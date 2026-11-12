import { describe, it, expect } from 'vitest';
import {
  calculateEarnedPoints,
  determineTier,
  calculateTierProgress,
  getTierMultiplier,
  getTierColor,
} from '@/lib/loyalty';
import { LOYALTY_TIERS, resolveTier } from '@/features/loyalty/constants';
import type { LoyaltyProgramRecord, LoyaltyTierRecord } from '@/types/database';

describe('Tác vụ 5.1: Hệ sinh thái SkyJoy Rewards & Hệ số Hạng thẻ', () => {
  const mockProgram: LoyaltyProgramRecord = {
    id: 'prog-1',
    name: 'VietjetSim Rewards',
    description: 'Chương trình SkyJoy Vietjet',
    points_per_1000_vnd: 1.0,
    min_points_to_redeem: 500,
    points_expiry_months: 24,
    start_date: '2026-01-01',
    end_date: null,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockTiers: LoyaltyTierRecord[] = [
    {
      id: 't-1',
      program_id: 'prog-1',
      name: 'Red',
      min_lifetime_points: 0,
      points_multiplier: 1.0,
      benefits: 'Tích 1 điểm cho mỗi 1.000 VND (x1.0)',
      tier_order: 1,
      created_at: '2026-01-01',
    },
    {
      id: 't-2',
      program_id: 'prog-1',
      name: 'Silver',
      min_lifetime_points: 10000,
      points_multiplier: 1.2,
      benefits: 'Hệ số tích điểm x1.2. Ưu tiên chọn chỗ ngồi.',
      tier_order: 2,
      created_at: '2026-01-01',
    },
    {
      id: 't-3',
      program_id: 'prog-1',
      name: 'Gold',
      min_lifetime_points: 50000,
      points_multiplier: 1.5,
      benefits: 'Hệ số tích điểm x1.5. Ưu tiên check-in & hành lý.',
      tier_order: 3,
      created_at: '2026-01-01',
    },
    {
      id: 't-4',
      program_id: 'prog-1',
      name: 'Diamond',
      min_lifetime_points: 150000,
      points_multiplier: 2.0,
      benefits: 'Hệ số tích điểm x2.0. Phòng chờ VIP miễn phí & dịch vụ thương gia.',
      tier_order: 4,
      created_at: '2026-01-01',
    },
  ];

  it('xác định chính xác hệ số nhân điểm theo 4 hạng thẻ: Red (1.0), Silver (1.2), Gold (1.5), Diamond (2.0)', () => {
    expect(getTierMultiplier('Red')).toBe(1.0);
    expect(getTierMultiplier('Silver')).toBe(1.2);
    expect(getTierMultiplier('Gold')).toBe(1.5);
    expect(getTierMultiplier('Diamond')).toBe(2.0);
    // Hạng không xác định mặc định về 1.0
    expect(getTierMultiplier('Unknown')).toBe(1.0);
  });

  it('hạng Red (x1.0): mua vé 2.000.000đ tích lũy 2.000 SkyPoints', () => {
    const points = calculateEarnedPoints(2_000_000, mockProgram, getTierMultiplier('Red'));
    expect(points).toBe(2000);
  });

  it('hạng Silver (x1.2): mua vé 2.000.000đ tích lũy 2.400 SkyPoints', () => {
    const points = calculateEarnedPoints(2_000_000, mockProgram, getTierMultiplier('Silver'));
    expect(points).toBe(2400);
  });

  it('hạng Gold (x1.5): mua vé 2.000.000đ tích lũy 3.000 SkyPoints', () => {
    const points = calculateEarnedPoints(2_000_000, mockProgram, getTierMultiplier('Gold'));
    expect(points).toBe(3000);
  });

  it('hạng Diamond (x2.0): mua vé 2.000.000đ tích lũy 4.000 SkyPoints', () => {
    const points = calculateEarnedPoints(2_000_000, mockProgram, getTierMultiplier('Diamond'));
    expect(points).toBe(4000);
  });

  it('tự động xác định hạng thành viên theo điểm tích lũy trọn đời (lifetime points)', () => {
    expect(determineTier(0, mockTiers)).toBe('Red');
    expect(determineTier(5000, mockTiers)).toBe('Red');
    expect(determineTier(10000, mockTiers)).toBe('Silver');
    expect(determineTier(49999, mockTiers)).toBe('Silver');
    expect(determineTier(50000, mockTiers)).toBe('Gold');
    expect(determineTier(149999, mockTiers)).toBe('Gold');
    expect(determineTier(150000, mockTiers)).toBe('Diamond');
    expect(determineTier(500000, mockTiers)).toBe('Diamond');
  });

  it('hàm resolveTier phản ánh đúng cấu hình 4 hạng thẻ chuẩn của SkyJoy', () => {
    expect(resolveTier(0)).toBe('Red');
    expect(resolveTier(12000)).toBe('Silver');
    expect(resolveTier(60000)).toBe('Gold');
    expect(resolveTier(200000)).toBe('Diamond');
  });

  it('tính toán thanh tiến trình lên hạng tiếp theo chính xác', () => {
    // Đang có 5.000 điểm ở hạng Red, cần 10.000 điểm để lên Silver (đạt 50%)
    const progress = calculateTierProgress(5000, 'Red', mockTiers);
    expect(progress.nextTier?.name).toBe('Silver');
    expect(progress.pointsNeeded).toBe(5000);
    expect(progress.progressPercent).toBe(50);
  });

  it('hạng cao nhất Diamond đạt 100% tiến độ và không có nextTier', () => {
    const progress = calculateTierProgress(200000, 'Diamond', mockTiers);
    expect(progress.nextTier).toBeNull();
    expect(progress.pointsNeeded).toBe(0);
    expect(progress.progressPercent).toBe(100);
  });

  it('bảng màu nhận diện thương hiệu Vietjet SkyJoy chuẩn cho từng hạng thẻ', () => {
    const red = getTierColor('Red');
    expect(red.bg).toBe('#E31837'); // Vietjet Red

    const silver = getTierColor('Silver');
    expect(silver.bg).toBe('#E2E8F0');

    const gold = getTierColor('Gold');
    expect(gold.bg).toBe('#FFDD00');

    const diamond = getTierColor('Diamond');
    expect(diamond.bg).toBe('#06B6D4');
  });

  it('danh sách LOYALTY_TIERS chứa đầy đủ 4 hạng thẻ theo yêu cầu đề bài', () => {
    const tierNames = LOYALTY_TIERS.map((t) => t.name);
    expect(tierNames).toContain('Red');
    expect(tierNames).toContain('Silver');
    expect(tierNames).toContain('Gold');
    expect(tierNames).toContain('Diamond');
  });
});
