// VietjetSim Database Layer
import { sql } from '@/lib/neon';
export { sql };
import type { Permission } from '@/lib/rbac';

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
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: string;
  user_id: string;
  flight_id: string;
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
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'archived';
  bank_info: any;
  admin_note: string | null;
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

// ─── Booking Queries ────────────────────────────────────────────────────────

export async function getBookingsByUserId(
  userId: string,
  params?: { status?: string; page?: number; limit?: number }
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

  // Get total count (without LIMIT/OFFSET)
  let countResult;
  if (params?.status) {
    countResult = await sql`
      SELECT COUNT(*) as total FROM bookings WHERE user_id = ${userId} AND status = ${params.status}
    `;
  } else {
    countResult = await sql`
      SELECT COUNT(*) as total FROM bookings WHERE user_id = ${userId}
    `;
  }
  const total = parseInt((countResult as any)[0].total, 10);

  // Get paginated results
  let bookings;
  if (params?.status) {
    bookings = await sql`
      SELECT b.*,
             f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time,
             json_agg(DISTINCT p) FILTER (WHERE p.id IS NOT NULL) as passengers,
             json_agg(DISTINCT pay) FILTER (WHERE pay.id IS NOT NULL) as payments
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      LEFT JOIN passengers p ON b.id = p.booking_id
      LEFT JOIN payments pay ON b.id = pay.booking_id
      WHERE b.user_id = ${userId} AND b.status = ${params.status}
      GROUP BY b.id, f.id
      ORDER BY b.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    bookings = await sql`
      SELECT b.*,
             f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time,
             json_agg(DISTINCT p) FILTER (WHERE p.id IS NOT NULL) as passengers,
             json_agg(DISTINCT pay) FILTER (WHERE pay.id IS NOT NULL) as payments
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      LEFT JOIN passengers p ON b.id = p.booking_id
      LEFT JOIN payments pay ON b.id = pay.booking_id
      WHERE b.user_id = ${userId}
      GROUP BY b.id, f.id
      ORDER BY b.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return {
    total,
    bookings: (bookings as any[]).map((b: any) => ({
      id: b.id,
      user_id: b.user_id,
      flight_id: b.flight_id,
      status: b.status,
      total_price: parseFloat(b.total_price),
      created_at: b.created_at,
      updated_at: b.updated_at,
      flight: {
        flight_no: b.flight_no,
        from_code: b.from_code,
        to_code: b.to_code,
        depart_time: b.depart_time,
        arrive_time: b.arrive_time,
      },
      passengers: b.passengers[0] ? b.passengers : [],
      payment: b.payments[0] || null,
    })),
  };
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
  passengers: { name: string; dob?: string; id_number?: string; gender?: string }[]
): Promise<BookingRecord> {
  // Wrap booking + all passenger inserts in a single transaction.
  // Without this: if passenger insert fails after booking insert → orphan booking with no passengers.
  // sql.transaction() runs all queries atomically — any failure rolls back all of them.
  const queries = [
    sql`
      INSERT INTO bookings (user_id, flight_id, status, total_price)
      VALUES (${booking.user_id}, ${booking.flight_id}, 'pending', ${booking.total_price})
      RETURNING *
    `,
    ...passengers.map(
      (p) => sql`
        WITH bk AS (
          SELECT id FROM bookings
          WHERE user_id = ${booking.user_id}
          ORDER BY created_at DESC LIMIT 1
        )
        INSERT INTO passengers (booking_id, name, dob, id_number, gender)
        SELECT bk.id, ${p.name}, ${p.dob || null}, ${p.id_number || null}, ${p.gender || 'male'}
        FROM bk
      `
    ),
  ];

  await sql.transaction(queries);

  // Re-fetch the booking we just inserted (transaction guarantees it exists)
  const [created] = (await sql`
    SELECT * FROM bookings
    WHERE user_id = ${booking.user_id} AND flight_id = ${booking.flight_id}
    ORDER BY created_at DESC LIMIT 1
  `) as BookingRecord[];

  return created;
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
}): Promise<{
  bookings: Array<BookingRecord & { user_email: string; user_name: string; flight_no: string }>;
  total: number;
}> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const filterValues: any[] = [];

  if (params?.status) {
    filterValues.push(params.status);
    whereClause += ` AND b.status = $${filterValues.length}`;
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

  const countQuery = `SELECT COUNT(*) as total FROM bookings b ${whereClause}`;

  const bookingsResult = await sql.query(bookingsQuery, [...filterValues, limit, offset]);
  const countResult = await sql.query(countQuery, filterValues);
  const total = parseInt((countResult as any)[0].total, 10);

  return { bookings: bookingsResult as any as any[], total };
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
  discount_code_id?: string;
  discount_amount?: number;
}): Promise<{ payment: PaymentRecord; booking: BookingRecord }> {
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
    // Increment used_count if a discount was applied
    ...(payment.discount_code_id
      ? [
          sql`UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ${payment.discount_code_id}`,
        ]
      : []),
  ]);

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
  return parseInt((result as any)[0].count, 10);
}

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
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'archived',
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

  if ((existing as any[]).length > 0) {
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
  const total = parseInt((countResult as any)[0].total, 10);

  return { conversations: conversations as ChatConversationRecord[], total };
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

  const r = (result as any)[0];
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
  return (await sql`
    SELECT status, COUNT(*) as count
    FROM bookings
    GROUP BY status
  `) as any[];
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

  const combined = [...(bookings as any[]), ...(refunds as any[])]
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
    JOIN users u ON ar.user_id = u.id
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
  const values: any[] = [];

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
  const total = parseInt((countRes as any)[0].total, 10);

  const dataRes = await sql.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return { logs: dataRes as any as AuditLogRecord[], total };
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
  return (rows as any)[0] || null;
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

  let query;
  if (params?.type) {
    query = sql`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ${wallet.id} AND type = ${params.type}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    query = sql`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ${wallet.id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  const countResult = await sql`
    SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = ${wallet.id}
  `;

  return {
    transactions: query as WalletTransactionRecord[],
    total: parseInt((countResult as any)[0].total, 10),
  };
}

export async function topupWallet(
  userId: string,
  amount: number,
  paymentMethodId: string,
  description?: string
): Promise<WalletTransactionRecord> {
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
      ${description || 'Nạp tiền vào ví'}, ${paymentMethodId}, 'completed'
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
    total: parseInt((countResult as any)[0].total, 10),
  };
}
