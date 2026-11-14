import { NextRequest, NextResponse } from 'next/server';
import { getBookingByCodeOrId, getPaymentsByBookingId } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';
import { canAccessBooking } from '@/lib/booking-access';
import { getApiErrorMessage } from '@/shared/services';

/**
 * GET /api/thanh-toan/trang-thai?bookingId=…
 *
 * Endpoint thăm dò (polling) cho màn thanh toán: client gọi định kỳ trong lúc
 * khách quét VietQR / chờ xử lý; khi `booking.status === 'confirmed'` (giao
 * dịch được ghi nhận — ví dụ webhook từ phía ngân hàng hoặc admin xác nhận),
 * client tự chuyển sang success screen mà khách không cần tải lại trang.
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuthRequest(request);

    const bookingId = request.nextUrl.searchParams.get('bookingId');
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'bookingId là bắt buộc' },
        { status: 400 }
      );
    }

    const booking = await getBookingByCodeOrId(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy thông tin đặt chỗ' },
        { status: 404 }
      );
    }

    // Payment state is booking-scoped data. Without this check an anonymous
    // caller who knew a booking UUID could poll a stranger's history.
    if (!canAccessBooking(request, booking, user, bookingId)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Đặt chỗ không thuộc về tài khoản này' },
        { status: 403 }
      );
    }

    const payments = await getPaymentsByBookingId(booking.id);
    const latest = payments[0] ?? null;

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        booking_code: booking.booking_code,
      },
      payment: latest
        ? { method: latest.method, status: latest.status, amount: latest.amount }
        : null,
    });
  } catch (error) {
    console.error('Payment status API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
