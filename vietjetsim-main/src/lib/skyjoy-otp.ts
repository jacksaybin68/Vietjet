/**
 * OTP SMS cho đăng ký / đăng nhập (bảng `phone_otp`, migration 038).
 *
 * Mã chỉ lưu dạng SHA-256 — bản rõ được trả về đúng một lần cho caller để gửi
 * qua SMS, giống cách refresh token và backup code được xử lý. Tiêu thụ là một
 * UPDATE có điều kiện, nên hai lần gửi xác nhận song song không thể cùng dùng
 * một mã.
 *
 * Chưa có nhà cung cấp SMS trong repo: `sendOtpSms` là chỗ cắm duy nhất, và
 * fail-soft giống `sendMail` — chưa cấu hình thì ghi log và trả false, không
 * chặn luồng. Ở môi trường không phải production, route gọi nó trả kèm `devCode`
 * để lập trình viên/kiểm thử đọc được mã mà không cần SMS thật.
 */

import { randomInt } from 'crypto';
import { sql } from '@/lib/neon';
import { hashToken } from '@/lib/auth';
import { OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from '@/lib/skyjoy';

export type OtpPurpose = 'register' | 'login';

export interface PhoneOtpRecord {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
}

/** Sinh mã gồm đúng `OTP_LENGTH` chữ số, kể cả số 0 đứng đầu. */
export function generateOtpCode(): string {
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

/**
 * Gửi OTP qua SMS. Chưa có nhà cung cấp nào được cấu hình trong repo, nên mặc
 * định chỉ ghi log. Cắm nhà cung cấp thật tại đây (Twilio/eSMS/…) và trả `true`
 * khi gửi thành công.
 */
export async function sendOtpSms(
  phone: string,
  code: string,
  purpose: OtpPurpose
): Promise<boolean> {
  console.info(`[OTP] (${purpose}) mã cho ${phone} là ${code} — chưa cấu hình SMS gateway`);
  return false;
}

/**
 * Cấp một OTP mới, huỷ mọi mã cũ chưa dùng của cùng (số, mục đích) để chỉ mã
 * mới nhất còn hiệu lực — nếu không, một mã cũ rò rỉ vẫn dùng được.
 *
 * @returns bản rõ của mã (để gửi) và thời điểm hết hạn.
 */
export async function createPhoneOtp(
  phone: string,
  purpose: OtpPurpose
): Promise<{ code: string; expiresAt: Date }> {
  await sql`
    DELETE FROM phone_otp
    WHERE phone = ${phone} AND purpose = ${purpose} AND consumed_at IS NULL
  `;

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO phone_otp (phone, purpose, code_hash, max_attempts, expires_at)
    VALUES (${phone}, ${purpose}, ${hashToken(code)}, ${OTP_MAX_ATTEMPTS}, ${expiresAt.toISOString()})
  `;

  return { code, expiresAt };
}

/**
 * Kiểm tra và tiêu thụ một OTP. Trả `true` chỉ khi mã khớp, chưa dùng, chưa hết
 * hạn và còn lượt thử. Mọi trường hợp sai đều tăng `attempts` của mã mới nhất,
 * nên dò 5 lần là hết lượt cho tới khi xin mã mới.
 */
export async function verifyPhoneOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string
): Promise<boolean> {
  const rows = await sql`
    UPDATE phone_otp
    SET consumed_at = NOW()
    WHERE id = (
      SELECT id FROM phone_otp
      WHERE phone = ${phone} AND purpose = ${purpose} AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    )
      AND code_hash = ${hashToken(code)}
      AND expires_at > NOW()
      AND attempts < max_attempts
    RETURNING id
  `;

  if (Array.isArray(rows) && rows.length > 0) return true;

  await sql`
    UPDATE phone_otp
    SET attempts = attempts + 1
    WHERE id = (
      SELECT id FROM phone_otp
      WHERE phone = ${phone} AND purpose = ${purpose} AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    )
  `;

  return false;
}
