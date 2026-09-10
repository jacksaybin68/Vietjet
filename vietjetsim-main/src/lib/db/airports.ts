import { sql } from '@/lib/neon';
import type { AirportRecord } from './types';

// ─── Airport Queries ────────────────────────────────────────────────────────

export async function getAllAirports(): Promise<AirportRecord[]> {
  return (await sql`
    SELECT * FROM airports ORDER BY city
  `) as AirportRecord[];
}

export async function getAirportByCode(code: string): Promise<AirportRecord | null> {
  const results = await sql`
    SELECT * FROM airports WHERE code = ${code}
  `;
  return (results as AirportRecord[])[0] || null;
}
