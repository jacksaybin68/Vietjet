import { NextRequest, NextResponse } from 'next/server';
import {
  createPaymentAndConfirmBooking,
  getBookingById,
  getActiveBankAccounts,
  getUserLoyaltyWithProgram,
  spendLoyaltyPoints,
  refundLoyaltyPoints,
  awardBookingLoyaltyPoints,
  findUserById,
  getDiscountCodeById,
  getDiscountCodeByCode,
  countUserDiscountUsage,
} from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { renderTransferNote } from '@/lib/transfer-note';
import { validateBankTransferInput } from '@/lib/bank-transfer';
import { sendPaymentInstructionEmail, sendPaymentFailedEmail } from '@/lib/mail';
import { sendAutomaticPaymentInvoiceEmail } from '@/lib/payment-invoice';
import { skypointPointsForAmount, skypointValueOfPoints } from '@/lib/skypoint';
import { rateLimit } from '@/lib/rate-limit';

/** Methods the payment page may submit. Anything else is rejected up front. */
const ALLOWED_METHODS = new Set([
  'card',
  'bank',
  'vietqr',
  'wallet',
  'e_wallet',
  'skypoint',
  'cash_plus_points',
  'movi',
]);

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 30 });
    if (limited) return limited;

    const { user, error, response } = await verifyAuthRequest(request);
    if (error === 'CSRF validation failed') return response!;

    const body = await request.json();
    const {
      booking_id,
      method,
      amount,
      discount_code_id,
      discount_code,
      bank_account_id,
      transfer_note,
      transfer_amount,
      receipt_image,
      points_to_redeem,
      pointsToRedeem,
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
      if (typeof receipt_image !== 'string' || receipt_image.length > 6_000_000) {
        return NextResponse.json(
          {
            error: 'Invalid receipt image',
            message: 'Ảnh biên lai không hợp lệ hoặc vượt quá kích thước cho phép (tối đa 4MB)',
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
    if (user && booking.user_id && booking.user_id !== user.userId && !isAdminRole(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Đặt chỗ không thuộc về tài khoản này' },
        { status: 403 }
      );
    }

    // Prevent double-charge: a booking can only be paid once.
    if (booking.status === 'confirmed' || booking.status === 'completed') {
      return NextResponse.json(
        {
          error: 'Already paid',
          message: 'Đặt chỗ này đã được thanh toán rồi.',
        },
        { status: 409 }
      );
    }

    let validatedDiscountId: string | undefined;
    let validatedDiscountAmount = 0;

    if (discount_code_id || discount_code) {
      const discount =
        (discount_code_id ? await getDiscountCodeById(String(discount_code_id)) : null) ??
        (discount_code ? await getDiscountCodeByCode(String(discount_code)) : null);

      if (!discount) {
        return NextResponse.json(
          { error: 'Invalid discount', message: 'Mã giảm giá không tồn tại' },
          { status: 400 }
        );
      }

      const now = new Date();
      if (
        !discount.is_active ||
        now < new Date(discount.start_date) ||
        now > new Date(discount.end_date)
      ) {
        return NextResponse.json(
          { error: 'Invalid discount', message: 'Mã giảm giá không còn hiệu lực' },
          { status: 400 }
        );
      }

      if (discount.usage_limit !== null && discount.used_count >= discount.usage_limit) {
        return NextResponse.json(
          { error: 'Invalid discount', message: 'Mã giảm giá đã hết lượt sử dụng' },
          { status: 400 }
        );
      }

      if (discount.usage_per_user_limit !== null) {
        const usedByUser = await countUserDiscountUsage(booking.user_id, discount.id);
        if (usedByUser >= discount.usage_per_user_limit) {
          return NextResponse.json(
            { error: 'Invalid discount', message: 'Bạn đã sử dụng mã giảm giá này rồi' },
            { status: 400 }
          );
        }
      }

      if (booking.total_price < Number(discount.min_booking_amount)) {
        return NextResponse.json(
          {
            error: 'Invalid discount',
            message: `Mã giảm giá chỉ áp dụng cho đơn hàng từ ${Number(
              discount.min_booking_amount
            ).toLocaleString('vi-VN')}₫`,
          },
          { status: 400 }
        );
      }

      let computedDiscount =
        discount.type === 'fixed'
          ? Number(discount.value)
          : (booking.total_price * Number(discount.value)) / 100;

      if (discount.type === 'percentage' && discount.max_discount_amount !== null) {
        computedDiscount = Math.min(computedDiscount, Number(discount.max_discount_amount));
      }

      validatedDiscountAmount = Math.max(
        0,
        Math.min(Math.round(computedDiscount), booking.total_price)
      );
      validatedDiscountId = discount.id;
    }

    // Charge exactly what the booking is worth. `amount` from the browser is for
    // display only — trusting it let a client pay one đồng (or ten times the
    // fare) and have the booking marked confirmed. A discount legitimately
    // lowers the charge, so the expected amount is the discounted total.
    let discountedTotal = Math.max(0, booking.total_price - validatedDiscountAmount);
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
        discountAmount: validatedDiscountAmount,
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

    let loyaltyPointsSpent = 0;
    const requestedPointsToRedeem = Number(points_to_redeem || pointsToRedeem || 0);

    // ─── Cơ chế Cash + Points hoặc Thanh toán 100% bằng SkyPoint ─────────
    if (requestedPointsToRedeem > 0) {
      if (!user) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Vui lòng đăng nhập tài khoản SkyJoy để sử dụng điểm thưởng Cash + Points.',
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

      if (loyaltyData.loyalty.available_points < requestedPointsToRedeem) {
        return NextResponse.json(
          {
            error: 'Insufficient SkyPoint',
            message: `Số dư điểm không đủ (khả dụng: ${loyaltyData.loyalty.available_points.toLocaleString('vi-VN')} điểm)`,
          },
          { status: 400 }
        );
      }

      const pointsDiscountVnd = skypointValueOfPoints(
        requestedPointsToRedeem,
        loyaltyData.program.points_per_1000_vnd
      );

      try {
        await spendLoyaltyPoints(
          user.userId,
          requestedPointsToRedeem,
          `Thanh toán Cash + Points cho đặt chỗ ${booking.booking_code ?? booking_id}`
        );
        loyaltyPointsSpent = requestedPointsToRedeem;
        discountedTotal = Math.max(0, discountedTotal - pointsDiscountVnd);
      } catch (loyaltyError) {
        const message = loyaltyError instanceof Error ? loyaltyError.message : '';
        return NextResponse.json(
          { error: 'Loyalty spend failed', message: message || 'Không thể trừ điểm SkyJoy' },
          { status: 400 }
        );
      }
    } else if (method === 'skypoint') {
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
        loyaltyPointsSpent = pointsNeeded;
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

    // Tìm thông tin người nhận email
    let toEmail = user?.email;
    let recipientName = user?.fullName;

    if (!toEmail && booking.user_id) {
      const bookingUser = await findUserById(booking.user_id);
      if (bookingUser) {
        toEmail = bookingUser.email;
        recipientName = bookingUser.full_name;
      }
    }

    if (!toEmail && Array.isArray(booking.passengers) && booking.passengers.length > 0) {
      const firstPass = booking.passengers[0] as { email?: string; name?: string };
      if (firstPass?.email) toEmail = firstPass.email;
      if (!recipientName && firstPass?.name) recipientName = firstPass.name;
    }

    // Create payment + confirm booking atomically (single transaction)
    const paymentUserId = user?.userId || booking.user_id;
    const result = await createPaymentAndConfirmBooking({
      booking_id,
      method,
      amount: discountedTotal,
      status: initialStatus,
      user_id: paymentUserId,
      discount_code_id: validatedDiscountId,
      discount_amount: validatedDiscountAmount,
      receipt_image,
      transfer_note:
        transfer_note || (booking.booking_code ? `VJ ${booking.booking_code}` : undefined),
    }).catch(async (paymentError) => {
      if (loyaltyPointsSpent > 0 && user) {
        try {
          await refundLoyaltyPoints(
            user.userId,
            loyaltyPointsSpent,
            `Hoàn điểm do thanh toán thất bại cho đặt chỗ ${booking.booking_code ?? booking_id}`
          );
        } catch (refundError) {
          console.error(
            '[PAYMENT][CRITICAL] SkyPoint spend occurred but payment failed and auto-refund failed.',
            { paymentError, refundError }
          );
        }
      }

      // Tự động gửi email thông báo thanh toán thất bại / báo lỗi cho khách hàng
      if (toEmail && !toEmail.includes('@khach.vietjetsim.vn')) {
        void sendPaymentFailedEmail({
          to: toEmail,
          fullName: recipientName || 'Quý khách',
          bookingCode: booking.booking_code ?? null,
          bookingId: booking.id,
          amount: discountedTotal,
          reason:
            paymentError instanceof Error
              ? paymentError.message
              : 'Giao dịch bị gián đoạn trong quá trình xử lý thanh toán',
        });
      }

      throw paymentError;
    });

    if (initialStatus === 'completed') {
      // Tự động tích lũy điểm thưởng SkyJoy theo hệ số hạng thẻ: Red (x1.0), Silver (x1.2), Gold (x1.5), Diamond (x2.0)
      if (discountedTotal > 0 || loyaltyPointsSpent > 0) {
        void awardBookingLoyaltyPoints(
          booking.id,
          discountedTotal > 0 ? discountedTotal : booking.total_price,
          user?.userId || booking.user_id
        ).catch((err) => {
          console.error('Failed to auto-award loyalty points for booking:', err);
        });
      }

      // Tự động gửi email hoá đơn thanh toán & vé điện tử cho khách hàng
      await sendAutomaticPaymentInvoiceEmail(booking.id, {
        paymentMethod: method,
        customAmount: discountedTotal,
      }).catch((err) => {
        console.error('Failed to auto-send payment invoice email:', err);
      });
    } else if (initialStatus === 'pending') {
      // Đơn hàng thanh toán chuyển khoản / VNPAY-QR đang chờ đối soát: gửi email thông báo và hướng dẫn thanh toán
      if (toEmail && !toEmail.includes('@khach.vietjetsim.vn')) {
        let bankName: string | undefined;
        let accountNumber: string | undefined;
        let accountHolder: string | undefined;
        let bankBin: string | undefined;
        try {
          const banks = await getActiveBankAccounts();
          if (banks && banks.length > 0) {
            const chosen = banks.find((a) => String(a.id) === String(bank_account_id)) ?? banks[0];
            bankName = chosen.bank_name;
            accountNumber = chosen.account_number;
            accountHolder = chosen.account_holder;
            bankBin = chosen.bank_bin || undefined;
          }
        } catch {
          // Không lấy được danh sách ngân hàng: dùng thông tin mặc định.
        }

        void sendPaymentInstructionEmail({
          to: toEmail,
          fullName: recipientName || 'Quý khách',
          bookingCode: result.booking.booking_code ?? null,
          bookingId: booking.id,
          amount: discountedTotal,
          transferNote:
            transfer_note ||
            (result.booking.booking_code ? `VJ ${result.booking.booking_code}` : undefined),
          bankName,
          accountNumber,
          accountHolder,
          bankBin,
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
