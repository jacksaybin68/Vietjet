/**
 * Sinh PDF thẻ lên máy bay (e-boarding pass) — server-side.
 *
 * Vì sao `pdfkit` chứ không phải `puppeteer-core`:
 * `puppeteer-core` cần một binary Chromium, mà image Docker của repo này là
 * `node:20-alpine` — không có Chrome ⇒ không dùng được cho PDF server-side.
 * `pdfkit` là thư viện thuần JS, không cần binary.
 *
 * Vì sao nhúng font KoHo:
 * PDF mặc định dùng Helvetica, không có dấu tiếng Việt ⇒ tên hành khách in ra
 * là ô chữ vuông. KoHo được commit cục bộ vào `public/fonts/` (file `.ttf`
 * gốc của hãng) để nhúng được. `src/styles/tailwind.css` cũng khai báo
 * `@font-face` cho chúng, nên web và PDF dùng cùng một typeface.
 *
 * Mô hình: mỗi chặng một trang A4, mỗi hành khách một thẻ vé trên trang.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import {
  buildBoardingQrContent,
  type ETicketData,
  type ETicketPassenger,
} from '@/features/payments/e-ticket';

/** Màu thương hiệu — cùng giá trị với `tailwind.config.js`. */
const BRAND_RED = '#EC2029';
const BRAND_YELLOW = '#FFDD00';
const INK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#D1D5DB';

export interface BoardingPassPdfLeg {
  /** PNR của chặng này. */
  pnr: string;
  flightNo: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  /** `YYYY-MM-DD`. */
  date: string;
  departTime: string;
  arriveTime: string;
  gate?: string | null;
  terminal?: string | null;
  /** 'outbound' | 'inbound' — nhúng vào QR để máy quét biết chặng nào. */
  legRole: 'outbound' | 'inbound';
  passengers: ETicketPassenger[];
}

export interface BoardingPassPdfInput {
  legs: BoardingPassPdfLeg[];
  /** Tổng tiền đã thanh toán (VND) — in ở chân trang. */
  amount?: number;
}

/**
 * Font KoHo đã commit cục bộ.
 *
 * `process.cwd()` là gốc project khi Next chạy server-side, nên
 * `public/fonts/KoHo-Regular.ttf` resolve được. Đường dẫn được dựng bằng
 * `path.join` (không phải nối chuỗi) vì Windows dùng `\` — một đường dẫn
 * viết tay bằng `/` vẫn chạy được trên Node, nhưng `path.join` là cách
 * đúng và giống nhau ở mọi nơi.
 */
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'KoHo-Regular.ttf');
const FONT_MEDIUM = path.join(FONT_DIR, 'KoHo-Medium.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'KoHo-Bold.ttf');

/**
 * Font KoHo đã nạp một lần cho cả tài liệu.
 *
 * `readFile` là I/O — đọc lại cho mỗi vé là lãng phí, và `registerFont` cần
 * một `Buffer` chứ không nhận đường dẫn lazy (nó đọc đồng bộ ở lần đầu).
 * Cache ở module scope vì một request sinh một tài liệu.
 */
let fontBuffersPromise: Promise<{ regular: Buffer; medium: Buffer; bold: Buffer }> | null = null;

async function loadFonts() {
  if (!fontBuffersPromise) {
    fontBuffersPromise = (async () => {
      const [regular, medium, bold] = await Promise.all([
        readFile(FONT_REGULAR),
        readFile(FONT_MEDIUM),
        readFile(FONT_BOLD),
      ]);
      return { regular, medium, bold };
    })().catch((error) => {
      // Không đọc được font thì reset cache để lần sau thử lại, và ném lỗi
      // có ngữ cảnh thay vì lỗi ENOENT trần.
      fontBuffersPromise = null;
      throw new Error(
        `Không đọc được file font KoHo (${FONT_DIR}): ${error instanceof Error ? error.message : error}`
      );
    });
  }
  return fontBuffersPromise;
}

/**
 * Nội dung QR của một chặng.
 *
 * `buildBoardingQrContent` là nơi duy nhất định nghĩa payload (nó nằm trong
 * `features/payments/e-ticket.ts` và dùng chung với màn hình web), nên PDF
 * và QR trên web không thể lệch nhau. Chặng được ghép thêm vào payload để máy
 * quét phân biệt được chặng đi và chặng về.
 */
function buildLegQrContent(leg: BoardingPassPdfLeg, passenger: ETicketPassenger): string {
  const data: ETicketData = {
    pnr: leg.pnr,
    flightNo: leg.flightNo,
    from: leg.from,
    to: leg.to,
    fromCity: leg.fromCity,
    toCity: leg.toCity,
    date: leg.date,
    departTime: leg.departTime,
    arriveTime: leg.arriveTime,
    passengers: leg.passengers,
    amount: 0,
  };
  const base = buildBoardingQrContent(data, passenger);
  return `${base}|${leg.legRole === 'inbound' ? 'IN' : 'OUT'}`;
}

/** QR dưới dạng PNG buffer — `pdfkit` nhúng được, và 300 DPI khi in. */
async function renderQrPng(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    type: 'png',
    margin: 1,
    width: 512,
    errorCorrectionLevel: 'M',
    color: { dark: INK, light: '#FFFFFF' },
  });
}

/**
 * Vẽ mã vạch Code 39 bằng vector.
 *
 * `code39Svg` trả SVG; PDF không nhúng SVG một cách tin cậy (pdfkit cần
 * `svg-to-pdfkit`, thêm một dependency nữa). Thay vào đó, cùng bảng pattern
 * Code 39 được dùng lại để vẽ rect trực tiếp — vector, sắc nét ở mọi kích
 * thước in, không phụ thuộc font.
 */
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

function drawCode39(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const clean = text
    .toUpperCase()
    .replace(/[^0-9A-Z\-. ]/g, '')
    .trim()
    .slice(0, 30);
  if (!clean) return;

  const encoded = `*${clean}*`;
  // Tổng số module của chuỗi đã mã hoá, để scale cho vừa `width`.
  let totalModules = 0;
  for (const ch of encoded) {
    const pattern = CODE39_PATTERNS[ch];
    if (!pattern) continue;
    totalModules += pattern
      .split('')
      .reduce((sum, bit) => sum + (bit === '1' ? CODE39_WIDE_RATIO : 1), 0);
    totalModules += 1; // inter-character gap
  }
  if (totalModules === 0) return;

  const moduleWidth = width / totalModules;
  let cursor = x;

  for (const ch of encoded) {
    const pattern = CODE39_PATTERNS[ch];
    if (!pattern) continue;
    for (let i = 0; i < 9; i++) {
      const barWidth = (pattern[i] === '1' ? CODE39_WIDE_RATIO : 1) * moduleWidth;
      if (i % 2 === 0) {
        // Chẵn = bar, lẻ = space (chỉ vẽ bar).
        doc.rect(cursor, y, barWidth, height).fill(INK);
      }
      cursor += barWidth;
    }
    cursor += moduleWidth; // inter-character gap
  }
}

/** Một ô nhãn/giá trị trong lưới thông tin vé. */
function field(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  fonts: { medium: Buffer; bold: Buffer }
): void {
  doc.font(fonts.medium).fontSize(7.5).fillColor(MUTED).text(label.toUpperCase(), x, y, { width });
  doc
    .font(fonts.bold)
    .fontSize(11)
    .fillColor(INK)
    .text(value || '—', x, y + 11, { width });
}

/**
 * Sinh buffer PDF chứa thẻ lên máy bay của mọi chặng.
 *
 * Trả về `Buffer` (không stream) vì cả hai nơi dùng nó — endpoint tải vé và
 * email kèm file — đều cần nội dung hoàn chỉnh trước khi gửi đi.
 */
export async function buildBoardingPassPdf(input: BoardingPassPdfInput): Promise<Buffer> {
  const fonts = await loadFonts();
  const legs = input.legs.filter((leg) => leg.passengers.length > 0);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    info: {
      Title: 'Thẻ lên máy bay — Vietjet Air',
      Author: 'Vietjet Air',
    },
  });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.registerFont('KoHo', fonts.regular);
  doc.registerFont('KoHoMedium', fonts.medium);
  doc.registerFont('KoHoBold', fonts.bold);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (const leg of legs) {
    // QR của chặng: mỗi hành khách một mã (mã chứa tên hành khách), nên phải
    // sinh riêng cho từng người.
    const qrByPassenger = await Promise.all(
      leg.passengers.map(async (passenger) => ({
        passenger,
        png: await renderQrPng(buildLegQrContent(leg, passenger)),
      }))
    );

    for (let index = 0; index < leg.passengers.length; index++) {
      const passenger = leg.passengers[index];
      const qr = qrByPassenger[index];

      if (doc.y > doc.page.height - 260) {
        doc.addPage();
      }

      const top = doc.page.margins.top;
      const ticketHeight = 168;

      // ── Header thương hiệu ────────────────────────────────────────────────
      doc.roundedRect(doc.page.margins.left, top, pageWidth, 26, 6).fill(BRAND_RED);
      doc
        .font('KoHoBold')
        .fontSize(11)
        .fillColor('#FFFFFF')
        .text('VIETJET AIR', doc.page.margins.left + 10, top + 8);
      doc
        .font('KoHoMedium')
        .fontSize(7.5)
        .fillColor('#FFFFFF')
        .text(
          `THẺ LÊN TÀU ĐIỆN TỬ · ${leg.legRole === 'inbound' ? 'CHẶNG VỀ' : 'CHẶNG ĐI'}`,
          doc.page.margins.left + 96,
          top + 10,
          { width: pageWidth - 200, align: 'left' }
        );
      doc
        .font('KoHoBold')
        .fontSize(12)
        .fillColor(BRAND_YELLOW)
        .text(leg.pnr || '—', doc.page.margins.left + pageWidth - 100, top + 7, {
          width: 90,
          align: 'right',
        });

      // ── Dải chặng bay ───────────────────────────────────────────────────
      const stripY = top + 30;
      doc.roundedRect(doc.page.margins.left, stripY, pageWidth, 22, 4).fill('#F3F4F6');
      doc
        .font('KoHoBold')
        .fontSize(9)
        .fillColor(INK)
        .text(`${leg.from} → ${leg.to}`, doc.page.margins.left + 10, stripY + 6, { width: 120 });
      doc
        .font('KoHoMedium')
        .fontSize(8)
        .fillColor(MUTED)
        .text(`${leg.flightNo} · ${leg.date}`, doc.page.margins.left + 10, stripY + 6, {
          width: 120,
          align: 'right',
        });
      doc
        .font('KoHoBold')
        .fontSize(8)
        .fillColor(BRAND_RED)
        .text(
          `GHẾ ${passenger.seat || '—'}   CỬA ${leg.gate || '—'}   NHÀ GA ${leg.terminal || '—'}`,
          doc.page.margins.left + 140,
          stripY + 7,
          { width: pageWidth - 150, align: 'right' }
        );

      // ── Lưới thông tin ──────────────────────────────────────────────────
      const gridTop = stripY + 32;
      const colWidth = (pageWidth - 12) / 2;

      field(
        doc,
        'Hành khách',
        passenger.name.toUpperCase(),
        doc.page.margins.left,
        gridTop,
        colWidth,
        fonts
      );
      field(
        doc,
        'Số hiệu chuyến bay',
        leg.flightNo,
        doc.page.margins.left + colWidth + 12,
        gridTop,
        colWidth,
        fonts
      );
      field(
        doc,
        'Chặng bay',
        `${leg.from} – ${leg.to}`,
        doc.page.margins.left,
        gridTop + 32,
        colWidth,
        fonts
      );
      field(
        doc,
        'Giờ bay',
        `${leg.departTime} – ${leg.arriveTime}`,
        doc.page.margins.left + colWidth + 12,
        gridTop + 32,
        colWidth,
        fonts
      );
      field(doc, 'Ngày bay', leg.date, doc.page.margins.left, gridTop + 64, colWidth, fonts);
      field(
        doc,
        'Ghế',
        passenger.seat || '—',
        doc.page.margins.left + colWidth + 12,
        gridTop + 64,
        colWidth,
        fonts
      );

      // ── QR + mã vạch ────────────────────────────────────────────────────
      const codeY = gridTop + 92;
      const qrSize = 76;
      doc
        .roundedRect(doc.page.margins.left, codeY, qrSize, qrSize, 6)
        .fillAndStroke('#FFFFFF', BORDER);
      doc.image(qr.png, doc.page.margins.left + 3, codeY + 3, {
        fit: [qrSize - 6, qrSize - 6],
      });

      const barcodeX = doc.page.margins.left + qrSize + 14;
      const barcodeWidth = pageWidth - qrSize - 14;
      drawCode39(doc, leg.pnr || '', barcodeX, codeY + 6, barcodeWidth, 34);
      doc
        .font('KoHoBold')
        .fontSize(9)
        .fillColor(INK)
        .text(leg.pnr || '—', barcodeX, codeY + 44, { width: barcodeWidth, align: 'center' });
      doc
        .font('KoHoMedium')
        .fontSize(7.5)
        .fillColor(MUTED)
        .text('Xuất trình QR hoặc mã vạch tại cổng lên máy bay', barcodeX, codeY + 58, {
          width: barcodeWidth,
          align: 'center',
        });

      // ── Đường kẻ đứt ────────────────────────────────────────────────────
      const perfY = top + ticketHeight;
      doc
        .save()
        .dash(3, { space: 3 })
        .moveTo(doc.page.margins.left, perfY)
        .lineTo(doc.page.margins.left + pageWidth, perfY)
        .strokeColor(BORDER)
        .stroke()
        .undash()
        .restore();

      doc.y = perfY + 8;

      // Mỗi hành khách một thẻ: thẻ sau xuống dưới, cùng trang nếu còn chỗ.
      if (index < leg.passengers.length - 1) {
        doc.y = perfY + 12;
        continue;
      }

      // Hết một chặng ⇒ sang trang mới cho chặng kế tiếp.
      if (leg !== legs[legs.length - 1]) {
        doc.addPage();
      }
    }
  }

  if (input.amount !== undefined && input.amount > 0) {
    if (doc.y > doc.page.height - 60) doc.addPage();
    doc
      .font('KoHoBold')
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `Đã thanh toán: ${Math.floor(input.amount).toLocaleString('vi-VN')}₫`,
        doc.page.margins.left,
        doc.page.height - 48,
        { width: pageWidth, align: 'right' }
      );
  }

  doc.end();
  return done;
}
