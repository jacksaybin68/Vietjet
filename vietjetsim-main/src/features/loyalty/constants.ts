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
 * Seeded tier ladder from `migrations/003_loyalty_program.sql`. The database is
 * authoritative (see `loyalty_tiers`); this mirrors it for static UI such as a
 * tier progress bar rendered before the program loads.
 */
export const LOYALTY_TIERS = [
  { name: 'Bronze', minLifetimePoints: 0, pointsMultiplier: 1 },
  { name: 'Silver', minLifetimePoints: 500000, pointsMultiplier: 1.25 },
  { name: 'Gold', minLifetimePoints: 2000000, pointsMultiplier: 1.5 },
  { name: 'Platinum', minLifetimePoints: 5000000, pointsMultiplier: 2 },
] as const;

export type LoyaltyTierName = (typeof LOYALTY_TIERS)[number]['name'];

/** Resolve the highest tier a member qualifies for given lifetime points. */
export function resolveTier(lifetimePoints: number): LoyaltyTierName {
  return [...LOYALTY_TIERS].reverse().find((tier) => lifetimePoints >= tier.minLifetimePoints)!
    .name;
}

/** Earning rate seeded in `loyalty_programs`: 1 point per 1,000 VND. */
export const POINTS_PER_1000_VND = 1;

export const MIN_POINTS_TO_REDEEM = 500;
