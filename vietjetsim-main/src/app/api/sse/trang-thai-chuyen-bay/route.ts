import { type NextRequest } from 'next/server';
import { getFlightById, getFlightStatusByNo } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flightId = searchParams.get('flightId');
  const flightNo = searchParams.get('flightNo');

  if (!flightId && !flightNo) {
    return new Response(
      JSON.stringify({ error: 'flightId hoặc flightNo là bắt buộc' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // connection closed, ignore
        }
      };

      const fetchAndSend = async () => {
        try {
          const flight = flightId
            ? await getFlightById(flightId)
            : await getFlightStatusByNo(flightNo!);

          if (flight) {
            send('flight-status', {
              flightId: flight.id,
              flightNo: flight.flight_no,
              status: flight.status,
              departTime: flight.depart_time,
              arriveTime: flight.arrive_time,
              updatedAt: flight.updated_at,
            });
          }
        } catch (err) {
          console.error('[SSE trang-thai-chuyen-bay] DB error:', err);
        }
      };

      // Send initial data immediately
      await fetchAndSend();

      // Poll every 10 seconds
      const pollInterval = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(pollInterval);
          clearInterval(pingInterval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }
        await fetchAndSend();
      }, 10_000);

      // Heartbeat ping every 30 seconds to keep the connection alive
      const pingInterval = setInterval(() => {
        if (request.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        } catch { /* closed */ }
      }, 30_000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        clearInterval(pingInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

