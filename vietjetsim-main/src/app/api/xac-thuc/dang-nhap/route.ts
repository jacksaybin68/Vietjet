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

    // Find user in Neon PostgreSQL
    // Identifier can be either email or phone number
    const results = await sql`
      SELECT id, email, password_hash, full_name, role, phone, avatar_url, created_at, updated_at,
             locked_until
      FROM user_profiles
      WHERE email = ${email} OR phone = ${email}
    `;

    const device = describeDevice(request.headers.get('user-agent'));

    console.log(`[AUTH] Login attempt for identifier: ${email}`);
    if (results.length === 0) {
      console.warn(`[AUTH] Login failed: User not found in database for identifier: ${email}`);
      return NextResponse.json(
        { error: 'Email/Số điện thoại hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    console.log(`[AUTH] User found, comparing password for: ${email}`);
    const userRecord = results[0];

    // Locked accounts cannot authenticate, even with the correct password.
    if (isAccountLocked(userRecord.locked_until)) {
      console.warn(`[AUTH] Login blocked: account locked for identifier: ${email}`);
      return NextResponse.json(
        { error: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }

    const isValidPassword = await comparePassword(password, userRecord.password_hash);

    if (!isValidPassword) {
      console.warn(`[AUTH] Login failed: Invalid password for email: ${email}`);
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
