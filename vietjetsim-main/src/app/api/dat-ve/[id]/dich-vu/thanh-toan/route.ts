import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import {
  getBookingByCodeOrId,
  getPendingBaggageAmount,
  markBookingBaggagePaid,
  addBookingExtraCharge,
  spendWalletBalance,
  createPayment,
} from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { isGuestBookingOwner } from '@/lib/guest-booking';

/**
 * Thanh toán ngay phần hành lý mua thêm sau khi đặt vé.
 *
 * Vì sao cần endpoint riêng: `POST /api/dat-ve/[id]/dich-vu` chỉ *ghi nhận*
 * gói hành lý với trạng thái `pending` — giá được server tính, nhưng tiền chưa
 * được thu. Khách mua thêm hành lý xong phải ra quầy mới có hành lý, điều mà
 * luồng "mua thêm dịch vụ sau khi đã thanh toán" không được phép.
 *
 * Nguyên tắc bất di bất dịch: **số tiền do server tính**
 * (`getPendingBaggageAmount`), client không gửi amount. Nếu tin client, một
 * request đã sửa số tiền sẽ mua được hành lý bằng 1₫.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        { error: 'Forbidden', message: 'Vui lòng đăng nhập để thanh toán dịch vụ bổ sung.' },
        { status: 403 }
      );
    }

    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Booking not payable', message: 'Chỉ có thể thanh toán bổ sung cho vé đã mua.' },
        { status: 409 }
      );
    }

    // Số tiền server tự tính từ `booking_baggage` — không đọc từ request.
    const amount = await getPendingBaggageAmount(booking.id);
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Nothing to pay', message: 'Không có hành lý nào đang chờ thanh toán.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const method = String(body.method ?? 'wallet');

    // Ví nội địa: trừ tiền thật khỏi ví, không đủ thì báo 402.
    if (method === 'wallet') {
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Vui lòng đăng nhập để thanh toán bằng ví.' },
          { status: 401 }
        );
      }
      try {
        await spendWalletBalance(
          user.userId,
          amount,
          booking.id,
          `Mua thêm hành lý — đặt chỗ ${booking.booking_code ?? booking.id}`
        );
      } catch (walletError) {
        const message = walletError instanceof Error ? walletError.message : '';
        const insufficient =
          message.includes('số dư') || message.includes('không đủ') || message.includes('SOLID');
        return NextResponse.json(
          {
            error: insufficient ? 'Insufficient funds' : 'Payment failed',
            message: insufficient
              ? 'Số dư ví không đủ để thanh toán dịch vụ bổ sung.'
              : message || 'Không thanh toán được.',
          },
          { status: insufficient ? 402 : 400 }
        );
      }
    } else if (method !== 'card') {
      return NextResponse.json(
        {
          error: 'Invalid method',
          message: 'Chỉ hỗ trợ thanh toán bổ sung bằng ví hoặc thẻ.',
        },
        { status: 400 }
      );
    }

    // Ghi giao dịch trước, đánh dấu hành lý đã trả sau. `markBookingBaggagePaid`
    // idempotent ⇒ chạy lại không cộng tiền hai lần.
    const payment = await createPayment({
      booking_id: booking.id,
      method,
      amount,
      transfer_note: booking.booking_code ?? undefined,
    });

    const markedCount = await markBookingBaggagePaid(booking.id, payment.id);
    if (markedCount > 0) {
      await addBookingExtraCharge(booking.id, amount);
    }

    return NextResponse.json({
      success: true,
      message: `Đã thanh toán ${amount.toLocaleString('vi-VN')}₫ cho hành lý bổ sung.`,
      amount,
      paymentId: payment.id,
      paidPackages: markedCount,
    });
  } catch (error) {
    console.error('Error paying baggage addon:', error);
    return NextResponse.json(
      { error: 'Failed to pay', message: 'Không thanh toán được dịch vụ bổ sung.' },
      { status: 500 }
    );
  }
}
