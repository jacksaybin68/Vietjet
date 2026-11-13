import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LockBody {
  flightId: string;
  seatIds: string[];
  sessionId: string;
}

const SEAT_REGEX = /^[0-9]{1,3}[A-K]$/i;

interface SeatLockRow {
  seat_number: string;
  session_id: string;
  expires_at: string;
}

/**
 * GET /api/ghe/khoa?flightId=...
 * Returns currently active temporary seat locks for a flight
 */
export async function GET(request: NextRequest) {
  try {
    const flightId = request.nextUrl.searchParams.get('flightId');
    if (!flightId) {
      return NextResponse.json({ error: 'flightId là bắt buộc' }, { status: 400 });
    }

    // Clean up expired locks first
    try {
      await sql`DELETE FROM seat_locks WHERE expires_at <= NOW()`;
    } catch {
      // Table may not exist yet or connection issue
    }

    try {
      const rows = (await sql`
        SELECT seat_number, session_id, expires_at
        FROM seat_locks
        WHERE flight_id = ${flightId} AND expires_at > NOW()
      `) as SeatLockRow[];

      return NextResponse.json({
        flightId,
        locked: rows.map((r) => ({
          seatNumber: r.seat_number,
          expiresAt: r.expires_at,
          sessionId: r.session_id,
        })),
      });
    } catch {
      return NextResponse.json({ flightId, locked: [] });
    }
  } catch (err) {
    console.error('[ghe/khoa GET] error:', err);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 120 });
    if (limited) return limited;

    const body: LockBody = await request.json();
    const { flightId, seatIds, sessionId } = body;

    if (!flightId || !Array.isArray(seatIds) || seatIds.length === 0 || !sessionId) {
      return NextResponse.json(
        { error: 'flightId, seatIds và sessionId là bắt buộc' },
        { status: 400 }
      );
    }

    if (typeof sessionId !== 'string' || sessionId.length > 128) {
      return NextResponse.json({ error: 'sessionId không hợp lệ' }, { status: 400 });
    }

    // Validate seat formats
    const validSeats = seatIds
      .map((s) => String(s).trim().toUpperCase())
      .filter((s) => SEAT_REGEX.test(s));

    if (validSeats.length === 0) {
      return NextResponse.json({ error: 'Danh sách số ghế không hợp lệ' }, { status: 400 });
    }

    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // A seat that is already locked by *another* session must not be silently
    // taken over.
    //
    // The insert used to be a bare
    //
    //   ON CONFLICT (flight_id, seat_number)
    //   DO UPDATE SET session_id = EXCLUDED.session_id, expires_at = …
    //
    // which is `ON CONFLICT DO UPDATE` — i.e. "last writer wins". Any client
    // could therefore steal a seat another customer was holding, silently
    // resetting the owner's timer. The owner would keep filling in passenger
    // details and only discover the loss at the final booking step, when the
    // unique index on `seats` refused the seat.
    //
    // The upsert is now conditional: the row is only taken over when it has
    // expired (or belongs to this very session, which is the ordinary
    // "extend my own hold" case). A live lock held by somebody else is
    // reported back to the caller.
    const conflicts: string[] = [];

    for (const seatNumber of validSeats) {
      const result = await sql`
        INSERT INTO seat_locks (flight_id, seat_number, session_id, expires_at)
        VALUES (
          ${flightId},
          ${seatNumber},
          ${sessionId},
          ${lockedUntil}::timestamptz
        )
        ON CONFLICT (flight_id, seat_number)
        DO UPDATE SET
          session_id = EXCLUDED.session_id,
          expires_at = EXCLUDED.expires_at
        WHERE seat_locks.session_id = EXCLUDED.session_id
           OR seat_locks.expires_at <= NOW()
        RETURNING seat_number
      `;

      // An empty result means the conflict was filtered out by the WHERE
      // clause: the seat is held by another live session.
      if (!Array.isArray(result) || result.length === 0) {
        conflicts.push(seatNumber);
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Seat locked by another customer',
          message: 'Một hoặc nhiều ghế vừa được khách khác giữ. Vui lòng chọn ghế khác.',
          seats: conflicts,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, lockedUntil, seats: validSeats });
  } catch (err) {
    console.error('[ghe/khoa POST] error:', err);
    const msg = err instanceof Error ? err.message : 'Lỗi server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 120 });
    if (limited) return limited;

    const body: LockBody = await request.json();
    const { flightId, seatIds, sessionId } = body;

    if (!flightId || !Array.isArray(seatIds) || seatIds.length === 0 || !sessionId) {
      return NextResponse.json(
        { error: 'flightId, seatIds và sessionId là bắt buộc' },
        { status: 400 }
      );
    }

    const validSeats = seatIds
      .map((s) => String(s).trim().toUpperCase())
      .filter((s) => SEAT_REGEX.test(s));

    for (const seatNumber of validSeats) {
      await sql`
        DELETE FROM seat_locks
        WHERE flight_id = ${flightId}
          AND seat_number = ${seatNumber}
          AND session_id = ${sessionId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ghe/khoa DELETE] error:', err);
    const msg = err instanceof Error ? err.message : 'Lỗi server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
