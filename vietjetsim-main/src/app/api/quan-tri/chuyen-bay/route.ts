import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAllFlights, createFlight, updateFlight, deleteFlight } from '@/lib/db';
import { parsePaginationParams, getPaginationMeta } from '@/lib/pagination';
import { FLIGHT_NO_PATTERN, normalizeFlightNo } from '@/lib/flight-no';

/**
 * Values allowed by the `flights_class_check` CHECK constraint on
 * `flights.class` (see migrations/000_core_schema.sql). Kept in one place so
 * validation and the database cannot drift apart.
 */
const FLIGHT_CLASSES = ['economy', 'business'] as const;

/**
 * True when Postgres rejected the insert because a flight already occupies that
 * slot.
 *
 * Driver errors are not `instanceof Error` across the bundler boundary, so this
 * matches on the stable shape instead: SQLSTATE 23505 plus the unique index
 * name.
 *
 * The database keeps its uniqueness on `(from_code, to_code, depart_time)` as a
 * plain unique *index*, not a table constraint, so a violation reaches this
 * process with `constraint` undefined and the index name in `routine`.
 * Matching on `err.constraint` alone — which is what this did — meant a
 * duplicate schedule always fell through to the generic 500, and the admin UI
 * showed an opaque failure for what is plainly a user mistake: two flights
 * cannot leave the same route at the same minute.
 */
function isDuplicateFlightSchedule(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: unknown; constraint?: unknown; routine?: unknown };
  if (err.code !== '23505') return false;
  return (
    err.constraint === 'idx_flights_route_depart_time' ||
    err.routine === 'idx_flights_route_depart_time'
  );
}

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:list');
    if (error) return response;
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const from_code = searchParams.get('from_code') || undefined;
    const to_code = searchParams.get('to_code') || undefined;
    const search = searchParams.get('search') || undefined;
    const { flights, total } = await getAllFlights({ page, limit, from_code, to_code, search });
    return NextResponse.json({
      flights,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Error fetching admin flights:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Captured from the parsed body so the catch block — which cannot see the
  // destructured locals below — can describe the conflicting schedule.
  let attempted: { from_code?: string; to_code?: string; depart_time?: string } = {};

  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:create');
    if (error) return response;
    const body = await request.json();
    const {
      flight_no,
      from_code,
      to_code,
      depart_time,
      arrive_time,
      price,
      economy_price: economyPrice,
      business_price: businessPrice,
      class: seatClass,
      available,
    } = body;
    attempted = { from_code, to_code, depart_time };
    if (
      !flight_no ||
      !from_code ||
      !to_code ||
      !depart_time ||
      !arrive_time ||
      price === undefined ||
      !seatClass ||
      available === undefined
    ) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'All flight fields are required' },
        { status: 400 }
      );
    }

    // `flights.class` carries a CHECK constraint limited to these two values.
    // Normalising here means a client that sends 'Economy'/'BUSINESS' gets a
    // helpful 400 (or is silently corrected) instead of Postgres raising
    // flights_class_check and the handler answering a bare 500.
    const normalizedClass = String(seatClass).trim().toLowerCase();
    if (!FLIGHT_CLASSES.includes(normalizedClass as (typeof FLIGHT_CLASSES)[number])) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid class '${seatClass}'. Expected one of: ${FLIGHT_CLASSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Same reasoning as `class` above, and the same reason the PATCH handler
    // already normalised: migration 036 put the shape in a CHECK, so an
    // unvalidated insert becomes a bare 500 from Postgres rather than a 400
    // naming the field. Normalising here also means `vj  101` is stored as
    // `VJ 101`, which is what the booking-PNR join compares against.
    const normalizedFlightNo = normalizeFlightNo(flight_no);
    if (!FLIGHT_NO_PATTERN.test(normalizedFlightNo)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid flight_no '${flight_no}'. Expected e.g. VJ 101, VJ 3001, VJ101-1000`,
        },
        { status: 400 }
      );
    }

    const flight = await createFlight({
      flight_no: normalizedFlightNo,
      from_code,
      to_code,
      depart_time,
      arrive_time,
      price,
      // Migration 030 made both fares NOT NULL and the results page reads them
      // instead of `price`, so a flight created without them is invisible to
      // pricing. Accepted from the form when it sends them, derived otherwise.
      economyPrice,
      businessPrice,
      class: normalizedClass,
      available,
    });
    return NextResponse.json(
      { success: true, message: 'Flight created successfully', flight },
      { status: 201 }
    );
  } catch (error) {
    // A duplicate schedule is a user mistake, not a server fault: the database
    // keeps a unique index on (from_code, to_code, depart_time), so two
    // flights cannot depart the same route at the same minute. Surface that as
    // a 409 the admin UI can explain, rather than a bare 500.
    if (isDuplicateFlightSchedule(error)) {
      const { from_code, to_code, depart_time } = attempted;
      return NextResponse.json(
        {
          error: 'Conflict',
          message: `A flight from ${from_code ?? '?'} to ${to_code ?? '?'} already departs at ${depart_time ?? 'that time'}. Choose a different departure time.`,
        },
        { status: 409 }
      );
    }
    console.error('Error creating flight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:edit');
    if (error) return response;
    const body = await request.json();
    const { flight_id, ...updates } = body;
    if (!flight_id)
      return NextResponse.json(
        { error: 'Bad Request', message: 'flight_id is required' },
        { status: 400 }
      );
    const updatedFlight = await updateFlight(flight_id, updates);
    if (!updatedFlight)
      return NextResponse.json(
        { error: 'Not Found', message: 'Flight not found' },
        { status: 404 }
      );
    return NextResponse.json({
      success: true,
      message: 'Flight updated successfully',
      flight: updatedFlight,
    });
  } catch (error) {
    console.error('Error updating flight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:delete');
    if (error) return response;
    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('flight_id');
    if (!flightId)
      return NextResponse.json(
        { error: 'Bad Request', message: 'flight_id is required' },
        { status: 400 }
      );
    await deleteFlight(flightId);
    return NextResponse.json({ success: true, message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Error deleting flight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
