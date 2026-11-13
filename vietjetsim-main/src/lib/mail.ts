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
  vietqr: 'VNPAY-QR / VietQR',
  card: 'Thẻ tín dụng / Ghi nợ quốc tế',
  momo: 'Ví MoMo',
  vnpay: 'VNPAY-QR',
  wallet: 'Ví Vietjet SkyJoy',
  e_wallet: 'Ví điện tử',
  skypoint: 'Điểm thưởng SkyPoint',
  movi: 'Bay trước trả sau (MOVI)',
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

export interface PaymentSuccessInput {
  fullName: string;
  bookingCode: string | null;
  amount: number;
  method?: string;
  bookingId?: string;
  flightNumber?: string;
  route?: string;
  departureTime?: string;
  ticketUrl?: string;
  customNote?: string;
  pointsEarned?: number;
  passengers?: Array<{ name: string; seat?: string }>;
}

export interface PaymentPendingReviewInput {
  fullName: string;
  bookingCode: string | null;
  bookingId?: string;
  amount: number;
  transferNote?: string;
  bankName?: string;
  flightNumber?: string;
  route?: string;
  departureTime?: string;
  passengers?: Array<{ name: string; seat?: string }>;
  receiptImageUrl?: string;
  customNote?: string;
}

export interface PaymentInstructionInput {
  fullName: string;
  bookingCode: string | null;
  bookingId?: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  bankBin?: string;
  transferNote?: string;
  expiresInMinutes?: number;
  paymentUrl?: string;
  customNote?: string;
  flightNumber?: string;
  route?: string;
  departureTime?: string;
  passengers?: Array<{ name: string; seat?: string }>;
}

export interface PaymentFailedInput {
  fullName: string;
  bookingCode: string | null;
  bookingId?: string;
  amount: number;
  reason?: string;
  retryUrl?: string;
  flightNumber?: string;
  route?: string;
  departureTime?: string;
  customNote?: string;
}

export interface RefundNotificationInput {
  fullName: string;
  bookingCode: string | null;
  amount: number;
  refundMethod?: string;
  reason?: string;
}

/** Email thông báo thanh toán / hướng dẫn thanh toán bằng VNPAY-QR hoặc chuyển khoản */
export function buildPaymentInstructionHtml(input: PaymentInstructionInput): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    bookingCode,
    bookingId,
    amount,
    bankName = 'Ngân hàng Quốc tế Việt Nam (VIB)',
    accountNumber = '876922729',
    accountHolder = 'DANG THI NGOC HAN',
    bankBin = '970406',
    transferNote,
    expiresInMinutes = 30,
    paymentUrl,
    customNote,
    flightNumber,
    route,
    departureTime,
    passengers,
  } = input;

  const code = bookingCode || '—';
  const total = `${formatVnd(amount)} VNĐ`;
  const memo = transferNote || (bookingCode ? `${bookingCode}I98O` : 'I98O');
  // The payment link carries the PNR, not the internal UUID. The PNR is what
  // the customer holds (it is printed on the ticket and quoted in support
  // chats), and it is the credential `POST /api/thanh-toan` accepts for a
  // guest who is not signed in. Linking the UUID would put a value that leaks
  // through logs and referrers into an email.
  const targetUrl =
    paymentUrl || `${siteUrl()}/thanh-toan?bookingId=${bookingCode || bookingId || ''}`;
  const subject = `Thông báo thanh toán đặt chỗ${bookingCode ? ` ${bookingCode}` : ''} — Vietjet Air`;

  let flightDetailsHtml = '';
  if (flightNumber) {
    flightDetailsHtml += detailRow('Chuyến bay', flightNumber);
  }
  if (route) {
    flightDetailsHtml += detailRow('Hành trình', route);
  }
  if (departureTime) {
    flightDetailsHtml += detailRow('Thời gian khởi hành', departureTime);
  }
  if (passengers && passengers.length > 0) {
    const pStr = passengers
      .map((p) => `${escapeHtml(p.name)}${p.seat ? ` (Ghế: ${escapeHtml(p.seat)})` : ''}`)
      .join(', ');
    flightDetailsHtml += detailRow('Hành khách', pStr);
  }

  const customNoteHtml = customNote
    ? noticeBox(`<strong>Ghi chú bổ sung từ Quản trị viên:</strong><br>${escapeHtml(customNote)}`)
    : '';

  const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountHolder)}`;

  const qrBoxHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;text-align:center;">
<tr><td align="center" style="padding:18px 16px;">
<div style="font-size:12px;font-weight:bold;color:#1e293b;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Quét mã VietQR chuyển khoản nhanh</div>
<img src="${escapeHtml(qrImageUrl)}" width="210" height="210" alt="VietQR Thanh toán" style="display:block;margin:0 auto;border:1px solid #cbd5e1;border-radius:8px;">
<div style="font-size:12px;color:#64748b;margin-top:10px;">Ứng dụng ngân hàng tự động điền đúng Số tiền (<strong>${total}</strong>) &amp; Nội dung (<strong>${escapeHtml(memo)}</strong>)</div>
</td></tr>
</table>`;

  const inner = `<p style="margin:0 0 16px;">Kính chào <strong>${escapeHtml(fullName)}</strong>,</p>
<p style="margin:0 0 20px;">Đặt chỗ của Quý khách đã được giữ tạm thời. Vui lòng hoàn tất thanh toán trong vòng <strong>${expiresInMinutes} phút</strong> để đảm bảo giữ chỗ và được phát hành vé điện tử chính thức.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td align="center" style="padding:22px 16px;">
<div style="font-size:11px;letter-spacing:2px;color:#6b7280;margin-bottom:6px;">MÃ ĐẶT CHỖ (PNR)</div>
<div style="font-size:28px;font-weight:bold;letter-spacing:5px;color:${BRAND_RED};">${escapeHtml(code)}</div>
<div style="margin-top:8px;font-size:12px;color:#6b7280;">Trạng thái: Đang chờ thanh toán</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${flightDetailsHtml}
${detailRow('Số tiền cần thanh toán', total, true)}
${detailRow('Hạn thanh toán', `${expiresInMinutes} phút kể từ khi đặt vé`)}
${detailRow('Ngân hàng thụ hưởng', bankName)}
${detailRow('Số tài khoản', accountNumber)}
${detailRow('Chủ tài khoản', accountHolder)}
${detailRow('Nội dung chuyển khoản (bắt buộc)', memo)}
</table>
${qrBoxHtml}
${customNoteHtml}
${noticeBox(`Quý khách vui lòng nhập <strong>chính xác nội dung chuyển khoản: <span style="color:${BRAND_RED};">${escapeHtml(memo)}</span></strong> (Lưu ý: định dạng chuẩn <strong>{mã_đặt_chỗ}I98O</strong>, ký tự "O" là chữ cái O in hoa, không phải số 0) để hệ thống đối soát và tự động phát hành vé ngay lập tức. Hoặc bấm nút bên dưới để quét mã <strong>VNPAY-QR</strong> được điền sẵn toàn bộ thông tin thanh toán.`)}
${actionButton(targetUrl, 'Thanh toán ngay bằng VNPAY-QR')}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Lưu ý: Nếu quá thời hạn thanh toán, hệ thống sẽ tự động hủy đơn đặt vé để hoàn trả ghế về kho chuyến bay. Mọi thắc mắc vui lòng liên hệ tổng đài hỗ trợ <strong>1900 1886</strong>.</p>`;

  const text = [
    `Thông báo thanh toán đặt chỗ — Vietjet Air`,
    `Kính chào ${fullName},`,
    ``,
    `Mã đặt chỗ (PNR): ${code}`,
    flightNumber ? `Chuyến bay: ${flightNumber}` : '',
    route ? `Hành trình: ${route}` : '',
    departureTime ? `Khởi hành: ${departureTime}` : '',
    `Số tiền cần thanh toán: ${total}`,
    `Hạn thanh toán: ${expiresInMinutes} phút`,
    `Ngân hàng thụ hưởng: ${bankName}`,
    `Số tài khoản: ${accountNumber}`,
    `Chủ tài khoản: ${accountHolder}`,
    `Nội dung chuyển khoản: ${memo}`,
    ``,
    `Thanh toán ngay bằng VNPAY-QR: ${targetUrl}`,
    `Tổng đài hỗ trợ 24/7: 1900 1886`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html: shell(inner, `Thông báo thanh toán đặt chỗ mã ${code}`, 'Chờ thanh toán'),
    text,
  };
}

/** Email xác nhận thanh toán thành công và vé điện tử chính thức */
export function buildPaymentSuccessHtml(input: PaymentSuccessInput): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    bookingCode,
    amount,
    method = 'vnpay',
    bookingId,
    flightNumber,
    route,
    departureTime,
    ticketUrl,
    customNote,
    pointsEarned,
    passengers,
  } = input;

  const code = bookingCode || '—';
  const total = `${formatVnd(amount)} VNĐ`;
  const methodLabel = METHOD_LABELS[method] || METHOD_LABEL_FALLBACK;
  const viewUrl =
    ticketUrl || `${siteUrl()}/tai-khoan${bookingId ? `?bookingId=${bookingId}` : ''}`;
  const subject = `Thanh toán thành công & Xác nhận vé${bookingCode ? ` ${bookingCode}` : ''} — Vietjet Air`;

  let flightDetailsHtml = '';
  if (flightNumber) {
    flightDetailsHtml += detailRow('Chuyến bay', flightNumber);
  }
  if (route) {
    flightDetailsHtml += detailRow('Hành trình', route);
  }
  if (departureTime) {
    flightDetailsHtml += detailRow('Thời gian khởi hành', departureTime);
  }
  if (passengers && passengers.length > 0) {
    const pStr = passengers
      .map((p) => `${escapeHtml(p.name)}${p.seat ? ` (Ghế: ${escapeHtml(p.seat)})` : ''}`)
      .join(', ');
    flightDetailsHtml += detailRow('Hành khách', pStr);
  }

  const customNoteHtml = customNote
    ? noticeBox(
        `<strong>Lời nhắn từ Quản trị viên Vietjet Air:</strong><br>${escapeHtml(customNote)}`
      )
    : '';

  const inner = `<p style="margin:0 0 16px;">Kính chào <strong>${escapeHtml(fullName)}</strong>,</p>
<p style="margin:0 0 20px;">Vietjet Air xin trân trọng thông báo giao dịch thanh toán của Quý khách đã <strong>hoàn tất thành công</strong>. Vé điện tử đã được phát hành chính thức với chi tiết dưới đây:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td align="center" style="padding:22px 16px;">
<div style="font-size:11px;letter-spacing:2px;color:#6b7280;margin-bottom:6px;">MÃ ĐẶT CHỖ (PNR)</div>
<div style="font-size:28px;font-weight:bold;letter-spacing:5px;color:${BRAND_RED};">${escapeHtml(code)}</div>
<div style="margin-top:8px;font-size:12px;color:#16a34a;font-weight:bold;">ĐÃ THANH TOÁN &bull; VÉ ĐÃ PHÁT HÀNH</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Trạng thái thanh toán', 'Thành công (Đã xuất vé)')}
${detailRow('Phương thức thanh toán', methodLabel)}
${detailRow('Tổng tiền đã trả', total, true)}
${pointsEarned && pointsEarned > 0 ? detailRow('Điểm SkyPoint tích lũy', `+${pointsEarned.toLocaleString('vi-VN')} điểm (SkyJoy)`) : ''}
${flightDetailsHtml}
</table>
${customNoteHtml}
${actionButton(viewUrl, 'Xem vé điện tử & Quản lý chuyến bay')}
${noticeBox(`<strong>Hướng dẫn làm thủ tục chuyến bay:</strong><br>&bull; Làm thủ tục trực tuyến (Web check-in) từ 24 giờ đến 60 phút trước giờ khởi hành tại website.<br>&bull; Có mặt tại sân bay ít nhất 120 phút trước giờ bay đối với chuyến bay nội địa (180 phút với quốc tế).<br>&bull; Mang theo CCCD/Hộ chiếu hợp lệ còn hạn.`)}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Tra cứu chi tiết và quản lý đặt chỗ bất kỳ lúc nào tại mục <a href="${escapeHtml(siteUrl())}/tai-khoan" style="color:${BRAND_RED};">Chuyến bay của tôi</a> hoặc liên hệ hotline <strong style="color:${BRAND_RED};">1900 1886</strong>.</p>`;

  const text = [
    `Thanh toán thành công & Xác nhận vé — Vietjet Air`,
    `Kính chào ${fullName},`,
    ``,
    `Mã đặt chỗ (PNR): ${code}`,
    `Trạng thái: Đã thanh toán thành công`,
    `Phương thức: ${methodLabel}`,
    `Tổng tiền: ${total}`,
    pointsEarned && pointsEarned > 0
      ? `Điểm SkyPoint tích lũy: +${pointsEarned.toLocaleString('vi-VN')} điểm`
      : '',
    flightNumber ? `Chuyến bay: ${flightNumber}` : '',
    route ? `Hành trình: ${route}` : '',
    departureTime ? `Khởi hành: ${departureTime}` : '',
    ``,
    `Xem vé điện tử: ${viewUrl}`,
    `Tổng đài hỗ trợ 24/7: 1900 1886`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html: shell(inner, `Thanh toán thành công vé mã ${code}`, 'Thanh toán thành công'),
    text,
  };
}

/** Email thông báo thanh toán không thành công / bị từ chối đối soát */
export function buildPaymentFailedHtml(input: PaymentFailedInput): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    bookingCode,
    bookingId,
    amount,
    reason = 'Giao dịch bị gián đoạn, quá hạn hoặc thông tin biên lai chuyển khoản không khớp',
    retryUrl,
    flightNumber,
    route,
    departureTime,
    customNote,
  } = input;

  const code = bookingCode || '—';
  const total = `${formatVnd(amount)} VNĐ`;
  // See `buildPaymentInstructionHtml`: the link carries the PNR, the credential
  // the customer actually holds, rather than the internal booking UUID.
  const payUrl = retryUrl || `${siteUrl()}/thanh-toan?bookingId=${bookingCode || bookingId || ''}`;
  const subject = `Thông báo thanh toán chưa thành công${bookingCode ? ` ${bookingCode}` : ''} — Vietjet Air`;

  let flightDetailsHtml = '';
  if (flightNumber) {
    flightDetailsHtml += detailRow('Chuyến bay', flightNumber);
  }
  if (route) {
    flightDetailsHtml += detailRow('Hành trình', route);
  }
  if (departureTime) {
    flightDetailsHtml += detailRow('Thời gian khởi hành', departureTime);
  }

  const customNoteHtml = customNote
    ? noticeBox(`<strong>Chi tiết phản hồi từ hệ thống:</strong><br>${escapeHtml(customNote)}`)
    : '';

  const inner = `<p style="margin:0 0 16px;">Kính chào <strong>${escapeHtml(fullName)}</strong>,</p>
<p style="margin:0 0 20px;">Vietjet Air xin thông báo: Giao dịch thanh toán cho mã đặt chỗ của Quý khách <strong>chưa được hoàn tất thành công</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background-color:#fff5f5;border:1px solid #fed7d7;border-radius:8px;">
<tr><td align="center" style="padding:22px 16px;">
<div style="font-size:11px;letter-spacing:2px;color:#991b1b;margin-bottom:6px;">MÃ ĐẶT CHỖ (PNR)</div>
<div style="font-size:28px;font-weight:bold;letter-spacing:5px;color:${BRAND_RED};">${escapeHtml(code)}</div>
<div style="margin-top:8px;font-size:12px;color:#dc2626;font-weight:bold;">THANH TOÁN THẤT BẠI / TỪ CHỐI ĐỐI SOÁT</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${flightDetailsHtml}
${detailRow('Số tiền cần thanh toán', total, true)}
${detailRow('Lý do', reason)}
</table>
${customNoteHtml}
${noticeBox(`<strong>Quý khách đã chuyển khoản nhưng bị báo thất bại?</strong><br>&bull; <em>Lỗi thường gặp:</em> Chuyển khoản sai số tiền hoặc sai cú pháp nội dung chuyển khoản. Cú pháp chuẩn của hệ thống bắt buộc là mã đặt chỗ kèm hậu tố <strong>I98O</strong> (Ví dụ: <strong>${escapeHtml(code)}I98O</strong>, ký tự "O" là chữ cái in hoa).<br>&bull; Nếu tài khoản của Quý khách đã bị trừ tiền, xin đừng lo lắng, vui lòng liên hệ ngay tổng đài <strong>1900 1886</strong> hoặc gửi ảnh biên lai giao dịch kèm mã <strong>${escapeHtml(code)}</strong> để bộ phận kế toán đối soát và hỗ trợ xuất vé ngay lập tức.`)}
${actionButton(payUrl, 'Thử lại thanh toán')}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Nếu Quý khách muốn đặt lại chuyến bay mới, vui lòng truy cập trang chủ <a href="${escapeHtml(siteUrl())}" style="color:${BRAND_RED};">${escapeHtml(siteUrl())}</a> hoặc liên hệ tổng đài <strong>1900 1886</strong>.</p>`;

  const text = [
    `Thông báo thanh toán chưa thành công — Vietjet Air`,
    `Kính chào ${fullName},`,
    ``,
    `Mã đặt chỗ (PNR): ${code}`,
    `Số tiền: ${total}`,
    `Lý do: ${reason}`,
    flightNumber ? `Chuyến bay: ${flightNumber}` : '',
    route ? `Hành trình: ${route}` : '',
    departureTime ? `Khởi hành: ${departureTime}` : '',
    ``,
    `Thử lại thanh toán: ${payUrl}`,
    `Hotline hỗ trợ 24/7: 1900 1886 / 1900 1166`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html: shell(inner, `Thanh toán chưa thành công cho mã ${code}`, 'Thanh toán thất bại'),
    text,
  };
}

/** Email tiếp nhận thanh toán & biên lai chuyển khoản (chờ kế toán đối soát) */
export function buildPaymentPendingReviewHtml(input: PaymentPendingReviewInput): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    bookingCode,
    bookingId,
    amount,
    transferNote,
    bankName,
    flightNumber,
    route,
    departureTime,
    passengers,
    customNote,
  } = input;

  const code = bookingCode || '—';
  const total = `${formatVnd(amount)} VNĐ`;
  const memo = transferNote || (bookingCode ? `${bookingCode}I98O` : '—');
  const viewUrl = `${siteUrl()}/tai-khoan${bookingId ? `?bookingId=${bookingId}` : ''}`;
  const subject = `Tiếp nhận thanh toán đặt chỗ${bookingCode ? ` ${bookingCode}` : ''} — Chờ đối soát — Vietjet Air`;

  let flightDetailsHtml = '';
  if (flightNumber) {
    flightDetailsHtml += detailRow('Chuyến bay', flightNumber);
  }
  if (route) {
    flightDetailsHtml += detailRow('Hành trình', route);
  }
  if (departureTime) {
    flightDetailsHtml += detailRow('Thời gian khởi hành', departureTime);
  }
  if (passengers && passengers.length > 0) {
    const pStr = passengers
      .map((p) => `${escapeHtml(p.name)}${p.seat ? ` (Ghế: ${escapeHtml(p.seat)})` : ''}`)
      .join(', ');
    flightDetailsHtml += detailRow('Hành khách', pStr);
  }

  const customNoteHtml = customNote
    ? noticeBox(`<strong>Ghi chú từ Quản trị viên:</strong><br>${escapeHtml(customNote)}`)
    : '';

  const inner = `<p style="margin:0 0 16px;">Kính chào <strong>${escapeHtml(fullName)}</strong>,</p>
<p style="margin:0 0 20px;">Vietjet Air đã tiếp nhận thông tin chuyển khoản và ảnh biên lai thanh toán cho mã đặt chỗ của Quý khách. Đơn hàng đang được chuyển sang bộ phận kế toán để <strong>đối soát giao dịch</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background-color:#fefce8;border:1px solid #fef08a;border-radius:8px;">
<tr><td align="center" style="padding:22px 16px;">
<div style="font-size:11px;letter-spacing:2px;color:#854d0e;margin-bottom:6px;">MÃ ĐẶT CHỖ (PNR)</div>
<div style="font-size:28px;font-weight:bold;letter-spacing:5px;color:${BRAND_RED};">${escapeHtml(code)}</div>
<div style="margin-top:8px;font-size:12px;color:#ca8a04;font-weight:bold;">ĐÃ NHẬN BIÊN LAI &bull; ĐANG ĐỐI SOÁT</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${flightDetailsHtml}
${detailRow('Số tiền thanh toán', total, true)}
${bankName ? detailRow('Ngân hàng thụ hưởng', bankName) : ''}
${detailRow('Nội dung chuyển khoản đối soát', memo)}
${detailRow('Trạng thái', 'Đang đối soát sao kê ngân hàng')}
</table>
${customNoteHtml}
${noticeBox(`<strong>Hệ thống đang xử lý:</strong><br>&bull; Giao dịch của Quý khách với nội dung <strong>${escapeHtml(memo)}</strong> đang được hệ thống và nhân viên kiểm tra đối chiếu tự động.<br>&bull; Ngay khi tài khoản ngân hàng ghi nhận khớp số tiền, vé điện tử chính thức sẽ được tự động kích hoạt và gửi tới email của Quý khách.<br>&bull; Quý khách không cần chuyển khoản lại để tránh trùng lặp giao dịch.`)}
${actionButton(viewUrl, 'Kiểm tra trạng thái đặt chỗ')}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Quý khách có thể kiểm tra trạng thái vé bất kỳ lúc nào tại mục <a href="${escapeHtml(siteUrl())}/tai-khoan" style="color:${BRAND_RED};">Chuyến bay của tôi</a> hoặc liên hệ hotline <strong style="color:${BRAND_RED};">1900 1886</strong> khi cần hỗ trợ gấp.</p>`;

  const text = [
    `Tiếp nhận thanh toán đặt chỗ — Chờ đối soát — Vietjet Air`,
    `Kính chào ${fullName},`,
    ``,
    `Mã đặt chỗ (PNR): ${code}`,
    `Trạng thái: Đã nhận biên lai, đang chờ đối soát ngân hàng`,
    `Số tiền: ${total}`,
    `Nội dung chuyển khoản: ${memo}`,
    flightNumber ? `Chuyến bay: ${flightNumber}` : '',
    route ? `Hành trình: ${route}` : '',
    departureTime ? `Khởi hành: ${departureTime}` : '',
    ``,
    `Xem trạng thái đặt chỗ: ${viewUrl}`,
    `Tổng đài hỗ trợ 24/7: 1900 1886`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html: shell(inner, `Tiếp nhận thanh toán đặt chỗ mã ${code}`, 'Chờ đối soát'),
    text,
  };
}

/** Email thông báo hoàn tiền */
export function buildRefundNotificationHtml(input: RefundNotificationInput): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    bookingCode,
    amount,
    refundMethod = 'Tài khoản thanh toán ban đầu',
    reason = 'Yêu cầu hoàn vé / hủy đặt chỗ theo quy định',
  } = input;

  const code = bookingCode || '—';
  const total = `${formatVnd(amount)} VNĐ`;
  const subject = `Xác nhận hoàn tiền đặt vé${bookingCode ? ` ${bookingCode}` : ''} — Vietjet Air`;

  const inner = `<p style="margin:0 0 16px;">Kính chào <strong>${escapeHtml(fullName)}</strong>,</p>
<p style="margin:0 0 20px;">Yêu cầu hoàn tiền cho đặt chỗ của Quý khách đã được xử lý thành công. Chi tiết giao dịch hoàn tiền như sau:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td align="center" style="padding:22px 16px;">
<div style="font-size:11px;letter-spacing:2px;color:#6b7280;margin-bottom:6px;">MÃ ĐẶT CHỖ (PNR)</div>
<div style="font-size:28px;font-weight:bold;letter-spacing:5px;color:${BRAND_RED};">${escapeHtml(code)}</div>
<div style="margin-top:8px;font-size:12px;color:#16a34a;font-weight:bold;">ĐÃ HOÀN TIỀN</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Số tiền hoàn trả', total, true)}
${detailRow('Phương thức hoàn tiền', refundMethod)}
${detailRow('Lý do hoàn tiền', reason)}
</table>
${noticeBox(`Số tiền hoàn trả sẽ được ghi có vào tài khoản hoặc thẻ của Quý khách trong vòng <strong>3 đến 7 ngày làm việc</strong> tùy thuộc vào ngân hàng phát hành.`)}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Nếu cần thêm thông tin hỗ trợ, Quý khách vui lòng liên hệ tổng đài chăm sóc khách hàng <strong>1900 1886</strong>.</p>`;

  const text = [
    `Xác nhận hoàn tiền đặt vé — Vietjet Air`,
    `Kính chào ${fullName},`,
    ``,
    `Mã đặt chỗ (PNR): ${code}`,
    `Số tiền hoàn trả: ${total}`,
    `Phương thức hoàn: ${refundMethod}`,
    `Lý do: ${reason}`,
    ``,
    `Thời gian nhận tiền: 3 đến 7 ngày làm việc.`,
    `Tổng đài hỗ trợ: 1900 1886`,
  ].join('\n');

  return {
    subject,
    html: shell(inner, `Hoàn tiền đặt chỗ mã ${code}`, 'Xác nhận hoàn tiền'),
    text,
  };
}

export function buildBookingConfirmationHtml(input: BookingConfirmationInput): {
  subject: string;
  html: string;
  text: string;
} {
  return buildPaymentSuccessHtml({
    fullName: input.fullName,
    bookingCode: input.bookingCode,
    amount: input.amount,
    method: input.method,
  });
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

/** Gửi email xác nhận thanh toán thành công và vé điện tử chính thức. */
export async function sendPaymentSuccessEmail(
  opts: PaymentSuccessInput & { to: string }
): Promise<boolean> {
  const { subject, html, text } = buildPaymentSuccessHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}

/** Gửi email thông báo thanh toán / hướng dẫn thanh toán kèm STK Admin và VNPAY-QR. */
export async function sendPaymentInstructionEmail(
  opts: PaymentInstructionInput & { to: string }
): Promise<boolean> {
  const { subject, html, text } = buildPaymentInstructionHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}

/** Gửi email thông báo thanh toán không thành công hoặc bị từ chối đối soát. */
export async function sendPaymentFailedEmail(
  opts: PaymentFailedInput & { to: string }
): Promise<boolean> {
  const { subject, html, text } = buildPaymentFailedHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}

/** Gửi email tiếp nhận thanh toán & biên lai chuyển khoản (chờ kế toán đối soát). */
export async function sendPaymentPendingReviewEmail(
  opts: PaymentPendingReviewInput & { to: string }
): Promise<boolean> {
  const { subject, html, text } = buildPaymentPendingReviewHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}

/** Gửi email thông báo hoàn tiền. */
export async function sendRefundNotificationEmail(opts: {
  to: string;
  fullName: string;
  bookingCode: string | null;
  amount: number;
  refundMethod?: string;
  reason?: string;
}): Promise<boolean> {
  const { subject, html, text } = buildRefundNotificationHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}

/** Gửi email xác nhận đặt vé — gọi sau khi thanh toán thành công. */
export async function sendBookingConfirmationEmail(
  opts: Parameters<typeof sendPaymentSuccessEmail>[0]
): Promise<boolean> {
  return sendPaymentSuccessEmail(opts);
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

/** Mail chứa mã xác thực OTP đăng ký hoặc đăng nhập. */
export function buildOtpEmailHtml(opts: {
  code: string;
  expiresInMinutes?: number;
  purpose?: string;
}): { subject: string; html: string; text: string } {
  const mins = opts.expiresInMinutes || 5;
  const isRegister = opts.purpose !== 'login';
  const actionText = isRegister
    ? 'hoàn tất đăng ký tài khoản Vietjet SkyJoy'
    : 'đăng nhập vào tài khoản';
  const subject = isRegister
    ? `Mã xác thực OTP đăng ký tài khoản: ${opts.code} — Vietjet Air`
    : `Mã xác thực OTP đăng nhập: ${opts.code} — Vietjet Air`;

  const inner = `<p style="margin:0 0 16px;">Kính chào Quý khách,</p>
<p style="margin:0 0 16px;">Mã xác thực (OTP) của Quý khách để ${actionText} là:</p>
<div style="margin:24px 0;text-align:center;">
  <span style="display:inline-block;padding:14px 28px;background-color:#fff5f5;border:2px dashed ${BRAND_RED};border-radius:10px;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:900;letter-spacing:8px;color:${BRAND_RED};">
    ${escapeHtml(opts.code)}
  </span>
</div>
${noticeBox(`Mã xác thực này có hiệu lực trong vòng <strong>${mins} phút</strong>. Quý khách vui lòng không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn tài khoản.`)}`;

  const text = [
    subject,
    ``,
    `Kính chào Quý khách,`,
    `Mã xác thực (OTP) của Quý khách là: ${opts.code}`,
    `Mã này có hiệu lực trong vòng ${mins} phút. Tuyệt đối không chia sẻ mã với bất kỳ ai.`,
  ].join('\n');

  return {
    subject,
    html: shell(
      inner,
      `Mã OTP của Quý khách: ${opts.code}`,
      isRegister ? 'Đăng ký SkyJoy' : 'Xác thực OTP'
    ),
    text,
  };
}

/** Gửi email chứa mã xác thực OTP. */
export async function sendOtpEmail(opts: {
  to: string;
  code: string;
  expiresInMinutes?: number;
  purpose?: string;
}): Promise<boolean> {
  const { subject, html, text } = buildOtpEmailHtml(opts);
  return sendMail({ to: opts.to, subject, html, text });
}
