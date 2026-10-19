import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, getPaymentsByBookingId } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';
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
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const bookingId = request.nextUrl.searchParams.get('bookingId');
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'bookingId là bắt buộc' },
        { status: 400 }
      );
    }

    const booking = await getBookingById(bookingId);
    if (!booking || booking.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không tìm thấy đặt chỗ' },
        { status: 403 }
      );
    }

    const payments = await getPaymentsByBookingId(bookingId);
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
