import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import {
  getBookingByCodeOrId,
  getRefundsByUserId,
  createRefund,
  isRefundFeatureEnabled,
} from '@/lib/db';
import { parsePaginationParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    const refunds = await getRefundsByUserId(payload.userId, { page, limit });
    // The client needs the switch too, so it can disable the button and explain
    // why instead of letting the customer fill in a form that will be rejected.
    const refundFeatureEnabled = await isRefundFeatureEnabled();

    return NextResponse.json({ refunds, page, limit, refundFeatureEnabled });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    // An operator can pause refunds from the admin console. Reject before
    // reading the body so a locked form cannot half-create a ticket.
    if (!(await isRefundFeatureEnabled())) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Tính năng yêu cầu hoàn tiền đang tạm khoá. Vui lòng thử lại sau.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      booking_id,
      booking_code,
      reason,
      bank_name,
      account_number,
      account_holder,
      phone,
      amount,
    } = body as Record<string, unknown>;

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const normalizedBookingId = str(booking_id);
    const normalizedPnr = str(booking_code).toUpperCase();
    const normalizedReason = str(reason);
    const normalizedBank = str(bank_name);
    const normalizedAccount = str(account_number);
    const normalizedHolder = str(account_holder);
    const normalizedPhone = str(phone);

    const missing: string[] = [];
    if (!normalizedBookingId && !normalizedPnr) missing.push('Mã đặt chỗ');
    if (!normalizedReason) missing.push('Lý do hoàn tiền');
    if (!normalizedBank) missing.push('Ngân hàng nhận tiền');
    if (!normalizedAccount) missing.push('Số tài khoản');
    if (!normalizedHolder) missing.push('Họ và tên chủ tài khoản');
    if (!normalizedPhone) missing.push('Số điện thoại');
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Thiếu thông tin: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Phone is the channel support calls back on, so validate the shape rather
    // than storing whatever was typed.
    if (!/^\+?[0-9\s.-]{8,20}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Số điện thoại không hợp lệ' },
        { status: 400 }
      );
    }

    const refundAmount = Number(amount);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Số tiền hoàn không hợp lệ' },
        { status: 400 }
      );
    }

    // Resolve the booking and prove it belongs to this customer. A PNR alone is
    // not authority — a 6-character code is guessable, so ownership is checked
    // before any payout details are attached to it.
    const booking = await getBookingByCodeOrId(normalizedBookingId || normalizedPnr);

    if (!booking || booking.user_id !== payload.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không tìm thấy đặt chỗ thuộc tài khoản của bạn' },
        { status: 403 }
      );
    }

    const refund = await createRefund({
      booking_id: booking.id,
      user_id: payload.userId,
      reason: normalizedReason,
      phone: normalizedPhone,
      booking_code: booking.booking_code || normalizedPnr || null,
      bank_info: {
        bank_name: normalizedBank,
        account_number: normalizedAccount,
        account_holder: normalizedHolder,
        phone: normalizedPhone,
        amount: refundAmount,
      },
    });

    // The ticket is created hidden (visible_to_user = FALSE). Echoing it back
    // would let the customer see it through devtools even though GET filters it.
    return NextResponse.json(
      {
        success: true,
        message: 'Đã gửi yêu cầu hoàn tiền. Yêu cầu sẽ hiển thị sau khi được xét duyệt.',
        refundId: refund.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating refund:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
