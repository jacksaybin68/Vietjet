import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getBookingsByUserId, createBooking } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const statusParam = searchParams.get('status');
    const requestedStatuses = statusParam
      ? statusParam
          .split(',')
          .map((item) => item.trim())
          .filter((item) => !!item)
      : [];
    const allowedStatuses = new Set(['pending', 'confirmed', 'completed', 'cancelled', 'refunded']);
    const filteredStatuses = requestedStatuses.filter((status) => allowedStatuses.has(status));
    const status = filteredStatuses.length > 0 ? filteredStatuses : undefined;

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
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const userId = user.userId;

    const body = await request.json();
    const { flight_id, total_price, passengers, seats } = body;
    const parsedTotalPrice =
      typeof total_price === 'number' ? total_price : Number.parseFloat(String(total_price));

    if (
      !flight_id ||
      !Number.isFinite(parsedTotalPrice) ||
      parsedTotalPrice <= 0 ||
      !passengers ||
      !Array.isArray(passengers) ||
      passengers.length === 0
    ) {
      return NextResponse.json(
        { error: 'flight_id, total_price (> 0), and passengers are required' },
        { status: 400 }
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
      { user_id: userId as string, flight_id, total_price: parsedTotalPrice },
      passengers,
      seats || []
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
