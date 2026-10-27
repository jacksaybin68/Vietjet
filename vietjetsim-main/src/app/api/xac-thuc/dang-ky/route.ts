import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { setCsrfCookieOnResponse } from '@/lib/csrf';
import {
  hashPassword,
  generateTokens,
  setAuthCookiesOnResponse,
  validatePassword,
  type UserRole,
} from '@/lib/auth';
import { normalizePhone } from '@/lib/utils';
import { sendRegistrationSuccessEmail } from '@/lib/mail';
import {
  generateSkyjoyMemberId,
  isSalutation,
  isValidReferralCode,
  normalizePassportName,
  normalizeSkyjoyMemberId,
  REFERRAL_BONUS_POINTS,
} from '@/lib/skyjoy';
import { verifyPhoneOtp } from '@/lib/skyjoy-otp';
import { verifyCaptcha } from '@/lib/captcha';
import { findAccountByIdentifier } from '@/lib/account-lookup';
import { awardLoyaltyPoints } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 20 });
    if (limited) return limited;

    const body = await request.json();
    const {
      email,
      password,
      full_name,
      phone,
      dob,
      salutation,
      last_name,
      first_name,
      referral_code,
      otp_code,
      captchaToken,
      captchaAnswer,
    } = body;

    // Validation: Require password and AT LEAST ONE of email or phone.
    if (!password || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Mật khẩu và (Email hoặc Số điện thoại) là bắt buộc' },
        { status: 400 }
      );
    }

    // Name may arrive either as one `full_name` (legacy callers) or as the
    // separate passport-style fields. Both are normalised to uppercase without
    // Vietnamese diacritics so a boarding pass prints NGUYEN VAN A, not Nguyễn
    // Văn A.
    const lastName = normalizePassportName(last_name);
    const firstName = normalizePassportName(first_name);
    const resolvedFullName =
      lastName || firstName ? `${lastName} ${firstName}`.trim() : normalizePassportName(full_name);

    if (!resolvedFullName) {
      return NextResponse.json({ error: 'Vui lòng nhập Họ và Tên đệm/Tên.' }, { status: 400 });
    }

    if (salutation != null && salutation !== '' && !isSalutation(salutation)) {
      return NextResponse.json({ error: 'Danh xưng không hợp lệ.' }, { status: 400 });
    }

    // CAPTCHA is always required on registration: unlike login there is no
    // "clean history" to earn trust from, and an account-creation endpoint is
    // the most attractive thing to script.
    if (!verifyCaptcha(captchaToken, captchaAnswer ?? '')) {
      return NextResponse.json(
        { error: 'Vui lòng xác nhận bạn không phải robot.', captchaRequired: true },
        { status: 400 }
      );
    }

    // M2: Strengthened password policy (8+ chars + complexity)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.errors.join('; ') }, { status: 400 });
    }

    // Store the canonical spelling. Otherwise a number typed as 0986349061
    // and one typed as 986349061 pass the uniqueness check as different
    // strings and end up as two accounts for the same person.
    const normalizedPhone = normalizePhone(phone);
    const trimmedEmail = (email || '').trim();

    // A phone-registered account must prove it owns the number before it exists.
    // The OTP is consumed by this call, so the same code cannot create twice.
    if (normalizedPhone || (otp_code && trimmedEmail)) {
      const otpTarget = normalizedPhone || trimmedEmail;
      const otpOk = await verifyPhoneOtp(otpTarget, 'register', String(otp_code ?? ''));
      if (!otpOk) {
        return NextResponse.json(
          { error: 'Mã OTP không đúng hoặc đã hết hạn. Vui lòng lấy mã mới.' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    if (email) {
      const existingEmail = await sql`SELECT id FROM user_profiles WHERE email = ${email}`;
      if (existingEmail.length > 0) {
        return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 });
      }
    }

    if (normalizedPhone) {
      const existingPhone =
        await sql`SELECT id FROM user_profiles WHERE phone = ${normalizedPhone}`;
      if (existingPhone.length > 0) {
        return NextResponse.json({ error: 'Số điện thoại đã được đăng ký' }, { status: 409 });
      }
    }

    const referralCode = isValidReferralCode(referral_code)
      ? normalizeSkyjoyMemberId(referral_code)
      : null;

    const password_hash = await hashPassword(password);

    // Create user in Neon PostgreSQL. The SkyJoy member id is generated here
    // and retried on a collision, because the UNIQUE constraint (migration 038)
    // is the only real guarantee — a prior SELECT cannot be trusted against a
    // concurrent signup.
    let userRecord: Record<string, unknown> | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 5 && !userRecord; attempt += 1) {
      const skyjoyMemberId = generateSkyjoyMemberId();
      try {
        const newUser = await sql`
          INSERT INTO user_profiles (
            email, password_hash, full_name, role, phone, dob,
            salutation, last_name, first_name, skyjoy_member_id, referred_by_code,
            email_verified
          )
          VALUES (
            ${email || null}, ${password_hash}, ${resolvedFullName}, 'user',
            ${normalizedPhone}, ${dob || null},
            ${salutation || null}, ${lastName || null}, ${firstName || null},
            ${skyjoyMemberId}, ${referralCode},
            true
          )
          RETURNING id, email, full_name, role, phone, dob, salutation, last_name,
                    first_name, skyjoy_member_id, created_at, updated_at
        `;
        userRecord = newUser[0] as Record<string, unknown>;
      } catch (err) {
        lastError = err;
        const code = (err as { code?: string }).code;
        const constraint = (err as { constraint?: string }).constraint ?? '';
        // Only a member-id collision is worth retrying; anything else is real.
        if (code === '23505' && constraint.includes('skyjoy_member_id')) continue;
        throw err;
      }
    }

    if (!userRecord) {
      console.error('Register error: could not allocate a unique SkyJoy member id', lastError);
      return NextResponse.json(
        { error: 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    const userId = String(userRecord.id);

    // Referral bonus is best-effort: a failure to credit points must never turn
    // a created account into an error the visitor sees.
    if (referralCode) {
      void applyReferralBonus(userId, referralCode);
    }

    // Generate tokens
    const user = {
      id: userId,
      email: String(userRecord.email ?? ''),
      full_name: String(userRecord.full_name ?? ''),
      role: (userRecord.role as UserRole) || 'user',
      phone: (userRecord.phone as string | null) ?? undefined,
      dob: userRecord.dob as string | undefined,
      created_at: String(userRecord.created_at ?? ''),
      updated_at: String(userRecord.updated_at ?? ''),
    };

    const tokens = generateTokens(user);

    // Set cookies on response
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
          skyjoyMemberId: userRecord.skyjoy_member_id,
        },
      },
      { status: 201 }
    );

    setAuthCookiesOnResponse(response, tokens);
    setCsrfCookieOnResponse(response);

    // Email chào mừng — fail-soft trong sendMail, không chặn response.
    if (user.email) {
      void sendRegistrationSuccessEmail({ to: user.email, fullName: user.full_name });
    }

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng ký' }, { status: 500 });
  }
}

/**
 * Ghi nhận một lượt dùng mã giới thiệu và thưởng điểm cho cả hai bên.
 *
 * `referral_events.referee_user_id` là UNIQUE, nên người được giới thiệu chỉ
 * nhận thưởng một lần dù hàm này có bị gọi lại. Mã không khớp tài khoản nào vẫn
 * được ghi lại (không thưởng) để đối soát.
 */
async function applyReferralBonus(refereeUserId: string, referralCode: string): Promise<void> {
  try {
    const referrer = await findAccountByIdentifier(referralCode);
    const referrerUserId = referrer && referrer.id !== refereeUserId ? referrer.id : null;

    await sql`
      INSERT INTO referral_events (referee_user_id, referrer_user_id, referral_code, points_awarded)
      VALUES (${refereeUserId}, ${referrerUserId}, ${referralCode},
              ${referrerUserId ? REFERRAL_BONUS_POINTS : 0})
      ON CONFLICT (referee_user_id) DO NOTHING
    `;

    if (!referrerUserId) return;

    await awardLoyaltyPoints(
      refereeUserId,
      REFERRAL_BONUS_POINTS,
      `Thưởng điểm mã giới thiệu ${referralCode}`
    );
    await awardLoyaltyPoints(
      referrerUserId,
      REFERRAL_BONUS_POINTS,
      `Thưởng điểm giới thiệu thành viên mới (${referralCode})`
    );
  } catch (error) {
    console.error('Referral bonus failed (non-fatal):', error);
  }
}
