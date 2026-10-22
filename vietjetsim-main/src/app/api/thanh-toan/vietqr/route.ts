import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, getActiveBankAccounts } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';
import { renderTransferNote } from '@/lib/transfer-note';
import { buildVietQrPayload } from '@/lib/vietqr';
import { getApiErrorMessage } from '@/shared/services';

/**
 * GET /api/thanh-toan/vietqr?bookingId=…
 *
 * Sinh mã VietQR động (EMVCo/NAPAS) cho một đặt chỗ: số tiền và nội dung
 * chuyển khoản được suy ra ở server (không tin dữ liệu client), CRC16 tính
 * tại chỗ. Client dùng payload này để render QR và poll trạng thái giao dịch.
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

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy thông tin đặt chỗ' },
        { status: 404 }
      );
    }

    if (user && booking.user_id && booking.user_id !== user.userId && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Đặt chỗ không thuộc về tài khoản này' },
        { status: 403 }
      );
    }

    const accounts = await getActiveBankAccounts();
    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'Unavailable', message: 'Chưa cấu hình tài khoản nhận tiền' },
        { status: 503 }
      );
    }

    const account = accounts[0];
    const discountAmount = booking.discount_amount || 0;
    const amount = Math.max(0, booking.total_price - discountAmount);
    const addInfo = renderTransferNote(account.transfer_note_template, {
      code: booking.booking_code ?? '',
      originalAmount: booking.total_price,
      discountAmount,
      amount,
      discountCode: '',
    });

    const payload = buildVietQrPayload({
      bin: account.bank_bin || '',
      accountNumber: account.account_number,
      amount,
      addInfo,
      bankName: account.bank_name,
    });

    return NextResponse.json({
      success: true,
      payload,
      pnr: booking.booking_code,
      amount,
      addInfo,
      bank: {
        id: account.id,
        name: account.bank_name,
        bin: account.bank_bin || null,
        accountNumber: account.account_number,
        accountHolder: account.account_holder,
        logoUrl: account.logo_url || null,
      },
    });
  } catch (error) {
    console.error('VietQR API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
