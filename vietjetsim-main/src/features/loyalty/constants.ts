// Loyalty-related constants
import { API_ENDPOINTS } from '@/shared/constants';

export const LOYALTY_API_ENDPOINTS = API_ENDPOINTS.LOYALTY;

/** Transaction types permitted by the `loyalty_transactions.type` constraint. */
export const LOYALTY_TRANSACTION_TYPES = {
  EARN: 'earn',
  REDEEM: 'redeem',
  EXPIRE: 'expire',
  BONUS: 'bonus',
  ADJUST: 'adjust',
} as const;

export const LOYALTY_TRANSACTION_LABELS: Record<string, string> = {
  earn: 'Tích điểm',
  redeem: 'Đổi điểm',
  expire: 'Hết hạn',
  bonus: 'Thưởng',
  adjust: 'Điều chỉnh',
};

/**
 * Seeded tier ladder for SkyJoy Rewards:
 * Red (x1.0), Silver (x1.2), Gold (x1.5), Diamond (x2.0).
 */
export const LOYALTY_TIERS = [
  { name: 'Red', minLifetimePoints: 0, pointsMultiplier: 1.0 },
  { name: 'Silver', minLifetimePoints: 10000, pointsMultiplier: 1.2 },
  { name: 'Gold', minLifetimePoints: 50000, pointsMultiplier: 1.5 },
  { name: 'Diamond', minLifetimePoints: 150000, pointsMultiplier: 2.0 },
] as const;

export type LoyaltyTierName = (typeof LOYALTY_TIERS)[number]['name'] | 'Bronze' | 'Platinum';

/** Resolve the highest tier a member qualifies for given lifetime points. */
export function resolveTier(lifetimePoints: number): LoyaltyTierName {
  const match = [...LOYALTY_TIERS]
    .reverse()
    .find((tier) => lifetimePoints >= tier.minLifetimePoints);
  return match ? match.name : 'Red';
}

/** Earning rate seeded in `loyalty_programs`: 1 point per 1,000 VND. */
export const POINTS_PER_1000_VND = 1;

export const MIN_POINTS_TO_REDEEM = 500;
