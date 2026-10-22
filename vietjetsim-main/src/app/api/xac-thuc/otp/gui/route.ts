import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { rateLimit } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/utils';
import { verifyCaptcha } from '@/lib/captcha';
import { createPhoneOtp, sendOtpSms, type OtpPurpose } from '@/lib/skyjoy-otp';
import { findAccountByIdentifier } from '@/lib/account-lookup';
import { OTP_TTL_MINUTES } from '@/lib/skyjoy';
import { sendOtpEmail } from '@/lib/mail';

/**
 * Gửi OTP SMS / Email cho đăng ký hoặc đăng nhập.
 *
 * `purpose` quyết định định danh nào được nhận:
 *  - `register`: nhận `phone` và/hoặc `email`, từ chối nếu số hoặc email đã có tài khoản
 *    (trùng với hành vi 409 của `/dang-ky`, để người dùng biết ngay).
 *    Nếu có `email`, hệ thống gửi mã OTP qua SMTP Hostinger.
 *  - `login`: nhận `identifier` (email / số điện thoại / mã hội viên) và **luôn**
 *    trả cùng một câu trả lời, kể cả khi không tìm thấy tài khoản — nếu không,
 *    route này trở thành công cụ dò xem số nào đã đăng ký.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const { identifier, phone, email, purpose, captchaToken, captchaAnswer } = body as {
      identifier?: string;
      phone?: string;
      email?: string;
      purpose?: string;
      captchaToken?: string;
      captchaAnswer?: string;
    };

    const otpPurpose: OtpPurpose = purpose === 'login' ? 'login' : 'register';

    // SMS/Email có chi phí/giới hạn, nên endpoint gửi mã luôn đòi CAPTCHA — đây là chỗ
    // chống "SMS/email bombing" mạnh hơn cả rate limit theo IP.
    if (!verifyCaptcha(captchaToken, captchaAnswer ?? '')) {
      return NextResponse.json(
        { error: 'Vui lòng xác nhận bạn không phải robot.', captchaRequired: true },
        { status: 400 }
      );
    }

    if (otpPurpose === 'register') {
      const trimmedEmail = (email || '').trim().toLowerCase();
      if (trimmedEmail) {
        const existingEmail =
          await sql`SELECT id FROM user_profiles WHERE LOWER(email) = ${trimmedEmail}`;
        if (Array.isArray(existingEmail) && existingEmail.length > 0) {
          return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 });
        }
      }

      const normalizedPhone = normalizePhone(phone);
      if (phone && !normalizedPhone) {
        return NextResponse.json({ error: 'Số điện thoại không hợp lệ.' }, { status: 400 });
      }

      if (normalizedPhone) {
        const existingPhone =
          await sql`SELECT id FROM user_profiles WHERE phone = ${normalizedPhone}`;
        if (Array.isArray(existingPhone) && existingPhone.length > 0) {
          return NextResponse.json({ error: 'Số điện thoại đã được đăng ký' }, { status: 409 });
        }
      }

      if (!normalizedPhone && !trimmedEmail) {
        return NextResponse.json(
          { error: 'Vui lòng cung cấp số điện thoại hoặc email để nhận mã OTP.' },
          { status: 400 }
        );
      }

      const targetKey = normalizedPhone || trimmedEmail;
      const { code } = await createPhoneOtp(targetKey, 'register');

      if (normalizedPhone) {
        await sendOtpSms(normalizedPhone, code, 'register');
      }

      let emailSent = false;
      if (trimmedEmail) {
        emailSent = await sendOtpEmail({
          to: trimmedEmail,
          code,
          expiresInMinutes: OTP_TTL_MINUTES,
          purpose: 'register',
        });
      }

      return NextResponse.json(
        otpSentPayload(targetKey, code, emailSent, trimmedEmail || undefined)
      );
    }

    // Login OTP: resolve the account, then text/email the user. A miss
    // answers with the same status and body as a hit.
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Vui lòng nhập Email, Số điện thoại hoặc Mã hội viên.' },
        { status: 400 }
      );
    }

    const account = await findAccountByIdentifier(trimmed);
    if (!account?.phone && !account?.email) {
      // Anti-enumeration: same status, same body and same message as a hit
      return NextResponse.json({
        success: true,
        message: 'Nếu tài khoản tồn tại, mã OTP đã được gửi.',
      });
    }

    const targetKey = account.phone || account.email || trimmed;
    const { code } = await createPhoneOtp(targetKey, 'login');

    if (account.phone) {
      await sendOtpSms(account.phone, code, 'login');
    }

    let emailSent = false;
    if (account.email) {
      emailSent = await sendOtpEmail({
        to: account.email,
        code,
        expiresInMinutes: OTP_TTL_MINUTES,
        purpose: 'login',
      });
    }

    return NextResponse.json({
      ...otpSentPayload(targetKey, code, emailSent, account.email || undefined),
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
 * Mã bản rõ chỉ được trả về ngoài production — giống cách `/quen-mat-khau` trả `resetUrl`.
 * Production luôn ẩn nó.
 */
function otpSentPayload(phone: string, code: string, emailSent?: boolean, email?: string) {
  return {
    success: true,
    phone,
    email,
    sentToEmail: emailSent,
    expiresInMinutes: OTP_TTL_MINUTES,
    ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}
