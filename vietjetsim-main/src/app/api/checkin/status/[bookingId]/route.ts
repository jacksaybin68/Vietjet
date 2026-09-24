import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { getCheckInStatusByBookingId } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { getApiErrorMessage } from '@/shared/services';

// GET /api/checkin/status/[bookingId] - Get check-in status for a booking
/** Minimal booking row needed by the ownership check below. */
interface CheckInBookingRow {
  id: string;
  user_id: string;
}

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

    // Passengers look this up from their own dashboard. Requiring a session and
    // ownership stops anyone from enumerating check-in details via booking codes.
    const { user, error: authError, response: authResponse } = await verifyAuthRequest(request);
    if (authError || !user) return authResponse!;

    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing bookingId' },
        { status: 400 }
      );
    }

    // Resolve booking by id or booking_code (PNR)
    const bookingResult = await sql`
      SELECT id, user_id FROM bookings
      WHERE id = ${bookingId} OR booking_code = ${bookingId}
      LIMIT 1
    `;
    if ((bookingResult as CheckInBookingRow[]).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: 'Không tìm thấy đặt chỗ',
        },
        { status: 404 }
      );
    }
    const resolvedBooking = (bookingResult as CheckInBookingRow[])[0];
    if (!isAdminRole(user.role) && resolvedBooking.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }
    const resolvedId = resolvedBooking.id;

    const status = await getCheckInStatusByBookingId(resolvedId);
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Not Found', message: 'Không tìm thấy đặt chỗ' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, checkInStatus: status });
  } catch (error) {
    console.error('Check-in status error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
