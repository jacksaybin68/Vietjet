import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { sql } from '@/lib/neon';
import { searchCheckIn, createCheckIn, getCheckInStatusByBookingId } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

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
    const firstName = searchParams.get('firstName');

    if (!bookingCode || !lastName || !firstName) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required parameters: bookingCode, lastName, firstName',
        },
        { status: 400 }
      );
    }

    const result = await searchCheckIn(bookingCode, lastName, firstName);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: 'Không tìm thấy thông tin đặt chỗ hoặc tên hành khách không khớp',
        },
        { status: 404 }
      );
    }

    // Check if already checked in
    const hasCheckIn = result.checkIn !== null;

    return NextResponse.json({
      success: true,
      booking: {
        id: result.booking.id,
        status: result.booking.status,
        flightId: result.booking.flight_id,
        totalPrice: result.booking.total_price,
        createdAt: result.booking.created_at,
        flight_no: result.booking.flight_no,
        from_code: result.booking.from_code,
        to_code: result.booking.to_code,
        depart_time: result.booking.depart_time,
        arrive_time: result.booking.arrive_time,
      },
      passengers: result.passengers,
      hasCheckIn,
      checkIn: hasCheckIn ? result.checkIn : null,
    });
  } catch (error: any) {
    console.error('Check-in search error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
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
  } catch (error: any) {
    console.error('Check-in creation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
