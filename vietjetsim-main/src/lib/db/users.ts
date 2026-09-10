import { sql } from '@/lib/neon';
import type { UserRecord } from './types';

// ─── User Queries ───────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const results = await sql`
    SELECT * FROM user_profiles WHERE email = ${email}
  `;
  return (results as UserRecord[])[0] || null;
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const results = await sql`
    SELECT * FROM user_profiles WHERE id = ${userId}
  `;
  return (results as UserRecord[])[0] || null;
}

export async function createUser(
  email: string,
  password_hash: string,
  full_name: string,
  role: string = 'user',
  phone: string | null = null
): Promise<UserRecord> {
  const results = await sql`
    INSERT INTO user_profiles (email, password_hash, full_name, role, phone)
    VALUES (${email}, ${password_hash}, ${full_name}, ${role}, ${phone})
    RETURNING *
  `;
  return (results as UserRecord[])[0];
}

export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; phone?: string; avatar_url?: string }
): Promise<UserRecord> {
  // Whitelist of allowed column names (prevent SQL key injection)
  const ALLOWED_COLUMNS = ['full_name', 'phone', 'avatar_url'] as const;
  const setClauses: string[] = [];
  const values: any[] = [];

  for (const col of ALLOWED_COLUMNS) {
    if (updates[col] !== undefined) {
      setClauses.push(`${col} = $${setClauses.length + 1}`);
      values.push(updates[col]);
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const query = `
    UPDATE user_profiles
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const results = await sql.query(query, values);
  return (results as any)[0] as UserRecord;
}

export async function getAllUsers(
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserRecord[]; total: number }> {
  const offset = (page - 1) * limit;

  const users = await sql`
    SELECT * FROM user_profiles
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await sql`SELECT COUNT(*) as total FROM user_profiles`;
  const total = parseInt((countResult as any)[0].total, 10);

  return { users: users as UserRecord[], total };
}

export async function updateUserRole(
  userId: string,
  role:
    | 'user'
    | 'admin'
    | 'super_admin'
    | 'admin_ops'
    | 'admin_finance'
    | 'admin_support'
    | 'admin_content'
): Promise<UserRecord> {
  const results = await sql`
    UPDATE user_profiles
    SET role = ${role}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING *
  `;
  return (results as UserRecord[])[0];
}

export async function deleteUser(userId: string): Promise<void> {
  await sql`DELETE FROM user_profiles WHERE id = ${userId}`;
}
