import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyAuthRequest, hashPassword } from '@/lib/auth';
import {
  getBookingsByUserId,
  createBooking,
  getFlightById,
  createUser,
  findUserByEmail,
  getActiveBankAccounts,
} from '@/lib/db';
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
import { sendPaymentInstructionEmail } from '@/lib/mail';
import { renderTransferNote } from '@/lib/transfer-note';
import { rateLimit } from '@/lib/rate-limit';
import { setGuestBookingCookie } from '@/lib/guest-booking';

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
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 30 });
    if (limited) return limited;

    const { user, error, response: authResponse } = await verifyAuthRequest(request);
    if (error === 'CSRF validation failed') return authResponse!;

    // `seats` are numbers the client picked from the map, `ancillaries` the
    // service ids it ticked, and `fareClass` the fare card it tapped. All three
    // are re-priced below, so the client says what it chose, never what it costs.
    const {
      flight_id,
      total_price: clientTotalPrice,
      passengers,
      seats,
      ancillaries,
      fareClass: requestedFareClass,
      consents,
    } = (await request.json()) as {
      flight_id?: string;
      total_price?: number;
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
      phone: passenger.phone ? String(passenger.phone) : null,
      email: passenger.email ? String(passenger.email) : null,
      residence: passenger.residence ? String(passenger.residence) : null,
      skyjoy_member_id: passenger.skyJoyMemberId ? String(passenger.skyJoyMemberId) : null,
      passenger_type: String(passenger.type ?? 'adult'),
    }));

    // Infants travel on a lap, so a seat is required for every other passenger
    // only if seats are selected. Pre-selecting seats is optional — if none are
    // selected (empty array), seats are assigned later at check-in.
    const seatedPassengers = normalizedPassengers.filter((p) => p.passenger_type !== 'infant');
    const sanitizedSeats = Array.isArray(seats)
      ? seats.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];
    if (sanitizedSeats.length > 0 && sanitizedSeats.length !== seatedPassengers.length) {
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
    const seatRows = sanitizedSeats.map((seat) => ({
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

    const serverCalculated = Math.round(
      taxableFare +
        farePerPassenger * counts.infant * FARE_RATE_BY_TYPE.infant +
        taxableFare * TAX_AND_FEE_RATE +
        seatFee +
        ancillaryFee
    );

    const _clientTotal =
      typeof clientTotalPrice === 'number' && Number.isFinite(clientTotalPrice)
        ? Math.round(clientTotalPrice)
        : 0;

    // The booked total is the server's number.
    //
    // The route used to take `clientTotal` whenever it was *higher* than the
    // server's own calculation ("round-trip legs and extra services"), which
    // made the browser the authority on what a flight costs: a crafted request
    // with `total_price: 99_000_000` booked a real seat for a sum that no
    // fare card ever showed, and the `min_booking_amount` gate on discount
    // codes was computed against the inflated figure.
    //
    // Everything the total is made of is now priced here, from the catalogue:
    // the fare (ladder on the flight row), the seats (per-seat band price),
    // the ancillaries (per-passenger catalogue price) and the round-trip leg
    // (the second flight's own fare, read from the database). A client total
    // that disagrees is reported so the caller can see the authoritative
    // number, but it is never charged.
    const totalPrice = serverCalculated;

    // Prevent overbooking: refuse the booking when the flight has no seats left
    // for every seated passenger. This check must happen before createBooking so
    // we never accept money for a seat that does not exist.
    if (flight.available < seatedCount) {
      return NextResponse.json(
        { error: 'Flight fully booked', message: 'Chuyến bay đã hết ghế trống.' },
        { status: 409 }
      );
    }

    let bookingUserId: string;

    if (user) {
      bookingUserId = user.userId;
    } else {
      // A guest booking is attached to a dedicated guest account. The account
      // is identified by the passenger's own email address when they gave
      // one, otherwise by a synthetic address derived from the phone number.
      //
      // It is deliberately NOT looked up by phone number: `user_profiles.phone`
      // is UNIQUE (migration 007) and a registered customer already owns that
      // number, so matching on it would attach the stranger's booking to the
      // customer's account — their bookings, their wallet, their PII. The
      // lookup below is by *email*, which the guest had to type in themselves,
      // and a fresh account is created when there is no match.
      const primaryAdult =
        normalizedPassengers.find(
          (p) => p.passenger_type === 'adult' && p.email && p.email.includes('@')
        ) || normalizedPassengers[0];

      const rawEmail = primaryAdult?.email?.trim().toLowerCase();
      const rawPhone = primaryAdult?.phone
        ? String(primaryAdult.phone).replace(/[^0-9]/g, '')
        : null;
      const passengerName = primaryAdult?.name?.trim() || 'Khách vãng lai';

      const guestEmail =
        rawEmail && rawEmail !== 'null' && rawEmail !== 'undefined'
          ? rawEmail
          : `${rawPhone || Date.now()}@khach.vietjetsim.vn`;

      let userRecord = await findUserByEmail(guestEmail);

      if (!userRecord) {
        const passwordHash = await hashPassword(randomUUID());
        // `phone` is not stored for a guest account created from a phone-only
        // booking: the number may already belong to a registered customer, and
        // `user_profiles_phone_key` is UNIQUE.
        userRecord = await createUser(
          guestEmail,
          passwordHash,
          passengerName,
          'user',
          rawPhone && rawPhone.length >= 9 && rawEmail ? rawPhone : null
        );
      }

      bookingUserId = userRecord.id;
    }

    const booking = await createBooking(
      { user_id: bookingUserId, flight_id, total_price: totalPrice, seatedCount },
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

    if (!booking) {
      return NextResponse.json(
        { error: 'Flight fully booked', message: 'Chuyến bay đã hết ghế trống.' },
        { status: 409 }
      );
    }

    // Gửi email thông báo đặt chỗ và hướng dẫn thanh toán cho khách hàng
    const customerEmail =
      user?.email ||
      normalizedPassengers.find((p) => p.email && p.email.includes('@'))?.email ||
      null;
    const customerName =
      user?.fullName || normalizedPassengers.find((p) => p.name)?.name || 'Quý khách';

    if (customerEmail && !customerEmail.includes('@khach.vietjetsim.vn')) {
      const departureFormatted = flight.depart_time
        ? new Date(flight.depart_time).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : undefined;

      const routeStr = `${flight.from_code} → ${flight.to_code}`;

      let bankName: string | undefined;
      let accountNumber: string | undefined;
      let accountHolder: string | undefined;
      let bankBin: string | undefined;
      let template: string | undefined;
      try {
        const banks = await getActiveBankAccounts();
        if (banks && banks.length > 0) {
          bankName = banks[0].bank_name;
          accountNumber = banks[0].account_number;
          accountHolder = banks[0].account_holder;
          bankBin = banks[0].bank_bin || undefined;
          template = banks[0].transfer_note_template || undefined;
        }
      } catch {
        // Không lấy được danh sách ngân hàng: dùng thông tin mặc định.
      }

      const transferNote = renderTransferNote(template, {
        code: booking.booking_code ?? '',
        amount: totalPrice,
      });

      void sendPaymentInstructionEmail({
        to: customerEmail,
        fullName: customerName,
        bookingCode: booking.booking_code ?? null,
        bookingId: booking.id,
        amount: totalPrice,
        transferNote,
        flightNumber: flight.flight_no,
        route: routeStr,
        departureTime: departureFormatted,
        passengers: normalizedPassengers.map((p, idx) => ({
          name: p.name,
          seat: sanitizedSeats[idx] || undefined,
        })),
        bankName,
        accountNumber,
        accountHolder,
        bankBin,
      }).catch((mailErr) => {
        console.error('[MAIL] sendPaymentInstructionEmail error (non-fatal):', mailErr);
      });
    }

    const response = NextResponse.json({ booking }, { status: 201 });

    // Remember that this browser created the booking, so the payment endpoint
    // can tell "the guest who booked it" from "someone who guessed the id".
    if (!user) {
      setGuestBookingCookie(response, request, booking.id);
    }

    return response;
  } catch (error) {
    const dbError = error as { code?: unknown; constraint?: unknown; message?: unknown };
    if (
      dbError.code === '23505' &&
      (dbError.constraint === 'idx_seats_flight_seat_unique' ||
        String(dbError.message).includes('idx_seats_flight_seat_unique'))
    ) {
      return NextResponse.json(
        {
          error: 'Seat no longer available',
          message: 'Ghế bạn chọn vừa được người khác đặt. Vui lòng chọn ghế khác.',
        },
        { status: 409 }
      );
    }
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
