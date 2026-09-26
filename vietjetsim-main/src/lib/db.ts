// VietjetSim Database Layer
import { sql } from '@/lib/neon';
export { sql };
import type { Permission } from '@/lib/rbac';

// ─── Result Helpers ─────────────────────────────────────────────────────────

/**
 * `sql` is declared `any` in `@/lib/neon`, so every raw result arrives
 * untyped. These helpers keep the cast in one documented place instead of
 * scattering `as any` through the file, and name the row shape the caller
 * actually relies on.
 */
function asRows<T>(result: unknown): T[] {
  return result as T[];
}

function asFirstRow<T>(result: unknown): T | undefined {
  return asRows<T>(result)[0];
}

/**
 * Flat row from the booking-list query: booking columns plus the joined flight
 * and the JSON-aggregated passengers/payments (the API shape nests these, the
 * row does not).
 */
type BookingListRow = BookingRecord & {
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  passengers: PassengerRecord[];
  payments: PaymentRecord[];
};

/** A value that can be bound as a SQL parameter. */
type DbParam = string | number | boolean | null | Date;

/**
 * Read a `COUNT(*)`-style total.
 *
 * Postgres returns bigint counts as strings, hence the `String(...)`. Missing
 * rows yield 0 rather than throwing on `.total` of `undefined`.
 */
function totalOf(result: unknown): number {
  return parseInt(String(asFirstRow<{ total?: string | number }>(result)?.total ?? 0), 10);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role:
    | 'user'
    | 'admin'
    | 'super_admin'
    | 'admin_ops'
    | 'admin_finance'
    | 'admin_support'
    | 'admin_content';
  phone: string | null;
  avatar_url: string | null;
  locked_until?: string | null;
  /**
   * Columns added by `migrations/005_enhanced_user_profiles.sql` and
   * `000_core_schema.sql`. They are nullable and not every query selects them,
   * so they stay optional rather than forcing every call site to widen.
   */
  dob?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  preferred_language?: string | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  last_login?: string | null;
  failed_login_attempts?: number | null;
  bank_info?: string | Record<string, string | number> | null;
  created_at: string;
  updated_at: string;
}

export interface AirportRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  created_at: string;
}

export type FlightStatus = 'active' | 'delayed' | 'cancelled' | 'completed' | 'departed';

export interface FlightRecord {
  id: string;
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price: number;
  class: 'economy' | 'business';
  available: number;
  status: FlightStatus;
  gate: string | null;
  terminal: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: string;
  user_id: string;
  flight_id: string;
  /** Short reference the customer is given (PNR). Assigned by the database. */
  booking_code: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  discount_code_id?: string | null;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface PassengerRecord {
  id: string;
  booking_id: string;
  name: string;
  dob: string | null;
  id_number: string | null;
  gender: 'male' | 'female' | 'other';
  country_code: string;
  phone: string | null;
  email: string | null;
  residence: string | null;
  skyjoy_member_id: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  created_at: string;
}

/** Rich booking detail returned by getBookingById (includes nested flight, passengers, payment, seats) */
export interface BookingDetail {
  id: string;
  user_id: string;
  flight_id: string;
  /** Short reference the customer is given (PNR). Assigned by the database. */
  booking_code: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  discount_code_id?: string | null;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
  flight: Pick<
    FlightRecord,
    'flight_no' | 'from_code' | 'to_code' | 'depart_time' | 'arrive_time' | 'price' | 'class'
  >;
  passengers: PassengerRecord[];
  payment: PaymentRecord | null;
  seats: Record<string, unknown>[];
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  booking_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processed' | 'archived';
  bank_info: string | Record<string, string | number> | null;
  admin_note: string | null;
  /** PNR the customer typed on the form, kept for operator reference. */
  booking_code?: string | null;
  /** Contact number for the payout; required by the current form. */
  phone?: string | null;
  /** Hidden from the customer until an operator reveals it (migration 020). */
  visible_to_user?: boolean;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountCodeRecord {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_booking_amount: number;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  usage_per_user_limit: number | null;
  used_count: number;
  is_active: boolean;
  /** NULL for platform-wide codes; set when an admin issued the code to an agency. */
  agency_id: string | null;
  issued_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgencyRecord {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  commission_rate: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversationRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: 'active' | 'closed';
  last_message: string | null;
  unread_by_user: number;
  unread_by_admin: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatPresenceRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'admin';
  is_online: boolean;
  is_typing: boolean;
  last_seen: string;
  updated_at: string;
}

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
  const values: DbParam[] = [];

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
  return asFirstRow<UserRecord>(results)!;
}

/** Replace a user's password hash. Callers must hash with `hashPassword` first. */
export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await sql`
    UPDATE user_profiles
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = ${userId}
  `;
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
  const total = totalOf(countResult);

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

// ─── Flight Queries ─────────────────────────────────────────────────────────

export async function searchFlights(params: {
  from_code: string;
  to_code: string;
  depart_date?: string;
  class?: string;
}): Promise<FlightRecord[]> {
  if (params.depart_date) {
    // `depart_date` is a Hanoi calendar day (the day the date strip highlights),
    // so the window has to be built in +07:00 — a bare timestamp would be read as
    // UTC and silently drop the flights that depart late in the local evening.
    const startDate = `${params.depart_date}T00:00:00+07:00`;
    const endDate = `${params.depart_date}T23:59:59.999+07:00`;
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

/**
 * Resolve a flight's operational status by flight number (case-insensitive),
 * returning the columns the tracking page renders. Only the most recent
 * matching flight is surfaced; a flight number is unique per schedule window
 * in this simulator, so a future-dated duplicate would shadow an older one.
 */
export async function getFlightStatusByNo(flightNo: string): Promise<FlightRecord | null> {
  const normalized = flightNo.trim().toUpperCase();
  if (!normalized) return null;
  const results = await sql`
    SELECT * FROM flights
    WHERE UPPER(flight_no) = ${normalized}
    ORDER BY depart_time DESC
    LIMIT 1
  `;
  return (results as FlightRecord[])[0] || null;
}

export async function getAllFlights(params?: {
  page?: number;
  limit?: number;
  from_code?: string;
  to_code?: string;
  class?: string;
  search?: string;
}): Promise<{ flights: FlightRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const values: DbParam[] = [];

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
  if (params?.search) {
    values.push(`%${params.search}%`);
    whereClause += ` AND (flight_no ILIKE $${values.length} OR from_code ILIKE $${values.length} OR to_code ILIKE $${values.length})`;
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
  const total = totalOf(countResult);

  return { flights: asRows<FlightRecord>(flights), total };
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
    status?: FlightStatus;
    gate?: string | null;
    terminal?: string | null;
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
    'status',
    'gate',
    'terminal',
  ] as const;
  const setClauses: string[] = [];
  const values: DbParam[] = [];

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
  return asFirstRow<FlightRecord>(results)!;
}

export async function deleteFlight(flightId: string): Promise<void> {
  await sql`DELETE FROM flights WHERE id = ${flightId}`;
}

// ─── Booking Queries ────────────────────────────────────────────────────────

export async function getBookingsByUserId(
  userId: string,
  params?: { status?: string | string[]; page?: number; limit?: number }
): Promise<{
  bookings: Array<
    BookingRecord & {
      flight: Pick<
        FlightRecord,
        'flight_no' | 'from_code' | 'to_code' | 'depart_time' | 'arrive_time'
      >;
      passengers: PassengerRecord[];
      payment: PaymentRecord | null;
    }
  >;
  total: number;
}> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;
  const statuses = Array.isArray(params?.status)
    ? params.status.filter((item) => !!item)
    : params?.status
      ? [params.status]
      : [];

  const hasStatusFilter = statuses.length > 0;
  const statusPlaceholders = statuses.map((_, index) => `$${index + 2}`).join(', ');
  const whereClause = hasStatusFilter
    ? `b.user_id = $1 AND b.status IN (${statusPlaceholders})`
    : 'b.user_id = $1';
  const whereClauseForCount = hasStatusFilter
    ? `user_id = $1 AND status IN (${statusPlaceholders})`
    : 'user_id = $1';
  const countValues = [userId, ...statuses];
  const queryValues = [userId, ...statuses, limit, offset];

  const countResult = await sql.query(
    `SELECT COUNT(*) as total FROM bookings WHERE ${whereClauseForCount}`,
    countValues
  );
  const total = totalOf(countResult);

  const bookings = await sql.query(
    `
      SELECT b.*,
             f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time,
             json_agg(DISTINCT p) FILTER (WHERE p.id IS NOT NULL) as passengers,
             json_agg(DISTINCT pay) FILTER (WHERE pay.id IS NOT NULL) as payments
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      LEFT JOIN passengers p ON b.id = p.booking_id
      LEFT JOIN payments pay ON b.id = pay.booking_id
      WHERE ${whereClause}
      GROUP BY b.id, f.id
      ORDER BY b.created_at DESC
      LIMIT $${queryValues.length - 1} OFFSET $${queryValues.length}
    `,
    queryValues
  );

  return {
    total,
    bookings: asRows<BookingListRow>(bookings).map((b) => ({
      id: b.id,
      user_id: b.user_id,
      flight_id: b.flight_id,
      // Selected by `b.*` but previously dropped by this explicit mapping.
      booking_code: b.booking_code ?? null,
      status: b.status,
      total_price: parseFloat(String(b.total_price)),
      created_at: b.created_at,
      updated_at: b.updated_at,
      flight: {
        flight_no: b.flight_no,
        from_code: b.from_code,
        to_code: b.to_code,
        depart_time: b.depart_time,
        arrive_time: b.arrive_time,
      },
      passengers: Array.isArray(b.passengers) ? b.passengers : [],
      payment: Array.isArray(b.payments) && b.payments.length > 0 ? b.payments[0] : null,
    })),
  };
}

/**
 * Resolve a booking from either its UUID or its PNR.
 *
 * `getBookingById` filters on `b.id`, so handing it a PNR makes Postgres attempt
 * a uuid cast and throw — turning "not found" into a 500. Matching on the text
 * form of the id keeps both lookups in one safe, non-throwing query.
 */
export async function getBookingByCodeOrId(codeOrId: string): Promise<BookingDetail | null> {
  const results = await sql`
    SELECT b.*,
           f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time, f.price, f.class
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    WHERE b.booking_code = ${codeOrId} OR b.id::text = ${codeOrId}
    LIMIT 1
  `;

  if ((results as BookingDetail[]).length === 0) return null;
  return (results as Record<string, unknown>[])[0] as unknown as BookingDetail;
}

export async function getBookingById(bookingId: string): Promise<BookingDetail | null> {
  const results = await sql`
    SELECT b.*,
           f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time, f.price, f.class,
           json_agg(DISTINCT p) FILTER (WHERE p.id IS NOT NULL) as passengers,
           json_agg(DISTINCT pay) FILTER (WHERE pay.id IS NOT NULL) as payments,
           json_agg(DISTINCT s) FILTER (WHERE s.id IS NOT NULL) as seats
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    LEFT JOIN passengers p ON b.id = p.booking_id
    LEFT JOIN payments pay ON b.id = pay.booking_id
    LEFT JOIN seats s ON b.id = s.booking_id
    WHERE b.id = ${bookingId}
    GROUP BY b.id, f.id
  `;

  if ((results as BookingDetail[]).length === 0) return null;

  const b = (results as Record<string, unknown>[])[0];
  return {
    id: String(b.id),
    user_id: String(b.user_id),
    flight_id: String(b.flight_id),
    // `b.*` already selects it, but the explicit mapping below would otherwise
    // drop it — and the payment page needs the real PNR, not the booking UUID.
    booking_code: b.booking_code ? String(b.booking_code) : null,
    status: b.status as BookingDetail['status'],
    total_price: parseFloat(String(b.total_price)),
    created_at: String(b.created_at),
    updated_at: String(b.updated_at),
    flight: {
      flight_no: String(b.flight_no),
      from_code: String(b.from_code),
      to_code: String(b.to_code),
      depart_time: String(b.depart_time),
      arrive_time: String(b.arrive_time),
      price: parseFloat(String(b.price)),
      class: b.class as FlightRecord['class'],
    },
    passengers:
      Array.isArray(b.passengers) && b.passengers.length > 0
        ? (b.passengers as PassengerRecord[])
        : [],
    payment:
      Array.isArray(b.payments) && b.payments.length > 0 ? (b.payments[0] as PaymentRecord) : null,
    seats: Array.isArray(b.seats) && b.seats.length > 0 ? (b.seats as BookingDetail['seats']) : [],
  };
}

export async function createBooking(
  booking: {
    user_id: string;
    flight_id: string;
    total_price: number;
  },
  passengers: {
    name: string;
    dob?: string | null;
    id_number?: string | null;
    gender?: string | null;
    country_code?: string | null;
    phone?: string | null;
    email?: string | null;
    residence?: string | null;
    skyjoy_member_id?: string | null;
    passenger_type?: string | null;
  }[],
  seats?: string[],
  consents: {
    marketing: boolean;
    survey: boolean;
    retainForFutureBooking: boolean;
    policyAccepted: boolean;
  } = { marketing: false, survey: false, retainForFutureBooking: false, policyAccepted: true }
): Promise<BookingRecord> {
  // One statement for the booking, passengers and seats so the whole booking is
  // atomic. The child rows select the new booking's id from a data-modifying
  // CTE, which is what makes this work in a single round trip: Neon's batch API
  // runs each statement independently and cannot reference another's result, so
  // the previous `bookingInsert.id` interpolation always passed undefined and
  // violated `passengers.booking_id NOT NULL`.
  const passengerRows = passengers.map((p) => ({
    name: p.name,
    dob: p.dob || null,
    id_number: p.id_number || null,
    gender: p.gender || 'male',
    country_code: p.country_code || 'VN',
    phone: p.phone || null,
    email: p.email || null,
    residence: p.residence || null,
    skyjoy_member_id: p.skyjoy_member_id || null,
    // Bookings created before passenger types existed carry no type, and every
    // one of them was an adult.
    passenger_type: p.passenger_type || 'adult',
  }));

  const rows = (await sql`
    WITH new_booking AS (
      INSERT INTO bookings (user_id, flight_id, status, total_price)
      VALUES (${booking.user_id}, ${booking.flight_id}, 'pending', ${booking.total_price})
      RETURNING id, user_id, flight_id, status, total_price, created_at, updated_at
    ),
    inserted_passengers AS (
      INSERT INTO passengers (
        booking_id, name, dob, id_number, gender, country_code, phone, email, residence, skyjoy_member_id, passenger_type
      )
      SELECT
        nb.id, p.name, p.dob, p.id_number, p.gender, p.country_code,
        p.phone, p.email, p.residence, p.skyjoy_member_id, p.passenger_type
      FROM new_booking nb
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(passengerRows)}::jsonb)
        AS p(
          name text, dob date, id_number text, gender text, country_code text,
          phone text, email text, residence text, skyjoy_member_id text,
          passenger_type text
        )
      RETURNING 1
    ),
    inserted_consents AS (
      INSERT INTO booking_consents (
        booking_id, marketing, survey, retain_for_future_booking, policy_accepted
      )
      SELECT
        nb.id,
        ${consents.marketing},
        ${consents.survey},
        ${consents.retainForFutureBooking},
        ${consents.policyAccepted}
      FROM new_booking nb
      RETURNING 1
    ),
    inserted_seats AS (
      INSERT INTO seats (booking_id, flight_id, seat_number, status)
      SELECT nb.id, nb.flight_id, s.seat_number, 'reserved'
      FROM new_booking nb
      CROSS JOIN jsonb_to_recordset(${JSON.stringify((seats || []).map((n) => ({ seat_number: n })))}::jsonb)
        AS s(seat_number text)
      RETURNING 1
    )
    SELECT b.* FROM new_booking b
  `) as BookingRecord[];

  return rows[0];
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
): Promise<BookingRecord> {
  const results = await sql`
    UPDATE bookings
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${bookingId}
    RETURNING *
  `;
  return (results as BookingRecord[])[0];
}

export async function getAllBookings(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{
  bookings: Array<BookingRecord & { user_email: string; user_name: string; flight_no: string }>;
  total: number;
}> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const filterValues: DbParam[] = [];

  if (params?.status) {
    filterValues.push(params.status);
    whereClause += ` AND b.status = $${filterValues.length}`;
  }
  if (params?.search) {
    filterValues.push(`%${params.search}%`);
    whereClause += ` AND (b.id::text ILIKE $${filterValues.length} OR b.booking_code ILIKE $${filterValues.length} OR u.email ILIKE $${filterValues.length} OR u.full_name ILIKE $${filterValues.length} OR f.flight_no ILIKE $${filterValues.length})`;
  }

  const bookingsQuery = `
    SELECT b.*, u.email as user_email, u.full_name as user_name, f.flight_no
    FROM bookings b
    JOIN user_profiles u ON b.user_id = u.id
    JOIN flights f ON b.flight_id = f.id
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${filterValues.length + 1} OFFSET $${filterValues.length + 2}
  `;

  // The search clause references `u` and `f`, so the count must join too.
  const countQuery = `
    SELECT COUNT(*) as total
    FROM bookings b
    JOIN user_profiles u ON b.user_id = u.id
    JOIN flights f ON b.flight_id = f.id
    ${whereClause}
  `;

  const bookingsResult = await sql.query(bookingsQuery, [...filterValues, limit, offset]);
  const countResult = await sql.query(countQuery, filterValues);
  const total = totalOf(countResult);

  return {
    bookings: bookingsResult as (BookingRecord & {
      user_email: string;
      user_name: string;
      flight_no: string;
    })[],
    total,
  };
}

// ─── Payment Queries ────────────────────────────────────────────────────────

export async function createPayment(payment: {
  booking_id: string;
  method: string;
  amount: number;
}): Promise<PaymentRecord> {
  const results = await sql`
    INSERT INTO payments (booking_id, method, status, amount)
    VALUES (${payment.booking_id}, ${payment.method}, 'completed', ${payment.amount})
    RETURNING *
  `;
  return (results as PaymentRecord[])[0];
}

/**
 * Atomically create a payment record AND confirm the booking.
 * Wraps both INSERTs in a single transaction so they succeed or fail together.
 * Without this: payment could be created but booking stays 'pending' on failure → data inconsistency.
 */
export async function createPaymentAndConfirmBooking(payment: {
  booking_id: string;
  method: string;
  amount: number;
  user_id?: string;
  discount_code_id?: string;
  discount_amount?: number;
}): Promise<{ payment: PaymentRecord; booking: BookingRecord }> {
  if (payment.method === 'wallet') {
    if (!payment.user_id) {
      throw new Error('User id is required for wallet payment');
    }
    // Atomicity note: the wallet debit happens BEFORE the booking/payment transaction.
    // If the transaction below fails, the debit is rolled back here to prevent
    // charging the wallet for a payment that never succeeded.
    try {
      await spendWalletBalance(
        payment.user_id,
        payment.amount,
        payment.booking_id,
        `Thanh toán vé máy bay #${payment.booking_id}`
      );
    } catch (walletErr) {
      // Re-throw business errors (insufficient balance, invalid amount) as-is.
      if (
        walletErr instanceof Error &&
        (walletErr.message.includes('Số dư') || walletErr.message.includes('Số tiền'))
      ) {
        throw walletErr;
      }
      console.error('Wallet debit failed, aborting payment:', walletErr);
      throw new Error('Không thể trừ tiền ví. Vui lòng thử lại.');
    }
  }

  try {
    await sql.transaction([
      sql`
      INSERT INTO payments (booking_id, method, status, amount)
      VALUES (${payment.booking_id}, ${payment.method}, 'completed', ${payment.amount})
    `,
      sql`
      UPDATE bookings
      SET status = 'confirmed',
          discount_code_id = ${payment.discount_code_id || null},
          discount_amount = ${payment.discount_amount || 0},
          updated_at = NOW()
      WHERE id = ${payment.booking_id}
    `,
      ...(payment.discount_code_id
        ? [
            sql`UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ${payment.discount_code_id}`,
          ]
        : []),
    ]);
  } catch (txErr) {
    // Compensating transaction: if the payment/booking transaction fails AFTER the
    // wallet has been debited, credit the money back so the user is never charged
    // for a payment that did not succeed.
    if (payment.method === 'wallet' && payment.user_id) {
      try {
        await refundWallet(
          payment.user_id,
          payment.amount,
          payment.booking_id,
          `Hoàn tiền do giao dịch thất bại #${payment.booking_id}`
        );
      } catch (refundErr) {
        // Critical: money left the wallet but booking was not confirmed.
        console.error(
          `[PAYMENT][CRITICAL] Wallet debit occurred but transaction failed and auto-refund failed for booking ${payment.booking_id}. Manual reconciliation required.`,
          { txErr, refundErr }
        );
      }
    }
    throw txErr;
  }

  // Re-fetch both records (transaction guarantees consistency)
  const [pay] = (await sql`
    SELECT * FROM payments WHERE booking_id = ${payment.booking_id} ORDER BY created_at DESC LIMIT 1
  `) as PaymentRecord[];

  const [booking] = (await sql`
    SELECT * FROM bookings WHERE id = ${payment.booking_id}
  `) as BookingRecord[];

  return { payment: pay, booking };
}

export async function getPaymentsByBookingId(bookingId: string): Promise<PaymentRecord[]> {
  return (await sql`
    SELECT * FROM payments WHERE booking_id = ${bookingId} ORDER BY created_at DESC
  `) as PaymentRecord[];
}

/**
 * Get payment history for a user with pagination.
 */
export async function getPaymentHistory(
  userId: string,
  params?: { page?: number; limit?: number; status?: string[] }
): Promise<{ payments: PaymentRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  const payments = (await sql`
    SELECT p.* FROM payments p
    INNER JOIN bookings b ON p.booking_id = b.id
    WHERE b.user_id = ${userId}
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as PaymentRecord[];

  const countResult = await sql`
    SELECT COUNT(*) as total FROM payments p
    INNER JOIN bookings b ON p.booking_id = b.id
    WHERE b.user_id = ${userId}
  `;

  return {
    payments,
    total: parseInt(countResult[0]?.total || '0', 10),
  };
}

// ─── Notification Queries ───────────────────────────────────────────────────

export async function getNotificationsByUserId(
  userId: string,
  params?: { page?: number; limit?: number; is_read?: boolean }
): Promise<NotificationRecord[]> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  if (params?.is_read !== undefined) {
    return (await sql`
      SELECT * FROM notifications
      WHERE user_id = ${userId} AND is_read = ${params.is_read}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as NotificationRecord[];
  }

  return (await sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as NotificationRecord[];
}

export async function createNotification(notification: {
  user_id: string;
  type: string;
  title: string;
  message: string;
}): Promise<NotificationRecord> {
  const results = await sql`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (${notification.user_id}, ${notification.type}, ${notification.title}, ${notification.message})
    RETURNING *
  `;
  return (results as NotificationRecord[])[0];
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationRecord | null> {
  const results = await sql`
    UPDATE notifications
    SET is_read = true
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING *
  `;
  return (results as NotificationRecord[])[0] || null;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await sql`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = ${userId} AND is_read = false
  `;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ${userId} AND is_read = false
  `;
  return totalOf(result);
}

// ─── Refund Queries ─────────────────────────────────────────────────────────

export async function getRefundsByUserId(
  userId: string,
  params?: { page?: number; limit?: number }
): Promise<RefundRecord[]> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  // Only tickets an operator has revealed. A customer who has just submitted
  // must not be able to read the ticket back — including the bank details they
  // supplied — until it has actually been reviewed.
  return (await sql`
    SELECT * FROM refund_requests
    WHERE user_id = ${userId} AND visible_to_user = TRUE
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as RefundRecord[];
}

/** Payout details the customer supplies on the refund form. */
export interface RefundPayoutDetails {
  bank_name: string;
  account_number: string;
  account_holder: string;
  phone: string;
}

export async function createRefund(refund: {
  booking_id: string;
  user_id: string;
  reason: string;
  bank_info?: string | Record<string, string | number> | null;
  phone?: string | null;
  booking_code?: string | null;
}): Promise<RefundRecord> {
  const results = await sql`
    INSERT INTO refund_requests (
      booking_id, user_id, reason, bank_info, phone, booking_code, visible_to_user
    )
    VALUES (
      ${refund.booking_id},
      ${refund.user_id},
      ${refund.reason},
      ${JSON.stringify(refund.bank_info || {})},
      ${refund.phone ?? null},
      ${refund.booking_code ?? null},
      FALSE
    )
    RETURNING *
  `;
  return (results as RefundRecord[])[0];
}

/**
 * Operator-side update: editable payout details, the customer-facing note, and
 * the reveal flag. Kept separate from `updateRefundStatus` so a plain status
 * change never accidentally publishes a ticket to the customer.
 */
export async function updateRefundDetails(
  refundId: string,
  fields: {
    bank_info?: Record<string, string | number>;
    phone?: string | null;
    admin_note?: string | null;
    reason?: string | null;
  },
  reviewedBy: string
): Promise<RefundRecord | null> {
  const values: DbParam[] = [reviewedBy];
  const sets: string[] = ['reviewed_at = NOW()', 'reviewed_by = $1'];
  if (fields.bank_info) {
    values.push(JSON.stringify(fields.bank_info));
    // `bank_info` is a TEXT column, so the jsonb merge has to be cast in and back
    // out. Merging rather than replacing means an operator correcting just the
    // bank name keeps the account holder and number already on file.
    sets.push(
      `bank_info = (COALESCE(NULLIF(bank_info, '')::jsonb, '{}'::jsonb) || $${values.length}::jsonb)::text`
    );
  }
  if (fields.phone !== undefined) {
    values.push(fields.phone);
    sets.push(`phone = $${values.length}`);
  }
  if (fields.admin_note !== undefined) {
    values.push(fields.admin_note);
    sets.push(`admin_note = $${values.length}`);
  }
  if (fields.reason !== undefined) {
    values.push(fields.reason);
    sets.push(`reason = $${values.length}`);
  }
  values.push(refundId);

  const rows = await sql.query(
    `UPDATE refund_requests SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
  return asRows<RefundRecord>(rows)[0] ?? null;
}

/** Show or hide a single ticket on the customer's screen. */
export async function setRefundVisibility(
  refundId: string,
  visible: boolean,
  reviewedBy: string
): Promise<RefundRecord | null> {
  const rows = await sql`
    UPDATE refund_requests
    SET visible_to_user = ${visible},
        reviewed_at = NOW(),
        reviewed_by = ${reviewedBy},
        updated_at = NOW()
    WHERE id = ${refundId}
    RETURNING *
  `;
  return (rows as RefundRecord[])[0] ?? null;
}

const REFUND_FEATURE_KEY = 'refund_feature_enabled';

/**
 * Whether customers may open new refund tickets. Defaults to enabled when the
 * config row is missing, so a database that predates migration 020 is not
 * accidentally read as "refunds disabled".
 */
export async function isRefundFeatureEnabled(): Promise<boolean> {
  const config = await getConfigValue(REFUND_FEATURE_KEY);
  if (!config) return true;
  return String(config.value).toLowerCase() !== 'false';
}

export async function setRefundFeatureEnabled(enabled: boolean, updatedBy: string): Promise<void> {
  await setConfigValue(
    REFUND_FEATURE_KEY,
    enabled ? 'true' : 'false',
    'boolean',
    'Cho phép khách hàng gửi yêu cầu hoàn tiền',
    'refund',
    updatedBy
  );
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
  const filterValues: DbParam[] = [];

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
  const total = totalOf(countResult);

  return {
    refunds: refundsResult as (RefundRecord & {
      user_email: string;
      user_name: string;
      booking_total: number;
    })[],
    total,
  };
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

// ─── Chat Queries ───────────────────────────────────────────────────────────

export async function getOrCreateConversation(
  userId: string,
  userEmail: string,
  userName: string
): Promise<ChatConversationRecord> {
  const existing = await sql`
    SELECT * FROM chat_conversations
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (asRows<ChatConversationRecord>(existing).length > 0) {
    return (existing as ChatConversationRecord[])[0];
  }

  const results = await sql`
    INSERT INTO chat_conversations (user_id, user_email, user_name)
    VALUES (${userId}, ${userEmail}, ${userName})
    RETURNING *
  `;
  return (results as ChatConversationRecord[])[0];
}

export async function getAllConversations(params?: {
  page?: number;
  limit?: number;
}): Promise<{ conversations: ChatConversationRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  const conversations = await sql`
    SELECT * FROM chat_conversations
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await sql`SELECT COUNT(*) as total FROM chat_conversations`;
  const total = totalOf(countResult);

  return { conversations: conversations as ChatConversationRecord[], total };
}

/** Whether `userId` is the owner of an active conversation. */
export async function userOwnsConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const results = await sql`
    SELECT 1 FROM chat_conversations
    WHERE id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `;
  return (results as unknown[]).length > 0;
}

/** Close or reopen a support thread. `closed` threads are the archive. */
export async function setConversationStatus(
  conversationId: string,
  status: 'active' | 'closed'
): Promise<ChatConversationRecord | null> {
  const results = await sql`
    UPDATE chat_conversations
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${conversationId}
    RETURNING *
  `;
  return (results as ChatConversationRecord[])[0] || null;
}

export async function getConversationMessages(
  conversationId: string,
  params?: { page?: number; limit?: number }
): Promise<ChatMessageRecord[]> {
  const page = params?.page || 1;
  const limit = params?.limit || 100;
  const offset = (page - 1) * limit;

  return (await sql`
    SELECT * FROM chat_messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `) as ChatMessageRecord[];
}

export async function sendChatMessage(message: {
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  content: string;
}): Promise<ChatMessageRecord> {
  const results = await sql`
    INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content)
    VALUES (${message.conversation_id}, ${message.sender_id}, ${message.sender_role}, ${message.content})
    RETURNING *
  `;

  const validRoles: ReadonlyArray<string> = ['user', 'admin'];
  const safeRole = validRoles.includes(message.sender_role) ? message.sender_role : 'user';
  const unreadField = safeRole === 'user' ? 'unread_by_admin' : 'unread_by_user';

  const updateQuery = `
    UPDATE chat_conversations
    SET last_message = $1,
        updated_at = NOW(),
        ${unreadField} = ${unreadField} + 1
    WHERE id = $2
  `;
  await sql.query(updateQuery, [message.content, message.conversation_id]);

  return (results as ChatMessageRecord[])[0];
}

/**
 * Mark every message authored by the opposite side of `readerRole` as read,
 * and reset the matching unread counter on the conversation. Returns how many
 * messages flipped so callers can update badges without a refetch.
 */
export async function markConversationRead(
  conversationId: string,
  readerRole: 'user' | 'admin'
): Promise<number> {
  const senderRole = readerRole === 'user' ? 'admin' : 'user';

  const result = await sql`
    UPDATE chat_messages
    SET read_at = NOW()
    WHERE conversation_id = ${conversationId}
      AND sender_role = ${senderRole}
      AND read_at IS NULL
    RETURNING id
  `;

  const unreadField = readerRole === 'user' ? 'unread_by_user' : 'unread_by_admin';
  await sql.query(
    `UPDATE chat_conversations
     SET ${unreadField} = 0, updated_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );

  return (result as unknown[]).length;
}

export async function getChatPresence(
  conversationId: string,
  role: 'user' | 'admin'
): Promise<ChatPresenceRecord | null> {
  const results = await sql`
    SELECT * FROM chat_presence
    WHERE conversation_id = ${conversationId} AND role = ${role}
  `;
  return (results as ChatPresenceRecord[])[0] || null;
}

export async function updateChatPresence(
  userId: string,
  conversationId: string,
  role: 'user' | 'admin',
  updates: { is_online?: boolean; is_typing?: boolean }
): Promise<ChatPresenceRecord> {
  const existing = await getChatPresence(conversationId, role);

  if (existing) {
    const results = await sql`
      UPDATE chat_presence
      SET is_online = COALESCE(${updates.is_online}, is_online),
          is_typing = COALESCE(${updates.is_typing}, is_typing),
          last_seen = NOW(),
          updated_at = NOW()
      WHERE conversation_id = ${conversationId} AND role = ${role}
      RETURNING *
    `;
    return (results as ChatPresenceRecord[])[0];
  }

  const results = await sql`
    INSERT INTO chat_presence (user_id, conversation_id, role, is_online, is_typing)
    VALUES (${userId}, ${conversationId}, ${role}, ${updates.is_online || false}, ${updates.is_typing || false})
    RETURNING *
  `;
  return (results as ChatPresenceRecord[])[0];
}

// ─── Admin Analytics Queries ────────────────────────────────────────────────

export async function getRevenueStats(): Promise<{
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  completedBookings: number;
  pendingBookings: number;
}> {
  const result = await sql`
    SELECT
      COALESCE(SUM(total_price), 0) as total_revenue,
      COUNT(*) as total_bookings,
      COALESCE(AVG(total_price), 0) as avg_booking_value,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings
    FROM bookings
  `;

  const r = asFirstRow<{
    total_revenue: string;
    total_bookings: string;
    completed_bookings: string;
    pending_bookings: string;
    avg_booking_value: string;
  }>(result)!;
  return {
    totalRevenue: parseFloat(r.total_revenue),
    totalBookings: parseInt(r.total_bookings, 10),
    avgBookingValue: parseFloat(r.avg_booking_value),
    completedBookings: parseInt(r.completed_bookings, 10),
    pendingBookings: parseInt(r.pending_bookings, 10),
  };
}

export async function getBookingStatusDistribution(): Promise<
  Array<{ status: string; count: number }>
> {
  return await sql`
    SELECT status, COUNT(*) as count
    FROM bookings
    GROUP BY status
  `;
}

export async function getRecentActivity(limit: number = 20): Promise<
  Array<{
    type: 'booking' | 'refund';
    id: string;
    created_at: string;
    status: string;
    total_price?: number;
    reason?: string;
  }>
> {
  const bookings = await sql`
    SELECT 'booking' as type, id, created_at, status, total_price, NULL as reason
    FROM bookings
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  const refunds = await sql`
    SELECT 'refund' as type, id, created_at, status, NULL as total_price, reason
    FROM refund_requests
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  const combined = [
    ...asRows<{
      type: 'booking';
      id: string;
      created_at: string;
      status: string;
      total_price: number;
    }>(bookings),
    ...asRows<{
      type: 'refund';
      id: string;
      created_at: string;
      status: string;
      reason: string;
    }>(refunds),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return combined;
}

// ─── SSTK (Self-Service Toolkit) ─────────────────────────────────────────────

export interface SstkToolLogRecord {
  id: string;
  tool_key: string;
  tool_label: string;
  executed_by: string;
  params_json: string;
  result_summary: string;
  status: 'success' | 'error' | 'partial';
  created_at: string;
}

export async function getSstkLogs(limit = 50): Promise<SstkToolLogRecord[]> {
  const rows = await sql`
    SELECT id, tool_key, tool_label, executed_by, params_json, result_summary, status, created_at
    FROM sstk_tool_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as SstkToolLogRecord[];
}

export async function insertSstkLog(
  toolKey: string,
  toolLabel: string,
  executedBy: string,
  paramsJson: string,
  resultSummary: string,
  status: 'success' | 'error' | 'partial' = 'success'
): Promise<void> {
  await sql`
    INSERT INTO sstk_tool_logs (tool_key, tool_label, executed_by, params_json, result_summary, status)
    VALUES (${toolKey}, ${toolLabel}, ${executedBy}, ${paramsJson}, ${resultSummary}, ${status})
  `;
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
      log.updatedBy,
      ${log.changesJson},
      ${log.previousSnapshot},
      ${log.ipAddress || null},
      ${log.userAgent || null}
    )
  `;
}

// ─── RBAC / Role-Based Access Control ──────────────────────────────────────

export interface AdminRoleRecord {
  id: string;
  user_id: string;
  role_name: string; // 'super_admin' | 'admin_ops' | 'admin_finance' | etc.
  custom_permissions: string | null; // JSON array or NULL = use system defaults
  granted_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string; // e.g. 'user:delete', 'flight:create', 'rbac:role_change'
  target_type: string; // 'user', 'flight', 'booking', 'config', 'role'
  target_id?: string;
  details_json: string; // JSON object with action details
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'error' | 'denied';
  created_at: string;
}

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

// ─── Admin Roles CRUD ───────────────────────────────────────────────────────

export async function getAdminRole(userId: string): Promise<AdminRoleRecord | null> {
  const rows = await sql`
    SELECT * FROM admin_roles WHERE user_id = ${userId}
  `;
  return (rows as AdminRoleRecord[])[0] || null;
}

export async function getAllAdminRoles(): Promise<AdminRoleRecord[]> {
  const rows = await sql`
    SELECT ar.*, u.email, u.full_name
    FROM admin_roles ar
    JOIN user_profiles u ON ar.user_id = u.id
    ORDER BY ar.created_at DESC
  `;
  return rows as AdminRoleRecord[];
}

export async function assignAdminRole(
  userId: string,
  roleName: string,
  grantedBy: string,
  customPermissions?: Permission[] | null
): Promise<AdminRoleRecord> {
  const permsJson = customPermissions ? JSON.stringify(customPermissions) : null;

  const existing = await getAdminRole(userId);
  if (existing) {
    const result = await sql`
      UPDATE admin_roles
      SET role_name = ${roleName}, custom_permissions = ${permsJson}, updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;
    return (result as AdminRoleRecord[])[0];
  }

  const result = await sql`
    INSERT INTO admin_roles (user_id, role_name, custom_permissions, granted_by)
    VALUES (${userId}, ${roleName}, ${permsJson}, ${grantedBy})
    RETURNING *
  `;
  return (result as AdminRoleRecord[])[0];
}

export async function removeAdminRole(userId: string): Promise<void> {
  await sql`DELETE FROM admin_roles WHERE user_id = ${userId}`;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

export async function writeAuditLog(log: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  detailsJson: string;
  status: 'success' | 'error' | 'denied';
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await sql`
    INSERT INTO audit_logs (admin_id, admin_email, action, target_type, target_id, details_json, ip_address, user_agent, status)
    VALUES (
      ${log.adminId}, ${log.adminEmail}, ${log.action}, ${log.targetType},
      ${log.targetId || null}, ${log.detailsJson},
      ${log.ipAddress || null}, ${log.userAgent || null}, ${log.status}
    )
  `;
}

export async function getAuditLogs(params?: {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const values: DbParam[] = [];

  if (params?.adminId) {
    where += ` AND admin_id = $${values.length + 1}`;
    values.push(params.adminId);
  }
  if (params?.action) {
    where += ` AND action ILIKE $${values.length + 1}`;
    values.push(`%${params.action}%`);
  }
  if (params?.startDate) {
    where += ` AND created_at >= $${values.length + 1}`;
    values.push(params.startDate);
  }
  if (params?.endDate) {
    where += ` AND created_at <= $${values.length + 1}`;
    values.push(params.endDate);
  }

  values.push(limit, offset);

  const countRes = await sql.query(
    `SELECT COUNT(*) as total FROM audit_logs ${where}`,
    values.slice(0, -2)
  );
  const total = totalOf(countRes);

  const dataRes = await sql.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return { logs: asRows<AuditLogRecord>(dataRes), total };
}

// ─── Refresh Token Store (for rotation / revocation) ───────────────────────

export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  familyId: string
): Promise<void> {
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, family_id)
    VALUES (${userId}, ${tokenHash}, ${familyId})
  `;
}

export async function getStoredRefreshToken(
  tokenHash: string
): Promise<{ id: string; user_id: string; family_id: string; revoked: boolean } | null> {
  const rows = await sql`
    SELECT id, user_id, family_id, revoked
    FROM refresh_tokens
    WHERE token_hash = ${tokenHash}
  `;
  return (
    asFirstRow<{ id: string; user_id: string; family_id: string; revoked: boolean }>(rows) || null
  );
}

/**
 * Rotate a refresh token:
 *  1. Mark the old token as used (but keep its family_id alive)
 *  2. Insert the new token hash under the same family
 * Returns true if rotation succeeded, false if the old token was already revoked (reuse detected).
 */
export async function rotateRefreshToken(
  oldTokenHash: string,
  newTokenHash: string,
  userId: string,
  familyId: string
): Promise<{ success: boolean; reuseDetected: boolean }> {
  // Check current state of the old token
  const existing = await getStoredRefreshToken(oldTokenHash);

  if (!existing) {
    // Token not found — reject entirely (possible forgery)
    return { success: false, reuseDetected: false };
  }

  if (existing.revoked) {
    // This token was already used → possible theft! Revoke entire family.
    await revokeRefreshTokenFamily(userId, familyId);
    return { success: false, reuseDetected: true };
  }

  // Mark old token as used
  await sql`
    UPDATE refresh_tokens SET revoked = true, used_at = NOW()
    WHERE token_hash = ${oldTokenHash}
  `;

  // Insert new token in same family
  await storeRefreshToken(userId, newTokenHash, familyId);
  return { success: true, reuseDetected: false };
}

/** Revoke every token in a family (called when reuse is detected). */
export async function revokeRefreshTokenFamily(userId: string, familyId: string): Promise<void> {
  await sql`
    UPDATE refresh_tokens SET revoked = true
    WHERE user_id = ${userId} AND family_id = ${familyId} AND revoked = false
  `;
}

/** Revoke ALL refresh tokens for a user (used on logout / password change). */
export async function invalidateUserRefreshTokens(userId: string): Promise<void> {
  await sql`
    UPDATE refresh_tokens SET revoked = true
    WHERE user_id = ${userId} AND revoked = false
  `;
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

// ─── Discount Code Queries ──────────────────────────────────────────────────

export async function getAllDiscountCodes(params?: {
  page?: number;
  limit?: number;
  search?: string;
  activeOnly?: boolean;
  agencyId?: string;
}): Promise<{ discounts: DiscountCodeRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const values: DbParam[] = [];

  if (params?.search) {
    values.push(`%${params.search}%`);
    whereClause += ` AND d.code ILIKE $${values.length}`;
  }

  if (params?.activeOnly) {
    whereClause += ` AND d.is_active = true AND d.start_date <= NOW() AND d.end_date >= NOW()`;
  }

  if (params?.agencyId) {
    values.push(params.agencyId);
    whereClause += ` AND d.agency_id = $${values.length}`;
  }

  const queryParams = [...values, limit, offset];
  const discountsQuery = `
    SELECT d.*, a.name AS agency_name, a.code AS agency_code
    FROM discount_codes d
    LEFT JOIN agencies a ON a.id = d.agency_id
    ${whereClause}
    ORDER BY d.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM discount_codes d ${whereClause}`;

  const discounts = await sql.query(discountsQuery, queryParams);
  const countResult = await sql.query(countQuery, values);
  const total = totalOf(countResult);

  return { discounts: asRows<DiscountCodeRecord>(discounts), total };
}

export async function getDiscountCodeByCode(code: string): Promise<DiscountCodeRecord | null> {
  const results = await sql`
    SELECT * FROM discount_codes WHERE code = ${code.toUpperCase()}
  `;
  return (results as DiscountCodeRecord[])[0] || null;
}

/** How many bookings a user has already placed with a given discount code. */
export async function countUserDiscountUsage(
  userId: string,
  discountCodeId: string
): Promise<number> {
  const results = await sql`
    SELECT COUNT(*)::int AS count
    FROM bookings
    WHERE user_id = ${userId} AND discount_code_id = ${discountCodeId}
  `;
  return totalOf(results);
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
      start_date, end_date, usage_limit, usage_per_user_limit, is_active,
      agency_id, issued_by
    )
    VALUES (
      ${data.code.toUpperCase()}, ${data.type}, ${data.value}, ${data.min_booking_amount}, ${data.max_discount_amount},
      ${data.start_date}, ${data.end_date}, ${data.usage_limit}, ${data.usage_per_user_limit}, ${data.is_active},
      ${data.agency_id ?? null}, ${data.issued_by ?? null}
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
    'agency_id',
  ] as const;

  const setClauses: string[] = [];
  const values: DbParam[] = [];

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
  return asFirstRow<DiscountCodeRecord>(results)!;
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

// ─── Agency Queries ─────────────────────────────────────────────────────────

export async function getAllAgencies(params?: {
  page?: number;
  limit?: number;
  search?: string;
  activeOnly?: boolean;
}): Promise<{ agencies: AgencyRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const values: DbParam[] = [];

  if (params?.search) {
    values.push(`%${params.search}%`);
    whereClause += ` AND (code ILIKE $${values.length} OR name ILIKE $${values.length} OR contact_email ILIKE $${values.length})`;
  }

  if (params?.activeOnly) {
    whereClause += ` AND is_active = true`;
  }

  // Code count is joined so the admin list shows issued-code usage without an N+1 query.
  const queryParams = [...values, limit, offset];
  const agenciesQuery = `
    SELECT a.*, COUNT(d.id)::int AS discount_count
    FROM agencies a
    LEFT JOIN discount_codes d ON d.agency_id = a.id
    ${whereClause}
    GROUP BY a.id
    ORDER BY a.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM agencies ${whereClause}`;

  const agencies = await sql.query(agenciesQuery, queryParams);
  const countResult = await sql.query(countQuery, values);
  const total = totalOf(countResult);

  return { agencies: asRows<AgencyRecord>(agencies), total };
}

export async function getAgencyById(id: string): Promise<AgencyRecord | null> {
  const results = await sql`SELECT * FROM agencies WHERE id = ${id}`;
  return (results as AgencyRecord[])[0] || null;
}

export async function createAgency(
  data: Omit<AgencyRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<AgencyRecord> {
  const results = await sql`
    INSERT INTO agencies (
      code, name, contact_name, contact_email, contact_phone,
      address, commission_rate, notes, is_active
    )
    VALUES (
      ${data.code.toUpperCase()}, ${data.name}, ${data.contact_name ?? null}, ${data.contact_email ?? null},
      ${data.contact_phone ?? null}, ${data.address ?? null}, ${data.commission_rate ?? 0},
      ${data.notes ?? null}, ${data.is_active}
    )
    RETURNING *
  `;
  return (results as AgencyRecord[])[0];
}

export async function updateAgency(
  id: string,
  updates: Partial<AgencyRecord>
): Promise<AgencyRecord> {
  const ALLOWED_COLUMNS = [
    'code',
    'name',
    'contact_name',
    'contact_email',
    'contact_phone',
    'address',
    'commission_rate',
    'notes',
    'is_active',
  ] as const;

  const setClauses: string[] = [];
  const values: DbParam[] = [];

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
    UPDATE agencies
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;
  const results = await sql.query(query, values);
  return asRows<AgencyRecord>(results)[0];
}

export async function deleteAgency(id: string): Promise<void> {
  // discount_codes.agency_id is ON DELETE SET NULL, so issued codes survive as
  // platform-wide rather than disappearing with the agency.
  await sql`DELETE FROM agencies WHERE id = ${id}`;
}

// ─── Wallet Queries ──────────────────────────────────────────────────────────

export interface WalletRecord {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  account_number: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionRecord {
  id: string;
  wallet_id: string;
  type: 'topup' | 'withdraw' | 'payment' | 'refund' | 'bonus';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  payment_method_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface SavedPaymentMethodRecord {
  id: string;
  user_id: string;
  type: 'card' | 'bank';
  card_brand: string | null;
  last_four: string | null;
  card_holder_name: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  bank_id: string | null;
  bank_name: string | null;
  bank_code: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export async function getOrCreateWallet(userId: string): Promise<WalletRecord> {
  const existing = await sql`
    SELECT * FROM user_wallets WHERE user_id = ${userId}
  `;

  if ((existing as WalletRecord[]).length > 0) {
    return (existing as WalletRecord[])[0];
  }

  const accNum =
    'VJSIM' +
    Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, '0');
  const result = await sql`
    INSERT INTO user_wallets (user_id, balance, currency, account_number)
    VALUES (${userId}, 0, 'VND', ${accNum})
    RETURNING *
  `;
  return (result as WalletRecord[])[0];
}

export async function getWalletTransactions(
  userId: string,
  params?: { page?: number; limit?: number; type?: string }
): Promise<{ transactions: WalletTransactionRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  const wallet = await getOrCreateWallet(userId);

  let transactions: WalletTransactionRecord[];
  if (params?.type) {
    transactions = (await sql`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ${wallet.id} AND type = ${params.type}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as WalletTransactionRecord[];
  } else {
    transactions = (await sql`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ${wallet.id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as WalletTransactionRecord[];
  }

  const countResult = await sql`
    SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = ${wallet.id}
  `;

  return {
    transactions,
    total: totalOf(countResult),
  };
}

export async function topupWallet(
  userId: string,
  amount: number,
  paymentMethodId?: string | null,
  description?: string
): Promise<WalletTransactionRecord> {
  // Defense-in-depth: API layer validates too, but never trust callers.
  // A negative amount here would DRAIN the wallet (acts as an unguarded withdraw).
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Số tiền nạp không hợp lệ');
  }
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  const balanceAfter = balanceBefore + amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, payment_method_id, status
    )
    VALUES (
      ${wallet.id}, 'topup', ${amount}, ${balanceBefore}, ${balanceAfter},
      ${description || 'Nạp tiền vào ví'}, ${paymentMethodId || null}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function withdrawWallet(
  userId: string,
  amount: number,
  paymentMethodId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  // Validate BEFORE computing the new balance to avoid NaN arithmetic.
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền rút không hợp lệ');
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  if (balanceBefore < amount) throw new Error('Số dư ví không đủ');
  const balanceAfter = balanceBefore - amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, payment_method_id, status
    )
    VALUES (
      ${wallet.id}, 'withdraw', ${-amount}, ${balanceBefore}, ${balanceAfter},
      ${description || 'Rút tiền từ ví'}, ${paymentMethodId}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function spendWalletBalance(
  userId: string,
  amount: number,
  referenceId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  // Defense-in-depth: validate BEFORE reading/computing balances.
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền thanh toán không hợp lệ');
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  if (balanceBefore < amount) throw new Error('Số dư ví không đủ để thanh toán');
  const balanceAfter = balanceBefore - amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, reference_id, status
    )
    VALUES (
      ${wallet.id}, 'payment', ${-amount}, ${balanceBefore}, ${balanceAfter},
      ${description || 'Thanh toán bằng ví'}, ${referenceId}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function refundWallet(
  userId: string,
  amount: number,
  referenceId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  // Defense-in-depth: validate BEFORE reading/computing balances.
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Số tiền hoàn không hợp lệ');
  }
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = parseFloat(String(wallet.balance));
  const balanceAfter = balanceBefore + amount;

  const result = await sql`
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, balance_before, balance_after,
      description, reference_id, status
    )
    VALUES (
      ${wallet.id}, 'refund', ${amount}, ${balanceBefore}, ${balanceAfter},
      ${description || `Hoàn tiền vào ví #${referenceId}`}, ${referenceId}, 'completed'
    )
    RETURNING *
  `;

  await sql`
    UPDATE user_wallets SET balance = ${balanceAfter}, updated_at = NOW()
    WHERE id = ${wallet.id}
  `;

  return (result as WalletTransactionRecord[])[0];
}

export async function getSavedPaymentMethods(userId: string): Promise<SavedPaymentMethodRecord[]> {
  return (await sql`
    SELECT * FROM saved_payment_methods
    WHERE user_id = ${userId} AND is_active = true
    ORDER BY is_default DESC, created_at DESC
  `) as SavedPaymentMethodRecord[];
}

export async function addSavedPaymentMethod(method: {
  user_id: string;
  type: 'card' | 'bank';
  card_brand?: string;
  last_four?: string;
  card_holder_name?: string;
  expiry_month?: number;
  expiry_year?: number;
  bank_id?: string;
  bank_name?: string;
  bank_code?: string;
}): Promise<SavedPaymentMethodRecord> {
  const result = await sql`
    INSERT INTO saved_payment_methods (
      user_id, type, card_brand, last_four, card_holder_name,
      expiry_month, expiry_year, bank_id, bank_name, bank_code
    )
    VALUES (
      ${method.user_id}, ${method.type}, ${method.card_brand || null},
      ${method.last_four || null}, ${method.card_holder_name || null},
      ${method.expiry_month || null}, ${method.expiry_year || null},
      ${method.bank_id || null}, ${method.bank_name || null}, ${method.bank_code || null}
    )
    RETURNING *
  `;
  return (result as SavedPaymentMethodRecord[])[0];
}

export async function deleteSavedPaymentMethod(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE saved_payment_methods
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function setDefaultPaymentMethod(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE saved_payment_methods SET is_default = false WHERE user_id = ${userId}
  `;
  await sql`
    UPDATE saved_payment_methods SET is_default = true, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

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
    total: totalOf(countResult),
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

// ─── Check-in Queries ──────────────────────────────────────────────────────────

/** Row shape returned by `getCheckInStatusByBookingId`. */
interface CheckInStatusRow {
  has_check_in: boolean;
  check_in_id: string | null;
  passenger_name: string | null;
  seat_number: string | null;
  check_in_number: string | null;
  boarding_pass_number: string | null;
  status: string | null;
  check_in_time: string | null;
}

export interface CheckInSearchResult {
  booking: {
    id: string;
    status: string;
    flight_id: string;
    total_price: number;
    created_at: string;
    flight_no?: string;
    from_code?: string;
    to_code?: string;
    depart_time?: string;
    arrive_time?: string;
  };
  passengers: Array<{
    id: string;
    booking_id: string;
    name: string;
    dob: string | null;
    id_number: string | null;
    gender: 'male' | 'female' | 'other';
    created_at: string;
  }>;
  checkIn: {
    id: string;
    booking_id: string;
    check_in_number: string;
    seat_number: string;
    gate: string | null;
    terminal: string | null;
    check_in_time: string;
    boarding_pass_number: string;
  } | null;
}

export async function searchCheckIn(
  bookingCode: string,
  lastName: string,
  firstName = ''
): Promise<CheckInSearchResult | null> {
  const bookingResult = await sql`
    SELECT
      b.id, b.status, b.flight_id, b.total_price, b.created_at,
      f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    WHERE (b.id::text = ${bookingCode} OR b.booking_code = ${bookingCode})
    LIMIT 1
  `;

  if (asRows<CheckInSearchResult['booking']>(bookingResult).length === 0) {
    return null;
  }

  const booking = asFirstRow<CheckInSearchResult['booking']>(bookingResult)!;

  const passengersResult = await sql`
    SELECT p.id, p.booking_id, p.name, p.dob, p.id_number, p.gender, p.created_at
    FROM passengers p
    JOIN bookings b ON p.booking_id = b.id
    WHERE (b.id::text = ${bookingCode} OR b.booking_code = ${bookingCode})
    ORDER BY p.created_at
  `;

  const passengers = passengersResult as Array<{
    id: string;
    booking_id: string;
    name: string;
    dob: string | null;
    id_number: string | null;
    gender: 'male' | 'female' | 'other';
    created_at: string;
  }>;

  // ─── Verify passenger name matches (case/diacritics-insensitive) ────────────
  // Normalizes Vietnamese text: lowercase + strip diacritics (dấu) for comparison.
  const normalizeName = (name: string): string =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedInput = `${normalizeName(lastName)} ${normalizeName(firstName)}`.trim();
  const normalizedDbNames = passengers.map((p) => normalizeName(p.name));

  const nameMatches = normalizedDbNames.some((dbName) => {
    // Match if the full input appears within the stored name (handles
    // "NGUYEN VAN A" vs lastName="NGUYEN", firstName="VAN A" ordering too)
    return dbName === normalizedInput || dbName.includes(normalizedInput);
  });

  if (!nameMatches) {
    return null;
  }

  const checkInResult = await sql`
    SELECT id, booking_id, check_in_number, seat_number, gate, terminal, check_in_time, boarding_pass_number
    FROM check_in
    WHERE booking_id = ${booking.id}
    LIMIT 1
  `;

  const checkIn = asFirstRow<CheckInSearchResult['checkIn']>(checkInResult) || null;

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      flight_id: booking.flight_id,
      total_price: booking.total_price,
      created_at: booking.created_at,
      flight_no: booking.flight_no,
      from_code: booking.from_code,
      to_code: booking.to_code,
      depart_time: booking.depart_time,
      arrive_time: booking.arrive_time,
    },
    passengers,
    checkIn: checkIn
      ? {
          id: checkIn.id,
          booking_id: checkIn.booking_id,
          check_in_number: checkIn.check_in_number,
          seat_number: checkIn.seat_number,
          gate: checkIn.gate,
          terminal: checkIn.terminal,
          check_in_time: checkIn.check_in_time,
          boarding_pass_number: checkIn.boarding_pass_number,
        }
      : null,
  };
}

export async function getCheckInStatusByBookingId(bookingId: string): Promise<{
  has_check_in: boolean;
  check_in_id: string | null;
  passenger_name: string | null;
  seat_number: string | null;
  check_in_number: string | null;
  boarding_pass_number: string | null;
  status: string | null;
  check_in_time: string | null;
} | null> {
  const result = await sql`
    SELECT
      EXISTS(SELECT 1 FROM check_in WHERE booking_id = ${bookingId}) as has_check_in,
      (SELECT id FROM check_in WHERE booking_id = ${bookingId} LIMIT 1) as check_in_id,
      (SELECT passenger_name FROM check_in WHERE booking_id = ${bookingId} LIMIT 1) as passenger_name,
      (SELECT seat_number FROM check_in WHERE booking_id = ${bookingId} LIMIT 1) as seat_number,
      (SELECT check_in_number FROM check_in WHERE booking_id = ${bookingId} LIMIT 1) as check_in_number,
      (SELECT boarding_pass_number FROM check_in WHERE booking_id = ${bookingId} LIMIT 1) as boarding_pass_number,
      (SELECT status FROM check_in WHERE booking_id = ${bookingId} LIMIT 1) as status,
      (SELECT check_in_time FROM check_in WHERE booking_id = ${bookingId} LIMIT 1) as check_in_time
  `;

  if (asRows<CheckInStatusRow>(result).length === 0) {
    return null;
  }

  const row = asFirstRow<CheckInStatusRow>(result)!;
  return {
    has_check_in: row.has_check_in,
    check_in_id: row.check_in_id,
    passenger_name: row.passenger_name,
    seat_number: row.seat_number,
    check_in_number: row.check_in_number,
    boarding_pass_number: row.boarding_pass_number,
    status: row.status,
    check_in_time: row.check_in_time,
  };
}

export async function createCheckIn(data: {
  bookingId: string;
  passengerId?: string | null;
  seatId?: string | null;
  seatNumber: string;
  flightNo: string;
  fromCode: string;
  toCode: string;
  departTime: string;
  passengerName: string;
  idNumber?: string | null;
  baggageInfo?: string | null;
  gate?: string | null;
  terminal?: string | null;
}): Promise<{
  id: string;
  check_in_number: string;
  booking_id: string;
  seat_number: string;
  gate: string | null;
  terminal: string | null;
  check_in_time: string;
  boarding_pass_number: string;
}> {
  const checkInNumber = `VN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const result = await sql`
    INSERT INTO check_in (
      booking_id, passenger_id, seat_number, flight_no, from_code, to_code,
      depart_time, passenger_name, id_number, baggage_info, gate, terminal,
      check_in_number, boarding_pass_number
    )
    VALUES (
      ${data.bookingId},
      ${data.passengerId || null},
      ${data.seatNumber},
      ${data.flightNo},
      ${data.fromCode},
      ${data.toCode},
      ${data.departTime},
      ${data.passengerName},
      ${data.idNumber || null},
      ${data.baggageInfo || null},
      ${data.gate || null},
      ${data.terminal || null},
      ${checkInNumber},
      ${checkInNumber}
    )
    RETURNING id, check_in_number, booking_id, seat_number, gate, terminal, check_in_time, boarding_pass_number
  `;

  return asFirstRow<{
    id: string;
    check_in_number: string;
    booking_id: string;
    seat_number: string;
    gate: string | null;
    terminal: string | null;
    check_in_time: string;
    boarding_pass_number: string;
  }>(result)!;
}
