import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getBookingsByUserId, createBooking, getFlightById } from '@/lib/db';
import { sql } from '@/lib/neon';
import { parsePaginationParams, getPaginationMeta } from '@/lib/pagination';
import {
  ANCILLARY_OPTIONS,
  FARE_CLASSES,
  FARE_RATE_BY_TYPE,
  TAX_AND_FEE_RATE,
  getFareForClass,
  getSeatCharge,
  type AncillaryId,
  type FareClassId,
} from '@/features/bookings/pricing';
import type { PassengerType } from '@/features/bookings/types/booking-flow';

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

    // `seats` are numbers the client picked from the map, `ancillaries` the
    // service ids it ticked, and `fareClass` the fare card it tapped. All three
    // are re-priced below, so the client says what it chose, never what it costs.
    const {
      flight_id,
      passengers,
      seats,
      ancillaries,
      fareClass: requestedFareClass,
      consents,
    } = (await request.json()) as {
      flight_id?: string;
      passengers?: Record<string, unknown>[];
      seats?: string[];
      ancillaries?: AncillaryId[];
      fareClass?: FareClassId;
      consents?: {
        marketing?: boolean;
        survey?: boolean;
        retainForFutureBooking?: boolean;
        policyAccepted?: boolean;
      };
    };

    // An unrecognised card is rejected rather than silently downgraded: it
    // meant to buy a fare this flight does not sell, and quietly charging the
    // cheapest one would under-quote the booking instead of failing it.
    if (requestedFareClass !== undefined && !FARE_CLASSES.includes(requestedFareClass)) {
      return NextResponse.json({ error: 'Unknown fare class' }, { status: 400 });
    }

    if (!flight_id || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return NextResponse.json({ error: 'flight_id and passengers are required' }, { status: 400 });
    }

    if (!consents || typeof consents !== 'object' || consents.policyAccepted !== true) {
      return NextResponse.json({ error: 'Policy acceptance is required' }, { status: 400 });
    }

    const PASSENGER_TYPES = ['adult', 'child', 'infant'] as const;
    const rawPassengers = passengers as Record<string, unknown>[];

    // A child (2-11) and an infant (under 2) are identified by name and date of
    // birth only — the booking form asks them for nothing more, and the columns
    // hold NULL for them (migration 018). Requiring contact details here made
    // every booking that included a minor impossible to submit. The travelling
    // adult is the one reachable during the flight, so their details are the
    // ones worth collecting.
    const invalidPassenger = rawPassengers.some((passenger) => {
      const type = passenger.type ?? 'adult';
      if (!PASSENGER_TYPES.includes(type as (typeof PASSENGER_TYPES)[number])) return true;
      if (!passenger.name || !passenger.dob) return true;
      if (type === 'adult' && (!passenger.phone || !passenger.email)) return true;
      // An infant has no passport of their own; everyone else needs one.
      if (type !== 'infant' && !passenger.idNumber) return true;
      return false;
    });
    if (invalidPassenger) {
      return NextResponse.json(
        {
          error:
            'Each passenger requires name and date of birth; adults also need contact details and everyone except infants needs an ID document',
        },
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

    // Price the whole booking here rather than trusting anything the browser
    // sent: the fare, the seats and the services are all priced from
    // `features/bookings/pricing`, the same module the UI sums with, so the two
    // cannot drift. A client posting `total_price: 1` would otherwise buy a
    // real seat for one đồng.
    const flight = await getFlightById(flight_id);
    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    const counts = { adult: 0, child: 0, infant: 0 };
    for (const passenger of normalizedPassengers) {
      counts[passenger.passenger_type as PassengerType] += 1;
    }

    // `fareClass` says which card the traveller tapped; the price for it comes
    // from `flights` (migration 030) through the same ladder the results page
    // drew it with, never from the browser. Defaulting to the cheapest card
    // keeps a booking that arrives without one working.
    const fareClass = FARE_CLASSES.includes(requestedFareClass as FareClassId)
      ? (requestedFareClass as FareClassId)
      : 'eco';
    const farePerPassenger = getFareForClass(fareClass, {
      economyPrice: flight.economy_price,
      businessPrice: flight.business_price,
    });
    const taxableFare = farePerPassenger * (counts.adult + counts.child * FARE_RATE_BY_TYPE.child);

    // Seats are sold per passenger, so each carries its own price and its own
    // tax/fee. An unknown seat number prices at 0 rather than being rejected —
    // the adjacency rule is a UX guard, not a money guarantee.
    const seatRows = (seats || []).map((seat) => ({
      seat_number: seat,
      price: getSeatCharge(seat),
    }));
    const seatFee = seatRows.reduce((sum, seat) => sum + seat.price, 0);

    // Services are priced from the catalogue and charged per seated passenger
    // (an infant rides on a lap, so none apply to one). The client only says
    // which ids it wants.
    const seatedCount = counts.adult + counts.child;
    const requestedAncillaries = (ancillaries || []).filter((id): id is AncillaryId =>
      ANCILLARY_OPTIONS.some((option) => option.id === id)
    );
    const ancillaryRows = requestedAncillaries.map((id) => ({
      option_id: id,
      unit_price: ANCILLARY_OPTIONS.find((option) => option.id === id)!.price,
      quantity: seatedCount,
    }));
    const ancillaryFee = ancillaryRows.reduce((sum, row) => sum + row.unit_price * row.quantity, 0);

    const totalPrice = Math.round(
      taxableFare +
        farePerPassenger * counts.infant * FARE_RATE_BY_TYPE.infant +
        taxableFare * TAX_AND_FEE_RATE +
        seatFee +
        ancillaryFee
    );

    // Prevent overbooking: refuse the booking when the flight has no seats left
    // for every seated passenger. This check must happen before createBooking so
    // we never accept money for a seat that does not exist.
    if (flight.available < seatedCount) {
      return NextResponse.json(
        { error: 'Flight fully booked', message: 'Chuyến bay đã hết ghế trống.' },
        { status: 409 }
      );
    }

    const booking = await createBooking(
      { user_id: userId as string, flight_id, total_price: totalPrice },
      normalizedPassengers,
      seatRows,
      ancillaryRows,
      {
        marketing: consents?.marketing ?? false,
        survey: consents?.survey ?? false,
        retainForFutureBooking: consents?.retainForFutureBooking ?? false,
        policyAccepted: consents?.policyAccepted ?? false,
      }
    );

    // Reserve the seats by decrementing available capacity on the flight.
    await sql`
      UPDATE flights
      SET available = available - ${seatedCount}
      WHERE id = ${flight_id}
    `;

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
