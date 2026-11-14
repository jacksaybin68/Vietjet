import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { getBookingByCodeOrId, getTripById } from '@/lib/db';
import { buildBoardingPassPdf, type BoardingPassPdfLeg } from '@/lib/pdf/boarding-pass';
import { rateLimit } from '@/lib/rate-limit';
import { isGuestBookingOwner } from '@/lib/guest-booking';
import { toVietnamWallClock } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Tải vé điện tử (PDF) của một đặt chỗ.
 *
 * `?leg=outbound|inbound|all` chọn chặng; mặc định `all` — khứ hồi thì một
 * file duy nhất chứa cả hai chặng, mỗi chặng một trang A4.
 *
 * Quyền truy cập theo đúng luật của `canAccessBooking`: cookie khách vãng lai,
 * tra cứu bằng PNR, hoặc chủ sở hữu/admin. Một UUID trần không đủ — UUID lọt
 * qua log và referrer, và khách không biết UUID để điền.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 20 });
    if (limited) return limited;

    const { user } = await verifyAuthRequest(request);
    const { id } = await params;

    const booking = await getBookingByCodeOrId(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const canViewFullBooking =
      !!user && (isAdminRole(user.role) || booking.user_id === user.userId);
    if (user && !canViewFullBooking) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lookedUpByPnr = booking.booking_code?.toUpperCase() === id.toUpperCase();
    if (!user && !lookedUpByPnr && !isGuestBookingOwner(request, booking.id)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Vui lòng đăng nhập hoặc dùng mã đặt chỗ để tải vé.',
        },
        { status: 403 }
      );
    }

    const tripId = booking.trip_id;
    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip not found', message: 'Không tìm thấy thông tin chặng bay.' },
        { status: 404 }
      );
    }

    const trip = await getTripById(tripId);
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found', message: 'Không tìm thấy thông tin chặng bay.' },
        { status: 404 }
      );
    }

    const requestedLeg = new URL(request.url).searchParams.get('leg') ?? 'all';
    const legs: BoardingPassPdfLeg[] = trip.legs
      .filter((leg) => requestedLeg === 'all' || leg.legRole === requestedLeg)
      .map((leg) => {
        const depart = toVietnamWallClock(leg.departTime);
        const arrive = toVietnamWallClock(leg.arriveTime);
        return {
          pnr: leg.bookingCode ?? '',
          flightNo: leg.flightNo,
          from: leg.fromCode,
          to: leg.toCode,
          fromCity: leg.fromCity,
          toCity: leg.toCity,
          date: depart.date,
          departTime: depart.time,
          arriveTime: arrive.time,
          gate: leg.gate,
          terminal: leg.terminal,
          legRole: leg.legRole,
          passengers: leg.passengers.map((passenger) => ({
            name: passenger.name,
            seat:
              passenger.seat_number ||
              leg.checkIns.find((ci) => ci.passenger_id === passenger.id)?.seat_number ||
              '',
          })),
        };
      })
      .filter((leg) => leg.passengers.length > 0);

    if (legs.length === 0) {
      return NextResponse.json(
        { error: 'No passengers', message: 'Đặt chỗ chưa có hành khách để in vé.' },
        { status: 404 }
      );
    }

    const pdf = await buildBoardingPassPdf({
      legs,
      amount: booking.total_price,
    });

    const filename = `ve-dien-tu-${booking.booking_code ?? booking.id}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error building e-ticket PDF:', error);
    return NextResponse.json(
      { error: 'Failed to build e-ticket PDF', message: 'Không tạo được file vé điện tử.' },
      { status: 500 }
    );
  }
}
