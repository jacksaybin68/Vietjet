/**
 * Gửi mail qua SMTP (Gmail App Password / Hostinger / Resend — cùng giao thức).
 *
 * Template email dùng **CSS inline + bảng**, không `<style>`/flex/grid: Gmail và
 * Outlook (Word engine) bỏ qua stylesheet và không hiểu layout hiện đại.
 *
 * Cấu hình qua env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 *   MAIL_FROM, MAIL_REPLY_TO.
 *
 * Mọi lỗi đều fail-soft: email là phụ trợ, một lần gửi hỏng không được chặn
 * luồng đặt vé / đặt lại mật khẩu.
 */

import { createTransport, type Transporter } from 'nodemailer';

let transporter: Transporter | null | undefined;

const BRAND_RED = '#EC2029';
const SITE_URL_FALLBACK = 'https://vietjet.shop';

/**
 * Domain công khai dùng cho mọi liên kết BÊN TRONG email (nút CTA, link đặt
 * lại mật khẩu...). Tách riêng khỏi NEXT_PUBLIC_SITE_URL để máy dev
 * (localhost) vẫn gửi mail test ra link domain thật.
 * Ưu tiên: MAIL_SITE_URL → NEXT_PUBLIC_SITE_URL → https://vietjet.shop
 */
export const siteUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  (env.MAIL_SITE_URL || env.NEXT_PUBLIC_SITE_URL || SITE_URL_FALLBACK).replace(/\/$/, '');

/** Gmail ép From về tài khoản đã đăng nhập, nên tên hiển thị người gửi bị mất. */
export function isGmailHost(host: string | undefined): boolean {
  return (host ?? '').trim().toLowerCase() === 'smtp.gmail.com';
}

/**
 * URL tuyệt đối của logo dùng trong email. Client mail chặn ảnh ngoài theo
 * mặc định nên thẻ <img> luôn kèm width/height cố định và alt text để layout
 * không vỡ khi ảnh chưa được tải. Ghi đè qua MAIL_LOGO_URL khi cần.
 */
export function mailLogoUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.MAIL_LOGO_URL) return env.MAIL_LOGO_URL.replace(/\/$/, '');
  return `${siteUrl(env)}/logo-internal.png`;
}

/** `.env` hay shell thường bọc giá trị trong dấu nháy — bóc ra trước khi gửi. */
export function normalizeMailFrom(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const unquoted = quoted ? trimmed.slice(1, -1) : trimmed;
  return unquoted.trim();
}

export function resolveMailFrom(env: NodeJS.ProcessEnv = process.env): string {
  const configured = normalizeMailFrom(env.MAIL_FROM);
  if (configured) return configured;

  // Gmail không cho đặt From khác tài khoản đăng nhập.
  if (isGmailHost(env.SMTP_HOST)) return normalizeMailFrom(env.SMTP_USER);

  return normalizeMailFrom(env.SMTP_USER) || 'Vietjet Air <booking@vietjet.shop>';
}

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
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
  text: string;
  replyTo?: string;
}

/** Gửi một email. Trả false (không throw) khi chưa cấu hình hoặc gửi hỏng. */
export async function sendMail(payload: MailPayload): Promise<boolean> {
  try {
    const tx = getTransporter();
    if (!tx) {
      console.warn(`[MAIL] Chưa cấu hình SMTP — bỏ qua gửi "${payload.subject}" tới ${payload.to}`);
      return false;
    }

    await tx.sendMail({
      from: resolveMailFrom(),
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

export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatVnd(amount: number): string {
  const safe = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  return safe.toLocaleString('vi-VN');
}

const METHOD_LABELS: Record<string, string> = {
  bank: 'Chuyển khoản ngân hàng',
  card: 'Thẻ tín dụng',
  momo: 'Ví MoMo',
  vnpay: 'VNPay',
};

const METHOD_LABEL_FALLBACK = 'Thanh toán trực tuyếp';

const INK = '#0f1c2e';

/** Bọc nội dung trong khung email hãng bay: vạch đỏ mỏng, header trắng, footer xám. */
function shell(inner: string, preheader: string, eyebrow: string): string {
  const url = siteUrl();
  const domain = url.replace(/^https?:\/\//, '');
  const year = new Date().getFullYear();
  // Logo gốc 230x40 — hiển thị đúng kích thước gốc để nét nhất.
  // Muốn to hơn nữa cần file nguồn phân giải cao hơn, không phóng ảnh nhỏ lên.
  const logo = `<img src="${escapeHtml(mailLogoUrl())}" width="230" height="40" alt="Vietjet Air" style="display:block;border:0;">`;
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Vietjet Air</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef1f5;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background-color:${BRAND_RED};font-size:8px;line-height:8px;">&nbsp;</td></tr>
<tr><td style="padding:22px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td>${logo}</td>
<td align="right" style="color:#8b95a1;font-size:12px;">${escapeHtml(eyebrow)}</td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 32px 0;"><div style="border-top:1px solid #edf0f4;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td style="padding:22px 32px 8px;color:#1f2328;font-size:15px;line-height:1.6;">
${inner}
</td></tr>
<tr><td style="padding:20px 32px 26px;background-color:#f7f9fb;font-size:12px;line-height:1.7;color:#6b7280;">
Hỗ trợ: <strong style="color:${BRAND_RED};">1900 1886</strong> (8:00&ndash;22:00 hằng ngày) &middot; <a href="${escapeHtml(url)}" style="color:#1f2328;text-decoration:underline;">${escapeHtml(domain)}</a>
<p style="margin:8px 0 0;">&copy; ${year} Vietjet Air. Email này được gửi tự động, vui lòng không trả lời.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Hộp lưu ý trung tính (hết hạn, bảo mật...) — xám nhạt, không màu mè. */
function noticeBox(innerHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#475569;">${innerHtml}</td></tr>
</table>`;
}

function actionButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
<tr><td style="background-color:${BRAND_RED};border-radius:10px;">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function detailRow(label: string, value: string, large = false): string {
  return `<tr>
<td style="padding:10px 0;border-bottom:1px solid #eef0f3;color:#6b7280;font-size:14px;">${escapeHtml(label)}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid #eef0f3;color:${INK};font-size:${large ? '18px' : '14px'};font-weight:bold;">${escapeHtml(value)}</td>
</tr>`;
}

export interface BookingConfirmationInput {
  fullName: string;
  bookingCode: string | null;
  amount: number;
  method: string;
}

export function buildBookingConfirmationHtml(input: BookingConfirmationInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, bookingCode, amount, method } = input;
  const code = bookingCode || '—';
  const total = `${formatVnd(amount)} VNĐ`;
  const methodLabel = METHOD_LABELS[method] || METHOD_LABEL_FALLBACK;
  const subject = `Xác nhận đặt vé${bookingCode ? ` ${bookingCode}` : ''} — Vietjet Air`;

  const inner = `<p style="margin:0 0 16px;">Kính chào <strong>${escapeHtml(fullName)}</strong>,</p>
<p style="margin:0 0 20px;">Đặt vé của Quý khách đã được xác nhận. Chi tiết như sau:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td align="center" style="padding:22px 16px;">
<div style="font-size:11px;letter-spacing:2px;color:#6b7280;margin-bottom:6px;">MÃ ĐẶT CHỖ (PNR)</div>
<div style="font-size:28px;font-weight:bold;letter-spacing:5px;color:${BRAND_RED};">${escapeHtml(code)}</div>
<div style="margin-top:8px;font-size:12px;color:#6b7280;">Vui lòng xuất trình mã này khi làm thủ tục tại sân bay</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Phương thức thanh toán', methodLabel)}
${detailRow('Tổng thanh toán', total, true)}
</table>
${actionButton(`${siteUrl()}/tai-khoan`, 'Xem đặt vé của tôi')}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Quý khách vui lòng có mặt tại sân bay trước giờ khởi hành ít nhất 120 phút đối với chuyến bay nội địa. Tra cứu và quản lý đặt vé tại mục <a href="${escapeHtml(siteUrl())}/tai-khoan" style="color:${BRAND_RED};">Chuyến bay của tôi</a>.</p>`;

  const text = [
    `Đặt vé thành công — Vietjet Air`,
    `Kính chào ${fullName},`,
    ``,
    `Mã đặt chỗ (PNR): ${code}`,
    `Phương thức thanh toán: ${methodLabel}`,
    `Tổng thanh toán: ${total}`,
    ``,
    `Xem đặt vé: ${siteUrl()}/tai-khoan`,
  ].join('\n');

  return { subject, html: shell(inner, `Đặt vé thành công — mã ${code}`, 'Xác nhận đặt vé'), text };
}

export function buildPasswordResetHtml(input: { token: string; expiresAt: Date }): {
  html: string;
  text: string;
} {
  const resetUrl = `${siteUrl()}/dat-lai-mat-khau?token=${input.token}`;
  const minutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60000));

  const inner = `<p style="margin:0 0 16px;">Kính chào Quý khách,</p>
<p style="margin:0 0 8px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của Quý khách. Nhấn nút dưới đây để tiếp tục:</p>
${actionButton(resetUrl, 'Đặt lại mật khẩu')}
${noticeBox(`Liên kết hết hạn sau <strong>${minutes} phút</strong>. Nếu Quý khách không yêu cầu, vui lòng bỏ qua email này — mật khẩu vẫn được giữ nguyên.`)}
<p style="margin:20px 0 8px;color:#6b7280;font-size:13px;">Nút bấm không hoạt động? Sao chép liên kết này vào trình duyệt:</p>
<p style="margin:0;word-break:break-all;font-size:13px;"><a href="${escapeHtml(resetUrl)}" style="color:${BRAND_RED};">${escapeHtml(resetUrl)}</a></p>`;

  const text = [
    `Đặt lại mật khẩu — Vietjet Air`,
    ``,
    `Liên kết có hiệu lực trong ${minutes} phút:`,
    resetUrl,
    ``,
    `Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`,
  ].join('\n');

  return { html: shell(inner, 'Đặt lại mật khẩu Vietjet Air', 'Đặt lại mật khẩu'), text };
}

export interface RegistrationSuccessInput {
  fullName: string;
}

/** Mail chào mừng khi tài khoản được tạo thành công. */
export function buildRegistrationSuccessHtml(input: RegistrationSuccessInput): {
  subject: string;
  html: string;
  text: string;
} {
  const url = siteUrl();
  const inner = `<p style="margin:0 0 16px;">Kính chào <strong>${escapeHtml(input.fullName)}</strong>,</p>
<p style="margin:0 0 16px;">Tài khoản Vietjet Air của Quý khách đã được tạo thành công. Từ nay Quý khách có thể:</p>
<ul style="margin:0 0 8px;padding-left:20px;color:#1f2328;font-size:14px;line-height:2;">
<li>Tra cứu và quản lý đặt vé tại mục Chuyến bay của tôi</li>
<li>Làm thủ tục trực tuyến trước giờ khởi hành</li>
<li>Tích lũy và sử dụng điểm thành viên cho các chuyến bay tiếp theo</li>
</ul>
${actionButton(url, 'Đặt vé ngay')}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Quản lý hồ sơ và bảo mật tài khoản tại mục <a href="${escapeHtml(url)}/tai-khoan" style="color:${BRAND_RED};">Tài khoản của tôi</a>.</p>`;

  const text = [
    `Chào mừng Quý khách đến với Vietjet Air`,
    ``,
    `Tài khoản của ${input.fullName} đã được tạo thành công.`,
    `Đặt vé ngay: ${url}`,
  ].join('\n');

  return {
    subject: 'Chào mừng Quý khách đến với Vietjet Air',
    html: shell(inner, 'Tài khoản Vietjet Air của Quý khách đã được tạo.', 'Chào mừng'),
    text,
  };
}

/** Mail thông báo bảo mật sau khi mật khẩu được đổi thành công. */
export function buildPasswordChangedHtml(): { subject: string; html: string; text: string } {
  const url = siteUrl();
  const inner = `<p style="margin:0 0 16px;">Kính chào Quý khách,</p>
<p style="margin:0 0 8px;">Mật khẩu tài khoản của Quý khách vừa được thay đổi thành công. Mọi phiên đăng nhập trên các thiết bị khác đã được đăng xuất.</p>
${noticeBox(`Nếu không phải Quý khách thực hiện, vui lòng đặt lại mật khẩu ngay và liên hệ tổng đài <strong>1900 1886</strong> để được hỗ trợ.`)}
${actionButton(`${url}/dang-nhap`, 'Đăng nhập')}`;

  const text = [
    `Mật khẩu đã được thay đổi — Vietjet Air`,
    ``,
    `Mật khẩu tài khoản của Quý khách vừa được thay đổi thành công.`,
    `Nếu không phải Quý khách thực hiện, vui lòng liên hệ tổng đài 1900 1886.`,
  ].join('\n');

  return {
    subject: 'Mật khẩu đã được thay đổi — Vietjet Air',
    html: shell(inner, 'Mật khẩu tài khoản của Quý khách vừa được thay đổi.', 'Bảo mật'),
    text,
  };
}

/** Gửi email xác nhận đặt vé — gọi sau khi thanh toán thành công. */
export async function sendBookingConfirmationEmail(opts: {
  to: string;
  fullName: string;
  bookingCode: string | null;
  amount: number;
  method: string;
}): Promise<boolean> {
  const { subject, html, text } = buildBookingConfirmationHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}

/** Gửi email liên kết đặt lại mật khẩu. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  token: string;
  expiresAt: Date;
}): Promise<boolean> {
  const { html, text } = buildPasswordResetHtml(opts);
  return sendMail({ to: opts.to, subject: 'Đặt lại mật khẩu — Vietjet Air', html, text });
}

/** Gửi email chào mừng khi đăng ký tài khoản thành công. */
export async function sendRegistrationSuccessEmail(opts: {
  to: string;
  fullName: string;
}): Promise<boolean> {
  const { subject, html, text } = buildRegistrationSuccessHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}

/** Gửi email thông báo sau khi mật khẩu được đổi thành công. */
export async function sendPasswordChangedEmail(opts: { to: string }): Promise<boolean> {
  const { subject, html, text } = buildPasswordChangedHtml();
  return sendMail({ to: opts.to, subject, html, text });
}
