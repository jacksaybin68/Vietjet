import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
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
    const { flight_id, total_price, passengers } = body;

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
    
    // If no userId from token (Guest Booking), fetch the first user from the database or create a guest fallback.
    // This allows Guest Booking to succeed and stores the booking against a default account.
    if (!userId) {
      try {
         const firstUser = await sql`SELECT id FROM user_profiles LIMIT 1`;
         if ((firstUser as any).length > 0) {
            userId = (firstUser as any)[0].id;
         } else {
            return NextResponse.json({ error: 'No default user for guest booking' }, { status: 500 });
         }
      } catch (err) {
         console.error('Failed to assign guest to default user', err);
         return NextResponse.json({ error: 'Guest booking failed' }, { status: 500 });
      }
    }

    const booking = await createBooking(
      { user_id: userId, flight_id, total_price },
      passengers
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
