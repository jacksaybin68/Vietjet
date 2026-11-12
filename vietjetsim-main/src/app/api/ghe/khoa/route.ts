import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LockBody {
  flightId: string;
  seatIds: string[];
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LockBody = await request.json();
    const { flightId, seatIds, sessionId } = body;

    if (!flightId || !Array.isArray(seatIds) || seatIds.length === 0 || !sessionId) {
      return NextResponse.json(
        { error: 'flightId, seatIds và sessionId là bắt buộc' },
        { status: 400 }
      );
    }

    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    for (const seatNumber of seatIds) {
      await sql`
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
      `;
    }

    return NextResponse.json({ success: true, lockedUntil });
  } catch (err) {
    console.error('[ghe/khoa POST] error:', err);
    const msg = err instanceof Error ? err.message : 'Lỗi server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body: LockBody = await request.json();
    const { flightId, seatIds, sessionId } = body;

    if (!flightId || !Array.isArray(seatIds) || seatIds.length === 0 || !sessionId) {
      return NextResponse.json(
        { error: 'flightId, seatIds và sessionId là bắt buộc' },
        { status: 400 }
      );
    }

    for (const seatNumber of seatIds) {
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

