/**
 * Currency formatting utilities
 */

/**
 * Format a number as currency (VND by default)
 */
export function formatCurrency(amount: number, currency: string = 'VND'): string {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    ...options,
  }).format(d);
}

/**
 * Format a date with time for display
 */
export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(d);
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

  if (days > 0) return rtf.format(days, 'day');
  if (hours > 0) return rtf.format(hours, 'hour');
  if (minutes > 0) return rtf.format(minutes, 'minute');
  return rtf.format(seconds, 'second');
}

/**
 * The offset every departure time in this app is written in.
 *
 * Vietnam has no DST, so a fixed literal is correct year-round — and a literal
 * is the point: a `TIMESTAMPTZ` without one is read in the *session* zone, and
 * Neon sessions run `TimeZone = GMT`, which shifts every flight seven hours.
 */
const VIETNAM_UTC_OFFSET = '+07:00';

/**
 * Format a stored timestamp as the `YYYY-MM-DD` and `HH:mm` a Vietnamese
 * operator sees, in Vietnam time.
 *
 * `toFlightRow` used `new Date(iso).toTimeString()` and `iso.split('T')[0]`,
 * which read in the *browser's* zone. An admin in Hanoi happened to see the
 * right numbers, so the bug stayed invisible there and appeared only as rows
 * that looked wrong to a reviewer elsewhere. `Intl` with an explicit zone asks
 * for the answer rather than inheriting whatever the machine happens to be set
 * to.
 */
export function toVietnamWallClock(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  const empty = { date: '', time: '' };
  if (!iso) return empty;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return empty;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/**
 * Build the instant string a flight's depart/arrive column is stored as.
 *
 * The admin forms collect a date and a `type="time"` field and concatenate
 * them (`2026-11-03T14:00:00`). Postgres reads that offsetless string in the
 * session zone, so a flight entered as 14:00 departed at 14:00 GMT — 21:00
 * Hanoi — and every readback showed a time nobody had typed. This is the same
 * trap 026 had to re-seed 440 rows over; appending the offset here keeps the
 * stored instant independent of the session.
 */
export function toVietnamInstant(date: string, time: string): string {
  return `${date}T${time}:00${VIETNAM_UTC_OFFSET}`;
}

/**
 * Normalize a Vietnamese phone number to a single canonical form.
 *
 * `user_profiles.phone` carries a UNIQUE constraint, yet registration and login
 * compared the raw string. The same person could therefore register
 * `0986349061`, `+84 986 349 061` and `986349061` as three separate accounts,
 * each with its own wallet — and the duplicate rows then collided only if the
 * user happened to type the exact spelling they registered with.
 *
 * Canonical form is `0XXXXXXXXX`, so `+84`/`84` prefixes and all punctuation
 * collapse to one value. Returns null when there is nothing usable, and leaves
 * foreign-length numbers as digits so they stay distinct rather than being
 * forced into the local shape.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('84') && digits.length > 9) return '0' + digits.slice(2);
  if (digits.startsWith('0')) return digits;
  // Bare local numbers are typed without the trunk zero (`986349061`).
  if (digits.length === 9) return '0' + digits;
  return digits;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}
