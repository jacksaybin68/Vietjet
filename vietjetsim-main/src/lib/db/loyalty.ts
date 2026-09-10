import { sql } from '@/lib/neon';

// ─── Loyalty Queries ─────────────────────────────────────────────────────────

export interface LoyaltyProgramRecord {
  id: string;
  name: string;
  description: string | null;
  points_per_1000_vnd: number;
  min_points_to_redeem: number;
  points_expiry_months: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface UserLoyaltyRecord {
  id: string;
  user_id: string;
  program_id: string;
  total_points: number;
  available_points: number;
  lifetime_points: number;
  tier: string;
  tier_qualified_at: string | null;
  joined_at: string;
}

export interface LoyaltyTransactionRecord {
  id: string;
  user_loyalty_id: string;
  booking_id: string | null;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjust';
  description: string | null;
  expires_at: string | null;
  expired: boolean;
  created_at: string;
}

export interface LoyaltyTierRecord {
  id: string;
  program_id: string;
  name: string;
  min_lifetime_points: number;
  points_multiplier: number;
  benefits: string | null;
  tier_order: number;
}

export async function getOrEnrollLoyalty(userId: string): Promise<UserLoyaltyRecord> {
  const activeProgram = await sql`
    SELECT * FROM loyalty_programs WHERE is_active = true LIMIT 1
  `;

  if ((activeProgram as LoyaltyProgramRecord[]).length === 0) {
    throw new Error('No active loyalty program found');
  }

  const program = (activeProgram as LoyaltyProgramRecord[])[0];

  const existing = await sql`
    SELECT * FROM user_loyalty WHERE user_id = ${userId}
  `;

  if ((existing as UserLoyaltyRecord[]).length > 0) {
    return (existing as UserLoyaltyRecord[])[0];
  }

  const result = await sql`
    INSERT INTO user_loyalty (user_id, program_id, tier)
    VALUES (${userId}, ${program.id}, 'Bronze')
    RETURNING *
  `;
  return (result as UserLoyaltyRecord[])[0];
}

export async function getUserLoyaltyWithProgram(userId: string): Promise<{
  loyalty: UserLoyaltyRecord;
  program: LoyaltyProgramRecord;
  tiers: LoyaltyTierRecord[];
} | null> {
  const loyalty = await getOrEnrollLoyalty(userId);

  const program = await sql`
    SELECT * FROM loyalty_programs WHERE id = ${loyalty.program_id}
  `;

  const tiers = await sql`
    SELECT * FROM loyalty_tiers WHERE program_id = ${loyalty.program_id}
    ORDER BY tier_order ASC
  `;

  return {
    loyalty,
    program: (program as LoyaltyProgramRecord[])[0],
    tiers: tiers as LoyaltyTierRecord[],
  };
}

export async function getLoyaltyTransactions(
  userId: string,
  params?: { page?: number; limit?: number }
): Promise<{ transactions: LoyaltyTransactionRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  const loyalty = await getOrEnrollLoyalty(userId);

  const transactions = await sql`
    SELECT * FROM loyalty_transactions
    WHERE user_loyalty_id = ${loyalty.id}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await sql`
    SELECT COUNT(*) as total FROM loyalty_transactions WHERE user_loyalty_id = ${loyalty.id}
  `;

  return {
    transactions: transactions as LoyaltyTransactionRecord[],
    total: parseInt((countResult as any)[0].total, 10),
  };
}

/**
 * Spend loyalty points for a user.
 * Creates a redeem transaction and updates available_points.
 */
export async function spendLoyaltyPoints(
  userId: string,
  pointsToSpend: number,
  description: string = 'Đổi điểm thưởng'
): Promise<LoyaltyTransactionRecord> {
  if (pointsToSpend <= 0) {
    throw new Error('Points to spend must be greater than 0');
  }

  const loyalty = await getOrEnrollLoyalty(userId);

  if (loyalty.available_points < pointsToSpend) {
    throw new Error('Insufficient loyalty points');
  }

  // Create transaction and update available points in a single operation
  const result = await sql`
    INSERT INTO loyalty_transactions (user_loyalty_id, points, type, description)
    VALUES (${loyalty.id}, ${-pointsToSpend}, 'redeem', ${description})
    RETURNING id, user_loyalty_id, points, type, description, created_at
  `;

  // Update available points
  await sql`
    UPDATE user_loyalty
    SET available_points = available_points - ${pointsToSpend}
    WHERE id = ${loyalty.id}
  `;

  return (result as LoyaltyTransactionRecord[])[0];
}
