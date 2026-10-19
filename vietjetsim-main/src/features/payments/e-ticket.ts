/**
 * Vé điện tử (e-ticket) & thẻ lên máy bay (e-boarding pass).
 *
 * Pure functions, không chạm DOM: render ra string nên test được bằng vitest
 * và tái dùng cho cả màn hình success (/thanh-toan) lẫn cửa sổ in PDF —
 * cùng triết lý với `features/admin/invoice.ts`.
 */

export interface ETicketPassenger {
  name: string;
  seat: string;
}

export interface ETicketData {
  /** Mã đặt chỗ (PNR). */
  pnr: string;
  flightNo: string;
  /** Mã sân bay (SGN/HAN...). */
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  /** Ngày bay `YYYY-MM-DD`. */
  date: string;
  departTime: string;
  arriveTime: string;
  passengers: ETicketPassenger[];
  /** Tổng số tiền đã thanh toán (VND). */
  amount: number;
  /** PNG base64 của QR lên máy bay — client sinh bằng `qrcode` rồi inject. */
  qrDataUrl?: string;
}

/** Escape dữ liệu khách hàng trước khi nhúng vào HTML in (chống XSS). */
export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Bỏ dấu tiếng Việt (NFD + loại combining U+0300–U+036F, đ→d) — chuỗi QR/mã
 * vạch cần ASCII để thiết bị sân bay đọc được mọi bộ ký tự.
 */
function asciiFold(value: string): string {
  let out = '';
  for (const ch of value.normalize('NFD')) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) out += ch;
  }
  return out.replace(/[đĐ]/g, 'd');
}

/** Chuỗi dữ liệu nhúng vào QR lên máy bay — mỗi hành khách một boarding pass. */
export function buildBoardingQrContent(data: ETicketData, passenger: ETicketPassenger): string {
  return [
    'ETKT',
    data.pnr,
    asciiFold(passenger.name.toUpperCase()),
    data.flightNo,
    data.date,
    passenger.seat,
    `${data.from}-${data.to}`,
  ].join('|');
}

// ─── Mã vạch Code 39 ─────────────────────────────────────────────────────────
// Mỗi ký tự = 9 phần tử xen kẽ bar/space (bắt đầu bằng bar), '1' = wide (3
// module), '0' = narrow (1 module). Ký tự start/stop là '*'.
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '*': '010010100',
};

const CODE39_WIDE_RATIO = 3;

/** Chỉ giữ ký tự Code 39 hợp lệ (PNR luôn là chữ hoa/số). */
export function sanitizeCode39Text(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^0-9A-Z\-. ]/g, '')
    .trim()
    .slice(0, 30);
}

/**
 * SVG mã vạch Code 39 cho `text` (tự bọc start/stop '*').
 * Trả về string — caller render bằng innerHTML với dữ liệu đã sanitize.
 */
export function code39Svg(
  text: string,
  options: { height?: number; moduleWidth?: number } = {}
): string {
  const height = options.height ?? 48;
  const moduleWidth = options.moduleWidth ?? 2;
  const clean = sanitizeCode39Text(text);
  if (!clean) return '';

  const encoded = `*${clean}*`;
  const rects: string[] = [];
  let x = 0;

  for (const ch of encoded) {
    const pattern = CODE39_PATTERNS[ch];
    if (!pattern) continue;
    for (let i = 0; i < 9; i++) {
      const width = (pattern[i] === '1' ? CODE39_WIDE_RATIO : 1) * moduleWidth;
      // Chẵn = bar, lẻ = space (chỉ vẽ bar).
      if (i % 2 === 0) {
        rects.push(`<rect x="${x}" y="0" width="${width}" height="${height}" fill="#111827"/>`);
      }
      x += width;
    }
    x += moduleWidth; // inter-character gap
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" width="100%" height="${height}" preserveAspectRatio="none" role="img" aria-label="Mã vạch vé ${escapeHtml(clean)}">${rects.join('')}</svg>`;
}

// ─── Bản in vé điện tử (window.print → "Lưu thành PDF") ──────────────────────

/**
 * HTML in A4 cho e-ticket: mỗi hành khách một trang vé (QR + mã vạch Code 39),
 * tiêu đề đỏ Vietjet, thông tin chuyến + tóm tắt thanh toán.
 * `qrDataUrl` do client sinh (package `qrcode`) rồi truyền vào — hàm này
 * vẫn là pure string nên test được.
 */
export function buildETicketHtml(data: ETicketData): string {
  const pnr = escapeHtml(data.pnr || '—');
  const flightNo = escapeHtml(data.flightNo);
  const route = `${escapeHtml(data.from)} → ${escapeHtml(data.to)}`;
  const cities = `${escapeHtml(data.fromCity)} – ${escapeHtml(data.toCity)}`;
  const date = escapeHtml(data.date);
  const depart = escapeHtml(data.departTime);
  const arrive = escapeHtml(data.arriveTime);
  const amount = `${Number(data.amount || 0).toLocaleString('vi-VN')}₫`;
  const qrImg = data.qrDataUrl
    ? `<img src="${data.qrDataUrl}" alt="QR lên máy bay" width="120" height="120"/>`
    : '';

  const tickets = data.passengers
    .map((p) => {
      const name = escapeHtml(p.name.toUpperCase());
      const seat = escapeHtml(p.seat || '—');
      return `
      <section class="ticket">
        <div class="ticket-head">
          <div class="brand">VIETJET AIR</div>
          <div class="doc">THẺ LÊN TÀU ĐIỆN TỬ · E-TICKET</div>
          <div class="pnr">PNR ${pnr}</div>
        </div>
        <div class="ticket-body">
          <table class="grid">
            <tr>
              <td><span class="lbl">Hành khách</span><span class="val">${name}</span></td>
              <td><span class="lbl">Số hiệu</span><span class="val">${flightNo}</span></td>
            </tr>
            <tr>
              <td><span class="lbl">Chặng bay</span><span class="val">${route} · ${cities}</span></td>
              <td><span class="lbl">Ngày bay</span><span class="val">${date}</span></td>
            </tr>
            <tr>
              <td><span class="lbl">Giờ bay</span><span class="val">${depart} – ${arrive}</span></td>
              <td><span class="lbl">Ghế</span><span class="val">${seat}</span></td>
            </tr>
          </table>
          <div class="codes">
            <div class="qr">${qrImg}</div>
            <div class="barcode">${code39Svg(data.pnr)}</div>
          </div>
        </div>
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<title>Vé điện tử ${pnr} — Vietjet Air</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif; color: #111827; }
  .ticket { border: 2px solid #111827; border-radius: 12px; overflow: hidden; margin-bottom: 14mm; page-break-inside: avoid; }
  .ticket:not(:last-child) { page-break-after: always; }
  .ticket-head { background: #ec2029; color: #fff; padding: 10px 16px; display: flex; align-items: baseline; gap: 16px; }
  .brand { font-weight: 900; letter-spacing: 2px; }
  .doc { font-size: 11px; opacity: .9; }
  .pnr { margin-left: auto; font-weight: 900; font-size: 18px; letter-spacing: 3px; }
  .ticket-body { padding: 14px 16px; }
  .grid { width: 100%; border-collapse: collapse; }
  .grid td { width: 50%; padding: 6px 8px; border-bottom: 1px dashed #d1d5db; vertical-align: top; }
  .lbl { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; }
  .val { display: block; font-size: 15px; font-weight: 800; margin-top: 2px; }
  .codes { display: flex; align-items: center; gap: 24px; margin-top: 14px; }
  .qr img { display: block; }
  .barcode { flex: 1; }
  .amount { margin-top: 10px; font-size: 12px; color: #6b7280; text-align: right; }
  .note { font-size: 10px; color: #6b7280; text-align: center; margin-top: 6mm; }
</style>
</head>
<body>
${tickets}
<div class="amount">Đã thanh toán: <strong>${amount}</strong></div>
<div class="note">Vé điện tử Vietjet Air — xuất trình mã QR hoặc mã vạch tại sân bay. Tài liệu này được tạo tự động.</div>
</body>
</html>`;
}
