import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { validateCsrfOrReject } from '@/lib/csrf';
import { getBookingsByUserId, createBooking, sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || undefined;

    const result = await getBookingsByUserId(payload.userId, { page, limit, status });
    const { bookings, total } = result;

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
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Validate CSRF token
  const csrfError = await validateCsrfOrReject(request);
  if (csrfError) return csrfError;

  try {
    const token = request.cookies.get('access_token')?.value;
    let userId: string | null = null;

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    const body = await request.json();
    const { flight_id, total_price, passengers, seats } = body;

    if (
      !flight_id ||
      !total_price ||
      !passengers ||
      !Array.isArray(passengers) ||
      passengers.length === 0
    ) {
      return NextResponse.json(
        { error: 'flight_id, total_price, and passengers are required' },
        { status: 400 }
      );
    }

    // Guest booking is not allowed - authentication is required
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please login to book flights.' },
        { status: 401 }
      );
    }

    // Validate seats count matches passenger count
    if (seats && Array.isArray(seats) && seats.length !== passengers.length) {
      return NextResponse.json(
        { error: 'Number of seats must match number of passengers' },
        { status: 400 }
      );
    }

    const booking = await createBooking(
      { user_id: userId as string, flight_id, total_price },
      passengers,
      seats || []
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
