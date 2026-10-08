/**
 * Mẫu hóa đơn đặt vé (mô phỏng) — HTML in A4 dùng cho `window.print()`.
 *
 * Pure function, không chạm DOM: render ra string nên test được bằng vitest
 * và tái dùng ở mọi nơi cần in (admin tab, tài khoản, email).
 */

export interface InvoiceBooking {
  id: string;
  userName: string;
  flightNo: string;
  route: string;
  date: string;
  seat: string;
  amount: number;
  status: string;
  statusLabel: string;
  payMethod: string;
  createdAt: string;
}

const SITE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SITE_URL) ||
  'https://vietjet.shop';

/** "123456" → "123.456 ₫". Số âm/không hợp lệ về 0. */
export function formatVnd(amount: number): string {
  const safe = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  return `${safe.toLocaleString('vi-VN')} ₫`;
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTriple(n: number, full = false): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donvi = n % 10;
  const parts: string[] = [];
  if (tram > 0) {
    parts.push(`${DIGITS[tram]} trăm`);
  } else if (full) {
    // "không trăm ba mươi tám": cụm đứng sau triệu/nghìn đọc đủ ba chữ số.
    parts.push('không trăm');
  }
  if (chuc === 0) {
    if (donvi > 0 && (tram > 0 || full)) parts.push('lẻ');
  } else if (chuc === 1) {
    parts.push('mười');
  } else {
    parts.push(`${DIGITS[chuc]} mươi`);
  }
  if (donvi > 0) {
    if (chuc === 0) parts.push(DIGITS[donvi]); // "lẻ năm", "một trăm năm"
    else if (chuc === 1) parts.push(donvi === 5 ? 'lăm' : DIGITS[donvi]); // "mười lăm"
    else parts.push(donvi === 1 ? 'mốt' : donvi === 5 ? 'lăm' : DIGITS[donvi]);
  }
  return parts.join(' ');
}

/** "1038900" → "Một triệu không trăm ba mươi tám nghìn chín trăm đồng". */
export function amountInWords(amount: number): string {
  const safe = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  if (safe === 0) return 'Không đồng';
  const ty = Math.floor(safe / 1_000_000_000);
  const trieu = Math.floor((safe % 1_000_000_000) / 1_000_000);
  const nghin = Math.floor((safe % 1_000_000) / 1000);
  const tram = safe % 1000;
  const parts: string[] = [];
  if (ty > 0) parts.push(`${readTriple(ty)} tỷ`);
  if (trieu > 0) parts.push(`${readTriple(trieu, ty > 0)} triệu`);
  if (nghin > 0) parts.push(`${readTriple(nghin, ty > 0 || trieu > 0)} nghìn`);
  if (tram > 0 || parts.length === 0) parts.push(readTriple(tram, parts.length > 0));
  const sentence = parts.join(' ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}

export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Số hóa đơn ổn định từ mã đặt chỗ: `HD-VJ2B4K9-20260316`. */
export function invoiceNo(booking: Pick<InvoiceBooking, 'id' | 'createdAt'>): string {
  const digits = booking.createdAt.replace(/[^\d]/g, '').slice(0, 8) || '00000000';
  return `HD-${booking.id}-${digits}`;
}

export function renderInvoiceHtml(booking: InvoiceBooking): string {
  const no = invoiceNo(booking);
  const today = new Date().toLocaleDateString('vi-VN');
  const b = {
    id: escapeHtml(booking.id),
    userName: escapeHtml(booking.userName),
    flightNo: escapeHtml(booking.flightNo),
    route: escapeHtml(booking.route),
    date: escapeHtml(booking.date),
    seat: escapeHtml(booking.seat),
    payMethod: escapeHtml(booking.payMethod),
    createdAt: escapeHtml(booking.createdAt),
    statusLabel: escapeHtml(booking.statusLabel),
  };

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Hóa đơn ${b.id}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; background: #fff; }
  .sheet { max-width: 720px; margin: 0 auto; padding: 40px 44px; }
  .brandbar { background: #EC2029; color: #fff; border-radius: 10px; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: 1px; }
  .brand small { display: block; font-size: 11px; font-weight: 400; letter-spacing: 0; opacity: .9; }
  .doc-title { text-align: right; }
  .doc-title h1 { margin: 0; font-size: 20px; }
  .doc-title p { margin: 2px 0 0; font-size: 12px; opacity: .9; }
  .meta { display: flex; justify-content: space-between; margin: 22px 0 6px; font-size: 13px; color: #4b5563; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0 20px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
  .card h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: .06em; }
  .card p { margin: 3px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: #f8fafc; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; padding: 10px 12px; border-top: 2px solid #EC2029; border-bottom: 1px solid #e5e7eb; }
  td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .total-row td { border-bottom: none; border-top: 2px solid #1f2937; font-weight: 900; font-size: 16px; }
  .total-amount { color: #EC2029; font-size: 20px; }
  .words { font-size: 13px; font-style: italic; color: #4b5563; margin: 8px 0 0; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 44px; text-align: center; font-size: 13px; }
  .sign .name { margin-top: 64px; font-weight: bold; }
  .foot { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; color: #6b7280; font-size: 12px; }
  @page { size: A4; margin: 12mm; }
  @media print {
    .sheet { padding: 0; max-width: none; }
    .brandbar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="brandbar">
    <div class="brand">✈ VIETJET AIR<small>Công ty Cổ phần Hàng không VietJet — Hóa đơn mô phỏng</small></div>
    <div class="doc-title"><h1>HÓA ĐƠN ĐẶT VÉ</h1><p>Số: ${no}</p></div>
  </div>

  <div class="meta"><span>Ngày đặt: ${b.createdAt}</span><span>Ngày xuất: ${today}</span></div>

  <div class="parties">
    <div class="card">
      <h3>Đơn vị cung cấp</h3>
      <p><b>Công ty Cổ phần Hàng không VietJet</b></p>
      <p>302 Kim Mã, Ba Đình, Hà Nội</p>
      <p>Hotline: 1900 1886 · ${escapeHtml(SITE_URL)}</p>
    </div>
    <div class="card">
      <h3>Khách hàng</h3>
      <p><b>${b.userName}</b></p>
      <p>Mã đặt chỗ: ${b.id}</p>
      <p>Trạng thái: ${b.statusLabel}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Nội dung</th><th>Chi tiết</th><th class="num">Thành tiền</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><b>Vé máy bay ${b.flightNo}</b><br><span style="color:#6b7280">${b.route} · Khởi hành ${b.date}</span></td>
        <td>Ghế ${b.seat} · ${b.payMethod}</td>
        <td class="num">${formatVnd(booking.amount)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">TỔNG CỘNG (đã gồm thuế, phí)</td>
        <td class="num total-amount">${formatVnd(booking.amount)}</td>
      </tr>
    </tbody>
  </table>
  <p class="words">Số tiền bằng chữ: ${escapeHtml(amountInWords(booking.amount))}.</p>

  <div class="sign">
    <div>KHÁCH HÀNG<div class="name">${b.userName}</div></div>
    <div>ĐẠI DIỆN VIETJET AIR<div class="name">&nbsp;</div></div>
  </div>

  <div class="foot">Cảm ơn quý khách đã sử dụng dịch vụ của VietJet Air. Hóa đơn mô phỏng phục vụ demo, không có giá trị thuế.</div>
</div>
<script>window.print();</script>
</body>
</html>`;
}
