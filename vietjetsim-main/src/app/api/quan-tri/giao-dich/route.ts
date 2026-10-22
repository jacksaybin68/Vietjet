import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { sendBookingConfirmationEmail } from '@/lib/mail';
import { writeAuditLog } from '@/lib/db';

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
          COALESCE(p.id, 'bk-' || b.id) as id,
          COALESCE(p.id, '') as "paymentId",
          b.id as "bookingId",
          b.booking_code as "bookingCode",
          COALESCE(p.amount, b.total_price) as amount,
          COALESCE(p.method, 'vietqr') as method,
          COALESCE(p.status, CASE WHEN b.status = 'confirmed' THEN 'completed' ELSE 'pending' END) as status,
          b.status as "bookingStatus",
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
          COALESCE(p.id, 'bk-' || b.id) as id,
          COALESCE(p.id, '') as "paymentId",
          b.id as "bookingId",
          b.booking_code as "bookingCode",
          COALESCE(p.amount, b.total_price) as amount,
          COALESCE(p.method, 'vietqr') as method,
          COALESCE(p.status, CASE WHEN b.status = 'confirmed' THEN 'completed' ELSE 'pending' END) as status,
          b.status as "bookingStatus",
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
      // 1. Update or create payment record
      if (targetPayment) {
        await sql`
          UPDATE payments 
          SET status = 'completed', updated_at = NOW() 
          WHERE id = ${targetPayment.id}
        `;
      } else {
        const createdP = await sql`
          INSERT INTO payments (booking_id, method, status, amount)
          VALUES (${targetBooking.id}, 'vietqr', 'completed', ${targetBooking.total_price})
          RETURNING *
        `;
        targetPayment = (createdP as any[])[0];
      }

      // 2. Confirm booking
      await sql`
        UPDATE bookings 
        SET status = 'confirmed', updated_at = NOW() 
        WHERE id = ${targetBooking.id}
      `;

      // 3. Resolve customer email and name for confirmation notice
      let toEmail: string | null = null;
      let fullName: string = 'Quý khách';

      if (targetBooking.user_id) {
        const uRes =
          await sql`SELECT email, full_name FROM user_profiles WHERE id = ${targetBooking.user_id} LIMIT 1`;
        const userRow = (uRes as any[])[0];
        if (userRow?.email) {
          toEmail = userRow.email;
          fullName = userRow.full_name || fullName;
        }
      }

      if (!toEmail) {
        const pRes =
          await sql`SELECT name, email FROM passengers WHERE booking_id = ${targetBooking.id} AND email IS NOT NULL LIMIT 1`;
        const pRow = (pRes as any[])[0];
        if (pRow?.email) {
          toEmail = pRow.email;
          fullName = pRow.name || fullName;
        }
      }

      if (toEmail) {
        void sendBookingConfirmationEmail({
          to: toEmail,
          fullName,
          bookingCode: targetBooking.booking_code,
          amount: targetBooking.total_price,
          method: targetPayment?.method || 'vietqr',
        });
      }

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
      // Reject action
      if (targetPayment) {
        await sql`
          UPDATE payments 
          SET status = 'failed', updated_at = NOW() 
          WHERE id = ${targetPayment.id}
        `;
      }

      // Cancel booking
      await sql`
        UPDATE bookings 
        SET status = 'cancelled', updated_at = NOW() 
        WHERE id = ${targetBooking.id}
      `;

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
          reason: note || 'Admin rejected payment',
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
