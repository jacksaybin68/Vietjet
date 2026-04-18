// Loyalty Points Calculation Utilities
import type { LoyaltyTierRecord, LoyaltyProgramRecord, UserLoyaltyRecord } from '@/types/database';

/**
 * Calculate the number of points earned for a given booking amount.
 * @param amountVnd - Booking amount in VND
 * @param program - Loyalty program config
 * @param tierMultiplier - Tier-specific multiplier (from LoyaltyTierRecord.points_multiplier)
 */
export function calculateEarnedPoints(
  amountVnd: number,
  program: LoyaltyProgramRecord,
  tierMultiplier: number = 1.0
): number {
  const pointsPerThousand = program.points_per_1000_vnd * tierMultiplier;
  return Math.floor((amountVnd / 1000) * pointsPerThousand);
}

/**
 * Determine the user's current tier based on lifetime points.
 * Returns the highest qualifying tier.
 */
export function determineTier(lifetimePoints: number, tiers: LoyaltyTierRecord[]): string {
  const sorted = [...tiers].sort((a, b) => b.min_lifetime_points - a.min_lifetime_points);
  const current = sorted.find((t) => lifetimePoints >= t.min_lifetime_points);
  return current?.name || 'Bronze';
}

/**
 * Calculate progress to the next tier (percentage 0-100).
 */
export function calculateTierProgress(
  lifetimePoints: number,
  currentTier: string,
  tiers: LoyaltyTierRecord[]
): { nextTier: LoyaltyTierRecord | null; pointsNeeded: number; progressPercent: number } {
  const sorted = [...tiers].sort((a, b) => a.tier_order - b.tier_order);
  const currentIndex = sorted.findIndex((t) => t.name === currentTier);

  if (currentIndex === -1 || currentIndex === sorted.length - 1) {
    return { nextTier: null, pointsNeeded: 0, progressPercent: 100 };
  }

  const nextTier = sorted[currentIndex + 1];
  const currentTierMin = sorted[currentIndex].min_lifetime_points;
  const range = nextTier.min_lifetime_points - currentTierMin;
  const progress = lifetimePoints - currentTierMin;
  const progressPercent = Math.min(100, Math.round((progress / range) * 100));

  return {
    nextTier,
    pointsNeeded: Math.max(0, nextTier.min_lifetime_points - lifetimePoints),
    progressPercent,
  };
}

/**
 * Format large point numbers with commas (e.g., 1,234,567).
 */
export function formatPoints(points: number): string {
  return points.toLocaleString('vi-VN');
}

/**
 * Check if points are expired and mark them for cleanup.
 * Returns true if points should be expired.
 */
export function shouldExpirePoints(expiresAt: string | null, expiryMonths: number): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  return now > expiryDate;
}

/**
 * Get tier badge color based on tier name.
 */
export function getTierColor(tier: string): { bg: string; text: string; border: string } {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    Bronze: { bg: '#CD7F32', text: '#FFFFFF', border: '#A0522D' },
    Silver: { bg: '#C0C0C0', text: '#1A2948', border: '#A9A9A9' },
    Gold: { bg: '#FFD700', text: '#1A2948', border: '#DAA520' },
    Platinum: { bg: '#E5E4E2', text: '#1A2948', border: '#B0C4DE' },
  };
  return colors[tier] || { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563' };
}
