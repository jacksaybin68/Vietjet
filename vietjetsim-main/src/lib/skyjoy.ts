/**
 * SkyJoy identity helpers, dùng chung cho cả client và server.
 *
 * Module này KHÔNG được import `crypto`, `next/headers` hay bất kỳ thứ gì chỉ
 * chạy trên server: form đăng ký/đăng nhập (client component) nạp trực tiếp
 * `SALUTATIONS` và `normalizePassportName` để validate tại chỗ. Phần cần
 * `crypto` (băm OTP) nằm ở `src/lib/skyjoy-otp.ts`.
 */

/** Danh xưng theo chuẩn vé máy bay (ICAO): Ông / Bà / Cô / Anh. */
export const SALUTATIONS = [
  { value: 'ong', label: 'Ông' },
  { value: 'ba', label: 'Bà' },
  { value: 'co', label: 'Cô' },
  { value: 'anh', label: 'Anh' },
] as const;

export type Salutation = (typeof SALUTATIONS)[number]['value'];

export const DEFAULT_SALUTATION: Salutation = 'ong';

export function isSalutation(value: unknown): value is Salutation {
  return typeof value === 'string' && SALUTATIONS.some((s) => s.value === value);
}

export function salutationLabel(value: string | null | undefined): string {
  return SALUTATIONS.find((s) => s.value === value)?.label ?? '';
}

/**
 * Chuẩn hoá tên riêng theo quy ước hộ chiếu / CCCD: IN HOA và **bỏ toàn bộ dấu
 * tiếng Việt** (Nguyễn → NGUYEN). Dấu được tách bằng NFD rồi xoá khối combining
 * marks, và `đ/Đ` là ký tự độc lập nên phải thay riêng — `NFD` không tách nó.
 *
 * Chỉ giữ chữ cái, chữ số, khoảng trắng và `-`/`'` để một cái tên dán vào
 * không mang theo ký tự điều khiển. Trả về chuỗi rỗng khi không còn gì.
 */
export function normalizePassportName(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (ch) => (ch === 'đ' ? 'd' : 'D'))
    .toUpperCase()
    .replace(/[^A-Z0-9 '-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mã hội viên SkyJoy (SkyID) do Vietjet cấp: `SJ` + 8–10 chữ số. */
export const SKYJOY_MEMBER_ID_PATTERN = /^SJ\d{8,10}$/;

/** Mã giới thiệu chính là mã hội viên của người giới thiệu. */
export const REFERRAL_CODE_PATTERN = SKYJOY_MEMBER_ID_PATTERN;

export function normalizeSkyjoyMemberId(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/\s+/g, '').toUpperCase();
}

export function isSkyjoyMemberId(value: string | null | undefined): boolean {
  return SKYJOY_MEMBER_ID_PATTERN.test(normalizeSkyjoyMemberId(value));
}

export function isValidReferralCode(value: string | null | undefined): boolean {
  return REFERRAL_CODE_PATTERN.test(normalizeSkyjoyMemberId(value));
}

/** Số điểm SkyPoint thưởng cho mỗi bên khi một mã giới thiệu hợp lệ được dùng. */
export const REFERRAL_BONUS_POINTS = 500;

/**
 * Sinh một mã hội viên SkyJoy mới: `SJ` + 8 chữ số.
 *
 * Đây là định danh công khai (in trên thẻ, đọc cho tổng đài), không phải bí mật,
 * nên `Math.random` là đủ và giữ hàm này isomorphic để form có thể xem trước.
 * Server vẫn kiểm tra trùng bằng UNIQUE của `user_profiles.skyjoy_member_id` và
 * sinh lại khi cần.
 */
export function generateSkyjoyMemberId(): string {
  let digits = '';
  for (let i = 0; i < 8; i += 1) {
    digits += String(Math.floor(Math.random() * 10));
  }
  return `SJ${digits}`;
}

/** OTP SMS: 6 chữ số, hiệu lực 5 phút, tối đa 5 lần thử. */
export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_HINT = `Nhập mã gồm ${OTP_LENGTH} chữ số đã gửi tới số điện thoại của bạn.`;

export function normalizeOtpCode(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, OTP_LENGTH);
}

export function isValidOtpCode(value: string | null | undefined): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(normalizeOtpCode(value));
}
