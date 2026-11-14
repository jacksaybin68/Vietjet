// Vietjet Air Database Layer
import { sql } from '@/lib/neon';
export { sql };
import type { Permission } from '@/lib/rbac';
import { addDateDays } from '@/lib/utils';
import type {
  DashboardSummary,
  KPIData,
  RevenuePoint,
  SeatDistribution,
  TopRoute,
  CancellationRate,
  DashboardBookingSummary,
  DashboardFlightSummary,
} from '@/features/admin/types/dashboard';

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
  flight_status: FlightStatus;
  gate: string | null;
  terminal: string | null;
  passengers: PassengerRecord[];
  payments: PaymentRecord[];
  check_ins: Array<{
    id: string;
    passenger_id: string | null;
    passenger_name: string;
    seat_number: string;
    check_in_number: string;
    boarding_pass_number: string | null;
    gate: string | null;
    terminal: string | null;
    check_in_time: string | null;
  }>;
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
  /** Fare per cabin (migration 030). The booking API prices from these. */
  economy_price: number;
  business_price: number;
  class: 'economy' | 'business';
  available: number;
  status: FlightStatus;
  gate: string | null;
  terminal: string | null;
  aircraft?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: string;
  user_id: string;
  flight_id: string;
  /** Short reference the customer is given (PNR). Assigned by the database. */
  booking_code: string | null;
  /** Shared id of the round trip this row belongs to (migration 045). */
  trip_id?: string | null;
  /** Which leg of the trip this row is: 'outbound' (đi) or 'inbound' (về). */
  leg_role?: 'outbound' | 'inbound';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  discount_code_id?: string | null;
  discount_amount?: number;
  receipt_image?: string | null;
  transfer_note?: string | null;
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
  /** Ghế của hành khách (migration 046). */
  seat_number?: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  /**
   * PNR of the booking this payment settles. Not a column of `payments` —
   * `getPaymentHistory` joins it in, so it is absent wherever the payment is
   * fetched without the booking (e.g. `getPaymentById`).
   */
  booking_code?: string | null;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  receipt_image?: string | null;
  transfer_note?: string | null;
  created_at: string;
}

/** Rich booking detail returned by getBookingById (includes nested flight, passengers, payment, seats) */
export interface BookingDetail {
  id: string;
  user_id: string;
  flight_id: string;
  /** Short reference the customer is given (PNR). Assigned by the database. */
  booking_code: string | null;
  /** Shared id of the round trip this row belongs to (migration 045). */
  trip_id?: string | null;
  /** Which leg of the trip this row is: 'outbound' (đi) or 'inbound' (về). */
  leg_role?: 'outbound' | 'inbound';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  discount_code_id?: string | null;
  discount_amount?: number;
  receipt_image?: string | null;
  transfer_note?: string | null;
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
  /** `processed` and `archived` are reachable only from SQL; no code writes them. */
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processed' | 'archived';
  bank_info: string | Record<string, string | number> | null;
  /** Payout figure in VND; NULL on tickets created before it was its own column. */
  amount?: number | null;
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

export interface ChatCallRecord {
  id: string;
  conversation_id: string;
  caller_id: string;
  caller_role: 'user' | 'admin';
  caller_name: string | null;
  status: 'ringing' | 'connected' | 'ended' | 'rejected' | 'missed';
  started_at: string;
  connected_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
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
  // `phone` is nullable on purpose: a cleared number must be stored as NULL, not
  // `''`, because `user_profiles_phone_key` (007) is unique and would then let
  // exactly one account hold the empty value.
  updates: { full_name?: string; phone?: string | null; avatar_url?: string }
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

/**
 * Delete a user profile.
 *
 * `bookings.user_id` is `REFERENCES user_profiles(id)` with **no** cascade
 * (migration 000), so a customer with a single booking cannot be deleted at
 * all — Postgres raises `bookings_user_id_fkey` and the admin saw a bare 500
 * with no hint that the account simply has history. The callers pre-check the
 * booking count and answer 409; this function keeps the same guard so a
 * direct call cannot slip a raw constraint error through.
 *
 * The child rows that *do* cascade (`wallet`, `notifications`, `sessions`,
 * `chat`, `admin_roles`, …) are removed by the foreign keys themselves.
 */
export async function deleteUser(userId: string): Promise<void> {
  const bookings = await sql`
    SELECT COUNT(*)::int AS count FROM bookings WHERE user_id = ${userId}
  `;
  const bookingCount = Number((bookings[0] as { count: number } | undefined)?.count ?? 0);
  if (bookingCount > 0) {
    const error = new Error(
      `Không thể xóa người dùng: còn ${bookingCount} đặt vé liên kết. Hãy xử lý/huỷ các đặt vé này trước.`
    ) as Error & { code?: string; status?: number };
    error.code = 'USER_HAS_BOOKINGS';
    error.status = 409;
    throw error;
  }
  await sql`DELETE FROM user_profiles WHERE id = ${userId}`;
}

// ─── Airport Queries ────────────────────────────────────────────────────────

export async function getAllAirports(): Promise<AirportRecord[]> {
  return (await sql`
    SELECT * FROM airports
    ORDER BY
      CASE
        WHEN country IN ('Vietnam', 'Việt Nam') OR code IN ('SGN', 'HAN', 'DAD', 'PQC', 'CXR', 'HPH', 'HUI', 'DLI', 'VII', 'VDO', 'VCA', 'UIH', 'BMV', 'PXU', 'TBB', 'VCL', 'THD', 'VDH', 'DIN', 'VCS', 'VKG') THEN 0
        ELSE 1
      END,
      CASE code
        WHEN 'SGN' THEN 1
        WHEN 'HAN' THEN 2
        WHEN 'DAD' THEN 3
        WHEN 'PQC' THEN 4
        WHEN 'CXR' THEN 5
        ELSE 10
      END,
      city ASC
  `) as AirportRecord[];
}

export async function getAirportByCode(code: string): Promise<AirportRecord | null> {
  const results = await sql`
    SELECT * FROM airports WHERE code = ${code}
  `;
  return (results as AirportRecord[])[0] || null;
}

// ─── Flight Queries ─────────────────────────────────────────────────────────

/**
 * Flights a customer may still book.
 *
 * `cancelled` and `completed` rows used to stay in the results list, so a
 * customer could pick a flight the operations desk had already cancelled (or
 * one that had already landed) and then pay for it. `delayed` is kept — a
 * delayed flight is still flyable. `departed` is dropped for the same reason
 * as `completed`.
 *
 * The list has to match migration 021's `flights_status_check`, so adding a
 * status means adding it here too.
 */
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
        AND status IN ('active', 'delayed')
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
        AND status IN ('active', 'delayed')
      ORDER BY depart_time ASC
    `) as FlightRecord[];
  }

  return (await sql`
    SELECT * FROM flights
    WHERE from_code = ${params.from_code}
      AND to_code = ${params.to_code}
      AND available > 0
      AND status IN ('active', 'delayed')
    ORDER BY depart_time ASC
  `) as FlightRecord[];
}

/**
 * Future departure dates that actually have flights on this route.
 *
 * A search for a day the schedule does not cover comes back empty, and the
 * results page's only advice was "pick a nearby date in the strip above" — but
 * the strip is built from today forward, so a date past the end of the seeded
 * week sits next to six more empty days. This gives the empty state somewhere
 * real to send the customer.
 *
 * **Today forward only.** The seeds leave past departures in the table, and
 * ordering without a filter offered 28/08 for a search made in October — a
 * button that empties the page again. The comparison is against today in
 * Vietnam, the same calendar day `searchFlights`' window uses.
 */
export async function getAvailableDepartDates(params: {
  from_code: string;
  to_code: string;
  limit?: number;
}): Promise<string[]> {
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 14);
  const rows = await sql`
    SELECT DISTINCT to_char(depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day
    FROM flights
    WHERE from_code = ${params.from_code}
      AND to_code = ${params.to_code}
      AND available > 0
      AND (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    ORDER BY day ASC
    LIMIT ${limit}
  `;
  return (rows as { day: string }[]).map((row) => row.day);
}

export async function getFlightById(flightId: string): Promise<FlightRecord | null> {
  const results = await sql`
    SELECT * FROM flights WHERE id = ${flightId}
  `;
  return (results as FlightRecord[])[0] || null;
}

/**
 * Tìm chuyến bay theo số hiệu + ngày giờ Việt Nam — đường tra của lệnh cập nhật
 * qua trợ lý OpenClaw (`flight-command.ts`).
 *
 * `UPPER(flight_no)` cả hai vế với cùng lý do `getFlightStatusByNo` làm vậy:
 * PNR/số hiệu giờ có chữ, và khách/quản trị gõ không hoa. Ngày so theo lịch
 * `Asia/Ho_Chi_Minh`, không theo UTC — một chuyến 06:00 giờ VN trôi vào ngày
 * hôm trước khi nhìn qua GMT.
 */
/**
 * Tìm chuyến bay theo số hiệu + ngày giờ Việt Nam — đường tra của lệnh cập nhật
 * qua trợ lý OpenClaw (`flight-command.ts`).
 *
 * So sánh bỏ hết khoảng trắng: `getFlightStatusByNo` yêu cầu `UPPER()` vì PNR
 * giờ có chữ, nhưng lệnh chat thêm một trạng thái nữa — quản trị gõ `VJ 3040`
 * trong khi dòng dữ liệu ghi `VJ3040` (hoặc ngược lại). Cả hai hợp lệ theo
 * `FLIGHT_NO_PATTERN` (dấu cách là tùy chọn), so chặt một vế sẽ chỉ tìm thấy
 * một trong hai cách viết. Ngày so theo lịch `Asia/Ho_Chi_Minh`, không theo
 * UTC — một chuyến 06:00 giờ VN trôi vào ngày hôm trước khi nhìn qua GMT.
 */
export async function getFlightByNoAndDate(
  flightNo: string,
  departDate: string
): Promise<FlightRecord[]> {
  const results = await sql`
    SELECT * FROM flights
    WHERE UPPER(REGEXP_REPLACE(flight_no, '\\s+', '', 'g'))
          = ${flightNo.replace(/\s+/g, '').toUpperCase()}
      AND (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          = ${departDate}::date
    ORDER BY depart_time ASC
  `;
  return results as FlightRecord[];
}

/**
 * Những ngày lân cận (±3 ngày quanh `departDate`) còn xuất hiện cùng số hiệu —
 * dùng để gợi ý khi ngày được hỏi không có chuyến, thay vì để câu trả lời dừng
 * ở "không tìm thấy".
 */
export async function getFlightDatesNear(
  flightNo: string,
  departDate: string
): Promise<Array<{ date: string; time: string }>> {
  const from = addDateDays(departDate, -3);
  const to = addDateDays(departDate, 3);
  const results = await sql`
    SELECT to_char(depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
           to_char(depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') AS time
    FROM flights
    WHERE UPPER(REGEXP_REPLACE(flight_no, '\\s+', '', 'g'))
          = ${flightNo.replace(/\s+/g, '').toUpperCase()}
      AND (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          BETWEEN ${from}::date AND ${to}::date
    ORDER BY depart_time ASC
    LIMIT 8
  `;
  return results as Array<{ date: string; time: string }>;
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
  /**
   * Fare per cabin (migration 030). Both are NOT NULL there, and they are what
   * the results cards and the booking API read — omitting them made every
   * admin-created flight fail with a constraint violation, so the "Thêm chuyến
   * bay" screen had been unusable since 030 shipped.
   *
   * A caller that sends only `price` gets a real ladder, not a flat one. Copying
   * `price` into both columns satisfies the constraint while making all four
   * fare cards on the results page print the same number, and it left the seeded
   * schedule that way until a form sent the pair.
   */
  economyPrice?: number | null;
  businessPrice?: number | null;
  class: string;
  available: number;
  /** Aircraft type code (migration 040), e.g. 'A321', 'A321neo', 'A330'. */
  aircraft?: string | null;
}): Promise<FlightRecord> {
  // The same ratio migration 030 seeds from, so a derived row is
  // indistinguishable from a seeded one. `price` is the fare of the cabin the
  // row itself seats, so the other cabin comes off it in whichever direction
  // that implies — deriving both from `price` in the same direction would put a
  // business row's economy fare at 2.77× its own, far above the business fare.
  const FARE_LADDER_RATIO = 2.77;
  const price = Number(flight.price) || 0;
  const isBusinessRow = flight.class === 'business';
  const economyPrice =
    Number(flight.economyPrice) || (isBusinessRow ? Math.round(price / FARE_LADDER_RATIO) : price);
  const businessPrice =
    Number(flight.businessPrice) || (isBusinessRow ? price : Math.round(price * FARE_LADDER_RATIO));
  const results = await sql`
    INSERT INTO flights (
      flight_no, from_code, to_code, depart_time, arrive_time, price,
      economy_price, business_price, class, available, aircraft
    )
    VALUES (
      ${flight.flight_no}, ${flight.from_code}, ${flight.to_code},
      ${flight.depart_time}, ${flight.arrive_time}, ${flight.price},
      ${economyPrice}, ${businessPrice}, ${flight.class}, ${flight.available},
      ${flight.aircraft ?? null}
    )
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
    /** Fare per cabin (migration 030). Missing here while present in
     * `createFlight` silently dropped every price edit — the form sent it and
     * nothing persisted. */
    economy_price?: number | null;
    business_price?: number | null;
    class: string;
    available: number;
    status?: FlightStatus;
    gate?: string | null;
    terminal?: string | null;
    aircraft?: string | null;
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
    'economy_price',
    'business_price',
    'class',
    'available',
    'status',
    'gate',
    'terminal',
    'aircraft',
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

/**
 * Delete a flight.
 *
 * `bookings.flight_id` is `REFERENCES flights(id)` with **no** cascade
 * (migration 000), so deleting a flight that has bookings raises
 * `bookings_flight_id_fkey` and the admin saw a bare 500. `seats`,
 * `seat_locks` and `flight_update_logs` *do* cascade, so they are not the
 * blocker.
 */
export async function deleteFlight(flightId: string): Promise<void> {
  const bookings = await sql`
    SELECT COUNT(*)::int AS count FROM bookings WHERE flight_id = ${flightId}
  `;
  const bookingCount = Number((bookings[0] as { count: number } | undefined)?.count ?? 0);
  if (bookingCount > 0) {
    const error = new Error(
      `Không thể xóa chuyến bay: còn ${bookingCount} đặt vé liên kết. Hãy hủy hoặc chuyển các đặt vé này trước.`
    ) as Error & { code?: string; status?: number };
    error.code = 'FLIGHT_HAS_BOOKINGS';
    error.status = 409;
    throw error;
  }
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
      flight_status: FlightStatus;
      gate: string | null;
      terminal: string | null;
      check_ins: Array<{
        id: string;
        passenger_id: string | null;
        passenger_name: string;
        seat_number: string;
        check_in_number: string;
        boarding_pass_number: string | null;
        gate: string | null;
        terminal: string | null;
        check_in_time: string | null;
      }>;
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
             f.status AS flight_status, f.gate, f.terminal,
             json_agg(DISTINCT p) FILTER (WHERE p.id IS NOT NULL) as passengers,
             json_agg(DISTINCT pay) FILTER (WHERE pay.id IS NOT NULL) as payments,
             -- Check-in gộp vào cùng một query: trước đây /chuyen-bay-cua-toi
             -- gọi /api/checkin/status/<id> cho TỪNG booking (N+1 request).
             COALESCE(
               json_agg(DISTINCT ci) FILTER (WHERE ci.id IS NOT NULL),
               '[]'::json
             ) AS check_ins
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      LEFT JOIN passengers p ON b.id = p.booking_id
      LEFT JOIN payments pay ON b.id = pay.booking_id
      LEFT JOIN check_in ci ON b.id = ci.booking_id
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
      // Trip/leg (migration 045): nhóm các booking của cùng một hành trình
      // khứ hồi, để `/chuyen-bay-cua-toi` hiển thị một thẻ trip gồm cả
      // chặng đi và chặng về.
      trip_id: b.trip_id ?? null,
      leg_role: (b.leg_role as 'outbound' | 'inbound') ?? 'outbound',
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
      // Trạng thái chuyến bay realtime (SSE) — cần cả gate/terminal.
      flight_status: b.flight_status,
      gate: b.gate,
      terminal: b.terminal,
      passengers: Array.isArray(b.passengers) ? b.passengers : [],
      payment: Array.isArray(b.payments) && b.payments.length > 0 ? b.payments[0] : null,
      // Check-in của booking này — lấy thẳng từ query danh sách.
      check_ins: Array.isArray(b.check_ins) ? b.check_ins : [],
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
    SELECT b.id
    FROM bookings b
    WHERE UPPER(b.booking_code) = UPPER(${codeOrId}) OR b.id::text = ${codeOrId}
    LIMIT 1
  `;

  if ((results as any[]).length === 0) return null;
  return getBookingById(String((results as any[])[0].id));
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
    trip_id: b.trip_id ? String(b.trip_id) : null,
    leg_role: (b.leg_role as BookingDetail['leg_role']) ?? 'outbound',
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
    seatedCount?: number;
    /**
     * Shared id for the two legs of a round trip (migration 045). Both legs
     * carry the same value, which is what makes one PNR resolve to the whole
     * trip. Omitted for a single-leg booking — the column default then gives
     * the row a trip of its own.
     */
    trip_id?: string | null;
    /** Which leg of the trip this row is: 'outbound' (đi) or 'inbound' (về). */
    leg_role?: 'outbound' | 'inbound';
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
  /** Seat numbers, each with the price it was sold for (migration 029). */
  seats?: { seat_number: string; price: number }[],
  /** Services bought, priced server-side from `ANCILLARY_OPTIONS` (migration 029). */
  ancillaries?: { option_id: string; unit_price: number; quantity: number }[],
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

  const seatedCount = Math.max(0, Number(booking.seatedCount) || 0);

  const rows = (await sql`
    WITH reserved_flight AS (
      UPDATE flights
      SET available = available - ${seatedCount}
      WHERE id = ${booking.flight_id} AND available >= ${seatedCount}
      RETURNING id
    ),
    new_booking AS (
      INSERT INTO bookings (user_id, flight_id, status, total_price, trip_id, leg_role)
      SELECT
        ${booking.user_id},
        ${booking.flight_id},
        'pending',
        ${booking.total_price},
        COALESCE(${booking.trip_id ?? null}::uuid, gen_random_uuid()),
        COALESCE(${booking.leg_role ?? null}::varchar(10), 'outbound')
      FROM reserved_flight
      RETURNING id, user_id, flight_id, status, total_price, created_at, updated_at, booking_code,
                trip_id, leg_role
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
      INSERT INTO seats (booking_id, flight_id, seat_number, status, price)
      SELECT nb.id, nb.flight_id, s.seat_number, 'reserved', s.price
      FROM new_booking nb
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(
        (seats || []).map((seat) => ({
          seat_number: seat.seat_number,
          price: seat.price,
        }))
      )}::jsonb)
        AS s(seat_number text, price numeric)
      RETURNING 1
    ),
    inserted_ancillaries AS (
      INSERT INTO booking_ancillaries (booking_id, option_id, unit_price, quantity)
      SELECT nb.id, a.option_id, a.unit_price, a.quantity
      FROM new_booking nb
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(ancillaries || [])}::jsonb)
        AS a(option_id text, unit_price numeric, quantity integer)
      RETURNING 1
    )
    SELECT b.* FROM new_booking b
  `) as BookingRecord[];

  // Ghế của từng hành khách (migration 046) — ghi SAU câu trên, vì một
  // data-modifying CTE không nhìn thấy dòng mà CTE khác vừa ghi (cùng giới
  // hạn với `sql.transaction` không tham chiếu được kết quả câu trước).
  //
  // `passengers.seat_number` là nơi duy nhất ánh xạ được hành khách → ghế:
  // không có nó thì không sinh được boarding pass theo từng người, và cũng
  // không có chỗ ghi khi khách đổi ghế sau khi đặt vé.
  //
  // `seats` là danh sách ghế đã bán theo thứ tự chọn; mỗi hành khách có ghế
  // (trừ em bé) chiếm đúng một ghế. Ghép theo thứ tự `created_at` của hành
  // khách là thứ tự hành khách được ghi vào đặt vé.
  if (seats && seats.length > 0) {
    const seatNumbers = seats.map((seat) => seat.seat_number);
    await sql`
      WITH seat_rows AS (
        SELECT st2.seat_number,
               ROW_NUMBER() OVER (ORDER BY st2.ord) AS rn
        FROM jsonb_to_recordset(${JSON.stringify(
          seatNumbers.map((seatNumber) => ({ seat_number: seatNumber }))
        )}::jsonb) WITH ORDINALITY AS st2(seat_number text, ord)
      ),
      passenger_rows AS (
        SELECT p2.id AS passenger_id,
               ROW_NUMBER() OVER (ORDER BY p2.created_at, p2.id) AS rn
        FROM passengers p2
        WHERE p2.booking_id = ${rows[0].id}
          AND p2.passenger_type <> 'infant'
      )
      UPDATE passengers p
      SET seat_number = s.seat_number
      FROM passenger_rows pr
      JOIN seat_rows s ON s.rn = pr.rn
      WHERE p.id = pr.passenger_id
    `;
  }

  return rows[0];
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
): Promise<BookingRecord> {
  const releasesSeats = status === 'cancelled' || status === 'refunded';

  const results = releasesSeats
    ? await sql`
        UPDATE bookings
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${bookingId} AND status NOT IN ('cancelled', 'refunded')
        RETURNING *
      `
    : await sql`
        UPDATE bookings
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${bookingId}
        RETURNING *
      `;

  const booking = (results as BookingRecord[])[0];

  if (!booking && releasesSeats) {
    const existing = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
    return (existing as BookingRecord[])[0];
  }

  if (booking && releasesSeats) {
    await sql`DELETE FROM seats WHERE booking_id = ${bookingId}`;

    const countRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM passengers
      WHERE booking_id = ${bookingId} AND passenger_type <> 'infant'
    `;
    const seatedCount = Number((countRows as Array<{ count: number }>)[0]?.count || 0);

    if (seatedCount > 0) {
      await sql`
        UPDATE flights
        SET available = available + ${seatedCount}
        WHERE id = ${booking.flight_id}
      `;
    }
  }

  return booking;
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
  receipt_image?: string;
  transfer_note?: string;
}): Promise<PaymentRecord> {
  const results = await sql`
    INSERT INTO payments (booking_id, method, status, amount, receipt_image, transfer_note)
    VALUES (${payment.booking_id}, ${payment.method}, 'completed', ${payment.amount}, ${payment.receipt_image || null}, ${payment.transfer_note || null})
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
  status?: 'pending' | 'completed';
  user_id?: string;
  discount_code_id?: string;
  discount_amount?: number;
  receipt_image?: string;
  transfer_note?: string;
}): Promise<{ payment: PaymentRecord; booking: BookingRecord }> {
  const targetPaymentStatus = payment.status || 'completed';
  const targetBookingStatus = targetPaymentStatus === 'completed' ? 'confirmed' : 'pending';

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
      INSERT INTO payments (booking_id, method, status, amount, receipt_image, transfer_note)
      VALUES (${payment.booking_id}, ${payment.method}, ${targetPaymentStatus}, ${payment.amount}, ${payment.receipt_image || null}, ${payment.transfer_note || null})
    `,
      sql`
      UPDATE bookings
      SET status = ${targetBookingStatus},
          discount_code_id = ${payment.discount_code_id || null},
          discount_amount = ${payment.discount_amount || 0},
          receipt_image = ${payment.receipt_image || null},
          transfer_note = ${payment.transfer_note || null},
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

export type ConfirmVietQrPaymentResult =
  | {
      ok: true;
      booking: BookingRecord;
      payment: PaymentRecord | null;
      alreadyPaid: boolean;
    }
  | {
      ok: false;
      reason: 'not_found' | 'invalid_status' | 'amount_mismatch';
      booking?: BookingRecord;
      expectedAmount?: number;
    };

/**
 * Settle a booking from a bank/VietQR webhook.
 *
 * This is the server-side half of the simulated gateway: it accepts the PNR or
 * booking id, verifies the transferred amount against what the booking is
 * worth, and atomically marks the booking confirmed plus its payment
 * completed. It is idempotent — a repeated delivery reports `alreadyPaid`
 * instead of inserting a second payment — and it never touches a cancelled or
 * refunded booking.
 *
 * The statements in the batch deliberately all target the booking row (or rows
 * derived from it) rather than each other's results, because the Neon batch API
 * runs them independently. The booking `UPDATE` is first so two concurrent
 * deliveries serialise on its row lock; the second one re-evaluates
 * `status = 'pending'`, matches nothing, and then sees the payment already
 * completed in its `NOT EXISTS` check.
 */
export async function confirmVietQrPayment(input: {
  bookingId?: string;
  bookingCode?: string;
  amount?: number;
  transferNote?: string;
}): Promise<ConfirmVietQrPaymentResult> {
  const booking =
    input.bookingId !== undefined
      ? asFirstRow<BookingRecord>(
          await sql`SELECT * FROM bookings WHERE id = ${input.bookingId} LIMIT 1`
        )
      : asFirstRow<BookingRecord>(
          await sql`SELECT * FROM bookings WHERE UPPER(booking_code) = UPPER(${input.bookingCode}) LIMIT 1`
        );

  if (!booking) return { ok: false, reason: 'not_found' };

  if (booking.status === 'cancelled' || booking.status === 'refunded') {
    return { ok: false, reason: 'invalid_status', booking };
  }

  const expectedAmount = Math.max(
    0,
    Number(booking.total_price || 0) - Number(booking.discount_amount || 0)
  );

  if (
    input.amount !== undefined &&
    Math.round(Number(input.amount)) !== Math.round(expectedAmount)
  ) {
    return { ok: false, reason: 'amount_mismatch', booking, expectedAmount };
  }

  if (booking.status === 'confirmed' || booking.status === 'completed') {
    const payment = asFirstRow<PaymentRecord>(
      await sql`SELECT * FROM payments WHERE booking_id = ${booking.id} ORDER BY created_at DESC LIMIT 1`
    );
    return { ok: true, booking, payment: payment ?? null, alreadyPaid: true };
  }

  const transferNote =
    input.transferNote?.trim() || (booking.booking_code ? `VJ ${booking.booking_code}` : null);

  const batch = (await sql.transaction([
    sql`
      UPDATE bookings
      SET status = 'confirmed', updated_at = NOW()
      WHERE id = ${booking.id} AND status = 'pending'
      RETURNING *
    `,
    sql`
      UPDATE payments
      SET status = 'completed'
      WHERE booking_id = ${booking.id} AND status = 'pending'
      RETURNING *
    `,
    sql`
      INSERT INTO payments (booking_id, method, status, amount, transfer_note)
      SELECT ${booking.id}, 'vietqr', 'completed', ${expectedAmount}, ${transferNote}
      WHERE NOT EXISTS (
        SELECT 1 FROM payments
        WHERE booking_id = ${booking.id} AND status IN ('pending', 'completed')
      )
      RETURNING *
    `,
  ])) as unknown[][];

  const confirmedBooking = asFirstRow<BookingRecord>(batch?.[0]) ?? {
    ...booking,
    status: 'confirmed' as const,
  };
  const payment =
    asFirstRow<PaymentRecord>(batch?.[1]) ??
    asFirstRow<PaymentRecord>(batch?.[2]) ??
    asFirstRow<PaymentRecord>(
      await sql`SELECT * FROM payments WHERE booking_id = ${booking.id} ORDER BY created_at DESC LIMIT 1`
    ) ??
    null;

  return { ok: true, booking: confirmedBooking, payment, alreadyPaid: false };
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

  // `b.booking_code` rides along because the history table labels a column "Mã
  // đặt chỗ" and used to fill it with the first 8 chars of the row UUID — a
  // reference the customer can neither read aloud nor use at check-in.
  const payments = (await sql`
    SELECT p.*, b.booking_code FROM payments p
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
  /**
   * Payout figure, in its own column. It used to ride inside `bank_info` only,
   * so the operator list rendered an empty "Số tiền" for every ticket and the
   * "Đã hoàn tiền" total stayed at 0₫ however many were approved.
   */
  amount?: number | null;
  bank_info?: string | Record<string, string | number> | null;
  phone?: string | null;
  booking_code?: string | null;
}): Promise<RefundRecord> {
  const results = await sql`
    INSERT INTO refund_requests (
      booking_id, user_id, reason, amount, bank_info, phone, booking_code, visible_to_user
    )
    VALUES (
      ${refund.booking_id},
      ${refund.user_id},
      ${refund.reason},
      ${refund.amount ?? null},
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

/** Một phiếu hoàn tiền kèm thông tin người dùng và chuyến bay để bảng admin hiển thị. */
export interface AdminRefundRow extends RefundRecord {
  user_email: string;
  user_name: string;
  booking_total: number;
  flight_no: string;
  route: string;
  flight_date: string;
}

export async function getAllRefunds(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ refunds: AdminRefundRow[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const filterValues: DbParam[] = [];

  if (params?.status) {
    filterValues.push(params.status);
    whereClause += ` AND r.status = $${filterValues.length}`;
  }

  // flight_no / route / flight_date are what the admin refund table renders;
  // LEFT JOIN so a refund is never hidden by a missing flight row.
  const refundsQuery = `
    SELECT r.*, u.email as user_email, u.full_name as user_name, b.total_price as booking_total,
           f.flight_no as flight_no,
           COALESCE(f.from_code || ' → ' || f.to_code, '') as route,
           COALESCE(to_char(f.depart_time, 'DD/MM/YYYY'), '') as flight_date
    FROM refund_requests r
    JOIN user_profiles u ON r.user_id = u.id
    JOIN bookings b ON r.booking_id = b.id
    LEFT JOIN flights f ON b.flight_id = f.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${filterValues.length + 1} OFFSET $${filterValues.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM refund_requests r ${whereClause}`;

  const refundsResult = await sql.query(refundsQuery, [...filterValues, limit, offset]);
  const countResult = await sql.query(countQuery, filterValues);
  const total = totalOf(countResult);

  return {
    refunds: refundsResult as unknown as AdminRefundRow[],
    total,
  };
}

/**
 * The four states an operator can reach from the console. `processed` and
 * `archived` exist in the column's CHECK (migration 037) because a row may
 * carry them, but nothing in the app writes either — the only function that
 * looked for `processed` had no caller and was removed.
 */
export type OperatorRefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export async function updateRefundStatus(
  refundId: string,
  status: OperatorRefundStatus,
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
 * Bulk archive old refund requests. Reachable from the admin SSTK tool, so it
 * is not dead — but the `'processed'` branch it used to carry was: no code path
 * writes that status, so a ticket could never enter this query through it.
 * `approved` is the state that actually accumulates, and `completed` is the
 * other settled state an operator can reach, so both are archived.
 */
export async function archiveOldRefunds(days: number = 90): Promise<number> {
  const result = await sql`
    UPDATE refund_requests
    SET status = 'archived', updated_at = NOW()
    WHERE (status = 'approved' OR status = 'completed')
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

// ─── Voice Calls & Signaling ────────────────────────────────────────────────

export async function createChatCall(call: {
  conversation_id: string;
  caller_id: string;
  caller_role: 'user' | 'admin';
  caller_name?: string;
}): Promise<ChatCallRecord> {
  const callerName =
    call.caller_name || (call.caller_role === 'admin' ? 'Tổng đài Vietjet Air' : 'Khách hàng');
  const results = await sql`
    INSERT INTO chat_calls (conversation_id, caller_id, caller_role, caller_name, status)
    VALUES (${call.conversation_id}, ${call.caller_id}, ${call.caller_role}, ${callerName}, 'ringing')
    RETURNING *
  `;
  return (results as ChatCallRecord[])[0];
}

export async function getActiveChatCall(conversationId: string): Promise<ChatCallRecord | null> {
  const results = await sql`
    SELECT * FROM chat_calls
    WHERE conversation_id = ${conversationId} AND status IN ('ringing', 'connected')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return (results as ChatCallRecord[])[0] || null;
}

export async function getLatestRingingCallForAdmin(): Promise<ChatCallRecord | null> {
  const results = await sql`
    SELECT * FROM chat_calls
    WHERE status = 'ringing' AND caller_role = 'user'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return (results as ChatCallRecord[])[0] || null;
}

export async function updateChatCallStatus(
  callId: string,
  status: 'connected' | 'ended' | 'rejected' | 'missed',
  durationSeconds?: number
): Promise<ChatCallRecord | null> {
  if (status === 'connected') {
    const results = await sql`
      UPDATE chat_calls
      SET status = ${status}, connected_at = NOW(), updated_at = NOW()
      WHERE id = ${callId}
      RETURNING *
    `;
    return (results as ChatCallRecord[])[0] || null;
  }

  const duration = durationSeconds ?? 0;
  const results = await sql`
    UPDATE chat_calls
    SET status = ${status},
        ended_at = NOW(),
        duration_seconds = ${duration},
        updated_at = NOW()
    WHERE id = ${callId}
    RETURNING *
  `;
  return (results as ChatCallRecord[])[0] || null;
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

export function getFallbackDashboardSummary(): DashboardSummary {
  const revenue: RevenuePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() + 7 * 3600 * 1000 - i * 86400 * 1000);
    revenue.push({
      date: d.toISOString().slice(0, 10),
      revenue: 0,
      bookings: 0,
    });
  }

  return {
    kpi: {
      bookingsToday: 0,
      bookingsTodayChange: 0,
      revenueToday: 0,
      revenueTodayChange: 0,
      activeUsers: 0,
      activeUsersChange: 0,
      loadFactor: 0,
      loadFactorChange: 0,
    },
    revenue,
    seatDistribution: [
      { name: 'Eco', class: 'eco', count: 0, percent: 0, color: '#7CB342' },
      { name: 'Deluxe', class: 'deluxe', count: 0, percent: 0, color: '#F4511E' },
      { name: 'SkyBoss', class: 'skyboss', count: 0, percent: 0, color: '#EC2029' },
      { name: 'Business', class: 'business', count: 0, percent: 0, color: '#B8860B' },
    ],
    topRoutes: [
      { route: 'SGN - HAN', bookings: 0, revenue: 0 },
      { route: 'HAN - SGN', bookings: 0, revenue: 0 },
      { route: 'SGN - DAD', bookings: 0, revenue: 0 },
      { route: 'DAD - HAN', bookings: 0, revenue: 0 },
      { route: 'SGN - PQC', bookings: 0, revenue: 0 },
    ],
    cancellationRate: {
      total: 0,
      cancelled: 0,
      rate: 0,
    },
    recentBookings: [],
    upcomingFlights: [],
  };
}

export async function getDashboardSummaryData(): Promise<DashboardSummary> {
  try {
    const [
      kpiResult,
      userResult,
      lfResult,
      revenueResult,
      seatResult,
      routeResult,
      cancelResult,
      recentBookingResult,
      upcomingFlightResult,
    ] = await Promise.all([
      // KPI Bookings & Revenue today vs yesterday
      sql`
        SELECT
          COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int AS bookings_today,
          COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day')::int AS bookings_yesterday,
          COALESCE(SUM(total_price) FILTER (
            WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
              AND status NOT IN ('cancelled', 'refunded')
          ), 0)::numeric AS revenue_today,
          COALESCE(SUM(total_price) FILTER (
            WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day'
              AND status NOT IN ('cancelled', 'refunded')
          ), 0)::numeric AS revenue_yesterday
        FROM bookings
      `.catch(() => []),

      // Active Users (30 days vs prior 30 days)
      sql`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '30 days' OR created_at >= NOW() - INTERVAL '30 days')::int AS active_users,
          COUNT(*) FILTER (WHERE (last_login >= NOW() - INTERVAL '60 days' AND last_login < NOW() - INTERVAL '30 days')
                              OR (created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'))::int AS prev_active_users
        FROM user_profiles
      `.catch(() => []),

      // Load Factor (today vs yesterday)
      sql`
        SELECT
          ROUND(
            SUM(GREATEST(0, (CASE WHEN aircraft ILIKE '%330%' THEN 377 WHEN aircraft ILIKE '%320%' THEN 180 ELSE 230 END) - available))::numeric /
            NULLIF(SUM(CASE WHEN aircraft ILIKE '%330%' THEN 377 WHEN aircraft ILIKE '%320%' THEN 180 ELSE 230 END), 0) * 100,
            1
          ) AS lf_today,
          ROUND(
            SUM(GREATEST(0, (CASE WHEN aircraft ILIKE '%330%' THEN 377 WHEN aircraft ILIKE '%320%' THEN 180 ELSE 230 END) - available)) FILTER (
              WHERE (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day'
            )::numeric /
            NULLIF(SUM(CASE WHEN aircraft ILIKE '%330%' THEN 377 WHEN aircraft ILIKE '%320%' THEN 180 ELSE 230 END) FILTER (
              WHERE (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day'
            ), 0) * 100,
            1
          ) AS lf_yesterday
        FROM flights
        WHERE depart_time >= NOW() - INTERVAL '3 days' AND depart_time <= NOW() + INTERVAL '1 day'
      `.catch(() => []),

      // Revenue last 30 days
      sql`
        SELECT
          to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
          COUNT(id)::int AS bookings,
          COALESCE(SUM(total_price) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0)::numeric AS revenue
        FROM bookings
        WHERE created_at >= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh' - INTERVAL '30 days')
        GROUP BY to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
        ORDER BY date ASC
      `.catch(() => []),

      // Seat distribution
      sql`
        SELECT seat_number, price FROM seats WHERE booking_id IS NOT NULL
      `.catch(() => []),

      // Top routes (top 5)
      sql`
        SELECT
          CONCAT(f.from_code, ' - ', f.to_code) AS route,
          COUNT(b.id)::int AS bookings,
          COALESCE(SUM(b.total_price), 0)::numeric AS revenue
        FROM bookings b
        JOIN flights f ON b.flight_id = f.id
        GROUP BY f.from_code, f.to_code
        ORDER BY bookings DESC, revenue DESC
        LIMIT 5
      `.catch(() => []),

      // Cancellation rate
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
        FROM bookings
      `.catch(() => []),

      // Recent bookings (10)
      sql`
        SELECT
          b.id,
          b.booking_code,
          b.status,
          b.total_price,
          b.created_at,
          COALESCE(u.full_name, u.email, 'Khách hàng') AS customer_name,
          CONCAT(f.from_code, ' - ', f.to_code) AS route
        FROM bookings b
        LEFT JOIN user_profiles u ON b.user_id = u.id
        LEFT JOIN flights f ON b.flight_id = f.id
        ORDER BY b.created_at DESC
        LIMIT 10
      `.catch(() => []),

      // Upcoming flights (5)
      sql`
        SELECT
          id,
          flight_no,
          CONCAT(from_code, ' - ', to_code) AS route,
          from_code,
          to_code,
          depart_time,
          available,
          status
        FROM flights
        WHERE depart_time >= NOW()
        ORDER BY depart_time ASC
        LIMIT 5
      `.catch(() => []),
    ]);

    // Parse KPI
    const kpiRow = asFirstRow<{
      bookings_today?: number | string;
      bookings_yesterday?: number | string;
      revenue_today?: number | string;
      revenue_yesterday?: number | string;
    }>(kpiResult);

    const userRow = asFirstRow<{
      total_users?: number | string;
      active_users?: number | string;
      prev_active_users?: number | string;
    }>(userResult);

    const lfRow = asFirstRow<{
      lf_today?: number | string;
      lf_yesterday?: number | string;
    }>(lfResult);

    const bookingsToday = Number(kpiRow?.bookings_today) || 0;
    const bookingsYesterday = Number(kpiRow?.bookings_yesterday) || 0;
    const revenueToday = Number(kpiRow?.revenue_today) || 0;
    const revenueYesterday = Number(kpiRow?.revenue_yesterday) || 0;

    const activeUsers = Number(userRow?.active_users) || Number(userRow?.total_users) || 0;
    const prevActiveUsers = Number(userRow?.prev_active_users) || 0;

    const loadFactor = lfRow?.lf_today != null ? Number(lfRow.lf_today) : 75.0;
    const prevLoadFactor = lfRow?.lf_yesterday != null ? Number(lfRow.lf_yesterday) : loadFactor;

    const calculatePercentChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const kpi: KPIData = {
      bookingsToday,
      bookingsTodayChange: calculatePercentChange(bookingsToday, bookingsYesterday),
      revenueToday,
      revenueTodayChange: calculatePercentChange(revenueToday, revenueYesterday),
      activeUsers,
      activeUsersChange: calculatePercentChange(activeUsers, prevActiveUsers),
      loadFactor,
      loadFactorChange: Math.round((loadFactor - prevLoadFactor) * 10) / 10,
    };

    // Revenue 30 days
    const revenueMap = new Map<string, { revenue: number; bookings: number }>();
    for (const r of asRows<{
      date?: string;
      bookings?: number | string;
      revenue?: number | string;
    }>(revenueResult)) {
      if (r.date) {
        revenueMap.set(r.date, {
          bookings: Number(r.bookings) || 0,
          revenue: Number(r.revenue) || 0,
        });
      }
    }

    const revenue: RevenuePoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() + 7 * 3600 * 1000 - i * 86400 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = revenueMap.get(dateStr);
      revenue.push({
        date: dateStr,
        revenue: entry ? entry.revenue : 0,
        bookings: entry ? entry.bookings : 0,
      });
    }

    // Seat Distribution
    let ecoCount = 0;
    let deluxeCount = 0;
    let skybossCount = 0;
    let businessCount = 0;

    for (const s of asRows<{ seat_number?: string }>(seatResult)) {
      const numStr = String(s.seat_number || '');
      const match = /^(\d+)/.exec(numStr.trim());
      const row = match ? parseInt(match[1], 10) : 0;
      if (row <= 2) {
        businessCount++;
      } else if (row === 3) {
        skybossCount++;
      } else if (row <= 10) {
        deluxeCount++;
      } else {
        ecoCount++;
      }
    }

    let totalSeats = ecoCount + deluxeCount + skybossCount + businessCount;
    if (totalSeats === 0) {
      const cancelRow = asFirstRow<{ total?: number | string }>(cancelResult);
      const totalBookings = Number(cancelRow?.total) || 0;
      if (totalBookings > 0) {
        ecoCount = Math.round(totalBookings * 0.65);
        deluxeCount = Math.round(totalBookings * 0.2);
        skybossCount = Math.round(totalBookings * 0.1);
        businessCount = Math.max(0, totalBookings - ecoCount - deluxeCount - skybossCount);
        totalSeats = ecoCount + deluxeCount + skybossCount + businessCount;
      }
    }

    const seatDistribution: SeatDistribution[] = [
      {
        name: 'Eco',
        class: 'eco',
        count: ecoCount,
        percent: totalSeats > 0 ? Math.round((ecoCount / totalSeats) * 1000) / 10 : 0,
        color: '#7CB342',
      },
      {
        name: 'Deluxe',
        class: 'deluxe',
        count: deluxeCount,
        percent: totalSeats > 0 ? Math.round((deluxeCount / totalSeats) * 1000) / 10 : 0,
        color: '#F4511E',
      },
      {
        name: 'SkyBoss',
        class: 'skyboss',
        count: skybossCount,
        percent: totalSeats > 0 ? Math.round((skybossCount / totalSeats) * 1000) / 10 : 0,
        color: '#EC2029',
      },
      {
        name: 'Business',
        class: 'business',
        count: businessCount,
        percent: totalSeats > 0 ? Math.round((businessCount / totalSeats) * 1000) / 10 : 0,
        color: '#B8860B',
      },
    ];

    // Top Routes
    let topRoutes: TopRoute[] = asRows<{
      route?: string;
      bookings?: number | string;
      revenue?: number | string;
    }>(routeResult).map((r) => ({
      route: String(r.route || ''),
      bookings: Number(r.bookings) || 0,
      revenue: Number(r.revenue) || 0,
    }));

    if (topRoutes.length === 0) {
      topRoutes = [
        { route: 'SGN - HAN', bookings: 0, revenue: 0 },
        { route: 'HAN - SGN', bookings: 0, revenue: 0 },
        { route: 'SGN - DAD', bookings: 0, revenue: 0 },
        { route: 'DAD - HAN', bookings: 0, revenue: 0 },
        { route: 'SGN - PQC', bookings: 0, revenue: 0 },
      ];
    }

    // Cancellation Rate
    const cancelRow = asFirstRow<{
      total?: number | string;
      cancelled?: number | string;
    }>(cancelResult);
    const cancelTotal = Number(cancelRow?.total) || 0;
    const cancelCount = Number(cancelRow?.cancelled) || 0;
    const cancellationRate: CancellationRate = {
      total: cancelTotal,
      cancelled: cancelCount,
      rate: cancelTotal > 0 ? Math.round((cancelCount / cancelTotal) * 1000) / 10 : 0,
    };

    // Recent Bookings (10)
    let recentBookings: DashboardBookingSummary[] = asRows<{
      id?: string;
      booking_code?: string;
      customer_name?: string;
      route?: string;
      total_price?: number | string;
      status?: string;
      created_at?: string | Date;
    }>(recentBookingResult).map((b) => ({
      id: String(b.id || ''),
      bookingCode: String(
        b.booking_code ||
          String(b.id || '')
            .slice(0, 6)
            .toUpperCase()
      ),
      customerName: String(b.customer_name || 'Khách hàng'),
      route: String(b.route || '—'),
      totalPrice: Number(b.total_price) || 0,
      status: String(b.status || 'pending'),
      createdAt: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
    }));

    // Fallback for mock DB if complex join returned empty
    if (recentBookings.length === 0) {
      const mockBookingsFallback = await sql`
        SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10
      `.catch(() => []);

      recentBookings = asRows<{
        id?: string;
        booking_code?: string;
        customer_name?: string;
        route?: string;
        total_price?: number | string;
        status?: string;
        created_at?: string | Date;
      }>(mockBookingsFallback).map((b) => ({
        id: String(b.id || ''),
        bookingCode: String(
          b.booking_code ||
            String(b.id || '')
              .slice(0, 6)
              .toUpperCase()
        ),
        customerName: String(b.customer_name || 'Khách hàng'),
        route: String(b.route || 'HAN - SGN'),
        totalPrice: Number(b.total_price) || 0,
        status: String(b.status || 'pending'),
        createdAt: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    // Upcoming Flights (5)
    let upcomingFlights: DashboardFlightSummary[] = asRows<{
      id?: string;
      flight_no?: string;
      route?: string;
      from_code?: string;
      to_code?: string;
      depart_time?: string | Date;
      available?: number | string;
      status?: string;
    }>(upcomingFlightResult).map((f) => ({
      id: String(f.id || ''),
      flightNo: String(f.flight_no || ''),
      route: String(
        f.route || (f.from_code && f.to_code ? `${f.from_code} - ${f.to_code}` : 'HAN - SGN')
      ),
      departTime: f.depart_time ? new Date(f.depart_time).toISOString() : new Date().toISOString(),
      availableSeats: Number(f.available) || 0,
      status: String(f.status || 'active'),
    }));

    // If upcoming flights is empty, fallback to simple select
    if (upcomingFlights.length === 0) {
      const fallbackFlights = await sql`
        SELECT id, flight_no, from_code, to_code, depart_time, available, status
        FROM flights
        ORDER BY depart_time DESC
        LIMIT 5
      `.catch(() => []);

      upcomingFlights = asRows<{
        id?: string;
        flight_no?: string;
        route?: string;
        from_code?: string;
        to_code?: string;
        depart_time?: string | Date;
        available?: number | string;
        status?: string;
      }>(fallbackFlights).map((f) => ({
        id: String(f.id || ''),
        flightNo: String(f.flight_no || ''),
        route: String(
          f.route || (f.from_code && f.to_code ? `${f.from_code} - ${f.to_code}` : 'HAN - SGN')
        ),
        departTime: f.depart_time
          ? new Date(f.depart_time).toISOString()
          : new Date().toISOString(),
        availableSeats: Number(f.available) || 0,
        status: String(f.status || 'active'),
      }));
    }

    return {
      kpi,
      revenue,
      seatDistribution,
      topRoutes,
      cancellationRate,
      recentBookings,
      upcomingFlights,
    };
  } catch (err) {
    console.error('Error in getDashboardSummaryData:', err);
    return getFallbackDashboardSummary();
  }
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
  try {
    const rows = await sql`
      SELECT id, tool_key, tool_label, executed_by, params_json, result_summary, status, created_at
      FROM sstk_tool_logs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows as SstkToolLogRecord[];
  } catch (error) {
    console.warn('[DB] getSstkLogs fallback:', error);
    return [];
  }
}

export async function insertSstkLog(
  toolKey: string,
  toolLabel: string,
  executedBy: string,
  paramsJson: string,
  resultSummary: string,
  status: 'success' | 'error' | 'partial' = 'success'
): Promise<void> {
  try {
    await sql`
      INSERT INTO sstk_tool_logs (tool_key, tool_label, executed_by, params_json, result_summary, status)
      VALUES (${toolKey}, ${toolLabel}, ${executedBy}, ${paramsJson}, ${resultSummary}, ${status})
    `;
  } catch (error) {
    console.warn('[DB] insertSstkLog fallback:', error);
  }
}

// ─── Bank Account (receiving account for bank transfers) ───────────────────

export interface BankAccountRecord {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  bank_bin?: string | null;
  branch?: string | null;
  logo_url?: string | null;
  is_default?: boolean | null;
  transfer_note_template?: string | null;
}

/**
 * Active receiving accounts, default first.
 *
 * The payment route renders the transfer memo through each account's template
 * so the memo it validates against is the same string the customer was shown;
 * deriving it twice would let the two drift.
 */
export async function getActiveBankAccounts(): Promise<BankAccountRecord[]> {
  const rows = await sql`
    SELECT id, bank_name, account_number, account_holder,
           bank_bin, branch, logo_url, is_default, transfer_note_template
    FROM bank_accounts
    WHERE is_active = true
    ORDER BY is_default DESC, created_at DESC
  `;
  return rows as BankAccountRecord[];
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

/**
 * The one place a wallet balance changes.
 *
 * Every caller used to do the same three statements in sequence —
 * `SELECT balance`, `INSERT` the ledger row, `UPDATE user_wallets SET balance
 = <computed in JS>` — with no transaction around them. That is a lost update:
 * two concurrent writes both read the same balance, both compute
 * `before + delta`, and the second `UPDATE` overwrites the first one's money.
 * Measured on Postgres 17, two 40,000 top-ups against 50,000 ended at 90,000
 * instead of 130,000, and two 100,000 withdrawals from a 100,000 wallet both
 * succeeded and left it at 0 — 200,000 paid out of 100,000.
 *
 * `CHECK (balance >= 0)` does not help. It reads the *final* value, and the
 * lost-update result is 0, which passes.
 *
 * The fix needs no transaction API and no explicit `FOR UPDATE`: Postgres
 * re-evaluates an `UPDATE`'s `WHERE` after it unblocks on a concurrent writer
 * (READ COMMITTED, EPQ), so putting the funds check *in* the `UPDATE` makes
 * every write test its own precondition against the balance it actually
 * found. Measured: two 40,000 top-ups land on 130,000 with a coherent ledger
 * (50,000 → 90,000 → 130,000), and of two 100,000 withdrawals from 100,000
 * exactly one commits while the other matches no row.
 *
 * The ledger `INSERT` hangs off that `UPDATE` as a data-modifying CTE, so a
 * committed move and its audit row are the same statement. A failure anywhere
 * rolls the whole thing back — the old order left a `completed` log row behind
 * whenever the `UPDATE` was the statement that failed.
 *
 * Wallet creation is a separate statement on purpose. Folding it into this
 * one (`INSERT ... ON CONFLICT DO UPDATE` in a CTE feeding the `UPDATE`) looks
 * tidier and is broken: a statement cannot update a row its own CTE just wrote,
 * so the `UPDATE` matches nothing and Postgres reports no error at all.
 * Measured — the CTE returned 1 row, the `UPDATE` returned 0, and the balance
 * never moved. A customer topping up for the first time would be told it
 * worked while nothing was credited. `ensureWallet` below is a write-only
 * `ON CONFLICT DO NOTHING`; correctness still rests on the `UPDATE`.
 */
async function moveWalletBalance(opts: {
  userId: string;
  /** Signed: positive credits the wallet, negative debits it. */
  delta: number;
  type: 'topup' | 'withdraw' | 'payment' | 'refund';
  /** When true, the `UPDATE` refuses to move the balance below zero. */
  requireFunds: boolean;
  description: string;
  paymentMethodId: string | null;
  referenceId: string | null;
}): Promise<WalletTransactionRecord> {
  const { userId, delta, type, requireFunds, description, paymentMethodId, referenceId } = opts;

  await ensureWallet(userId);

  // Both `type` and `status` are bound, never spliced into the SQL text.
  // `'${type}'` inside quotes is the trap: the driver still emits `$5`, so the
  // query becomes the *string* `'$5'`, Postgres sees no parameter at that
  // position, and it answers `could not determine data type of parameter $5`
  // (42P18). Nothing catches that until a real database is behind the query —
  // a unit test with a mocked `sql` passes happily. The casts give the
  // parameters a type at parse time instead.

  const row = await (requireFunds
    ? sql`
        WITH moved AS (
          UPDATE user_wallets
          SET balance = balance + ${delta}, updated_at = NOW()
          WHERE user_id = ${userId} AND balance + ${delta} >= 0
          RETURNING id, balance - ${delta} AS balance_before, balance AS balance_after
        )
        INSERT INTO wallet_transactions (
          wallet_id, type, amount, balance_before, balance_after,
          description, payment_method_id, reference_id, status
        )
        SELECT id, ${type}::varchar(20), ${delta}, balance_before, balance_after,
               ${description}, ${paymentMethodId}, ${referenceId}, 'completed'
        FROM moved
        RETURNING *
      `
    : sql`
        WITH moved AS (
          UPDATE user_wallets
          SET balance = balance + ${delta}, updated_at = NOW()
          WHERE user_id = ${userId}
          RETURNING id, balance - ${delta} AS balance_before, balance AS balance_after
        )
        INSERT INTO wallet_transactions (
          wallet_id, type, amount, balance_before, balance_after,
          description, payment_method_id, reference_id, status
        )
        SELECT id, ${type}::varchar(20), ${delta}, balance_before, balance_after,
               ${description}, ${paymentMethodId}, ${referenceId}, 'completed'
        FROM moved
        RETURNING *
      `);

  // No row means the `UPDATE`'s `WHERE` matched nothing: for a debit, the
  // balance was insufficient once the row lock was actually granted. Saying so
  // is the whole point — the caller must not tell an operator a payout is on
  // its way when the wallet never had the money.
  if (!row || row.length === 0) {
    throw new Error(requireFunds ? 'Số dư ví không đủ' : 'Không tìm thấy ví của người dùng này');
  }

  return (row as WalletTransactionRecord[])[0];
}

/**
 * Creates the wallet if it is missing; never fails when it already exists.
 *
 * `ON CONFLICT (user_id)` targets the `UNIQUE(user_id)` from migration 002 —
 * not `account_number`, whose own UNIQUE 006 only adds on a database that has
 * no duplicates, so it cannot be relied on here.
 */
async function ensureWallet(userId: string): Promise<void> {
  const accNum =
    'VJSIM' +
    Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, '0');
  await sql`
    INSERT INTO user_wallets (user_id, balance, currency, account_number)
    VALUES (${userId}, 0, 'VND', ${accNum})
    ON CONFLICT (user_id) DO NOTHING
  `;
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
  return moveWalletBalance({
    userId,
    delta: amount,
    type: 'topup',
    requireFunds: false,
    description: description || 'Nạp tiền vào ví',
    paymentMethodId: paymentMethodId || null,
    referenceId: null,
  });
}

export async function withdrawWallet(
  userId: string,
  amount: number,
  paymentMethodId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  // Validate BEFORE computing the new balance to avoid NaN arithmetic.
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền rút không hợp lệ');
  return moveWalletBalance({
    userId,
    delta: -amount,
    type: 'withdraw',
    requireFunds: true,
    description: description || 'Rút tiền từ ví',
    paymentMethodId,
    referenceId: null,
  });
}

export async function spendWalletBalance(
  userId: string,
  amount: number,
  referenceId: string,
  description?: string
): Promise<WalletTransactionRecord> {
  // Defense-in-depth: validate BEFORE reading/computing balances.
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền thanh toán không hợp lệ');
  return moveWalletBalance({
    userId,
    delta: -amount,
    type: 'payment',
    requireFunds: true,
    description: description || 'Thanh toán bằng ví',
    paymentMethodId: null,
    referenceId,
  });
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
  // Migration 037's `wallet_transactions_one_refund_per_reference` is what
  // actually enforces the one-refund rule. This lookup is not that enforcement
  // — checking here cannot close the race, because two approvals can both read
  // "no refund yet" and both proceed. It exists so the caller learns *why* the
  // booking was already paid out, instead of reading a raw unique-violation
  // from the ledger insert, which surfaces as a bare 500.
  const alreadyRefunded = await sql`
    SELECT id FROM wallet_transactions
    WHERE type = 'refund' AND reference_id = ${referenceId}
    LIMIT 1
  `;
  if (alreadyRefunded.length > 0) {
    throw new Error(`Booking ${referenceId} đã được hoàn tiền trước đó`);
  }

  return moveWalletBalance({
    userId,
    delta: amount,
    type: 'refund',
    requireFunds: false,
    description: description || `Hoàn tiền vào ví #${referenceId}`,
    paymentMethodId: null,
    referenceId,
  });
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
    VALUES (${userId}, ${program.id}, 'Red')
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
  description: string = 'Đổi điểm thưởng',
  /**
   * The booking the points were spent on. `loyalty_transactions.booking_id`
   * already existed but nothing wrote to it, so a refund had no way to find
   * out how many points a booking had burned. Linking the row here is what
   * lets the refund path hand them back.
   */
  bookingId?: string | null
): Promise<LoyaltyTransactionRecord> {
  if (pointsToSpend <= 0) {
    throw new Error('Points to spend must be greater than 0');
  }

  const loyalty = await getOrEnrollLoyalty(userId);

  const result = await sql`
    WITH updated AS (
      UPDATE user_loyalty
      SET available_points = available_points - ${pointsToSpend},
          updated_at = NOW()
      WHERE id = ${loyalty.id} AND available_points >= ${pointsToSpend}
      RETURNING id
    )
    INSERT INTO loyalty_transactions (user_loyalty_id, points, type, description, booking_id)
    SELECT id, ${-pointsToSpend}, 'redeem', ${description}, ${bookingId ?? null}
    FROM updated
    RETURNING id, user_loyalty_id, points, type, description, created_at
  `;

  const transaction = (result as LoyaltyTransactionRecord[])[0];
  if (!transaction) {
    throw new Error('Insufficient loyalty points');
  }

  return transaction;
}

export async function refundLoyaltyPoints(
  userId: string,
  points: number,
  description: string = 'Hoàn điểm thưởng'
): Promise<LoyaltyTransactionRecord> {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error('Points to refund must be greater than 0');
  }

  const loyalty = await getOrEnrollLoyalty(userId);

  const result = await sql`
    WITH updated AS (
      UPDATE user_loyalty
      SET available_points = available_points + ${points},
          updated_at = NOW()
      WHERE id = ${loyalty.id}
      RETURNING id
    )
    INSERT INTO loyalty_transactions (user_loyalty_id, points, type, description)
    SELECT id, ${points}, 'adjust', ${description}
    FROM updated
    RETURNING id, user_loyalty_id, points, type, description, created_at
  `;

  const transaction = (result as LoyaltyTransactionRecord[])[0];
  if (!transaction) {
    throw new Error('Cannot refund loyalty points');
  }

  return transaction;
}

/**
 * Hoàn lại SkyPoint đã dùng cho một đơn đặt chỗ cụ thể.
 *
 * Khi khách thanh toán bằng tiền mặt + điểm, họ đã mất điểm. Nếu đơn bị hoàn
 * tiền mà điểm không trả lại, khách mất tiền *và* mất điểm cho cùng một chuyến
 * bay — đúng thứ mà quy trình hoàn tiền nên tránh.
 *
 * Điểm đã dùng được ghi vào `loyalty_transactions` với `type = 'redeem'`. Hàm
 * này tính tổng điểm đã trừ của đơn rồi cộng lại, và trừ điểm đã hoàn trước đó
 * để không bao giờ hoàn hai lần.
 */
export async function refundLoyaltyPointsForBooking(
  bookingId: string,
  userId: string
): Promise<{ pointsRefunded: number } | null> {
  const booking = asFirstRow<BookingRecord>(
    await sql`SELECT booking_code FROM bookings WHERE id = ${bookingId} LIMIT 1`
  );
  const bookingCode = booking?.booking_code || bookingId;

  // Điểm đã dùng: ưu tiên `booking_id` (ghi từ bản vá mới), fallback khớp mô
  // tả bằng mã đặt chỗ cho các giao dịch cũ chưa có `booking_id`.
  const spentRows = await sql`
    SELECT COALESCE(SUM(t.points), 0) AS spent
    FROM loyalty_transactions t
    JOIN user_loyalty ul ON ul.id = t.user_loyalty_id
    WHERE ul.user_id = ${userId}
      AND t.type = 'redeem'
      AND t.points < 0
      AND (
        t.booking_id::text = ${bookingId}
        OR t.description ILIKE ${'%đặt chỗ ' + bookingCode + '%'}
      )
  `;
  const spent = Math.abs(Number(asFirstRow<{ spent: number }>(spentRows)?.spent) || 0);
  if (spent <= 0) return { pointsRefunded: 0 };

  // Điểm đã hoàn trước đó cho cùng đơn (chống hoàn hai lần).
  const refundedRows = await sql`
    SELECT COALESCE(SUM(t.points), 0) AS refunded
    FROM loyalty_transactions t
    JOIN user_loyalty ul ON ul.id = t.user_loyalty_id
    WHERE ul.user_id = ${userId}
      AND t.type = 'adjust'
      AND t.points > 0
      AND (
        t.booking_id::text = ${bookingId}
        OR t.description ILIKE ${'%Hoàn điểm do hoàn tiền đặt chỗ ' + bookingCode + '%'}
      )
  `;
  const alreadyRefunded = Number(asFirstRow<{ refunded: number }>(refundedRows)?.refunded) || 0;

  const pointsToRefund = spent - alreadyRefunded;
  if (pointsToRefund <= 0) return { pointsRefunded: 0 };

  await refundLoyaltyPoints(
    userId,
    pointsToRefund,
    `Hoàn điểm do hoàn tiền đặt chỗ ${bookingCode}`
  );

  return { pointsRefunded: pointsToRefund };
}

/**
 * Tổng số tiền mặt đã thu cho một đơn (đã hoàn tất).
 *
 * Đơn trả bằng SkyPoint thu 0đ, đơn trả bằng ví/cash + điểm thu đúng phần
 * tiền mặt. Số tiền hoàn phải bám theo con số này, không theo `total_price`:
 * hoàn theo giá vé gốc khiến công ty trả ra tiền mà khách chưa từng trả.
 *
 * `hasCompletedPayment` phân biệt "không có tiền nào thu" với "tiền chưa
 * được ghi nhận". Chuyển khoản ngân hàng chỉ ghi nhận là `completed` sau khi
 * nhân viên xác nhận, nên đơn đó vẫn phải cho khách gửi yêu cầu hoàn tiền.
 */
export async function getBookingCashPaid(
  bookingId: string
): Promise<{ cashPaid: number; hasCompletedPayment: boolean }> {
  const rows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS paid, COUNT(*) AS cnt
    FROM payments
    WHERE booking_id = ${bookingId} AND status = 'completed'
  `;
  const row = asFirstRow<{ paid: number; cnt: number }>(rows);
  return {
    cashPaid: Number(row?.paid) || 0,
    hasCompletedPayment: Number(row?.cnt) > 0,
  };
}

/**
 * Cộng điểm SkyPoint cho một người dùng (ví dụ thưởng mã giới thiệu).
 *
 * Ba bộ đếm trên `user_loyalty` được cập nhật cùng nhịp: `available_points` là
 * điểm tiêu được, `total_points`/`lifetime_points` là số tích luỹ dùng để xét
 * hạng. Bỏ sót `lifetime_points` khiến khách có điểm mà không lên hạng.
 */
export async function awardLoyaltyPoints(
  userId: string,
  points: number,
  description: string,
  type: 'bonus' | 'earn' | 'adjust' = 'bonus'
): Promise<LoyaltyTransactionRecord> {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error('Points to award must be greater than 0');
  }

  const loyalty = await getOrEnrollLoyalty(userId);

  const result = await sql`
    INSERT INTO loyalty_transactions (user_loyalty_id, points, type, description)
    VALUES (${loyalty.id}, ${points}, ${type}, ${description})
    RETURNING id, user_loyalty_id, points, type, description, created_at
  `;

  const newLifetime = Number(loyalty.lifetime_points || 0) + points;
  let newTier = loyalty.tier || 'Red';
  if (newLifetime >= 150000) {
    newTier = 'Diamond';
  } else if (newLifetime >= 50000) {
    newTier = 'Gold';
  } else if (newLifetime >= 10000) {
    newTier = 'Silver';
  } else {
    newTier = 'Red';
  }

  await sql`
    UPDATE user_loyalty
    SET available_points = available_points + ${points},
        total_points = total_points + ${points},
        lifetime_points = lifetime_points + ${points},
        tier = ${newTier},
        tier_qualified_at = CASE WHEN tier <> ${newTier} THEN NOW() ELSE tier_qualified_at END,
        updated_at = NOW()
    WHERE id = ${loyalty.id}
  `;

  return (result as LoyaltyTransactionRecord[])[0];
}

/**
 * Tích lũy điểm thưởng tự động cho vé máy bay đã thanh toán thành công
 * theo hệ số hạng thẻ: Red (x1.0), Silver (x1.2), Gold (x1.5), Diamond (x2.0).
 */
export async function awardBookingLoyaltyPoints(
  bookingId: string,
  amountVnd: number,
  userId?: string | null
): Promise<{ pointsEarned: number; newTier: string } | null> {
  let targetUserId = userId;
  let bookingCode = bookingId;

  if (!targetUserId) {
    const booking = asFirstRow<BookingRecord>(
      await sql`SELECT * FROM bookings WHERE id = ${bookingId} LIMIT 1`
    );
    if (!booking) return null;
    bookingCode = booking.booking_code || booking.id;
    targetUserId = booking.user_id;
  } else {
    const booking = asFirstRow<BookingRecord>(
      await sql`SELECT booking_code FROM bookings WHERE id = ${bookingId} LIMIT 1`
    );
    if (booking?.booking_code) bookingCode = booking.booking_code;
  }

  if (!targetUserId) return null;

  const loyaltyData = await getUserLoyaltyWithProgram(targetUserId);
  if (!loyaltyData) return null;

  const tierMultipliers: Record<string, number> = {
    Red: 1.0,
    Silver: 1.2,
    Gold: 1.5,
    Diamond: 2.0,
    Bronze: 1.0,
    Platinum: 2.0,
  };

  const currentTier = loyaltyData.loyalty.tier || 'Red';
  const multiplier = tierMultipliers[currentTier] ?? 1.0;
  const rate = Number(loyaltyData.program.points_per_1000_vnd) || 1.0;
  const pointsEarned = Math.max(1, Math.floor((amountVnd / 1000) * rate * multiplier));

  await awardLoyaltyPoints(
    targetUserId,
    pointsEarned,
    `Tích lũy điểm chuyến bay ${bookingCode} (Hạng ${currentTier} x${multiplier})`,
    'earn'
  );

  const updatedLoyalty = await getOrEnrollLoyalty(targetUserId);
  return { pointsEarned, newTier: updatedLoyalty.tier };
}

// ─── Trip / Leg Queries (migration 045) ───────────────────────────────────────

/**
 * Một chặng của một trip khứ hồi.
 *
 * Trước migration 045, chặng về là một dòng `bookings` hoàn toàn độc lập: liên
 * kết với chặng đi chỉ tồn tại trong response API và `sessionStorage` của
 * trình duyệt. Hệ quả: không thể tra cứu "mã đặt chỗ nào cũng ra cả hai
 * chặng", không thể check-in riêng từng chặng, và không thể hiển thị một thẻ
 * trip gồm đi + về. `trip_id` + `leg_role` đặt quan hệ đó vào cơ sở dữ liệu.
 */
export interface TripLegRecord {
  /** UUID của dòng `bookings` của chặng này. */
  bookingId: string;
  /** PNR của chặng này — mỗi chặng giữ PNR riêng. */
  bookingCode: string | null;
  /** 'outbound' (đi) hoặc 'inbound' (về). */
  legRole: 'outbound' | 'inbound';
  status: BookingRecord['status'];
  totalPrice: number;
  flightId: string;
  flightNo: string;
  fromCode: string;
  toCode: string;
  fromCity: string;
  toCity: string;
  departTime: string;
  arriveTime: string;
  /** Trạng thái chuyến bay — nguồn cho SSE realtime. */
  flightStatus: FlightStatus;
  gate: string | null;
  terminal: string | null;
  passengers: Array<{
    id: string;
    name: string;
    dob: string | null;
    id_number: string | null;
    /** Ghế của hành khách này (migration 046). */
    seat_number: string | null;
  }>;
  /** Check-in của chặng này, theo từng hành khách. */
  checkIns: Array<{
    id: string;
    passenger_id: string | null;
    passenger_name: string;
    seat_number: string;
    check_in_number: string;
    boarding_pass_number: string | null;
    gate: string | null;
    terminal: string | null;
    check_in_time: string | null;
  }>;
}

export interface TripRecord {
  /** `trip_id` chung của hai chặng. */
  tripId: string;
  legs: TripLegRecord[];
}

/**
 * Tra một trip từ PNR (hoặc UUID) của MỘT trong hai chặng.
 *
 * `UPPER()` ở cả hai vế: PNR gồm chữ cái lẫn chữ số (`FG7KH9`), nên khách
 * gõ `fg7kh9` trên điện thoại (tắt caps-lock) vẫn phải ra kết quả. So khớp
 * phân biệt hoa thường là lỗi 404, không phải lỗi bảo mật.
 */
export async function getTripByCodeOrId(codeOrId: string): Promise<TripRecord | null> {
  const anchor = await sql`
    SELECT b.trip_id
    FROM bookings b
    WHERE (b.id::text = ${codeOrId} OR UPPER(b.booking_code) = UPPER(${codeOrId}))
    LIMIT 1
  `;

  const tripId = asFirstRow<{ trip_id: string | null }>(anchor)?.trip_id;
  if (!tripId) return null;

  return getTripById(tripId);
}

/** Tra một trip theo `trip_id`. */
export async function getTripById(tripId: string): Promise<TripRecord | null> {
  const legRows = await sql`
    SELECT b.id, b.booking_code, b.leg_role, b.status, b.total_price, b.flight_id,
           f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time,
           f.status AS flight_status, f.gate, f.terminal,
           af.city AS from_city, at.city AS to_city
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    LEFT JOIN airports af ON af.code = f.from_code
    LEFT JOIN airports at ON at.code = f.to_code
    WHERE b.trip_id = ${tripId}
    ORDER BY CASE b.leg_role WHEN 'outbound' THEN 0 ELSE 1 END, b.created_at
  `;

  const rows = asRows<{
    id: string;
    booking_code: string | null;
    leg_role: 'outbound' | 'inbound';
    status: BookingRecord['status'];
    total_price: string | number;
    flight_id: string;
    flight_no: string;
    from_code: string;
    to_code: string;
    from_city: string | null;
    to_city: string | null;
    depart_time: string;
    arrive_time: string;
    flight_status: FlightStatus;
    gate: string | null;
    terminal: string | null;
  }>(legRows);

  if (rows.length === 0) return null;

  const bookingIds = rows.map((r) => r.id);

  // `ANY($1::uuid[])` chứ không phải `= ANY(${ids}::uuid[])`: driver Neon
  // serialize mảng thành mảng Postgres, nhưng bind kiểu `::uuid[]` qua tagged
  // template là đường dẫn không được kiểm chứng ở đây. `sql.query` với
  // placeholder tường minh là cách repo này đã dùng cho mọi truy vấn có
  // danh sách tham số (`getBookingsByUserId` v.v.).
  const passengerRows = await sql.query(
    `SELECT id, booking_id, name, dob, id_number, seat_number
     FROM passengers
     WHERE booking_id = ANY($1::uuid[])
     ORDER BY created_at`,
    [bookingIds]
  );

  const checkInRows = await sql.query(
    `SELECT id, booking_id, passenger_id, passenger_name, seat_number,
            check_in_number, boarding_pass_number, gate, terminal, check_in_time
     FROM check_in
     WHERE booking_id = ANY($1::uuid[])
     ORDER BY check_in_time`,
    [bookingIds]
  );

  const passengersByBooking = new Map<string, TripLegRecord['passengers']>();
  for (const p of asRows<{
    id: string;
    booking_id: string;
    name: string;
    dob: string | null;
    id_number: string | null;
    seat_number: string | null;
  }>(passengerRows)) {
    const list = passengersByBooking.get(p.booking_id) ?? [];
    list.push({
      id: p.id,
      name: p.name,
      dob: p.dob,
      id_number: p.id_number,
      seat_number: p.seat_number,
    });
    passengersByBooking.set(p.booking_id, list);
  }

  const checkInsByBooking = new Map<string, TripLegRecord['checkIns']>();
  for (const c of asRows<{
    id: string;
    booking_id: string;
    passenger_id: string | null;
    passenger_name: string;
    seat_number: string;
    check_in_number: string;
    boarding_pass_number: string | null;
    gate: string | null;
    terminal: string | null;
    check_in_time: string | null;
  }>(checkInRows)) {
    const list = checkInsByBooking.get(c.booking_id) ?? [];
    list.push({
      id: c.id,
      passenger_id: c.passenger_id,
      passenger_name: c.passenger_name,
      seat_number: c.seat_number,
      check_in_number: c.check_in_number,
      boarding_pass_number: c.boarding_pass_number,
      gate: c.gate,
      terminal: c.terminal,
      check_in_time: c.check_in_time,
    });
    checkInsByBooking.set(c.booking_id, list);
  }

  return {
    tripId,
    legs: rows.map((r) => ({
      bookingId: r.id,
      bookingCode: r.booking_code,
      legRole: r.leg_role,
      status: r.status,
      totalPrice: parseFloat(String(r.total_price)),
      flightId: r.flight_id,
      flightNo: r.flight_no,
      fromCode: r.from_code,
      toCode: r.to_code,
      fromCity: r.from_city ?? '',
      toCity: r.to_city ?? '',
      departTime: r.depart_time,
      arriveTime: r.arrive_time,
      flightStatus: r.flight_status,
      gate: r.gate,
      terminal: r.terminal,
      passengers: passengersByBooking.get(r.id) ?? [],
      checkIns: checkInsByBooking.get(r.id) ?? [],
    })),
  };
}

/**
 * Ghi ghế của một hành khách vào `passengers.seat_number`.
 *
 * Migration 046 thêm cột này vì trước đó ghế chỉ thuộc về `seats` (gắn
 * booking), nên không ánh xạ được hành khách → ghế: không sinh được boarding
 * pass theo từng người, và cũng không có chỗ ghi khi khách đổi ghế sau khi
 * đặt vé.
 */
export async function setPassengerSeatNumber(
  passengerId: string,
  seatNumber: string | null
): Promise<void> {
  await sql`
    UPDATE passengers
    SET seat_number = ${seatNumber}
    WHERE id = ${passengerId}
  `;
}

// ─── Dịch vụ mua thêm & đổi ghế sau khi đặt vé (migration 046) ───────────────

export interface BookingBaggageRecord {
  id: string;
  booking_id: string;
  package_id: string;
  weight_kg: number;
  unit_price: number;
  quantity: number;
  status: 'pending' | 'paid' | 'cancelled';
  /** Giao dịch đã thu tiền cho gói này (migration 047). */
  payment_id?: string | null;
  created_at: string;
}

/** Danh sách dịch vụ đã mua thêm của một đặt chỗ. */
export async function getBookingBaggage(bookingId: string): Promise<BookingBaggageRecord[]> {
  const rows = await sql`
    SELECT id, booking_id, package_id, weight_kg, unit_price, quantity, status,
           payment_id, created_at
    FROM booking_baggage
    WHERE booking_id = ${bookingId}
    ORDER BY created_at
  `;

  return asRows<{
    id: string;
    booking_id: string;
    package_id: string;
    weight_kg: number;
    unit_price: string | number;
    quantity: number;
    status: 'pending' | 'paid' | 'cancelled';
    payment_id: string | null;
    created_at: string;
  }>(rows).map((row) => ({
    ...row,
    unit_price: parseFloat(String(row.unit_price)),
  }));
}

/**
 * Ghi nhận một gói hành lý khách mua thêm sau khi đã đặt vé.
 *
 * Giá do SERVER quyết định (`unitPrice`), không phải giá client gửi lên —
 * `pricing.ts` là nguồn sự thật duy nhất của mọi khoản phí trong một đặt vé,
 * và một đường ghi tiền mới phải tuân theo đúng quy tắc đó.
 */
export async function addBookingBaggage(input: {
  bookingId: string;
  packageId: string;
  weightKg: number;
  unitPrice: number;
  quantity: number;
  status?: 'pending' | 'paid';
}): Promise<BookingBaggageRecord> {
  const rows = await sql`
    INSERT INTO booking_baggage (booking_id, package_id, weight_kg, unit_price, quantity, status)
    VALUES (
      ${input.bookingId},
      ${input.packageId},
      ${input.weightKg},
      ${input.unitPrice},
      ${input.quantity},
      ${input.status ?? 'pending'}
    )
    ON CONFLICT (booking_id, package_id) DO UPDATE
      SET unit_price = EXCLUDED.unit_price,
          quantity = EXCLUDED.quantity,
          status = EXCLUDED.status,
          updated_at = NOW()
    RETURNING id, booking_id, package_id, weight_kg, unit_price, quantity, status, created_at
  `;

  const row = asFirstRow<{
    id: string;
    booking_id: string;
    package_id: string;
    weight_kg: number;
    unit_price: string | number;
    quantity: number;
    status: 'pending' | 'paid' | 'cancelled';
    created_at: string;
  }>(rows)!;

  return { ...row, unit_price: parseFloat(String(row.unit_price)) };
}

/**
 * Đánh dấu các gói hành lý của một đặt chỗ đã được thanh toán.
 *
 * `WHERE status = 'pending'` giữ cho lệnh này idempotent: chạy hai lần thì
 * gọi thứ hai không đụng vào dòng đã `paid`, nên không thể cộng tiền hai lần.
 */
export async function markBookingBaggagePaid(
  bookingId: string,
  paymentId?: string | null
): Promise<number> {
  const rows = await sql`
    UPDATE booking_baggage
    SET status = 'paid', payment_id = ${paymentId ?? null}, updated_at = NOW()
    WHERE booking_id = ${bookingId} AND status = 'pending'
    RETURNING id
  `;
  return asRows<{ id: string }>(rows).length;
}

/**
 * Cộng phí dịch vụ (hành lý mua thêm, phí đổi ghế) vào tổng tiền của đặt chỗ.
 *
 * Server tự tính `amount` rồi cộng vào — client không bao giờ gửi tổng tiền.
 * `delta` có thể âm khi hoàn tiền (đổi sang ghế rẻ hơn).
 */
export async function addBookingExtraCharge(bookingId: string, delta: number): Promise<void> {
  if (!Number.isFinite(delta) || delta === 0) return;
  await sql`
    UPDATE bookings
    SET total_price = COALESCE(total_price, 0) + ${delta}
    WHERE id = ${bookingId}
  `;
}

/**
 * Tổng tiền hành lý chưa thanh toán của một đặt chỗ.
 *
 * Đây là số tiền khách còn phải trả cho phần mua thêm. Nó được tính ở server
 * từ `booking_baggage`, không phải từ con số client gửi lên.
 */
export async function getPendingBaggageAmount(bookingId: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(unit_price * quantity), 0) AS total
    FROM booking_baggage
    WHERE booking_id = ${bookingId} AND status = 'pending'
  `;
  return parseFloat(String(asFirstRow<{ total: string | number }>(rows)?.total ?? 0));
}

/**
 * Đổi ghế của một hành khách sau khi đã đặt vé.
 *
 * `price_delta` là chênh lệch do SERVER tính (`getSeatCharge(new) −
 * getSeatCharge(old)`); client chỉ gửi ghế mới. Ghế cũ bị giải phóng và ghế
 * mới được chiếm trong cùng một câu lệnh, và `idx_seats_flight_seat_unique`
 * là cái ghim: khi ghế vừa có người chọn, Postgres báo 23505 và route trả 409.
 */
export async function changeBookingSeat(input: {
  bookingId: string;
  passengerId: string;
  oldSeat: string | null;
  newSeat: string;
  newSeatPrice: number;
  priceDelta: number;
}): Promise<void> {
  // Ghế cũ được giải phóng (nếu có).
  await sql`
    UPDATE seats
    SET status = 'available', check_in_status = 'not_checked_in', check_in_time = NULL
    WHERE booking_id = ${input.bookingId} AND seat_number = ${input.oldSeat ?? ''}
  `;

  const claimed = await sql`
    UPDATE seats
    SET status = 'reserved', price = ${input.newSeatPrice}
    WHERE booking_id = ${input.bookingId} AND flight_id = (
      SELECT flight_id FROM bookings WHERE id = ${input.bookingId}
    ) AND seat_number = ${input.newSeat}
    RETURNING id
  `;

  if (asRows<{ id: string }>(claimed).length === 0) {
    // Đặt chỗ KHÔNG chọn ghế khi đặt vé (chọn khi check-in) thì chưa có dòng
    // `seats` cho booking này — ghế mới phải được TẠO, không phải cập nhật.
    // `idx_seats_flight_seat_unique` vẫn là cái ghim: nếu ghế vừa có người
    // chọn, Postgres báo 23505 và route trả 409.
    try {
      await sql`
        INSERT INTO seats (booking_id, flight_id, seat_number, status, price)
        SELECT b.id, b.flight_id, ${input.newSeat}, 'reserved', ${input.newSeatPrice}
        FROM bookings b
        WHERE b.id = ${input.bookingId}
      `;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('23505') || message.includes('idx_seats_flight_seat_unique')) {
        throw error;
      }
      throw new Error('SEAT_NOT_IN_BOOKING');
    }
  }

  await sql`
    INSERT INTO booking_seat_changes (booking_id, passenger_id, old_seat, new_seat, price_delta)
    VALUES (${input.bookingId}, ${input.passengerId}, ${input.oldSeat ?? null}, ${input.newSeat}, ${input.priceDelta})
  `;

  await sql`
    UPDATE passengers
    SET seat_number = ${input.newSeat}
    WHERE id = ${input.passengerId}
  `;
}

/**
 * Kiểm tra một ghế còn trống trên chuyến bay hay không.
 *
 * Kiểm tra ở tầng ứng dụng là tiện nhưng không phải hàng rào: hai người cùng
 * bấm một ghế sẽ cùng đi qua đây. Hàng rào thật là
 * `idx_seats_flight_seat_unique` — nó mới là thứ trả 409 khi ghế vừa bị
 * chiếm.
 */
export async function isSeatAvailable(flightId: string, seatNumber: string): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM seats
    WHERE flight_id = ${flightId} AND seat_number = ${seatNumber} AND booking_id IS NOT NULL
    LIMIT 1
  `;
  return asRows<{ id: string }>(rows).length === 0;
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
    /** The PNR, so the boarding pass does not print the row UUID. */
    booking_code: string | null;
    status: string;
    flight_id: string;
    total_price: number;
    created_at: string;
    flight_no?: string;
    from_code?: string;
    to_code?: string;
    depart_time?: string;
    arrive_time?: string;
    seat_number?: string | null;
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
      b.id, b.booking_code, b.status, b.flight_id, b.total_price, b.created_at,
      f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    -- UPPER() on both sides: the PNR mixes letters and digits, and a customer
    -- typing jkhbmi on a phone with caps-lock off must still find their
    -- booking. Plain = was exact, so a lower-case entry silently 404s.
    WHERE (b.id::text = ${bookingCode} OR UPPER(b.booking_code) = UPPER(${bookingCode}))
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
    WHERE (b.id::text = ${bookingCode} OR UPPER(b.booking_code) = UPPER(${bookingCode}))
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

  const seatRow = asFirstRow<{ seat_number: string }>(
    await sql`SELECT seat_number FROM seats WHERE booking_id = ${booking.id} LIMIT 1`
  );

  return {
    booking: {
      id: booking.id,
      booking_code: booking.booking_code,
      status: booking.status,
      flight_id: booking.flight_id,
      total_price: booking.total_price,
      created_at: booking.created_at,
      flight_no: booking.flight_no,
      from_code: booking.from_code,
      to_code: booking.to_code,
      depart_time: booking.depart_time,
      arrive_time: booking.arrive_time,
      seat_number: seatRow?.seat_number || null,
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

// ─── Thông báo công khai ─────────────────────────────────────────────────────

/**
 * Thông báo đang hiệu lực, dùng cho thanh thông báo trên header
 * (`AnnouncementBar`) — nội dung mà khách *chưa* đăng nhập cũng đọc được.
 *
 * Chỉ chọn ba cột mà thanh này thực sự hiển thị; `created_by` và `id` không cần
 * thiết cho giao diện công khai nên không trả ra ngoài.
 *
 * `target_role = 'all'` là điều kiện bắt buộc, không phải bộ lọc làm đẹp: thanh
 * này render trước khi biết người xem là ai, nên một thông báo nhắm riêng
 * `user`/`admin` sẽ lộ cho khách vãng lai. `start_date` / `end_date` là khoảng
 * hiệu lực do quản trị viên đặt, thiếu một đầu nghĩa là mở ở đầu đó.
 */
export interface PublicAnnouncementRecord {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'promotion' | 'system';
}

export async function getActiveAnnouncements(limit = 10): Promise<PublicAnnouncementRecord[]> {
  const rows = await sql`
    SELECT id, title, content, type
    FROM announcements
    WHERE is_active = true
      AND target_role = 'all'
      AND (start_date IS NULL OR start_date <= now())
      AND (end_date IS NULL OR end_date >= now())
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return asRows<PublicAnnouncementRecord>(rows);
}

// ─── Bố cục trang (trình soạn thảo trực quan) ─────────────────────────────────

/**
 * Bố cục trang do trình soạn thảo trực quan (`/editor`) lưu.
 *
 * `layout` là JSONB do `normalizeLayout` (`features/visual-editor/utils/layout`)
 * tạo ra: danh sách section đã định danh kèm thứ tự, trạng thái hiển thị và
 * style đã allow-list. Không có HTML tùy ý trong bảng — cột `html` bị ràng
 * buộc CHECK luôn NULL.
 */
export interface PageLayoutRecord {
  id: string;
  page_path: string;
  layout: unknown;
  html: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Đọc bố cục của một trang.
 *
 * Trả `null` khi trang chưa có bố cục nào được lưu — đây là trạng thái bình
 * thường, không phải lỗi: phía render dùng thứ tự mặc định của trang.
 */
export async function getPageLayout(pagePath: string): Promise<PageLayoutRecord | null> {
  const rows = await sql`
    SELECT id, page_path, layout, html, updated_by, created_at, updated_at
    FROM page_layouts
    WHERE page_path = ${pagePath}
  `;

  return asFirstRow<PageLayoutRecord>(rows) ?? null;
}

/**
 * Ghi bố cục của một trang (upsert theo `page_path`).
 *
 * `page_path` có ràng buộc UNIQUE nên `ON CONFLICT (page_path)` xử lý cả
 * hai trường hợp: tạo mới và cập nhật bản ghi đang có.
 */
export async function upsertPageLayout(params: {
  pagePath: string;
  layout: unknown;
  updatedBy: string | null;
}): Promise<PageLayoutRecord> {
  const rows = await sql`
    INSERT INTO page_layouts (page_path, layout, updated_by)
    VALUES (${params.pagePath}, ${JSON.stringify(params.layout)}::jsonb, ${params.updatedBy})
    ON CONFLICT (page_path) DO UPDATE
      SET layout = EXCLUDED.layout,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
    RETURNING id, page_path, layout, html, updated_by, created_at, updated_at
  `;

  return asFirstRow<PageLayoutRecord>(rows)!;
}
