// Loyalty Points Calculation Utilities
import type { LoyaltyTierRecord, LoyaltyProgramRecord } from '@/types/database';

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

export function getTierMultiplier(tier: string): number {
  const multipliers: Record<string, number> = {
    Red: 1.0,
    Silver: 1.2,
    Gold: 1.5,
    Diamond: 2.0,
    Bronze: 1.0,
    Platinum: 2.0,
  };
  return multipliers[tier] ?? 1.0;
}

/**
 * Determine the user's current tier based on lifetime points.
 * Returns the highest qualifying tier.
 */
export function determineTier(lifetimePoints: number, tiers: LoyaltyTierRecord[]): string {
  const sorted = [...tiers].sort((a, b) => b.min_lifetime_points - a.min_lifetime_points);
  const current = sorted.find((t) => lifetimePoints >= t.min_lifetime_points);
  return current?.name || 'Red';
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
export function shouldExpirePoints(expiresAt: string | null, _expiryMonths: number): boolean {
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
    Red: { bg: '#E31837', text: '#FFFFFF', border: '#B91C1C' },
    Silver: { bg: '#E2E8F0', text: '#1E293B', border: '#94A3B8' },
    Gold: { bg: '#FFDD00', text: '#1A2948', border: '#DAA520' },
    Diamond: { bg: '#06B6D4', text: '#FFFFFF', border: '#0891B2' },
    // Backwards compatibility for legacy accounts
    Bronze: { bg: '#CD7F32', text: '#FFFFFF', border: '#A0522D' },
    Platinum: { bg: '#06B6D4', text: '#FFFFFF', border: '#0891B2' },
  };
  return colors[tier] || colors.Red;
}
