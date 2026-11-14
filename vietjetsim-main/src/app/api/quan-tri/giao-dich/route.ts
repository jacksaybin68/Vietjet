import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { sendPaymentFailedEmail } from '@/lib/mail';
import { sendAutomaticPaymentInvoiceEmail } from '@/lib/payment-invoice';
import { writeAuditLog, awardBookingLoyaltyPoints } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'payment:view');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase();

    // Query transactions joining payments, bookings, user_profiles, and primary passenger info
    let result: any[];
    if (status && status !== 'all') {
      result = await sql`
        SELECT 
          COALESCE(p.id::text, 'bk-' || b.id::text) as id,
          COALESCE(p.id::text, '') as "paymentId",
          b.id as "bookingId",
          b.booking_code as "bookingCode",
          COALESCE(p.amount, b.total_price) as amount,
          COALESCE(p.method, 'vietqr') as method,
          COALESCE(p.status, CASE WHEN b.status = 'confirmed' THEN 'completed' ELSE 'pending' END) as status,
          b.status as "bookingStatus",
          COALESCE(p.receipt_image, b.receipt_image) as "receiptImage",
          COALESCE(p.transfer_note, b.transfer_note) as "transferNote",
          COALESCE(p.created_at, b.created_at) as "createdAt",
          COALESCE(u.email, (
            SELECT email FROM passengers WHERE booking_id = b.id AND email IS NOT NULL AND email != '' LIMIT 1
          ), 'guest@vietjetsim.vn') as "userEmail",
          COALESCE(u.full_name, (
            SELECT name FROM passengers WHERE booking_id = b.id LIMIT 1
          ), 'Khách vãng lai') as "userName"
        FROM bookings b
        LEFT JOIN payments p ON p.booking_id = b.id
        LEFT JOIN user_profiles u ON b.user_id = u.id
        WHERE COALESCE(p.status, CASE WHEN b.status = 'confirmed' THEN 'completed' ELSE 'pending' END) = ${status}
        ORDER BY COALESCE(p.created_at, b.created_at) DESC
        LIMIT 100
      `;
    } else {
      result = await sql`
        SELECT 
          COALESCE(p.id::text, 'bk-' || b.id::text) as id,
          COALESCE(p.id::text, '') as "paymentId",
          b.id as "bookingId",
          b.booking_code as "bookingCode",
          COALESCE(p.amount, b.total_price) as amount,
          COALESCE(p.method, 'vietqr') as method,
          COALESCE(p.status, CASE WHEN b.status = 'confirmed' THEN 'completed' ELSE 'pending' END) as status,
          b.status as "bookingStatus",
          COALESCE(p.receipt_image, b.receipt_image) as "receiptImage",
          COALESCE(p.transfer_note, b.transfer_note) as "transferNote",
          COALESCE(p.created_at, b.created_at) as "createdAt",
          COALESCE(u.email, (
            SELECT email FROM passengers WHERE booking_id = b.id AND email IS NOT NULL AND email != '' LIMIT 1
          ), 'guest@vietjetsim.vn') as "userEmail",
          COALESCE(u.full_name, (
            SELECT name FROM passengers WHERE booking_id = b.id LIMIT 1
          ), 'Khách vãng lai') as "userName"
        FROM bookings b
        LEFT JOIN payments p ON p.booking_id = b.id
        LEFT JOIN user_profiles u ON b.user_id = u.id
        ORDER BY COALESCE(p.created_at, b.created_at) DESC
        LIMIT 100
      `;
    }

    if (search) {
      result = (result as any[]).filter(
        (t) =>
          String(t.id).toLowerCase().includes(search) ||
          String(t.bookingCode || '')
            .toLowerCase()
            .includes(search) ||
          String(t.bookingId).toLowerCase().includes(search) ||
          String(t.userName || '')
            .toLowerCase()
            .includes(search) ||
          String(t.userEmail || '')
            .toLowerCase()
            .includes(search)
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'payment:process');
    if (error) return response;

    const body = await request.json().catch(() => ({}));
    const transactionId = body.transactionId ? String(body.transactionId) : undefined;
    const bookingId = body.bookingId ? String(body.bookingId) : undefined;
    const action = body.action === 'reject' ? 'reject' : 'confirm';
    const note = body.note ? String(body.note) : '';

    if (!transactionId && !bookingId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'transactionId hoặc bookingId là bắt buộc' },
        { status: 400 }
      );
    }

    // Resolve target booking and payment
    let targetBooking: any = null;
    let targetPayment: any = null;

    if (bookingId) {
      const bRes = await sql`SELECT * FROM bookings WHERE id = ${bookingId} LIMIT 1`;
      targetBooking = (bRes as any[])[0] || null;
      if (targetBooking) {
        const pRes =
          await sql`SELECT * FROM payments WHERE booking_id = ${bookingId} ORDER BY created_at DESC LIMIT 1`;
        targetPayment = (pRes as any[])[0] || null;
      }
    } else if (transactionId) {
      // If transactionId is prefixed with 'bk-', it refers to a booking
      if (transactionId.startsWith('bk-')) {
        const actualBookingId = transactionId.slice(3);
        const bRes = await sql`SELECT * FROM bookings WHERE id = ${actualBookingId} LIMIT 1`;
        targetBooking = (bRes as any[])[0] || null;
        if (targetBooking) {
          const pRes =
            await sql`SELECT * FROM payments WHERE booking_id = ${actualBookingId} ORDER BY created_at DESC LIMIT 1`;
          targetPayment = (pRes as any[])[0] || null;
        }
      } else {
        const pRes = await sql`SELECT * FROM payments WHERE id = ${transactionId} LIMIT 1`;
        targetPayment = (pRes as any[])[0] || null;
        if (targetPayment) {
          const bRes =
            await sql`SELECT * FROM bookings WHERE id = ${targetPayment.booking_id} LIMIT 1`;
          targetBooking = (bRes as any[])[0] || null;
        }
      }
    }

    if (!targetBooking) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy thông tin đặt vé tương ứng' },
        { status: 404 }
      );
    }

    if (action === 'confirm') {
      // Idempotency: a repeated "xác nhận" must not award loyalty points twice
      // nor resend the invoice. The first request leaves the booking
      // `confirmed`/`completed`; everything after it is a no-op that only
      // repairs a payment row left `pending`.
      const alreadySettled =
        targetBooking.status === 'confirmed' || targetBooking.status === 'completed';
      if (alreadySettled) {
        if (targetPayment && targetPayment.status !== 'completed') {
          await sql`
            UPDATE payments
            SET status = 'completed', updated_at = NOW()
            WHERE id = ${targetPayment.id}
          `;
        }
        return NextResponse.json({ status: 'completed', idempotent: true });
      }
      if (targetBooking.status !== 'pending') {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: `Đặt vé đang ở trạng thái "${targetBooking.status}" nên không thể xác nhận.`,
          },
          { status: 409 }
        );
      }

      // Claim the transition atomically. Of two concurrent confirms, only the
      // one whose UPDATE matches the `pending` row proceeds to the side
      // effects below.
      const claimed = await sql`
        UPDATE bookings
        SET status = 'confirmed', updated_at = NOW()
        WHERE id = ${targetBooking.id} AND status = 'pending'
        RETURNING id
      `;
      if ((claimed as { id: string }[]).length === 0) {
        return NextResponse.json({ status: 'completed', idempotent: true });
      }

      // 1. Update or create payment record
      if (targetPayment) {
        await sql`
          UPDATE payments 
          SET status = 'completed', updated_at = NOW() 
          WHERE id = ${targetPayment.id}
        `;
      } else {
        // The amount recorded here must be the cash actually collected, which is
        // the fare minus the discount that was applied — not the gross fare. The
        // booking row carries `discount_amount`; without it the payment row
        // overstated revenue and inflated the refund ceiling
        // (`getBookingCashPaid` sums `payments.amount`).
        const discountedAmount = Math.max(
          0,
          Number(targetBooking.total_price || 0) - Number(targetBooking.discount_amount || 0)
        );
        const createdP = await sql`
          INSERT INTO payments (booking_id, method, status, amount)
          VALUES (${targetBooking.id}, 'vietqr', 'completed', ${discountedAmount})
          RETURNING *
        `;
        targetPayment = (createdP as any[])[0];
      }

      // 2. Tích lũy điểm SkyJoy khi admin đối soát thành công. Nếu bỏ qua,
      // một booking xác nhận qua admin sẽ không bao giờ tích điểm, trong khi
      // booking thanh toán trực tiếp thì có — khách bị mất điểm chỉ vì cách
      // họ thanh toán.
      const collectedAmount = Number(targetPayment?.amount || targetBooking.total_price || 0);
      if (collectedAmount > 0 && targetBooking.user_id) {
        try {
          await awardBookingLoyaltyPoints(targetBooking.id, collectedAmount, targetBooking.user_id);
        } catch (loyaltyError) {
          console.error(
            'Failed to award loyalty points for admin-confirmed booking:',
            loyaltyError
          );
        }
      }

      // 3. Tự động gửi email hoá đơn thanh toán & vé điện tử cho khách hàng
      await sendAutomaticPaymentInvoiceEmail(targetBooking.id, {
        paymentMethod: targetPayment?.method || 'vietqr',
      }).catch((err) => {
        console.error('Failed to auto-send payment invoice email:', err);
      });

      // 4. Audit Log
      void writeAuditLog({
        adminId: payload.userId,
        adminEmail: payload.email,
        action: 'payment:confirm',
        targetType: 'booking',
        targetId: targetBooking.id,
        detailsJson: JSON.stringify({
          bookingCode: targetBooking.booking_code,
          amount: targetBooking.total_price,
          paymentId: targetPayment?.id,
          note,
        }),
        status: 'success',
      });

      return NextResponse.json({
        success: true,
        message: 'Đã xác nhận thanh toán và phát hành vé thành công!',
        bookingId: targetBooking.id,
        bookingCode: targetBooking.booking_code,
        status: 'completed',
      });
    } else {
      // Reject action.
      //
      // It used to run unconditionally, so pressing "từ chối" a second time
      // released the same seats and incremented `flights.available` again —
      // inventing inventory on every click — and a confirmed booking could be
      // cancelled after the customer had already been ticketed.
      if (targetBooking.status === 'cancelled' || targetBooking.status === 'refunded') {
        return NextResponse.json({
          success: true,
          message: 'Giao dịch đã được từ chối trước đó.',
          bookingId: targetBooking.id,
          status: 'failed',
          idempotent: true,
        });
      }
      if (targetBooking.status === 'confirmed' || targetBooking.status === 'completed') {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: 'Đặt vé đã được xác nhận thanh toán nên không thể từ chối.',
          },
          { status: 409 }
        );
      }

      // Claim the cancellation atomically before touching seats, so two
      // concurrent rejects cannot both restore inventory.
      const rejected = await sql`
        UPDATE bookings
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${targetBooking.id} AND status = 'pending'
        RETURNING id
      `;
      if ((rejected as { id: string }[]).length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Giao dịch đã được xử lý trước đó.',
          bookingId: targetBooking.id,
          status: 'failed',
          idempotent: true,
        });
      }

      // Reject action
      if (targetPayment) {
        await sql`
          UPDATE payments 
          SET status = 'failed', updated_at = NOW() 
          WHERE id = ${targetPayment.id}
        `;
      }

      // Release the seats this booking was holding.
      //
      // This was missing, and it left the `seats` rows pointing at a cancelled
      // booking. The partial unique index `idx_seats_flight_seat_unique`
      // (migration 041) covers `(flight_id, seat_number) WHERE booking_id IS
      // NOT NULL`, so those seats could never be booked again — while the SSE
      // feed showed them as free, because it only counts bookings in
      // ('confirmed', 'pending'). The result was a seat the customer could
      // click, pay for, and then be refused at the last moment, permanently.
      await sql`DELETE FROM seats WHERE booking_id = ${targetBooking.id}`;

      // Restore seats on flight
      const countRes = await sql`
        SELECT COUNT(*) as count 
        FROM passengers 
        WHERE booking_id = ${targetBooking.id} AND passenger_type != 'infant'
      `;
      const seatedCount = Number((countRes as any[])[0]?.count || 1);
      if (targetBooking.flight_id && seatedCount > 0) {
        await sql`
          UPDATE flights 
          SET available = available + ${seatedCount} 
          WHERE id = ${targetBooking.flight_id}
        `;
      }

      // Gửi email thông báo thanh toán không thành công / từ chối đối soát cho khách hàng
      let rejectEmail: string | null = null;
      let rejectName: string = 'Quý khách';

      if (targetBooking.user_id) {
        const uRes =
          await sql`SELECT email, full_name FROM user_profiles WHERE id = ${targetBooking.user_id} LIMIT 1`;
        const userRow = (uRes as any[])[0];
        if (userRow?.email) {
          rejectEmail = userRow.email;
          rejectName = userRow.full_name || rejectName;
        }
      }

      if (!rejectEmail) {
        const pRes =
          await sql`SELECT name, email FROM passengers WHERE booking_id = ${targetBooking.id} AND email IS NOT NULL LIMIT 1`;
        const pRow = (pRes as any[])[0];
        if (pRow?.email) {
          rejectEmail = pRow.email;
          rejectName = pRow.name || rejectName;
        }
      }

      if (rejectEmail) {
        void sendPaymentFailedEmail({
          to: rejectEmail,
          fullName: rejectName,
          bookingCode: targetBooking.booking_code,
          bookingId: targetBooking.id,
          amount: targetBooking.total_price,
          reason:
            note ||
            'Biên lai giao dịch không hợp lệ hoặc không nhận được khoản thanh toán đối soát',
        });
      }

      // Audit Log
      void writeAuditLog({
        adminId: payload.userId,
        adminEmail: payload.email,
        action: 'payment:reject',
        targetType: 'booking',
        targetId: targetBooking.id,
        detailsJson: JSON.stringify({
          bookingCode: targetBooking.booking_code,
          paymentId: targetPayment?.id,
          reason: note || 'Hệ thống từ chối thanh toán',
        }),
        status: 'success',
      });

      return NextResponse.json({
        success: true,
        message: 'Đã từ chối giao dịch thanh toán và hủy đặt vé.',
        bookingId: targetBooking.id,
        status: 'failed',
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = PATCH;
