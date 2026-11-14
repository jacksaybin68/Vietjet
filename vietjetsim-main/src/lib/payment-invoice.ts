/**
 * Module xử lý gửi tự động hoá đơn thanh toán & vé điện tử cho khách hàng.
 * Kiểm tra cài đặt hệ thống `auto_send_payment_invoice_email` trước khi gửi.
 *
 * Vé điện tử được đính kèm dạng PDF (mỗi chặng một trang A4) ngay trong email
 * xác nhận, và lần gửi được ghi vào `email_log` để KHÔNG gửi trùng khi nhiều
 * trigger cùng kích hoạt (webhook VietQR + `/api/thanh-toan` + admin).
 */

import { sql } from '@/lib/neon';
import { sendBookingConfirmationEmail, type MailAttachment } from '@/lib/mail';
import { buildBoardingPassPdf, type BoardingPassPdfLeg } from '@/lib/pdf/boarding-pass';
import { getTripById } from '@/lib/db';
import { toVietnamWallClock } from '@/lib/utils';

export interface SendPaymentInvoiceResult {
  sent: boolean;
  reason?: string;
  recipientEmail?: string;
  bookingCode?: string | null;
  /** PDF vé điện tử có được đính kèm hay không. */
  attachedPdf?: boolean;
}

export interface SendPaymentInvoiceOptions {
  paymentMethod?: string;
  customAmount?: number;
  pointsEarned?: number;
  /** Bỏ qua kiểm tra cấu hình để gửi cưỡng bức (ví dụ admin bấm gửi trực tiếp) */
  force?: boolean;
  /** Bỏ qua khoá idempotent (admin gửi lại có chủ đích). */
  skipIdempotency?: boolean;
}

/** Template name trong `email_log` — dùng làm khoá idempotent. */
const INVOICE_TEMPLATE = 'payment_invoice';

function resolveBaseUrl(): string {
  return (
    process.env.MAIL_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://vietjet.shop'
  ).replace(/\/$/, '');
}

/**
 * Kiểm tra xem hệ thống có đang bật tự động gửi hoá đơn thanh toán qua email hay không.
 * Mặc định trả về true trừ khi quản trị viên chủ động tắt trong Cài đặt hệ thống.
 */
export async function isAutoSendInvoiceEnabled(): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT key, value FROM system_config
      WHERE key IN ('auto_send_payment_invoice_email', 'email_notifications')
    `;
    const list = (rows as any[]) || [];
    const invoiceCfg = list.find((r) => r.key === 'auto_send_payment_invoice_email');
    const notifCfg = list.find((r) => r.key === 'email_notifications');

    if (notifCfg?.value === 'false') return false;
    if (invoiceCfg?.value === 'false') return false;

    return true;
  } catch {
    return true;
  }
}

/**
 * Kiểm tra một lần gửi hoá đơn cho (booking, payment) đã diễn ra chưa.
 *
 * `email_log` có unique index `(booking_id, payment_id, template) NULLS NOT
 * DISTINCT` — nên nếu đã có dòng `status = 'sent'` thì lần gửi này là trùng.
 */
async function hasAlreadySent(bookingId: string, paymentId: string | null): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT id FROM email_log
      WHERE booking_id = ${bookingId}
        AND template = ${INVOICE_TEMPLATE}
        AND status = 'sent'
        AND (payment_id IS NOT DISTINCT FROM ${paymentId})
      LIMIT 1
    `;
    return (rows as unknown[]).length > 0;
  } catch {
    // `email_log` chưa có (DB cũ chưa chạy migration 046) — không chặn gửi.
    return false;
  }
}

/** Ghi nhật một lần gửi vào `email_log`. */
async function logEmailSent(input: {
  bookingId: string;
  paymentId: string | null;
  recipientEmail: string;
  status: 'sent' | 'failed';
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO email_log (booking_id, payment_id, template, recipient_email, status, error_message)
      VALUES (
        ${input.bookingId},
        ${input.paymentId},
        ${INVOICE_TEMPLATE},
        ${input.recipientEmail},
        ${input.status},
        ${input.errorMessage ?? null}
      )
      ON CONFLICT (booking_id, payment_id, template) NULLS NOT DISTINCT
      DO UPDATE SET
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        created_at = NOW()
    `;
  } catch (error) {
    console.warn('[AUTO-MAIL] Không ghi được email_log:', error);
  }
}

/**
 * Sinh PDF vé điện tử cho cả hai chặng của một trip.
 *
 * Trả `null` khi không sinh được — mail vẫn gửi được, chỉ thiếu file đính kèm.
 */
async function buildTicketPdf(booking: {
  id: string;
  trip_id?: string | null;
  total_price?: number;
  booking_code?: string | null;
}): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const tripId = booking.trip_id;
    if (!tripId) return null;

    const trip = await getTripById(String(tripId));
    if (!trip || trip.legs.length === 0) return null;

    const legs: BoardingPassPdfLeg[] = trip.legs
      .map((leg) => {
        const depart = toVietnamWallClock(leg.departTime);
        const arrive = toVietnamWallClock(leg.arriveTime);
        return {
          pnr: leg.bookingCode ?? '',
          flightNo: leg.flightNo,
          from: leg.fromCode,
          to: leg.toCode,
          fromCity: leg.fromCity,
          toCity: leg.toCity,
          date: depart.date,
          departTime: depart.time,
          arriveTime: arrive.time,
          gate: leg.gate,
          terminal: leg.terminal,
          legRole: leg.legRole,
          passengers: leg.passengers.map((passenger) => ({
            name: passenger.name,
            seat:
              passenger.seat_number ||
              leg.checkIns.find((ci) => ci.passenger_id === passenger.id)?.seat_number ||
              '',
          })),
        };
      })
      .filter((leg) => leg.passengers.length > 0);

    if (legs.length === 0) return null;

    const buffer = await buildBoardingPassPdf({
      legs,
      amount: Number(booking.total_price ?? 0),
    });

    return {
      buffer,
      filename: `ve-dien-tu-${booking.booking_code ?? booking.id}.pdf`,
    };
  } catch (error) {
    console.warn('[AUTO-MAIL] Không sinh được PDF vé điện tử:', error);
    return null;
  }
}

/**
 * Tự động gửi email hoá đơn thanh toán & vé điện tử cho khách hàng khi giao dịch hoàn tất.
 */
export async function sendAutomaticPaymentInvoiceEmail(
  bookingId: string,
  options: SendPaymentInvoiceOptions = {}
): Promise<SendPaymentInvoiceResult> {
  try {
    if (!bookingId) {
      return { sent: false, reason: 'bookingId không hợp lệ' };
    }

    // 1. Kiểm tra cấu hình hệ thống
    if (!options.force) {
      const enabled = await isAutoSendInvoiceEnabled();
      if (!enabled) {
        console.info(
          `[AUTO-MAIL] Bỏ qua gửi hoá đơn tự động cho đơn ${bookingId} (tính năng đang tắt trong cài đặt hệ thống)`
        );
        return {
          sent: false,
          reason: 'Tính năng tự động gửi hoá đơn đang tắt trong cài đặt hệ thống',
        };
      }
    }

    // 2. Truy vấn thông tin đơn đặt vé, chuyến bay và người đặt
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
      return { sent: false, reason: 'Không tìm thấy thông tin đặt vé' };
    }

    // 3. Truy vấn danh sách hành khách
    let passengersList: any[] = [];
    try {
      const pRes = await sql`
        SELECT name, email, seat_number
        FROM passengers
        WHERE booking_id = ${booking.id}
      `;
      passengersList = (pRes as any[]) || [];
    } catch {
      passengersList = [];
    }

    // 4. Truy vấn thông tin thanh toán mới nhất
    let payment: any = null;
    try {
      const payRes = await sql`
        SELECT id, method, amount, status
        FROM payments
        WHERE booking_id = ${booking.id}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      payment = (payRes as any[])[0] || null;
    } catch {
      payment = null;
    }

    // 5. Xác định email và tên người nhận chính xác (hỗ trợ cả DB thật và test mocks)
    let recipientEmail: string | null = null;
    let recipientName: string =
      booking.account_name || booking.userName || booking.user_name || 'Quý khách';

    // Tìm email thực tế từ danh sách hành khách trước
    const realPassenger = passengersList.find(
      (p) => p.email && p.email.includes('@') && !p.email.includes('@khach.vietjetsim.vn')
    );
    if (realPassenger?.email) {
      recipientEmail = realPassenger.email;
      recipientName = realPassenger.name || recipientName;
    }

    // Kiểm tra email tài khoản hoặc userEmail
    const accountEmailCandidate = booking.account_email || booking.userEmail || booking.user_email;

    if (
      !recipientEmail &&
      accountEmailCandidate &&
      !accountEmailCandidate.includes('@khach.vietjetsim.vn')
    ) {
      recipientEmail = accountEmailCandidate;
    }

    // Nếu vẫn chưa có, lấy email bất kỳ có chứa @
    if (!recipientEmail) {
      const anyEmail =
        passengersList.find((p) => p.email && p.email.includes('@'))?.email ||
        (accountEmailCandidate?.includes('@') ? accountEmailCandidate : null);
      if (anyEmail && !anyEmail.includes('@khach.vietjetsim.vn')) {
        recipientEmail = anyEmail;
      }
    }

    if (!recipientEmail) {
      console.warn(
        `[AUTO-MAIL] Không tìm thấy địa chỉ email hợp lệ để gửi hoá đơn cho đơn ${booking.booking_code || booking.id}`
      );
      return {
        sent: false,
        reason:
          'Không tìm thấy địa chỉ email khách hàng hợp lệ (khách đặt bằng SĐT mà không để lại email)',
      };
    }

    // 6. Chuẩn bị chi tiết chuyến bay & xuất vé
    const totalAmount =
      options.customAmount !== undefined && options.customAmount > 0
        ? options.customAmount
        : payment?.amount
          ? Number(payment.amount)
          : Number(booking.amount || booking.total_price) || 0;

    const paymentMethod = options.paymentMethod || payment?.method || 'vietqr';
    const resolvedBookingCode = booking.booking_code || booking.bookingCode || null;

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

    const baseUrl = resolveBaseUrl();

    // 6b. Chống gửi trùng.
    //
    // Nhiều trigger có thể cùng kích hoạt cho một giao dịch (webhook VietQR,
    // `POST /api/thanh-toan`, admin bấm "gửi lại"). `email_log` có unique index
    // `(booking_id, payment_id, template) NULLS NOT DISTINCT`, nên nếu đã gửi
    // cho giao dịch này thì lần này bị bỏ qua.
    const paymentId = payment?.id ?? null;
    if (!options.skipIdempotency && (await hasAlreadySent(booking.id, paymentId))) {
      console.info(
        `[AUTO-MAIL] Bỏ qua gửi trùng hoá đơn cho đơn ${resolvedBookingCode} (đã gửi cho giao dịch này)`
      );
      return {
        sent: false,
        reason: 'Hoá đơn đã được gửi cho giao dịch này',
        recipientEmail,
        bookingCode: resolvedBookingCode,
      };
    }

    // 7. Sinh PDF vé điện tử (CẢ HAI chặng nếu là khứ hồi) để đính kèm.
    const pdf = await buildTicketPdf({
      id: booking.id,
      trip_id: booking.trip_id,
      total_price: booking.total_price,
      booking_code: booking.booking_code,
    });

    const attachments: MailAttachment[] = pdf
      ? [
          {
            filename: pdf.filename,
            contentType: 'application/pdf',
            content: pdf.buffer,
          },
        ]
      : [];

    // 8. Thực hiện gửi email hoá đơn & vé điện tử
    const sent = await sendBookingConfirmationEmail({
      to: recipientEmail.trim(),
      fullName: recipientName,
      bookingCode: resolvedBookingCode,
      bookingId: booking.id,
      amount: totalAmount,
      method: paymentMethod,
      flightNumber: booking.flight_no,
      route: routeStr,
      departureTime: departureFormatted,
      ticketUrl: `${baseUrl}/tai-khoan?bookingId=${booking.id}`,
      pointsEarned: options.pointsEarned,
      passengers: passengersList.map((p) => ({
        name: p.name || 'Hành khách',
        seat: p.seat_number || undefined,
      })),
      attachments,
    });

    await logEmailSent({
      bookingId: booking.id,
      paymentId,
      recipientEmail: recipientEmail.trim(),
      status: sent ? 'sent' : 'failed',
    });

    if (sent) {
      console.info(
        `[AUTO-MAIL] Đã tự động gửi hoá đơn thanh toán & vé điện tử đơn ${resolvedBookingCode} tới ${recipientEmail}` +
          (pdf ? ' (kèm PDF)' : '')
      );
    } else {
      console.error(
        `[AUTO-MAIL] Gửi email hoá đơn thất bại qua SMTP cho đơn ${resolvedBookingCode} tới ${recipientEmail}`
      );
    }

    return {
      sent,
      recipientEmail,
      bookingCode: resolvedBookingCode,
      attachedPdf: !!pdf,
    };
  } catch (error) {
    console.error('Lỗi khi thực hiện tự động gửi hoá đơn thanh toán qua email:', error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Lỗi không xác định khi gửi hoá đơn',
    };
  }
}
