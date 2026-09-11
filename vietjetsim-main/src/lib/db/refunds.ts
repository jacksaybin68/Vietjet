import { sql } from '@/lib/neon';
import type { RefundRecord } from './types';

// ─── Refund Queries ─────────────────────────────────────────────────────────

export async function getRefundsByUserId(
  userId: string,
  params?: { page?: number; limit?: number }
): Promise<RefundRecord[]> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  return (await sql`
    SELECT * FROM refund_requests
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as RefundRecord[];
}

export async function createRefund(refund: {
  booking_id: string;
  user_id: string;
  reason: string;
  bank_info?: any;
}): Promise<RefundRecord> {
  const results = await sql`
    INSERT INTO refund_requests (booking_id, user_id, reason, bank_info)
    VALUES (${refund.booking_id}, ${refund.user_id}, ${refund.reason}, ${JSON.stringify(refund.bank_info || {})})
    RETURNING *
  `;
  return (results as RefundRecord[])[0];
}

export async function getAllRefunds(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  refunds: Array<RefundRecord & { user_email: string; user_name: string; booking_total: number }>;
  total: number;
}> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const filterValues: any[] = [];

  if (params?.status) {
    filterValues.push(params.status);
    whereClause += ` AND r.status = $${filterValues.length}`;
  }

  const refundsQuery = `
    SELECT r.*, u.email as user_email, u.full_name as user_name, b.total_price as booking_total
    FROM refund_requests r
    JOIN user_profiles u ON r.user_id = u.id
    JOIN bookings b ON r.booking_id = b.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${filterValues.length + 1} OFFSET $${filterValues.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM refund_requests r ${whereClause}`;

  const refundsResult = await sql.query(refundsQuery, [...filterValues, limit, offset]);
  const countResult = await sql.query(countQuery, filterValues);
  const total = parseInt((countResult as any)[0].total, 10);

  return { refunds: refundsResult as any as any[], total };
}

export async function updateRefundStatus(
  refundId: string,
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processed' | 'archived',
  admin_note?: string
): Promise<RefundRecord> {
  const results = await sql`
    UPDATE refund_requests
    SET status = ${status}, admin_note = ${admin_note || null}, updated_at = NOW()
    WHERE id = ${refundId}
    RETURNING *
  `;
  return (results as RefundRecord[])[0];
}

/**
 * Bulk archive old refund requests that have been processed or approved.
 * @param days Number of days since the last update (or creation) to consider for archival.
 * @returns The number of records archived.
 */
export async function archiveOldRefunds(days: number = 90): Promise<number> {
  const result = await sql`
    UPDATE refund_requests
    SET status = 'archived', updated_at = NOW()
    WHERE (status = 'processed' OR status = 'approved')
      AND (
        (updated_at IS NOT NULL AND updated_at < NOW() - (CAST(${days} || ' days' AS INTERVAL)))
        OR
        (updated_at IS NULL AND created_at < NOW() - (CAST(${days} || ' days' AS INTERVAL)))
      )
    RETURNING id
  `;

  return Array.isArray(result) ? result.length : 0;
}
