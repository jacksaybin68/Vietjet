import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { comparePassword, type User } from '@/lib/auth';
import {
  CAPTCHA_AFTER_FAILED_ATTEMPTS,
  isAccountLocked,
  temporaryLockMessage,
} from '@/lib/account-lock';
import { verifyCaptcha } from '@/lib/captcha';
import { findAccountByIdentifier } from '@/lib/account-lookup';
import {
  clearFailedLoginAttempts,
  consumeBackupCodeHash,
  get2FAConfig,
  recordLoginAttempt,
  registerFailedLoginAttempt,
} from '@/lib/security-db';
import { describeDevice } from '@/lib/user-agent';
import { hashBackupCode, normalizeBackupCode, verifyTotpToken } from '@/lib/two-factor';
import { establishSession } from '@/lib/auth-session';

export async function POST(request: NextRequest) {
  // IP-based rate limiting: 10 attempts per minute per IP + path.
  const rateLimitResponse = rateLimit(request, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { email, password, token, captchaToken, captchaAnswer } = body as {
      email?: string;
      password?: string;
      token?: string;
      captchaToken?: string;
      captchaAnswer?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    // Strip surrounding whitespace before looking the account up: text copied
    // out of a password manager, a chat message or a spreadsheet routinely
    // drags a trailing space/newline along, and that alone is enough to make a
    // correct credential look wrong.
    const identifier = email.trim();

    // The identifier can be an email, a phone number (any spelling) or a SkyJoy
    // member id; `findAccountByIdentifier` owns that lookup so the password and
    // OTP login paths cannot drift apart.
    const userRecord = await findAccountByIdentifier(identifier);

    const device = describeDevice(request.headers.get('user-agent'));

    console.info(`[AUTH] Login attempt for identifier: ${identifier}`);
    if (!userRecord) {
      console.warn(`[AUTH] Login failed: User not found in database for identifier: ${identifier}`);
      return NextResponse.json(
        { error: 'Email/Số điện thoại hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Locked accounts cannot authenticate, even with the correct password.
    if (isAccountLocked(userRecord.locked_until)) {
      console.warn(`[AUTH] Login blocked: account locked for identifier: ${identifier}`);
      return NextResponse.json(
        { error: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }

    // Adaptive CAPTCHA: a first-time or clean login never sees the challenge,
    // but once an account has failed a few times every further attempt must
    // prove it is human. Enforcing it from attempt one would make the very
    // first typo cost an extra round trip.
    const failedBefore = userRecord.failed_login_attempts ?? 0;
    const captchaRequired = failedBefore >= CAPTCHA_AFTER_FAILED_ATTEMPTS;
    if (captchaRequired && !verifyCaptcha(captchaToken, captchaAnswer ?? '')) {
      return NextResponse.json(
        { error: 'Vui lòng xác nhận bạn không phải robot.', captchaRequired: true },
        { status: 400 }
      );
    }

    console.info(`[AUTH] User found, comparing password for: ${identifier}`);

    // A password pasted from a manager/chat window often carries a trailing
    // space or newline. Try the value as typed first, then the trimmed value, so
    // the user is not told their (correct) password is wrong.
    const trimmedPassword = password.trim();
    const isValidPassword =
      (await comparePassword(password, userRecord.password_hash ?? '')) ||
      (trimmedPassword !== password &&
        (await comparePassword(trimmedPassword, userRecord.password_hash ?? '')));

    if (!isValidPassword) {
      console.warn(`[AUTH] Login failed: Invalid password for email: ${identifier}`);
      void recordLoginAttempt(userRecord.id, {
        ...device,
        success: false,
        failureReason: 'invalid_password',
      });

      // Count the failure and, on the fifth, apply a temporary lock. The count
      // and the lock land in one UPDATE; see `registerFailedLoginAttempt`.
      const state = await registerFailedLoginAttempt(userRecord.id);
      if (state && isAccountLocked(state.locked_until)) {
        return NextResponse.json(
          { error: temporaryLockMessage(), locked: true, captchaRequired: false },
          { status: 403 }
        );
      }

      const failedNow = state?.failed_login_attempts ?? failedBefore + 1;
      return NextResponse.json(
        {
          error: 'Email hoặc mật khẩu không đúng',
          failedAttempts: failedNow,
          captchaRequired: failedNow >= CAPTCHA_AFTER_FAILED_ATTEMPTS,
        },
        { status: 401 }
      );
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
      email: userRecord.email ?? '',
      full_name: userRecord.full_name ?? '',
      role: (userRecord.role as User['role']) || 'user',
      phone: userRecord.phone ?? undefined,
      avatar_url: userRecord.avatar_url ?? undefined,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    };

    // A successful login clears the counter so the next typo starts from zero.
    try {
      await clearFailedLoginAttempts(user.id);
    } catch (clearErr) {
      console.error('Failed to reset failed-login counter:', clearErr);
    }

    return establishSession(user, device);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng nhập' }, { status: 500 });
  }
}
