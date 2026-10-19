import { describe, it, expect } from 'vitest';
import {
  skypointPointsForAmount,
  skypointValueOfPoints,
  FALLBACK_POINTS_PER_1000_VND,
} from '@/lib/skypoint';

describe('SkyPoint ↔ VND conversion', () => {
  it('10 điểm/1.000đ: 850.000đ → 8.500 điểm', () => {
    expect(skypointPointsForAmount(850_000, 10)).toBe(8_500);
  });

  it('luôn làm tròn lên để không bao giờ thiếu điểm so với số hiển thị', () => {
    // 1.001đ với tỉ lệ 10 điểm/1.000đ = 10,01 điểm → 11 điểm.
    expect(skypointPointsForAmount(1_001, 10)).toBe(11);
  });

  it('giá trị VND của điểm làm tròn xuống', () => {
    expect(skypointValueOfPoints(8_500, 10)).toBe(850_000);
    // 11 điểm = 1.100đ → floor 1.100; tỉ lệ ngược không cho lẻ đồng.
    expect(skypointValueOfPoints(8_505, 10)).toBe(850_500);
  });

  it('tỉ lệ hỏng/0 dùng fallback an toàn, không NaN', () => {
    expect(skypointPointsForAmount(100_000, 0)).toBe(
      Math.ceil((100_000 / 1000) * FALLBACK_POINTS_PER_1000_VND)
    );
    expect(skypointPointsForAmount(100_000, null)).toBe(
      Math.ceil((100_000 / 1000) * FALLBACK_POINTS_PER_1000_VND)
    );
    expect(skypointValueOfPoints(100, undefined)).toBe(
      Math.floor((100 / FALLBACK_POINTS_PER_1000_VND) * 1000)
    );
  });

  it('số tiền âm/không hợp lệ về 0 điểm', () => {
    expect(skypointPointsForAmount(-5, 10)).toBe(0);
    expect(skypointPointsForAmount(Number.NaN, 10)).toBe(0);
  });
});
