import { sql } from '@/lib/neon';

export interface SystemConfigRecord {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  category: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── System Configuration ──────────────────────────────────────────────────

export async function getConfigValue(key: string): Promise<SystemConfigRecord | null> {
  const rows = await sql`SELECT * FROM system_config WHERE key = ${key}`;
  return (rows as SystemConfigRecord[])[0] || null;
}

export async function getAllConfig(category?: string): Promise<SystemConfigRecord[]> {
  if (category) {
    const rows = await sql`SELECT * FROM system_config WHERE category = ${category} ORDER BY key`;
    return rows as SystemConfigRecord[];
  }
  const rows = await sql`SELECT * FROM system_config ORDER BY category, key`;
  return rows as SystemConfigRecord[];
}

export async function setConfigValue(
  key: string,
  value: string,
  type: string,
  description: string | null,
  category: string,
  updatedBy: string
): Promise<SystemConfigRecord> {
  const existing = await getConfigValue(key);
  if (existing) {
    const res = await sql`
      UPDATE system_config SET value = ${value}, type = ${type}, description = ${description}, category = ${category}, updated_by = ${updatedBy}, updated_at = NOW()
      WHERE key = ${key}
      RETURNING *
    `;
    return (res as SystemConfigRecord[])[0];
  }
  const res = await sql`
    INSERT INTO system_config (key, value, type, description, category, updated_by)
    VALUES (${key}, ${value}, ${type}, ${description}, ${category}, ${updatedBy})
    RETURNING *
  `;
  return (res as SystemConfigRecord[])[0];
}
