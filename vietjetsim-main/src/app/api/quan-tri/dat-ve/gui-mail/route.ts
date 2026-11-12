import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  sendPaymentInstructionEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  siteUrl,
} from '@/lib/mail';
import { writeAuditLog } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'booking:edit');
    if (error) return response;

    const body = await request.json().catch(() => ({}));
    const {
      bookingId,
      type,
      toEmail,
      fullName: providedName,
      amount: providedAmount,
      customNote,
      autoConfirmBooking,
    } = body;

    if (!bookingId || !type || !toEmail) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'bookingId, type (loại email) và toEmail là bắt buộc',
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(toEmail).trim())) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Địa chỉ email không hợp lệ' },
        { status: 400 }
      );
    }

    // 1. Fetch booking with flight and user details
    const bRes = await sql`
      SELECT b.*,
             f.flight_no, f.from_code, f.to_code, f.depart_time, f.arrive_time,
             u.email as account_email, u.full_name as account_name
      FROM bookings b
      LEFT JOIN flights f ON b.flight_id = f.id
      LEFT JOIN user_profiles u ON b.user_id = u.id
      WHERE b.id::text = ${String(bookingId)} OR UPPER(b.booking_code) = UPPER(${String(bookingId)})
      LIMIT 1
    `;

    const booking = (bRes as any[])[0];
    if (!booking) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy thông tin đơn đặt vé' },
        { status: 404 }
      );
    }

    // 2. Fetch passengers for rich flight / seat details
    const pRes = await sql`
      SELECT name, email, seat_code
      FROM passengers
      WHERE booking_id = ${booking.id}
    `;
    const passengersList = (pRes as any[]) || [];

    // 3. Resolve customer name & total amount
    const customerName =
      providedName ||
      passengersList[0]?.name ||
      booking.account_name ||
      toEmail.split('@')[0] ||
      'Quý khách';

    const totalAmount =
      providedAmount !== undefined && Number(providedAmount) > 0
        ? Number(providedAmount)
        : Number(booking.total_price) || 0;

    let emailSent = false;
    let actionDesc = '';

    if (type === 'payment_instruction') {
      // Fetch default bank account
      const bankRes = await sql`
        SELECT * FROM bank_accounts WHERE is_default = true LIMIT 1
      `;
      const bank = (bankRes as any[])[0] || null;

      const bankName = bank?.bank_name || 'Ngân hàng Quốc tế Việt Nam (VIB)';
      const accountNumber = bank?.account_number || '876922729';
      const accountHolder = bank?.account_holder || 'DANG THI NGOC HAN';
      const pnr = booking.booking_code || booking.id.slice(0, 6).toUpperCase();
      const transferNote = `VJ ${pnr}`;
      const paymentUrl = `${siteUrl()}/thanh-toan?bookingId=${booking.id}`;

      emailSent = await sendPaymentInstructionEmail({
        to: String(toEmail).trim(),
        fullName: customerName,
        bookingCode: booking.booking_code,
        bookingId: booking.id,
        amount: totalAmount,
        bankName,
        accountNumber,
        accountHolder,
        transferNote,
        expiresInMinutes: 30,
        paymentUrl,
        customNote: customNote ? String(customNote).trim() : undefined,
      });

      actionDesc = `Gửi hướng dẫn thanh toán VietQR & Ngân hàng tới ${toEmail}`;
    } else if (type === 'ticket_issuance') {
      const departureFormatted = booking.depart_time
        ? new Date(booking.depart_time).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : undefined;

      const routeStr =
        booking.from_code && booking.to_code
          ? `${booking.from_code} → ${booking.to_code}`
          : undefined;

      emailSent = await sendPaymentSuccessEmail({
        to: String(toEmail).trim(),
        fullName: customerName,
        bookingCode: booking.booking_code,
        bookingId: booking.id,
        amount: totalAmount,
        method: 'vietqr',
        flightNumber: booking.flight_no,
        route: routeStr,
        departureTime: departureFormatted,
        ticketUrl: `${siteUrl()}/tai-khoan?bookingId=${booking.id}`,
        customNote: customNote ? String(customNote).trim() : undefined,
        passengers: passengersList.map((p) => ({
          name: p.name || 'Hành khách',
          seat: p.seat_code || undefined,
        })),
      });

      // Optionally auto-confirm booking and create/update payment record if requested
      if (autoConfirmBooking && booking.status !== 'confirmed') {
        await sql`
          UPDATE bookings
          SET status = 'confirmed', updated_at = NOW()
          WHERE id = ${booking.id}
        `;

        // Check if payment already exists
        const pCheck = await sql`
          SELECT id FROM payments WHERE booking_id = ${booking.id} LIMIT 1
        `;
        if ((pCheck as any[]).length > 0) {
          await sql`
            UPDATE payments
            SET status = 'completed', updated_at = NOW()
            WHERE booking_id = ${booking.id}
          `;
        } else {
          await sql`
            INSERT INTO payments (booking_id, method, status, amount, created_at)
            VALUES (${booking.id}, 'vietqr', 'completed', ${totalAmount}, NOW())
          `;
        }
      }

      actionDesc = `Gửi Gmail xuất vé điện tử chính thức tới ${toEmail}`;
    } else if (type === 'payment_failed') {
      emailSent = await sendPaymentFailedEmail({
        to: String(toEmail).trim(),
        fullName: customerName,
        bookingCode: booking.booking_code,
        bookingId: booking.id,
        amount: totalAmount,
        reason: customNote ? String(customNote).trim() : 'Giao dịch chuyển khoản chưa hợp lệ hoặc hết hạn đối soát',
        retryUrl: `${siteUrl()}/thanh-toan?bookingId=${booking.id}`,
      });

      actionDesc = `Gửi thông báo thanh toán thất bại tới ${toEmail}`;
    } else {
      return NextResponse.json(
        { error: 'Bad Request', message: `Loại email không được hỗ trợ: ${type}` },
        { status: 400 }
      );
    }

    // Write audit log
    void writeAuditLog({
      adminId: payload.userId,
      adminEmail: payload.email,
      action: 'booking:send_email',
      targetType: 'booking',
      targetId: booking.id,
      detailsJson: JSON.stringify({
        type,
        toEmail,
        bookingCode: booking.booking_code,
        amount: totalAmount,
        emailSent,
        customNote: customNote || null,
        autoConfirmed: Boolean(autoConfirmBooking),
      }),
      status: emailSent ? 'success' : 'error',
    });

    if (!emailSent) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không thể gửi email qua máy chủ SMTP. Vui lòng kiểm tra lại cấu hình hòm thư.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${actionDesc} thành công!`,
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      status: autoConfirmBooking ? 'confirmed' : booking.status,
    });
  } catch (error) {
    console.error('Lỗi API gửi mail đặt vé:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Lỗi hệ thống khi gửi email',
      },
      { status: 500 }
    );
  }
}
