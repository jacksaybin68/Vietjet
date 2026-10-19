import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { rateLimit } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/utils';
import { verifyCaptcha } from '@/lib/captcha';
import { createPhoneOtp, sendOtpSms, type OtpPurpose } from '@/lib/skyjoy-otp';
import { findAccountByIdentifier } from '@/lib/account-lookup';
import { OTP_TTL_MINUTES } from '@/lib/skyjoy';

/**
 * Gửi OTP SMS cho đăng ký hoặc đăng nhập.
 *
 * `purpose` quyết định định danh nào được nhận:
 *  - `register`: nhận `phone`, từ chối nếu số đã có tài khoản (trùng với hành vi
 *    409 của `/dang-ky`, để người dùng biết ngay thay vì điền hết form rồi mới lỗi).
 *  - `login`: nhận `identifier` (email / số điện thoại / mã hội viên) và **luôn**
 *    trả cùng một câu trả lời, kể cả khi không tìm thấy tài khoản — nếu không,
 *    route này trở thành công cụ dò xem số nào đã đăng ký.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const { identifier, phone, purpose, captchaToken, captchaAnswer } = body as {
      identifier?: string;
      phone?: string;
      purpose?: string;
      captchaToken?: string;
      captchaAnswer?: string;
    };

    const otpPurpose: OtpPurpose = purpose === 'login' ? 'login' : 'register';

    // SMS có chi phí thật, nên endpoint gửi mã luôn đòi CAPTCHA — đây là chỗ
    // chống "SMS bombing" mạnh hơn cả rate limit theo IP.
    if (!verifyCaptcha(captchaToken, captchaAnswer ?? '')) {
      return NextResponse.json(
        { error: 'Vui lòng xác nhận bạn không phải robot.', captchaRequired: true },
        { status: 400 }
      );
    }

    if (otpPurpose === 'register') {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return NextResponse.json({ error: 'Số điện thoại không hợp lệ.' }, { status: 400 });
      }

      const existing = await sql`SELECT id FROM user_profiles WHERE phone = ${normalizedPhone}`;
      if (Array.isArray(existing) && existing.length > 0) {
        return NextResponse.json({ error: 'Số điện thoại đã được đăng ký' }, { status: 409 });
      }

      const { code } = await createPhoneOtp(normalizedPhone, 'register');
      await sendOtpSms(normalizedPhone, code, 'register');

      return NextResponse.json(otpSentPayload(normalizedPhone, code));
    }

    // Login OTP: resolve the account, then text the number on file. A miss
    // answers with the same status and body as a hit.
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Vui lòng nhập Email, Số điện thoại hoặc Mã hội viên.' },
        { status: 400 }
      );
    }

    const account = await findAccountByIdentifier(trimmed);
    if (!account?.phone) {
      // Anti-enumeration: same status, same body and same message as a hit, so
      // the caller has nothing to branch on. The timing is not identical (a hit
      // does two more round trips), so treat this as a shape-equal reply rather
      // than a constant-time one.
      return NextResponse.json({
        success: true,
        message: 'Nếu tài khoản tồn tại, mã OTP đã được gửi.',
      });
    }

    const { code } = await createPhoneOtp(account.phone, 'login');
    await sendOtpSms(account.phone, code, 'login');

    return NextResponse.json({
      ...otpSentPayload(account.phone, code),
      message: 'Nếu tài khoản tồn tại, mã OTP đã được gửi.',
    });
  } catch (error) {
    console.error('OTP send error:', error);
    return NextResponse.json(
      { error: 'Không gửi được mã OTP. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}

/**
 * Không có nhà cung cấp SMS trong repo, nên mã bản rõ chỉ được trả về ngoài
 * production — giống cách `/quen-mat-khau` trả `resetUrl`. Production luôn ẩn nó.
 */
function otpSentPayload(phone: string, code: string) {
  return {
    success: true,
    phone,
    expiresInMinutes: OTP_TTL_MINUTES,
    ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}
