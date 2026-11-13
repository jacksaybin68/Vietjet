'use client';

/**
 * Kiểu định danh ở bước đầu của luồng SkyID.
 *
 *  - `phone`: số điện thoại kèm mã quốc gia (mặc định, khớp site thật).
 *  - `account`: email hoặc mã hội viên SkyJoy.
 *
 * Backend đã tra được cả ba loại (`findAccountByIdentifier` gộp email /
 * số điện thoại / mã hội viên vào một câu truy vấn), nhưng trước đây ô nhập
 * lọc sạch mọi ký tự không phải số nên người dùng không thể đăng nhập bằng
 * email hay mã hội viên — đúng những định danh mà API hỗ trợ.
 */
export type IdentifierMode = 'phone' | 'account';

/** Một mã quốc gia trong menu chọn mã vùng của ô nhập số điện thoại. */
export interface SkyIdCountry {
  code: string;
  flag: string;
  dial: string;
  label: string;
}

/** Danh sách mã quốc gia hỗ trợ. */
export const SKY_ID_COUNTRY_CODES: readonly SkyIdCountry[] = [
  { code: 'VN', flag: '🇻🇳', dial: '+84', label: 'Việt Nam' },
  { code: 'US', flag: '🇺🇸', dial: '+1', label: 'Hoa Kỳ' },
  { code: 'GB', flag: '🇬🇧', dial: '+44', label: 'Anh' },
  { code: 'JP', flag: '🇯🇵', dial: '+81', label: 'Nhật Bản' },
  { code: 'KR', flag: '🇰🇷', dial: '+82', label: 'Hàn Quốc' },
  { code: 'AU', flag: '🇦🇺', dial: '+61', label: 'Australia' },
] as const;

/** Mã hội viên SkyJoy: `SJ` + 8–10 chữ số (xem `src/lib/account-lookup.ts`). */
export const SKY_ID_MEMBER_ID_PATTERN = /^SJ\d{8,10}$/;
