/**
 * Quy đổi SkyPoint (điểm SkyJoy) ↔ VND khi thanh toán.
 *
 * Tỷ lệ lấy từ chương trình loyalty đang hoạt động: `points_per_1000_vnd`
 * là số điểm tích được trên mỗi 1.000đ chi tiêu. Khi thanh toán bằng điểm,
 * cùng tỷ lệ được dùng ngược lại — trả N điểm cho hóa đơn Xđ.
 *
 * Pure function để test được và dùng chung client (hiển thị số dư quy đổi)
 * và server (trừ điểm trong POST /api/thanh-toan) — hai bên không được lệch
 * công thức, nếu không số hiển thị và số bị trừ sẽ khác nhau.
 */

/** Dùng khi chương trình loyalty chưa được seed (không được chia cho 0). */
export const FALLBACK_POINTS_PER_1000_VND = 10;

function normalizeRate(pointsPerThousandVnd: number | null | undefined): number {
  const rate = Number(pointsPerThousandVnd);
  return Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_POINTS_PER_1000_VND;
}

/**
 * Số SkyPoint cần trả cho hóa đơn `amountVnd` (luôn làm tròn lên để khách
 * không bị thiếu điểm so với giá trị hiển thị).
 */
export function skypointPointsForAmount(
  amountVnd: number,
  pointsPerThousandVnd: number | null | undefined
): number {
  const safeAmount = Number.isFinite(amountVnd) && amountVnd > 0 ? amountVnd : 0;
  const rate = normalizeRate(pointsPerThousandVnd);
  return Math.ceil((safeAmount / 1000) * rate);
}

/** Giá trị VND của `points` SkyPoint (làm tròn xuống — không hứa hẹn lẻ đồng). */
export function skypointValueOfPoints(
  points: number,
  pointsPerThousandVnd: number | null | undefined
): number {
  const safePoints = Number.isFinite(points) && points > 0 ? points : 0;
  const rate = normalizeRate(pointsPerThousandVnd);
  return Math.floor((safePoints / rate) * 1000);
}
