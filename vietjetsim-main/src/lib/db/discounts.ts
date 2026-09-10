import { sql } from '@/lib/neon';
import type { DiscountCodeRecord } from './types';

// ─── Discount Code Queries ──────────────────────────────────────────────────

export async function getAllDiscountCodes(params?: {
  page?: number;
  limit?: number;
  search?: string;
  activeOnly?: boolean;
}): Promise<{ discounts: DiscountCodeRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const values: any[] = [];

  if (params?.search) {
    values.push(`%${params.search}%`);
    whereClause += ` AND code ILIKE $${values.length}`;
  }

  if (params?.activeOnly) {
    whereClause += ` AND is_active = true AND start_date <= NOW() AND end_date >= NOW()`;
  }

  const queryParams = [...values, limit, offset];
  const discountsQuery = `
    SELECT * FROM discount_codes
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM discount_codes ${whereClause}`;

  const discounts = await sql.query(discountsQuery, queryParams);
  const countResult = await sql.query(countQuery, values);
  const total = parseInt((countResult as any)[0].total, 10);

  return { discounts: discounts as any as DiscountCodeRecord[], total };
}

export async function getDiscountCodeByCode(code: string): Promise<DiscountCodeRecord | null> {
  const results = await sql`
    SELECT * FROM discount_codes WHERE code = ${code.toUpperCase()}
  `;
  return (results as DiscountCodeRecord[])[0] || null;
}

export async function getDiscountCodeById(id: string): Promise<DiscountCodeRecord | null> {
  const results = await sql`
    SELECT * FROM discount_codes WHERE id = ${id}
  `;
  return (results as DiscountCodeRecord[])[0] || null;
}

export async function createDiscountCode(
  data: Omit<DiscountCodeRecord, 'id' | 'used_count' | 'created_at' | 'updated_at'>
): Promise<DiscountCodeRecord> {
  const results = await sql`
    INSERT INTO discount_codes (
      code, type, value, min_booking_amount, max_discount_amount, 
      start_date, end_date, usage_limit, usage_per_user_limit, is_active
    )
    VALUES (
      ${data.code.toUpperCase()}, ${data.type}, ${data.value}, ${data.min_booking_amount}, ${data.max_discount_amount},
      ${data.start_date}, ${data.end_date}, ${data.usage_limit}, ${data.usage_per_user_limit}, ${data.is_active}
    )
    RETURNING *
  `;
  return (results as DiscountCodeRecord[])[0];
}

export async function updateDiscountCode(
  id: string,
  updates: Partial<DiscountCodeRecord>
): Promise<DiscountCodeRecord> {
  const ALLOWED_COLUMNS = [
    'code',
    'type',
    'value',
    'min_booking_amount',
    'max_discount_amount',
    'start_date',
    'end_date',
    'usage_limit',
    'usage_per_user_limit',
    'is_active',
  ] as const;

  const setClauses: string[] = [];
  const values: any[] = [];

  for (const col of ALLOWED_COLUMNS) {
    if (updates[col] !== undefined) {
      let val = updates[col];
      if (col === 'code' && typeof val === 'string') val = val.toUpperCase();
      setClauses.push(`${col} = $${setClauses.length + 1}`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) throw new Error('No fields to update');

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE discount_codes
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const results = await sql.query(query, values);
  return (results as any)[0] as DiscountCodeRecord;
}

export async function deleteDiscountCode(id: string): Promise<void> {
  await sql`DELETE FROM discount_codes WHERE id = ${id}`;
}

export async function incrementDiscountUsedCount(id: string): Promise<void> {
  await sql`
    UPDATE discount_codes
    SET used_count = used_count + 1, updated_at = NOW()
    WHERE id = ${id}
  `;
}
