import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { getBookingByCodeOrId, changeBookingSeat, getTripById } from '@/lib/db';
import { getSeatCharge } from '@/features/bookings/pricing';
import { rateLimit } from '@/lib/rate-limit';
import { isGuestBookingOwner } from '@/lib/guest-booking';

/**
 * Đổi ghế sau khi đã đặt vé.
 *
 * Giá chênh lệch luôn do SERVER tính (`getSeatCharge(new) −
 * getSeatCharge(old)`); client chỉ gửi ghế mới. Hai đường ghi tiền — ghế rẻ
 * hơn và ghế đắng hơn — đều phải đi qua cùng một công thức, nếu không một
 * chiều sẽ bị tính sai.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 20 });
    if (limited) return limited;

    const { user, error, response } = await verifyAuthRequest(request);
    if (error === 'CSRF validation failed') return response!;

    const { id } = await params;
    const booking = await getBookingByCodeOrId(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const canViewFullBooking =
      !!user && (isAdminRole(user.role) || booking.user_id === user.userId);
    const lookedUpByPnr = booking.booking_code?.toUpperCase() === id.toUpperCase();
    if (!canViewFullBooking && !lookedUpByPnr && !isGuestBookingOwner(request, booking.id)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Vui lòng đăng nhập hoặc dùng mã đặt chỗ để đổi ghế.',
        },
        { status: 403 }
      );
    }

    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Booking not payable',
          message: 'Chỉ có thể đổi ghế cho đặt chỗ đã thanh toán.',
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const passengerId = String(body.passenger_id ?? '').trim();
    const newSeat = String(body.seat_number ?? '').trim().toUpperCase();

    if (!passengerId || !newSeat) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Thiếu hành khách hoặc ghế mới.' },
        { status: 400 }
      );
    }

    const trip = await getTripById(String(booking.trip_id ?? ''));
    const leg = trip?.legs.find((item) => item.bookingId === booking.id);
    if (!leg) {
      return NextResponse.json(
        { error: 'Leg not found', message: 'Không tìm thấy chặng bay của đặt chỗ.' },
        { status: 404 }
      );
    }

    const passenger = leg.passengers.find((item) => item.id === passengerId);
    if (!passenger) {
      return NextResponse.json(
        { error: 'Passenger not found', message: 'Hành khách không thuộc đặt chỗ này.' },
        { status: 404 }
      );
    }

    const oldSeat = passenger.seat_number ?? null;
    if (oldSeat === newSeat) {
      return NextResponse.json({
        success: true,
        message: 'Ghế không thay đổi.',
        priceDelta: 0,
        seatNumber: newSeat,
      });
    }

    const priceDelta = getSeatCharge(newSeat) - (oldSeat ? getSeatCharge(oldSeat) : 0);

    try {
      await changeBookingSeat({
        bookingId: booking.id,
        passengerId,
        oldSeat,
        newSeat,
        newSeatPrice: getSeatCharge(newSeat),
        priceDelta,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'SEAT_NOT_IN_BOOKING') {
        return NextResponse.json(
          {
            error: 'Seat not available',
            message: 'Ghế này không thuộc chuyến bay của bạn.',
          },
          { status: 400 }
        );
      }
      // 23505 = `idx_seats_flight_seat_unique` — ghế vừa có người chọn.
      if (message.includes('23505') || message.includes('idx_seats_flight_seat_unique')) {
        return NextResponse.json(
          {
            error: 'Seat conflict',
            message: 'Ghế này vừa có người khác chọn. Vui lòng chọn ghế khác.',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message:
        priceDelta > 0
          ? `Đã đổi sang ghế ${newSeat}. Phí chênh lệch: ${priceDelta.toLocaleString('vi-VN')}₫`
          : priceDelta < 0
            ? `Đã đổi sang ghế ${newSeat}. Hoàn: ${Math.abs(priceDelta).toLocaleString('vi-VN')}₫`
            : `Đã đổi sang ghế ${newSeat}.`,
      seatNumber: newSeat,
      oldSeat,
      priceDelta,
    });
  } catch (error) {
    console.error('Error changing seat:', error);
    return NextResponse.json(
      { error: 'Failed to change seat', message: 'Không đổi được ghế.' },
      { status: 500 }
    );
  }
}
