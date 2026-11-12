import { NextRequest, NextResponse } from 'next/server';
import { confirmVietQrPayment, awardBookingLoyaltyPoints } from '@/lib/db';
import { sendAutomaticPaymentInvoiceEmail } from '@/lib/payment-invoice';
import { getApiErrorMessage } from '@/shared/services';
import { rateLimit } from '@/lib/rate-limit';
import {
  parseVietQrWebhookPayload,
  verifyVietQrWebhookAuth,
  verifyWebhookTimestamp,
  getIdempotentWebhook,
  setIdempotentWebhook,
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
 * Security:
 *   - Rate limited to 60 requests/min to mitigate DDoS/brute force.
 *   - Timing-safe HMAC-SHA256 / Shared Secret auth.
 *   - Timestamp drift verification (5-minute tolerance) against replay attacks.
 *   - Idempotent transaction cache: repeated transactionIds return cached success
 *     without double-processing, duplicate rows, or duplicate email notifications.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP Rate Limiting
    const rateLimitResponse = rateLimit(request, { windowMs: 60_000, maxRequests: 60 });
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Body size guard
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

    // 3. Signature & Secret Auth
    const auth = verifyVietQrWebhookAuth(request.headers, rawBody);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 503 ? 'Unavailable' : 'Unauthorized', message: auth.message },
        { status: auth.status }
      );
    }

    // 4. JSON Body parsing
    let body: unknown;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Body phải là JSON hợp lệ' },
        { status: 400 }
      );
    }

    // 5. Timestamp Freshness Verification (Anti-Replay)
    const timestampCheck = verifyWebhookTimestamp(
      request.headers,
      body && typeof body === 'object' ? (body as Record<string, unknown>).timestamp : undefined
    );
    if (!timestampCheck.ok) {
      return NextResponse.json(
        { error: 'Unauthorized', message: timestampCheck.message },
        { status: timestampCheck.status }
      );
    }

    // 6. Payload structure parsing
    const parsed = parseVietQrWebhookPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Bad Request', message: parsed.message }, { status: 400 });
    }

    // 7. Check In-Memory Idempotency Cache (Fast replay rejection)
    if (parsed.payload.transactionId) {
      const cached = getIdempotentWebhook(parsed.payload.transactionId);
      if (cached) {
        return NextResponse.json({
          ...(cached.response as Record<string, unknown>),
          idempotentReplay: true,
          alreadyPaid: true,
        });
      }
    }

    // 8. Confirm payment in DB
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
      // Tự động tích lũy điểm thưởng SkyJoy theo hệ số hạng thẻ
      void awardBookingLoyaltyPoints(
        result.booking.id,
        result.booking.total_price,
        result.booking.user_id
      ).catch((error) => {
        console.error('VietQR webhook loyalty points award failed:', error);
      });

      // Best-effort invoice/ticket email
      void sendAutomaticPaymentInvoiceEmail(result.booking.id, {
        paymentMethod: 'vietqr',
      }).catch((error) => {
        console.error('VietQR webhook invoice email failed:', error);
      });
    }

    const responseData = {
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
    };

    // Cache successful transaction to prevent replay
    if (parsed.payload.transactionId) {
      setIdempotentWebhook(parsed.payload.transactionId, {
        bookingId: result.booking.id,
        bookingCode: result.booking.booking_code ?? undefined,
        amount: parsed.payload.amount,
        response: responseData,
      });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('VietQR webhook error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
