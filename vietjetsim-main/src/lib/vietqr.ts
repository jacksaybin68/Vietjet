/**
 * Sinh mã VietQR chuẩn EMVCo (NAPAS) — pure function, không phụ thuộc mạng.
 *
 * Cấu trúc payload theo EMV® QR Code Specification for Payment Systems +
 * đặc tả VietQR (NAPAS 232):
 *   00 – Payload Format Indicator   = "01"
 *   01 – Point of Initiation Method = "12" (dynamic QR, một lần dùng)
 *   38 – Merchant Account Info     = 00 NAPAS GUID · 01 BIN · 02 STK · 03 tên NH
 *   53 – Transaction Currency      = "704" (VND)
 *   54 – Transaction Amount        = số nguyên đồng (không dấu phân cách)
 *   58 – Country Code              = "VN"
 *   62 – Additional Data           = 08 reference label (nội dung CK, chứa PNR)
 *   63 – CRC16-CCITT (0x1021, init 0xFFFF) trên toàn bộ chuỗi kèm "6304"
 *
 * Ngân hàng yêu cầu text không dấu, in hoa — sanitize trước khi nhúng.
 */

/** NAPAS GUID định danh VietQR. */
export const VIETQR_GUID = 'A000000727';

/** Mã nước VND theo ISO 4217. */
export const VIETQR_CURRENCY_VND = '704';

/** Loại dấu tiếng Việt (vùng combining U+0300–U+036F) sau bước NFD. */
function stripCombiningMarks(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) out += ch;
  }
  return out;
}

const SPECIAL_MAP: Record<string, string> = { đ: 'd', Đ: 'D' };

/**
 * Không dấu + in hoa + gộp khoảng trắng — quy ước bắt buộc của bank khi parse
 * additional data (62/08) và tên ngân hàng (42).
 */
export function sanitizeVietQrText(value: string, maxLength = 99): string {
  return stripCombiningMarks(value.replace(/[đĐ]/g, (ch) => SPECIAL_MAP[ch] ?? ch).normalize('NFD'))
    .replace(/[^0-9A-Za-z ,.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

/** CRC16-CCITT (FALSE): polynomial 0x1021, seed 0xFFFF — chuẩn EMVCo field 63. */
export function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** TLV: ID 2 ký tự + length 2 chữ số (0-padded) + value. */
function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

/** Sub-field (nested TLV) cho field 38/62: ID 2 ký tự + length + value. */
function sub(id: string, value: string): string {
  return tlv(id, value);
}

export interface VietQrInput {
  /** BIN ngân hàng thụ hưởng (6–9 chữ số), ví dụ MB = 970422. */
  bin: string;
  /** Số tài khoản thụ hưởng, chỉ giữ chữ số. */
  accountNumber: string;
  /** Số tiền VND (số nguyên). Bỏ qua nếu <= 0. */
  amount: number;
  /** Nội dung chuyển khoản (đã render template) — chứa mã PNR. */
  addInfo: string;
  /** Tên ngân hàng thụ hưởng hiển thị trong field 38/03. */
  bankName?: string;
}

/**
 * Gộp payload EMVCo và tính CRC16 tại field 63.
 * Trả về chuỗi khách hàng app ngân hàng có thể quét (upi/vietqr string).
 */
export function buildVietQrPayload(input: VietQrInput): string {
  const bin = (input.bin || '').trim();
  const accountNumber = (input.accountNumber || '').replace(/\D/g, '');
  if (!bin || !accountNumber) {
    throw new Error('VietQR cần BIN ngân hàng và số tài khoản thụ hưởng');
  }

  const merchantAccount = [
    sub('00', VIETQR_GUID),
    sub('01', bin),
    sub('02', accountNumber),
    sub('03', sanitizeVietQrText(input.bankName || 'VIETJET AIR', 30)),
  ].join('');

  const additional = sub('08', sanitizeVietQrText(input.addInfo || '', 99));

  let payload = [
    tlv('00', '01'), // Payload Format Indicator
    tlv('01', '12'), // Dynamic QR, dùng một lần
    tlv('38', merchantAccount),
    tlv('53', VIETQR_CURRENCY_VND),
    ...(Number.isFinite(input.amount) && input.amount > 0
      ? [tlv('54', String(Math.round(input.amount)))]
      : []),
    tlv('58', 'VN'),
    tlv('62', additional),
  ].join('');

  payload += tlv('63', crc16Ccitt(payload + '6304'));
  return payload;
}
