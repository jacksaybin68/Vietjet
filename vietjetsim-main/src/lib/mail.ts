import { createTransport, type Transporter } from 'nodemailer';

/**
 * Mail gửi qua SMTP (Gmail App Password hoặc Resend — cả hai nói cùng giao
 * thức). Cấu hình qua env:
 *
 *   SMTP_HOST=smtp.gmail.com        (hoặc smtp.resend.com)
 *   SMTP_PORT=587                   (465 → implicit TLS)
 *   SMTP_USER=...
 *   SMTP_PASS=...
 *   MAIL_FROM="Vietjet Air <bookbooking@vietjet.shop>"
 *   MAIL_REPLY_TO=bookbooking@vietjet.shop   (tuỳ chọn)
 *
 * Mọi lỗi đều fail-soft: email là phụ trợ, một lần gửi hỏng không được
 * chặn luồng đặt vé / đặt lại mật khẩu.
 */

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    transporter = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  transporter = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/** Gửi một email. Trả về false (thay vì throw) khi chưa cấu hình hoặc gửi hỏng. */
export async function sendMail(payload: MailPayload): Promise<boolean> {
  try {
    const tx = getTransporter();
    if (!tx) {
      console.warn(`[MAIL] Chưa cấu hình SMTP — bỏ qua gửi "${payload.subject}" tới ${payload.to}`);
      return false;
    }

    const from =
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      'Vietjet Air <bookbooking@vietjet.shop>';

    await tx.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo ?? process.env.MAIL_REPLY_TO,
    });
    console.info(`[MAIL] Đã gửi "${payload.subject}" tới ${payload.to}`);
    return true;
  } catch (error) {
    console.error(`[MAIL] Lỗi gửi "${payload.subject}" tới ${payload.to}:`, error);
    return false;
  }
}

const siteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://vietjet.shop').replace(/\/$/, '');

const layout = (title: string, bodyHtml: string): string => `
<!doctype html>
<html lang="vi">
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2328">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#ec2029;padding:18px 24px">
      <span style="color:#fff;font-size:20px;font-weight:bold">✈ VIETJET AIR</span>
    </div>
    <div style="padding:24px">
      <h1 style="font-size:18px;margin:0 0 16px">${title}</h1>
      ${bodyHtml}
      <p style="font-size:12px;color:#6b7280;margin-top:24px">
        Đây là email tự động từ ${siteUrl()}, vui lòng không trả lời email này.
      </p>
    </div>
  </div>
</body>
</html>`;

const row = (label: string, value: string): string =>
  `<tr><td style="padding:6px 0;color:#6b7280">${label}</td>` +
  `<td style="padding:6px 0;text-align:right;font-weight:bold">${value}</td></tr>`;

/** Email xác nhận đặt vé — gửi sau khi thanh toán thành công. */
export async function sendBookingConfirmationEmail(opts: {
  to: string;
  fullName: string;
  bookingCode: string | null;
  amount: number;
  method: string;
}): Promise<boolean> {
  const { to, fullName, bookingCode, amount, method } = opts;
  const methodLabel =
    method === 'bank' ? 'Chuyển khoản ngân hàng' : method === 'card' ? 'Thẻ' : method;

  const html = layout(
    'Đặt vé thành công — Cảm ơn bạn đã đặt vé!',
    `<p>Xin chào <b>${escapeHtml(fullName)}</b>,</p>
     <p>Yêu cầu đặt vé của bạn đã được <b style="color:#ec2029">xác nhận</b>.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px">
       ${row('Mã đặt chỗ (PNR)', `<span style="letter-spacing:2px">${escapeHtml(bookingCode || '—')}</span>`)}
       ${row('Số tiền', `${amount.toLocaleString('vi-VN')} VNĐ`)}
       ${row('Phương thức', escapeHtml(methodLabel))}
     </table>
     <p style="margin-top:20px">
       <a href="${siteUrl()}/tai-khoan"
          style="display:inline-block;background:#ec2029;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">
         Xem đặt vé của tôi
       </a>
     </p>`
  );

  return sendMail({
    to,
    subject: `Xác nhận đặt vé${bookingCode ? ` ${bookingCode}` : ''} — Vietjet Air`,
    html,
    text: `Đặt vé thành công. Mã đặt chỗ: ${bookingCode || '—'}. Số tiền: ${amount.toLocaleString('vi-VN')} VNĐ.`,
  });
}

/** Email liên kết đặt lại mật khẩu. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  token: string;
  expiresAt: Date;
}): Promise<boolean> {
  const resetUrl = `${siteUrl()}/dat-lai-mat-khau?token=${opts.token}`;
  const html = layout(
    'Đặt lại mật khẩu',
    `<p>Xin chào,</p>
     <p>Nhấn nút dưới đây để đặt lại mật khẩu (hết hạn sau ${Math.round(
       (opts.expiresAt.getTime() - Date.now()) / 60000
     )} phút):</p>
     <p style="margin-top:20px">
       <a href="${resetUrl}"
          style="display:inline-block;background:#ec2029;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">
         Đặt lại mật khẩu
       </a>
     </p>
     <p style="font-size:13px;color:#6b7280">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`
  );

  return sendMail({
    to: opts.to,
    subject: 'Đặt lại mật khẩu — Vietjet Air',
    html,
    text: `Đặt lại mật khẩu: ${resetUrl}`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
