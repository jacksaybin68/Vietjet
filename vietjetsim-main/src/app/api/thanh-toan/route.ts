import { NextRequest, NextResponse } from 'next/server';
import {
  createPaymentAndConfirmBooking,
  getBookingById,
  getActiveBankAccounts,
  getUserLoyaltyWithProgram,
  spendLoyaltyPoints,
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
    if (error || !user) return response!;

    const payload = user;

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

    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { error: 'Invalid method', message: 'Phương thức thanh toán không hợp lệ' },
        { status: 400 }
      );
    }

    // Verify booking exists and belongs to current user
    const booking = await getBookingById(booking_id);
    if (!booking || booking.user_id !== payload.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Booking not found or does not belong to you' },
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
    // Paying with SkyPoint: deduct the points first — if they are insufficient
    // nothing is charged and the booking stays pending. Points are spent before
    // the booking flips to confirmed so a failed deduction can never hand out a
    // free ticket (worst case: a point refund an operator can reverse, not an
    // unpaid flight).
    if (method === 'skypoint') {
      const loyaltyData = await getUserLoyaltyWithProgram(payload.userId);
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
          payload.userId,
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

    // Create payment + confirm booking atomically (single transaction)
    const result = await createPaymentAndConfirmBooking({
      booking_id,
      method,
      amount: discountedTotal,
      user_id: payload.userId,
      discount_code_id,
      discount_amount: discount_amount || 0,
    });

    // Email xác nhận — fail-soft trong sendMail, không được chặn response.
    void sendBookingConfirmationEmail({
      to: payload.email,
      fullName: payload.fullName,
      bookingCode: result.booking.booking_code ?? null,
      amount: discountedTotal,
      method,
    });

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
