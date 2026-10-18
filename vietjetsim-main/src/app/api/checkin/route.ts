import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { getBookingById, getFlightById } from '@/lib/db';
import { sql } from '@/lib/neon';
import { searchCheckIn, createCheckIn, getCheckInStatusByBookingId } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getApiErrorMessage } from '@/shared/services';

// GET /api/checkin - Search for check-in by booking code and passenger name
export async function GET(request: NextRequest) {
  try {
    // Apply IP-based rate limiting
    const rateLimitResponse = rateLimit(request, { windowMs: 60_000, maxRequests: 20 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const bookingCode = searchParams.get('bookingCode');
    const lastName = searchParams.get('lastName');
    const firstName = searchParams.get('firstName') || '';

    if (!bookingCode || !lastName) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Mã đặt chỗ và họ là bắt buộc' },
        { status: 400 }
      );
    }

    const result = await searchCheckIn(bookingCode, lastName, firstName);

    if (!result) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy đặt chỗ phù hợp' },
        { status: 404 }
      );
    }

    // Check if already checked in
    const hasCheckIn = result.checkIn !== null;

    return NextResponse.json({
      booking: result.booking,
      checkIn: result.checkIn,
      hasCheckIn,
    });
  } catch (error) {
    console.error('Check-in search error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}

// POST /api/checkin - Create a new check-in
export async function POST(request: NextRequest) {
  try {
    // Apply IP-based rate limiting
    const rateLimitResponse = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { user, error: authError, response: authResponse } = await verifyAuthRequest(request);
    if (authError || !user) return authResponse!;

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'bookingId',
      'seatNumber',
      'flightNo',
      'fromCode',
      'toCode',
      'departTime',
      'passengerName',
    ];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Self-service check-in must only touch the caller's own booking; without
    // this, any signed-in user could check in a stranger's reservation by id.
    const booking = await getBookingById(body.bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy đặt chỗ' },
        { status: 404 }
      );
    }
    if (!isAdminRole(user.role) && booking.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Only confirmed bookings can be checked in. Cancelled / refunded /
    // completed bookings must not issue a boarding pass.
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        {
          error: 'Booking not payable',
          message: `Không thể check-in đặt chỗ có trạng thái '${booking.status}'.`,
        },
        { status: 400 }
      );
    }

    // The flight must not already have departed or completed.
    const flight = await getFlightById(booking.flight_id);
    if (!flight) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy chuyến bay' },
        { status: 404 }
      );
    }
    if (['departed', 'completed', 'cancelled'].includes(flight.status)) {
      return NextResponse.json(
        {
          error: 'Flight not check-inable',
          message: `Chuyến bay đã ${flight.status}, không thể check-in.`,
        },
        { status: 400 }
      );
    }

    // Check if already checked in
    const existingCheckIn = await getCheckInStatusByBookingId(body.bookingId);
    if (existingCheckIn?.has_check_in) {
      return NextResponse.json(
        {
          error: 'Already Checked In',
          message: 'Bạn đã thực hiện check-in cho chuyến bay này rồi',
          checkInNumber: existingCheckIn.check_in_number,
        },
        { status: 400 }
      );
    }

    // Create check-in record
    const checkIn = await createCheckIn({
      bookingId: body.bookingId,
      passengerId: body.passengerId || null,
      seatId: body.seatId || null,
      seatNumber: body.seatNumber,
      flightNo: body.flightNo,
      fromCode: body.fromCode,
      toCode: body.toCode,
      departTime: body.departTime,
      passengerName: body.passengerName,
      idNumber: body.idNumber || null,
      baggageInfo: body.baggageInfo || null,
      gate: body.gate || null,
      terminal: body.terminal || null,
    });

    // Update seat check-in status if seatId is provided
    if (body.seatId) {
      await sql`
        UPDATE seats 
        SET check_in_status = 'checked_in', check_in_time = NOW()
        WHERE id = ${body.seatId}
      `;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Check-in thành công!',
        checkIn,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Check-in creation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
