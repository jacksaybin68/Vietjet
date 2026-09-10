import { sql } from '@/lib/neon';

// ─── Check-in Types ─────────────────────────────────────────────────────────

export interface CheckInRecord {
  id: string;
  booking_id: string;
  passenger_id: string | null;
  seat_id: string | null;
  check_in_number: string;
  boarding_pass_number: string | null;
  seat_number: string;
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  passenger_name: string;
  id_number: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  is_online_check_in: boolean;
  baggage_info: any | null;
  gate: string | null;
  terminal: string | null;
  check_in_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckInStatus {
  has_check_in: boolean;
  check_in_id: string | null;
  passenger_id: string | null;
  passenger_name: string | null;
  seat_number: string | null;
  check_in_number: string | null;
  boarding_pass_number: string | null;
  status: string | null;
  check_in_time: string | null;
}

export interface CreateCheckInParams {
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
  baggageInfo?: any | null;
  gate?: string | null;
  terminal?: string | null;
}

// ─── Check-in Queries ───────────────────────────────────────────────────────

/**
 * Create a new check-in record for a booking
 */
export async function createCheckIn(params: CreateCheckInParams): Promise<CheckInRecord> {
  // Generate check-in number
  const checkInNumber = `VJ${new Date().getFullYear().toString().slice(-2)}${Math.floor(
    Math.random() * 1000000
  )
    .toString()
    .padStart(6, '0')}`;
  const boardingPassNumber = `BP${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(
    Math.random() * 100000
  )
    .toString()
    .padStart(5, '0')}`;

  const result = await sql`
    INSERT INTO check_in (
      booking_id, passenger_id, seat_id,
      check_in_number, boarding_pass_number, seat_number,
      flight_no, from_code, to_code, depart_time,
      passenger_name, id_number, status, is_online_check_in,
      baggage_info, gate, terminal
    ) VALUES (
      ${params.bookingId}, ${params.passengerId || null}, ${params.seatId || null},
      ${checkInNumber}, ${boardingPassNumber}, ${params.seatNumber},
      ${params.flightNo}, ${params.fromCode}, ${params.toCode}, ${params.departTime},
      ${params.passengerName}, ${params.idNumber || null}, 'confirmed', true,
      ${params.baggageInfo || null}, ${params.gate || null}, ${params.terminal || null}
    )
    RETURNING *
  `;

  return (result as CheckInRecord[])[0];
}

/**
 * Get check-in status for a specific booking
 */
export async function getCheckInStatusByBookingId(
  bookingId: string
): Promise<CheckInStatus | null> {
  const result = await sql`
    SELECT 
      EXISTS(SELECT 1 FROM check_in WHERE booking_id = ${bookingId}) as has_check_in,
      c.id as check_in_id,
      c.passenger_id,
      c.passenger_name,
      c.seat_number,
      c.check_in_number,
      c.boarding_pass_number,
      c.status,
      c.check_in_time
    FROM check_in c
    WHERE c.booking_id = ${bookingId}
    ORDER BY c.check_in_time DESC
    LIMIT 1
  `;

  if ((result as any[]).length === 0) {
    return null;
  }

  return (result as any[])[0] as CheckInStatus;
}

/**
 * Get check-in by ID
 */
export async function getCheckInById(checkInId: string): Promise<CheckInRecord | null> {
  const result = await sql`
    SELECT * FROM check_in WHERE id = ${checkInId}
  `;

  if ((result as CheckInRecord[]).length === 0) {
    return null;
  }

  return (result as CheckInRecord[])[0];
}

/**
 * Get check-in by check-in number
 */
export async function getCheckInByNumber(checkInNumber: string): Promise<CheckInRecord | null> {
  const result = await sql`
    SELECT * FROM check_in WHERE check_in_number = ${checkInNumber}
  `;

  if ((result as CheckInRecord[]).length === 0) {
    return null;
  }

  return (result as CheckInRecord[])[0];
}

/**
 * Get check-in by boarding pass number
 */
export async function getCheckInByBoardingPass(
  boardingPassNumber: string
): Promise<CheckInRecord | null> {
  const result = await sql`
    SELECT * FROM check_in WHERE boarding_pass_number = ${boardingPassNumber}
  `;

  if ((result as CheckInRecord[]).length === 0) {
    return null;
  }

  return (result as CheckInRecord[])[0];
}

/**
 * Get all check-ins for a user
 */
export async function getCheckInsByUser(userId: string): Promise<CheckInRecord[]> {
  return (await sql`
    SELECT c.* FROM check_in c
    JOIN bookings b ON c.booking_id = b.id
    WHERE b.user_id = ${userId}
    ORDER BY c.check_in_time DESC
  `) as CheckInRecord[];
}

/**
 * Get check-in information for a flight
 */
export async function getCheckInsByFlight(flightId: string): Promise<CheckInRecord[]> {
  return (await sql`
    SELECT c.* FROM check_in c
    JOIN bookings b ON c.booking_id = b.id
    WHERE b.flight_id = ${flightId}
    ORDER BY c.check_in_time DESC
  `) as CheckInRecord[];
}

/**
 * Update check-in status
 */
export async function updateCheckInStatus(
  checkInId: string,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
): Promise<CheckInRecord | null> {
  const result = await sql`
    UPDATE check_in
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${checkInId}
    RETURNING *
  `;

  if ((result as CheckInRecord[]).length === 0) {
    return null;
  }

  return (result as CheckInRecord[])[0];
}

/**
 * Cancel check-in
 */
export async function cancelCheckIn(checkInId: string): Promise<boolean> {
  const result = await sql`
    UPDATE check_in
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${checkInId}
  `;

  return result.count > 0;
}

/**
 * Get check-in with booking details
 */
export async function getCheckInWithBooking(checkInId: string): Promise<{
  checkIn: CheckInRecord | null;
  booking: any | null;
  flight: any | null;
  passenger: any | null;
  seat: any | null;
} | null> {
  const checkIn = await getCheckInById(checkInId);

  if (!checkIn) {
    return null;
  }

  const bookingResult = await sql`
    SELECT * FROM bookings WHERE id = ${checkIn.booking_id}
  `;

  const flightResult = await sql`
    SELECT * FROM flights 
    JOIN bookings b ON flights.id = b.flight_id
    WHERE b.id = ${checkIn.booking_id}
  `;

  const passengerResult = checkIn.passenger_id
    ? await sql`
    SELECT * FROM passengers WHERE id = ${checkIn.passenger_id}
  `
    : null;

  const seatResult = checkIn.seat_id
    ? await sql`
    SELECT * FROM seats WHERE id = ${checkIn.seat_id}
  `
    : null;

  return {
    checkIn,
    booking: (bookingResult as any[])[0] || null,
    flight: (flightResult as any[])[0] || null,
    passenger: passengerResult ? (passengerResult as any[])[0] || null : null,
    seat: seatResult ? (seatResult as any[])[0] || null : null,
  };
}

/**
 * Get available seats for a flight that haven't been checked in yet
 */
export async function getAvailableSeatsForCheckIn(flightId: string): Promise<
  {
    id: string;
    seat_number: string;
    status: string;
    is_available: boolean;
  }[]
> {
  const result = await sql`
    SELECT 
      s.id,
      s.seat_number,
      s.status,
      CASE 
        WHEN s.check_in_status = 'checked_in' THEN false
        WHEN s.status = 'booked' THEN true
        ELSE false
      END as is_available
    FROM seats s
    WHERE s.flight_id = ${flightId}
    ORDER BY s.seat_number
  `;

  return result as {
    id: string;
    seat_number: string;
    status: string;
    is_available: boolean;
  }[];
}

/**
 * Get booking with check-in status
 */
export async function getBookingWithCheckInStatus(bookingId: string): Promise<{
  booking: any | null;
  passengers: any[];
  checkIn: CheckInStatus | null;
} | null> {
  const bookingResult = await sql`
    SELECT * FROM bookings WHERE id = ${bookingId}
  `;

  if ((bookingResult as any[]).length === 0) {
    return null;
  }

  const booking = (bookingResult as any[])[0];

  const passengers = await sql`
    SELECT * FROM passengers WHERE booking_id = ${bookingId}
  `;

  const checkIn = await getCheckInStatusByBookingId(bookingId);

  return {
    booking,
    passengers: passengers as any[],
    checkIn,
  };
}

/**
 * Search for check-in by booking code and passenger name
 */
export async function searchCheckIn(
  bookingCode: string,
  lastName: string,
  firstName: string
): Promise<{
  booking: any | null;
  passengers: any[];
  checkIn: CheckInRecord | null;
} | null> {
  // Search by booking ID (UUID) or booking_code (PNR)
  // Try to parse as UUID first, then fall back to booking_code
  try {
    const bookingResult = await sql`
      SELECT * FROM bookings 
      WHERE id = ${bookingCode} 
         OR CAST(id AS TEXT) = ${bookingCode}
      LIMIT 1
    `;

    if ((bookingResult as any[]).length === 0) {
      return null;
    }

    const booking = (bookingResult as any[])[0];

    // Get passengers for this booking
    const passengers = (await sql`
      SELECT * FROM passengers WHERE booking_id = ${booking.id}
    `) as any[];

    // Check if passenger name matches
    const passengerName =
      `${lastName.trim().toUpperCase()} ${firstName.trim().toUpperCase()}`.trim();
    const matchingPassenger = passengers.find(
      (p: any) =>
        p.name.toUpperCase().includes(lastName.trim().toUpperCase()) ||
        p.name.toUpperCase() === passengerName
    );

    if (!matchingPassenger) {
      return null;
    }

    // Get check-in for this booking
    const checkIn = await getCheckInById(matchingPassenger.id);

    return {
      booking,
      passengers,
      checkIn,
    };
  } catch (error: any) {
    // If there's a database error (e.g., column doesn't exist), return null
    console.error('Check-in search error:', error.message);
    return null;
  }
}
