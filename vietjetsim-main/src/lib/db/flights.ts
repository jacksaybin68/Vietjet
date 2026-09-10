import { sql } from '@/lib/neon';
import type { FlightRecord } from './types';

// ─── Flight Queries ─────────────────────────────────────────────────────────

export async function searchFlights(params: {
  from_code: string;
  to_code: string;
  depart_date?: string;
  class?: string;
}): Promise<FlightRecord[]> {
  if (params.depart_date) {
    const startDate = `${params.depart_date}T00:00:00`;
    const endDate = `${params.depart_date}T23:59:59`;
    return (await sql`
      SELECT * FROM flights
      WHERE from_code = ${params.from_code}
        AND to_code = ${params.to_code}
        AND depart_time >= ${startDate}
        AND depart_time <= ${endDate}
        AND available > 0
      ORDER BY depart_time ASC
    `) as FlightRecord[];
  }

  if (params.class) {
    return (await sql`
      SELECT * FROM flights
      WHERE from_code = ${params.from_code}
        AND to_code = ${params.to_code}
        AND class = ${params.class}
        AND available > 0
      ORDER BY depart_time ASC
    `) as FlightRecord[];
  }

  return (await sql`
    SELECT * FROM flights
    WHERE from_code = ${params.from_code}
      AND to_code = ${params.to_code}
      AND available > 0
    ORDER BY depart_time ASC
  `) as FlightRecord[];
}

export async function getFlightById(flightId: string): Promise<FlightRecord | null> {
  const results = await sql`
    SELECT * FROM flights WHERE id = ${flightId}
  `;
  return (results as FlightRecord[])[0] || null;
}

export async function getAllFlights(params?: {
  page?: number;
  limit?: number;
  from_code?: string;
  to_code?: string;
  class?: string;
}): Promise<{ flights: FlightRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const values: any[] = [];

  if (params?.from_code) {
    values.push(params.from_code);
    whereClause += ` AND from_code = $${values.length}`;
  }
  if (params?.to_code) {
    values.push(params.to_code);
    whereClause += ` AND to_code = $${values.length}`;
  }
  if (params?.class) {
    values.push(params.class);
    whereClause += ` AND class = $${values.length}`;
  }

  values.push(limit, offset);

  const flightsQuery = `
    SELECT * FROM flights
    ${whereClause}
    ORDER BY depart_time DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM flights ${whereClause}`;

  const flights = await sql.query(flightsQuery, values);
  const countResult = await sql.query(countQuery, values.slice(0, -2));
  const total = parseInt((countResult as any)[0].total, 10);

  return { flights: flights as any as FlightRecord[], total };
}

export async function createFlight(flight: {
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price: number;
  class: string;
  available: number;
}): Promise<FlightRecord> {
  const results = await sql`
    INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
    VALUES (${flight.flight_no}, ${flight.from_code}, ${flight.to_code}, ${flight.depart_time}, ${flight.arrive_time}, ${flight.price}, ${flight.class}, ${flight.available})
    RETURNING *
  `;
  return (results as FlightRecord[])[0];
}

export async function updateFlight(
  flightId: string,
  updates: Partial<{
    flight_no: string;
    from_code: string;
    to_code: string;
    depart_time: string;
    arrive_time: string;
    price: number;
    class: string;
    available: number;
  }>
): Promise<FlightRecord> {
  // Whitelist of allowed column names (prevent SQL key injection)
  const ALLOWED_COLUMNS = [
    'flight_no',
    'from_code',
    'to_code',
    'depart_time',
    'arrive_time',
    'price',
    'class',
    'available',
  ] as const;
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
  values.push(flightId);

  const query = `
    UPDATE flights
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const results = await sql.query(query, values);
  return (results as any)[0] as FlightRecord;
}

export async function deleteFlight(flightId: string): Promise<void> {
  await sql`DELETE FROM flights WHERE id = ${flightId}`;
}

export async function decrementFlightAvailable(
  flightId: string,
  count: number = 1
): Promise<FlightRecord | null> {
  const results = await sql`
    UPDATE flights
    SET available = GREATEST(0, available - ${count}), updated_at = NOW()
    WHERE id = ${flightId} AND available >= ${count}
    RETURNING *
  `;
  return (results as FlightRecord[])[0] || null;
}

export async function incrementFlightAvailable(
  flightId: string,
  count: number = 1
): Promise<FlightRecord | null> {
  const results = await sql`
    UPDATE flights
    SET available = available + ${count}, updated_at = NOW()
    WHERE id = ${flightId}
    RETURNING *
  `;
  return (results as FlightRecord[])[0] || null;
}

export async function getFlightIdByBookingId(bookingId: string): Promise<string | null> {
  const results = await sql`
    SELECT flight_id FROM bookings WHERE id = ${bookingId}
  `;
  return (results as any[])[0]?.flight_id || null;
}

// ─── Flight Update Log ──────────────────────────────────────────────────────

export interface FlightUpdateLogRecord {
  id: string;
  flight_id: string;
  flight_no: string;
  updated_by: string;
  changes_json: string; // JSON array of { field, oldValue, newValue }
  previous_snapshot: string; // full row snapshot before update
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export async function getFlightUpdateLogs(
  flightId?: string,
  limit = 50
): Promise<FlightUpdateLogRecord[]> {
  if (flightId) {
    const rows = await sql`
      SELECT id, flight_id, flight_no, updated_by, changes_json, previous_snapshot, ip_address, user_agent, created_at
      FROM flight_update_logs
      WHERE flight_id = ${flightId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows as FlightUpdateLogRecord[];
  }
  const rows = await sql`
    SELECT id, flight_id, flight_no, updated_by, changes_json, previous_snapshot, ip_address, user_agent, created_at
    FROM flight_update_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as FlightUpdateLogRecord[];
}

export async function insertFlightUpdateLog(log: {
  flightId: string;
  flightNo: string;
  updatedBy: string;
  changesJson: string;
  previousSnapshot: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await sql`
    INSERT INTO flight_update_logs (flight_id, flight_no, updated_by, changes_json, previous_snapshot, ip_address, user_agent)
    VALUES (
      ${log.flightId},
      ${log.flightNo},
      ${log.updatedBy},
      ${log.changesJson},
      ${log.previousSnapshot},
      ${log.ipAddress || null},
      ${log.userAgent || null}
    )
  `;
}
