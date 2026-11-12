import { describe, it, expect } from 'vitest';
import {
  skypointPointsForAmount,
  skypointValueOfPoints,
  FALLBACK_POINTS_PER_1000_VND,
} from '@/lib/skypoint';

describe('Tác vụ 5.1: Cơ chế thanh toán kết hợp Cash + Points', () => {
  const rate = 1.0; // 1 điểm = 1.000 VND

  it('quy đổi chính xác điểm SkyPoint thành giá trị tiền mặt giảm trừ (Points -> Cash)', () => {
    // 500 điểm -> 500.000 VND
    expect(skypointValueOfPoints(500, rate)).toBe(500_000);
    // 1.500 điểm -> 1.500.000 VND
    expect(skypointValueOfPoints(1500, rate)).toBe(1_500_000);
    // 0 điểm -> 0 VND
    expect(skypointValueOfPoints(0, rate)).toBe(0);
  });

  it('tính toán số tiền mặt còn lại cần thanh toán sau khi giảm trừ điểm thưởng', () => {
    const totalAmount = 2_500_000;
    const pointsToRedeem = 1000; // tương đương 1.000.000 VND
    const pointsDiscount = skypointValueOfPoints(pointsToRedeem, rate);
    const cashRemaining = Math.max(0, totalAmount - pointsDiscount);

    expect(pointsDiscount).toBe(1_000_000);
    expect(cashRemaining).toBe(1_500_000);
  });

  it('xử lý an toàn khi số điểm quy đổi lớn hơn tổng tiền vé (không bị âm tiền)', () => {
    const totalAmount = 800_000;
    const pointsToRedeem = 1200; // tương đương 1.200.000 VND
    const pointsDiscount = skypointValueOfPoints(pointsToRedeem, rate);
    const cashRemaining = Math.max(0, totalAmount - pointsDiscount);

    expect(pointsDiscount).toBe(1_200_000);
    expect(cashRemaining).toBe(0);
  });

  it('chuyển đổi ngược từ số tiền mặt sang số điểm cần thiết', () => {
    const cashAmount = 1_500_000;
    const pointsNeeded = skypointPointsForAmount(cashAmount, rate);
    expect(pointsNeeded).toBe(1500);
  });

  it('tính tỷ lệ quy đổi khi chương trình có tỷ lệ 10 điểm / 1.000 VND', () => {
    const customRate = 10;
    // 1.000.000 VND cần 10.000 điểm
    expect(skypointPointsForAmount(1_000_000, customRate)).toBe(10_000);
    // 10.000 điểm tương đương 1.000.000 VND
    expect(skypointValueOfPoints(10_000, customRate)).toBe(1_000_000);
  });

  it('fallback an toàn khi rate không hợp lệ (null, undefined, 0, âm)', () => {
    expect(skypointValueOfPoints(500, 0)).toBe(
      Math.floor((500 / FALLBACK_POINTS_PER_1000_VND) * 1000)
    );
    expect(skypointValueOfPoints(500, null)).toBe(
      Math.floor((500 / FALLBACK_POINTS_PER_1000_VND) * 1000)
    );
    expect(skypointValueOfPoints(500, -2)).toBe(
      Math.floor((500 / FALLBACK_POINTS_PER_1000_VND) * 1000)
    );
  });

  it('tính toán phân chia thanh toán nhiều mức tỷ lệ phần trăm (25%, 50%, 75%, 100%)', () => {
    const totalVnd = 4_000_000;
    const maxPoints = skypointPointsForAmount(totalVnd, rate); // 4000 points
    expect(maxPoints).toBe(4000);

    const testPercentages = [
      { pct: 0.25, expectedPoints: 1000, expectedCash: 3_000_000 },
      { pct: 0.5, expectedPoints: 2000, expectedCash: 2_000_000 },
      { pct: 0.75, expectedPoints: 3000, expectedCash: 1_000_000 },
      { pct: 1.0, expectedPoints: 4000, expectedCash: 0 },
    ];

    for (const testCase of testPercentages) {
      const pts = maxPoints * testCase.pct;
      const discount = skypointValueOfPoints(pts, rate);
      const remaining = totalVnd - discount;

      expect(pts).toBe(testCase.expectedPoints);
      expect(remaining).toBe(testCase.expectedCash);
    }
  });
});
