import { sql } from '@/lib/neon';
import type {
  FlightRecord,
  BookingRecord,
  PassengerRecord,
  PaymentRecord,
  BookingDetail,
} from './types';

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
  const total = parseInt((countResult as any)[0].total, 10);

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
  passengers: { name: string; dob?: string; id_number?: string; gender?: string }[],
  seats?: string[] // seat numbers to reserve
): Promise<BookingRecord> {
  // Use a single transaction for booking + passengers + seats + available decrement.
  // Using RETURNING id from the INSERT ensures we get the correct booking_id
  // even if multiple bookings are created concurrently.
  const bookingInsert = sql`
    INSERT INTO bookings (user_id, flight_id, status, total_price)
    VALUES (${booking.user_id}, ${booking.flight_id}, 'pending', ${booking.total_price})
    RETURNING id, user_id, flight_id, status, total_price, created_at, updated_at
  `;

  const passengerInserts = passengers.map(
    (p) => sql`
      INSERT INTO passengers (booking_id, name, dob, id_number, gender)
      VALUES (${bookingInsert.id}, ${p.name}, ${p.dob || null}, ${p.id_number || null}, ${p.gender || 'male'})
    `
  );

  // Insert seats if provided
  const seatInserts = (seats || []).map(
    (seatNumber) => sql`
      INSERT INTO seats (booking_id, flight_id, seat_number, status)
      VALUES (${bookingInsert.id}, ${booking.flight_id}, ${seatNumber}, 'reserved')
    `
  );

  // Decrement available seats on the flight
  const seatCount = seats?.length ?? passengers.length ?? 0;
  const availableUpdate =
    seatCount > 0
      ? sql`
          UPDATE flights
          SET available = GREATEST(0, available - ${seatCount}), updated_at = NOW()
          WHERE id = ${booking.flight_id}
        `
      : null;

  const transactionStatements = [
    bookingInsert,
    ...passengerInserts,
    ...seatInserts,
    ...(availableUpdate ? [availableUpdate] : []),
  ];

  const results = await sql.transaction(transactionStatements);

  // results[0] is the result of bookingInsert, which is an array of inserted rows
  const bookingRows = results[0] as unknown as BookingRecord[];
  return bookingRows[0];
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
