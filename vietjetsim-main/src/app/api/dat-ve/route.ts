import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getBookingsByUserId, createBooking } from '@/lib/db';
import { parsePaginationParams, getPaginationMeta } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
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
      pagination: getPaginationMeta(page, limit, total),
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
    const { flight_id, total_price, passengers, seats, consents } = body;
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

    if (!consents || typeof consents !== 'object' || consents.policyAccepted !== true) {
      return NextResponse.json({ error: 'Policy acceptance is required' }, { status: 400 });
    }

    const PASSENGER_TYPES = ['adult', 'child', 'infant'] as const;
    const rawPassengers = passengers as Record<string, unknown>[];

    // An infant has no passport of their own, so every other category still
    // needs an identity document. Unrecognised values are rejected rather than
    // coerced: a typo would otherwise silently price a child as an adult.
    const invalidPassenger = rawPassengers.some((passenger) => {
      const type = passenger.type ?? 'adult';
      if (!PASSENGER_TYPES.includes(type as (typeof PASSENGER_TYPES)[number])) return true;
      if (!passenger.name || !passenger.dob || !passenger.phone || !passenger.email) return true;
      if (type !== 'infant' && !passenger.idNumber) return true;
      return false;
    });
    if (invalidPassenger) {
      return NextResponse.json(
        { error: 'Each passenger requires identity and contact details' },
        { status: 400 }
      );
    }

    const normalizedPassengers = rawPassengers.map((passenger) => ({
      name: String(passenger.name),
      dob: String(passenger.dob),
      id_number: passenger.idNumber ? String(passenger.idNumber) : null,
      gender: passenger.gender ? String(passenger.gender) : 'male',
      country_code: passenger.countryCode ? String(passenger.countryCode) : 'VN',
      phone: String(passenger.phone),
      email: String(passenger.email),
      residence: passenger.residence ? String(passenger.residence) : null,
      skyjoy_member_id: passenger.skyJoyMemberId ? String(passenger.skyJoyMemberId) : null,
      passenger_type: String(passenger.type ?? 'adult'),
    }));

    // Infants travel on a lap, so a seat is required for every other passenger
    // only. An all-adult booking still has to match one-to-one as before.
    const seatedPassengers = normalizedPassengers.filter((p) => p.passenger_type !== 'infant');
    if (seats && Array.isArray(seats) && seats.length !== seatedPassengers.length) {
      return NextResponse.json(
        { error: 'Number of seats must match number of seated passengers' },
        { status: 400 }
      );
    }

    const booking = await createBooking(
      { user_id: userId as string, flight_id, total_price: parsedTotalPrice },
      normalizedPassengers,
      seats || [],
      consents
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
