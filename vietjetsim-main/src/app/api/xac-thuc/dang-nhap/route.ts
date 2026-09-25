import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import {
  comparePassword,
  generateTokens,
  setAuthCookiesOnResponse,
  hashToken,
  generateTokenFamily,
} from '@/lib/auth';
import { storeRefreshToken } from '@/lib/db';
import type { User } from '@/lib/auth';
import { isAccountLocked } from '@/lib/account-lock';
import { setCsrfCookieOnResponse } from '@/lib/csrf';
import {
  consumeBackupCodeHash,
  createUserSession,
  get2FAConfig,
  recordLoginAttempt,
} from '@/lib/security-db';
import { describeDevice } from '@/lib/user-agent';
import { normalizePhone } from '@/lib/utils';
import { hashBackupCode, normalizeBackupCode, verifyTotpToken } from '@/lib/two-factor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, token } = body as {
      email?: string;
      password?: string;
      token?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    // Strip surrounding whitespace before looking the account up: text copied
    // out of a password manager, a chat message or a spreadsheet routinely
    // drags a trailing space/newline along, and that alone is enough to make a
    // correct credential look wrong.
    const identifier = email.trim();

    // Find user in Neon PostgreSQL.
    // Identifier can be either an email or a phone number. Phone rows are
    // matched on the canonical form too, so someone who registered as
    // `0986349061` can still sign in with `+84 986 349 061`.
    // Email comparison is case-insensitive: addresses are not case-sensitive
    // per RFC 5321 and users habitually type `User@VietjetSim.vn`.
    // The cast is required: a bare parameter in `IS NOT NULL` leaves Postgres
    // unable to infer a type and the query fails with "could not determine
    // data type of parameter $3".
    const phoneIdentifier = normalizePhone(identifier);
    const results = await sql`
      SELECT id, email, password_hash, full_name, role, phone, avatar_url, created_at, updated_at,
             locked_until
      FROM user_profiles
      WHERE LOWER(email) = LOWER(${identifier})
         OR phone = ${identifier}
         OR (${phoneIdentifier}::text IS NOT NULL AND phone = ${phoneIdentifier}::text)
    `;

    const device = describeDevice(request.headers.get('user-agent'));

    console.info(`[AUTH] Login attempt for identifier: ${identifier}`);
    if (results.length === 0) {
      console.warn(`[AUTH] Login failed: User not found in database for identifier: ${identifier}`);
      return NextResponse.json(
        { error: 'Email/Số điện thoại hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    console.info(`[AUTH] User found, comparing password for: ${identifier}`);
    const userRecord = results[0];

    // Locked accounts cannot authenticate, even with the correct password.
    if (isAccountLocked(userRecord.locked_until)) {
      console.warn(`[AUTH] Login blocked: account locked for identifier: ${identifier}`);
      return NextResponse.json(
        { error: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }

    // A password pasted from a manager/chat window often carries a trailing
    // space or newline. Try the value as typed first, then the trimmed value, so
    // the user is not told their (correct) password is wrong.
    const trimmedPassword = password.trim();
    const isValidPassword =
      (await comparePassword(password, userRecord.password_hash)) ||
      (trimmedPassword !== password &&
        (await comparePassword(trimmedPassword, userRecord.password_hash)));

    if (!isValidPassword) {
      console.warn(`[AUTH] Login failed: Invalid password for email: ${identifier}`);
      void recordLoginAttempt(userRecord.id, {
        ...device,
        success: false,
        failureReason: 'invalid_password',
      });
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // Second factor gate. Nothing is issued until the token checks out, so a
    // stolen password alone is no longer sufficient.
    const twoFA = await get2FAConfig(userRecord.id);
    if (twoFA?.is_enabled) {
      if (!token) {
        return NextResponse.json(
          { error: 'Vui lòng nhập mã xác thực hai yếu tố.', requires2FA: true },
          { status: 401 }
        );
      }

      const totpOk = verifyTotpToken(twoFA.secret, token);
      const backupOk =
        !totpOk &&
        (await consumeBackupCodeHash(userRecord.id, hashBackupCode(normalizeBackupCode(token))));

      if (!totpOk && !backupOk) {
        void recordLoginAttempt(userRecord.id, {
          ...device,
          success: false,
          failureReason: 'invalid_2fa_token',
        });
        return NextResponse.json(
          { error: 'Mã xác thực không đúng.', requires2FA: true },
          { status: 401 }
        );
      }
    }

    // Build user object
    const user: User = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: userRecord.role || 'user',
      phone: userRecord.phone,
      avatar_url: userRecord.avatar_url,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    };

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token hash in DB for rotation / revocation tracking
    const tokenHash = hashToken(tokens.refreshToken);
    const familyId = generateTokenFamily();
    try {
      await storeRefreshToken(user.id, tokenHash, familyId);
    } catch (storeErr) {
      // Log but don't block login — rotation is a security hardening, not a hard dependency
      console.error('Failed to store refresh token (rotation disabled):', storeErr);
    }

    // Register the device so the security tab can list and revoke logins.
    // Failures here must not block a valid login.
    let sessionId: string | null = null;
    try {
      const session = await createUserSession(user.id, device);
      sessionId = session.id;
    } catch (sessionErr) {
      console.error('Failed to record session (session list unavailable):', sessionErr);
    }

    void recordLoginAttempt(user.id, { ...device, success: true });

    // Create response with user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatar_url,
      },
    });

    // Set cookies on response
    setAuthCookiesOnResponse(response, tokens);
    // Establish the double-submit CSRF cookie alongside the session cookies, otherwise
    // CSRF-guarded mutations fail after a fresh login.
    setCsrfCookieOnResponse(response);

    if (sessionId) {
      response.cookies.set('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng nhập' }, { status: 500 });
  }
}
