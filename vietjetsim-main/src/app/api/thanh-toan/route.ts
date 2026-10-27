import { NextRequest, NextResponse } from 'next/server';
import {
  createPaymentAndConfirmBooking,
  getBookingById,
  getActiveBankAccounts,
  getUserLoyaltyWithProgram,
  spendLoyaltyPoints,
  findUserById,
} from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';
import { renderTransferNote } from '@/lib/transfer-note';
import { validateBankTransferInput } from '@/lib/bank-transfer';
import { sendBookingConfirmationEmail } from '@/lib/mail';
import { skypointPointsForAmount } from '@/lib/skypoint';

/** Methods the payment page may submit. Anything else is rejected up front. */
const ALLOWED_METHODS = new Set(['card', 'bank', 'vietqr', 'wallet', 'e_wallet', 'skypoint']);

export async function POST(request: NextRequest) {
  // Validate CSRF token
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error === 'CSRF validation failed') return response!;

    const body = await request.json();
    const {
      booking_id,
      method,
      amount,
      discount_code_id,
      discount_amount,
      discount_code,
      bank_account_id,
      transfer_note,
      transfer_amount,
      receipt_image,
    } = body;

    // Validation
    if (!booking_id || !method || amount === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'booking_id, method, and amount are required',
        },
        { status: 400 }
      );
    }

    if (amount < 0) {
      return NextResponse.json(
        { error: 'Invalid amount', message: 'Amount cannot be negative' },
        { status: 400 }
      );
    }

    if (receipt_image) {
      if (typeof receipt_image !== 'string' || receipt_image.length > 5_000_000) {
        return NextResponse.json(
          {
            error: 'Invalid receipt image',
            message: 'Ảnh biên lai không hợp lệ hoặc vượt quá kích thước cho phép (tối đa 5MB)',
          },
          { status: 400 }
        );
      }
      if (!receipt_image.startsWith('data:image/') && !receipt_image.startsWith('/images/')) {
        return NextResponse.json(
          { error: 'Invalid receipt image format', message: 'Định dạng ảnh biên lai không hợp lệ' },
          { status: 400 }
        );
      }
    }

    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { error: 'Invalid method', message: 'Phương thức thanh toán không hợp lệ' },
        { status: 400 }
      );
    }

    // Verify booking exists
    const booking = await getBookingById(booking_id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy thông tin đặt chỗ' },
        { status: 404 }
      );
    }

    // Nếu người dùng đã đăng nhập, đảm bảo đặt chỗ thuộc về tài khoản của họ (trừ admin)
    if (user && booking.user_id && booking.user_id !== user.userId && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Đặt chỗ không thuộc về tài khoản này' },
        { status: 403 }
      );
    }

    // Prevent double-charge: a booking can only be paid once.
    if (booking.status === 'confirmed') {
      return NextResponse.json(
        {
          error: 'Already paid',
          message: 'Đặt chỗ này đã được thanh toán rồi.',
        },
        { status: 409 }
      );
    }

    // Charge exactly what the booking is worth. `amount` from the browser is for
    // display only — trusting it let a client pay one đồng (or ten times the
    // fare) and have the booking marked confirmed. A discount legitimately
    // lowers the charge, so the expected amount is the discounted total.
    const discountedTotal = Math.max(0, booking.total_price - (discount_amount || 0));
    if (amount !== discountedTotal) {
      return NextResponse.json(
        {
          error: 'Invalid payment amount',
          message: `Số tiền phải đúng ${discountedTotal.toLocaleString('vi-VN')} VND`,
        },
        { status: 400 }
      );
    }

    // A bank transfer (or a VietQR scan, which settles the same account) is
    // confirmed by re-typing the memo and the amount the page showed. Both are
    // checked against values derived here, never against the ones the browser
    // sent — an attacker controls those, so trusting them would make the
    // confirmation decorative. Deriving the memo from the same template the
    // page used keeps the two from drifting apart.
    if (method === 'bank' || method === 'vietqr') {
      const bankAccounts = await getActiveBankAccounts();
      const account =
        bankAccounts.find((a) => String(a.id) === String(bank_account_id)) ?? bankAccounts[0];

      if (!account) {
        return NextResponse.json(
          { error: 'Bank transfer unavailable', message: 'Chưa cấu hình tài khoản nhận tiền.' },
          { status: 503 }
        );
      }

      const expectedNote = renderTransferNote(account.transfer_note_template, {
        code: booking.booking_code ?? '',
        originalAmount: booking.total_price,
        discountAmount: discount_amount || 0,
        amount: discountedTotal,
        discountCode: discount_code || '',
      });

      // Nếu khách đã tải ảnh biên lai giao dịch ngân hàng để Admin đối chiếu,
      // hoặc đã bấm "Tôi đã thanh toán" kèm ảnh biên lai, cho phép tiếp tục ghi nhận giao dịch.
      if (!receipt_image) {
        const check = validateBankTransferInput(
          { transferNote: transfer_note, amount: transfer_amount },
          { transferNote: expectedNote, amount: discountedTotal }
        );

        if (!check.valid) {
          return NextResponse.json(
            { error: 'Transfer details do not match', message: check.message, field: check.field },
            { status: 400 }
          );
        }
      }
    }
    // Paying with SkyPoint or Wallet requires an authenticated user account
    if (method === 'wallet' && !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Vui lòng đăng nhập để thanh toán bằng ví Vietjet.' },
        { status: 401 }
      );
    }

    if (method === 'skypoint') {
      if (!user) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Vui lòng đăng nhập tài khoản SkyJoy để thanh toán bằng điểm thưởng.',
          },
          { status: 401 }
        );
      }

      const loyaltyData = await getUserLoyaltyWithProgram(user.userId);
      if (!loyaltyData) {
        return NextResponse.json(
          { error: 'Loyalty unavailable', message: 'Chương trình SkyJoy chưa khả dụng' },
          { status: 503 }
        );
      }

      const pointsNeeded = skypointPointsForAmount(
        discountedTotal,
        loyaltyData.program.points_per_1000_vnd
      );

      try {
        await spendLoyaltyPoints(
          user.userId,
          pointsNeeded,
          `Thanh toán SkyPoint cho đặt chỗ ${booking.booking_code ?? booking_id}`
        );
      } catch (loyaltyError) {
        const message = loyaltyError instanceof Error ? loyaltyError.message : '';
        if (message.includes('Insufficient')) {
          return NextResponse.json(
            {
              error: 'Insufficient SkyPoint',
              message: `Bạn cần ${pointsNeeded.toLocaleString('vi-VN')} SkyPoint cho giao dịch này`,
            },
            { status: 400 }
          );
        }
        throw loyaltyError;
      }
    }

    // Nếu khách hàng đính kèm ảnh biên lai để admin đối chiếu,
    // giao dịch được đưa vào trạng thái 'pending' để admin kiểm tra tài khoản và xác nhận.
    const initialStatus = receipt_image ? 'pending' : 'completed';

    // Create payment + confirm booking atomically (single transaction)
    const paymentUserId = user?.userId || booking.user_id;
    const result = await createPaymentAndConfirmBooking({
      booking_id,
      method,
      amount: discountedTotal,
      status: initialStatus,
      user_id: paymentUserId,
      discount_code_id,
      discount_amount: discount_amount || 0,
      receipt_image,
      transfer_note:
        transfer_note || (booking.booking_code ? `VJ ${booking.booking_code}` : undefined),
    });

    // Chỉ gửi email xác nhận vé ngay nếu thanh toán đã hoàn tất trực tiếp (thẻ, ví).
    // Nếu khách đính kèm ảnh biên lai để admin đối chiếu, email sẽ được gửi tự động khi admin bấm duyệt trong /quan-tri.
    let toEmail = user?.email;
    let recipientName = user?.fullName;

    if (initialStatus === 'completed') {
      if (!toEmail && booking.user_id) {
        const bookingUser = await findUserById(booking.user_id);
        if (bookingUser) {
          toEmail = bookingUser.email;
          recipientName = bookingUser.full_name;
        }
      }

      if (toEmail) {
        void sendBookingConfirmationEmail({
          to: toEmail,
          fullName: recipientName || 'Quý khách',
          bookingCode: result.booking.booking_code ?? null,
          amount: discountedTotal,
          method,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        payment: {
          id: result.payment.id,
          booking_id: result.payment.booking_id,
          method: result.payment.method,
          status: result.payment.status,
          amount: result.payment.amount,
          created_at: result.payment.created_at,
        },
        booking_status: result.booking.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
