import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { isAccountLocked, temporaryLockMessage } from '@/lib/account-lock';
import { findAccountByIdentifier } from '@/lib/account-lookup';
import { verifyPhoneOtp } from '@/lib/skyjoy-otp';
import { describeDevice } from '@/lib/user-agent';
import {
  clearFailedLoginAttempts,
  recordLoginAttempt,
  registerFailedLoginAttempt,
} from '@/lib/security-db';
import { establishSession } from '@/lib/auth-session';
import type { User } from '@/lib/auth';

/**
 * Đăng nhập bằng OTP SMS (không cần mật khẩu).
 *
 * Cùng một câu trả lời 401 cho "không có tài khoản", "không có số điện thoại" và
 * "mã sai" — nếu phân biệt được, route này tiết lộ số nào đã đăng ký.
 *
 * Mã sai vẫn đi qua đúng bộ đếm `failed_login_attempts` như đăng nhập mật khẩu,
 * để không có đường nào rẻ hơn để dò.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 10 });
  if (limited) return limited;

  try {
    const { identifier, code } = (await request.json()) as {
      identifier?: string;
      code?: string;
    };

    if (!identifier || !code) {
      return NextResponse.json({ error: 'Thiếu định danh hoặc mã OTP.' }, { status: 400 });
    }

    const account = await findAccountByIdentifier(identifier.trim());
    const device = describeDevice(request.headers.get('user-agent'));
    const invalid = NextResponse.json(
      { error: 'Mã OTP không đúng hoặc đã hết hạn.' },
      { status: 401 }
    );

    if (!account?.phone) return invalid;

    if (isAccountLocked(account.locked_until)) {
      return NextResponse.json(
        { error: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }

    const ok = await verifyPhoneOtp(account.phone, 'login', String(code));
    if (!ok) {
      void recordLoginAttempt(account.id, {
        ...device,
        success: false,
        failureReason: 'invalid_otp',
      });

      const state = await registerFailedLoginAttempt(account.id);
      if (state && isAccountLocked(state.locked_until)) {
        return NextResponse.json({ error: temporaryLockMessage(), locked: true }, { status: 403 });
      }
      return invalid;
    }

    try {
      await clearFailedLoginAttempts(account.id);
    } catch (clearErr) {
      console.error('Failed to reset failed-login counter:', clearErr);
    }

    const user: User = {
      id: account.id,
      email: account.email ?? '',
      full_name: account.full_name ?? '',
      role: (account.role as User['role']) || 'user',
      phone: account.phone ?? undefined,
      avatar_url: account.avatar_url ?? undefined,
      created_at: account.created_at,
      updated_at: account.updated_at,
    };

    return establishSession(user, device);
  } catch (error) {
    console.error('OTP login error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng nhập' }, { status: 500 });
  }
}
