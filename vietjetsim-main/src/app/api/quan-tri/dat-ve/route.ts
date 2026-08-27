import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAllBookings, getBookingById, updateBookingStatus } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

// ─── GET: Get all bookings (admin) ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'booking:list');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || undefined;

    const { bookings, total } = await getAllBookings({ page, limit, status });

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update booking status ───────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'booking:status_change');
    if (error) return response;

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'bookingId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const result = await updateBookingStatus(bookingId, status);

    if (!result) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking status updated successfully',
      bookingId,
      status,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update booking status' },
      { status: 500 }
    );
  }
}
