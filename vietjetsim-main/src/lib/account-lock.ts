/**
 * Account locking is expressed through `user_profiles.locked_until`; there is
 * no separate `status` column. A timestamp in the future means the account is
 * locked, NULL means it is active.
 */

/** Sentinel written when an admin locks an account indefinitely. */
export const LOCKED_UNTIL_SENTINEL = '9999-12-31T23:59:59.000Z';

/**
 * Số lần đăng nhập sai liên tiếp trước khi tài khoản bị khoá tạm thời.
 * Bộ đếm nằm ở `user_profiles.failed_login_attempts` (migration 005).
 */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

/** Thời gian khoá tạm thời sau khi vượt ngưỡng, tính bằng phút. */
export const LOGIN_LOCK_MINUTES = 15;

/**
 * Ngưỡng sai liên tiếp mà từ đó đăng nhập bắt buộc kèm CAPTCHA.
 * Thấp hơn ngưỡng khoá để bot bị chặn trước khi kịp khoá người dùng thật.
 */
export const CAPTCHA_AFTER_FAILED_ATTEMPTS = 3;

/** Thông báo khoá tạm thời hiển thị cho người dùng. */
export function temporaryLockMessage(minutes: number = LOGIN_LOCK_MINUTES): string {
  return `Bạn đã nhập sai quá ${MAX_FAILED_LOGIN_ATTEMPTS} lần. Vì lý do an toàn, tài khoản bị khoá tạm thời trong ${minutes} phút. Vui lòng thử lại sau hoặc liên hệ tổng đài 1900 1886.`;
}

/** True when `locked_until` is set and still in the future. */
export function isAccountLocked(lockedUntil: string | Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  const until = lockedUntil instanceof Date ? lockedUntil : new Date(lockedUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > Date.now();
}
