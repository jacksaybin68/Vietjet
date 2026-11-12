import { NextRequest, NextResponse } from 'next/server';
import { confirmVietQrPayment } from '@/lib/db';
import { sendAutomaticPaymentInvoiceEmail } from '@/lib/payment-invoice';
import { getApiErrorMessage } from '@/shared/services';
import {
  parseVietQrWebhookPayload,
  verifyVietQrWebhookAuth,
} from '@/lib/vietqr-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** No legitimate bank notification for this flow is larger than this. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/thanh-toan/webhook/vietqr
 *
 * Simulated VietQR/bank webhook: settles a pending booking immediately so the
 * payment flow can be exercised end to end without an operator pressing
 * "Xác nhận" in `/quan-tri`. Authentication is a shared secret
 * (`VIETQR_WEBHOOK_SECRET`) or an HMAC-SHA256 signature of the raw body —
 * never a session, because the caller is a gateway rather than a browser.
 *
 * The route is idempotent: replaying the same notification returns
 * `alreadyPaid: true` and does not write a second payment row. The public
 * prefix `/api/thanh-toan` already classifies it as a public API route in
 * `route-access.ts`; access is enforced here.
 */
export async function POST(request: NextRequest) {
  try {
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Payload Too Large', message: 'Webhook body quá lớn' },
        { status: 413 }
      );
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Payload Too Large', message: 'Webhook body quá lớn' },
        { status: 413 }
      );
    }

    const auth = verifyVietQrWebhookAuth(request.headers, rawBody);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 503 ? 'Unavailable' : 'Unauthorized', message: auth.message },
        { status: auth.status }
      );
    }

    let body: unknown;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Body phải là JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = parseVietQrWebhookPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Bad Request', message: parsed.message }, { status: 400 });
    }

    const result = await confirmVietQrPayment(parsed.payload);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Không tìm thấy đặt chỗ' },
          { status: 404 }
        );
      }
      if (result.reason === 'amount_mismatch') {
        return NextResponse.json(
          {
            error: 'Amount Mismatch',
            message: `Số tiền không khớp: cần ${result.expectedAmount?.toLocaleString('vi-VN')} VND`,
            expectedAmount: result.expectedAmount,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: 'Invalid Status',
          message: `Đặt chỗ đang ở trạng thái "${result.booking?.status}", không thể xác nhận thanh toán`,
          bookingStatus: result.booking?.status,
        },
        { status: 409 }
      );
    }

    if (!result.alreadyPaid) {
      // Same best-effort invoice/ticket email the admin confirmation and the
      // real payment route send. A mail failure must not turn a settled
      // payment into a 5xx the gateway would retry forever.
      void sendAutomaticPaymentInvoiceEmail(result.booking.id, {
        paymentMethod: 'vietqr',
      }).catch((error) => {
        console.error('VietQR webhook invoice email failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      simulated: true,
      alreadyPaid: result.alreadyPaid,
      authMode: auth.mode,
      transactionId: parsed.payload.transactionId ?? null,
      booking: {
        id: result.booking.id,
        code: result.booking.booking_code,
        status: result.booking.status,
      },
      payment: result.payment
        ? {
            id: result.payment.id,
            method: result.payment.method,
            status: result.payment.status,
            amount: result.payment.amount,
          }
        : null,
    });
  } catch (error) {
    console.error('VietQR webhook error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
