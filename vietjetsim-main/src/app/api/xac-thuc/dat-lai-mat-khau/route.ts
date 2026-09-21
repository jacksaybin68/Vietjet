import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfOrReject } from '@/lib/csrf';
import { rateLimit } from '@/lib/rate-limit';
import { hashPassword, validatePassword } from '@/lib/auth';
import { updateUserPassword, invalidateUserRefreshTokens } from '@/lib/db';
import { consumeResetToken, getValidResetRequest } from '@/lib/password-reset';
import { deleteAllUserSessions } from '@/lib/security-db';

/**
 * Confirm a password reset with the token from the emailed link.
 *
 * On success every active session and refresh token is revoked, so whoever
 * forced the reset cannot keep an already-issued session alive.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfError = await validateCsrfOrReject(request);
    if (csrfError) return csrfError;

    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 10 });
    if (limited) return limited;

    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt lại mật khẩu.' }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.errors.join('; ') }, { status: 400 });
    }

    // Reject an unknown/expired token before touching the password.
    const recovery = await getValidResetRequest(token);
    if (!recovery) {
      return NextResponse.json(
        { error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' },
        { status: 400 }
      );
    }

    // Spend the token first: if this loses a race, no password is changed.
    const consumed = await consumeResetToken(token);
    if (!consumed) {
      return NextResponse.json(
        { error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' },
        { status: 400 }
      );
    }

    await updateUserPassword(recovery.user_id, await hashPassword(password));

    // A reset must terminate every existing session.
    await Promise.all([
      invalidateUserRefreshTokens(recovery.user_id).catch(() => undefined),
      deleteAllUserSessions(recovery.user_id).catch(() => undefined),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }, { status: 500 });
  }
}

/** Token validity probe so the reset page can show an expired-link state early. */
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    const recovery = await getValidResetRequest(token);
    return NextResponse.json({ valid: recovery !== null });
  } catch (error) {
    console.error('Verify reset token error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }, { status: 500 });
  }
}
