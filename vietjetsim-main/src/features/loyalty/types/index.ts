import type { LoyaltyTierRecord, LoyaltyTransactionRecord } from '@/lib/db/loyalty';

export type { LoyaltyTierRecord, LoyaltyTransactionRecord };

/** Membership block returned by `GET /api/thanh-vien` (camelCase). */
export interface Membership {
  id: string;
  tier: string;
  currentPoints: number;
  totalPoints: number;
  lifetimePoints: number;
  enrolledAt: string;
}

export interface LoyaltyProgram {
  name: string;
  pointsPerThousandVnd: number;
  minPointsToRedeem: number;
}

export interface MembershipTier {
  id: string;
  name: string;
  minLifetimePoints: number;
  pointsMultiplier: number;
  benefits: string | null;
  tierOrder: number;
}

export interface MembershipResponse {
  success: boolean;
  membership: Membership;
  program: LoyaltyProgram;
  tiers: MembershipTier[];
}

export interface LoyaltyTransactionsResponse {
  transactions: LoyaltyTransactionRecord[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RedeemPointsInput {
  points: number;
  description?: string;
}

export interface RedeemPointsResponse {
  success: boolean;
  message: string;
  transaction: LoyaltyTransactionRecord;
  loyalty: {
    availablePoints: number;
    totalPoints: number;
    lifetimePoints: number;
    tier: string;
  };
}
