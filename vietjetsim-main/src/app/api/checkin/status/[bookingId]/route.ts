import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { getCheckInStatusByBookingId } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/checkin/status/[bookingId] - Get check-in status for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Apply IP-based rate limiting
    const rateLimitResponse = rateLimit(request, { windowMs: 60_000, maxRequests: 30 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing bookingId' },
        { status: 400 }
      );
    }

    // Resolve booking by id or booking_code (PNR)
    const bookingResult = await sql`
      SELECT id FROM bookings
      WHERE id = ${bookingId} OR booking_code = ${bookingId}
      LIMIT 1
    `;
    if ((bookingResult as any[]).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: 'Không tìm thấy đặt chỗ',
        },
        { status: 404 }
      );
    }
    const resolvedId = (bookingResult as any[])[0].id;

    const status = await getCheckInStatusByBookingId(resolvedId);
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Not Found', message: 'Không tìm thấy đặt chỗ' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, checkInStatus: status });
  } catch (error: any) {
    console.error('Check-in status error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
