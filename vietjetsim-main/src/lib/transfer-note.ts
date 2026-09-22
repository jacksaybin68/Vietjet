/**
 * Payment transfer-note templating.
 *
 * Admins configure a note template per bank account (Admin → Ngân hàng). The
 * template is rendered at checkout into the bank-transfer content shown to the
 * customer and embedded in the VietQR `addInfo` parameter, so it has to stay
 * safe for bank systems: monetary values are rendered as plain digits with no
 * grouping separators, because a comma or dot can be misread by a receiving
 * bank or by the customer retyping the amount.
 */

export interface TransferNoteVars {
  /** Booking code the customer is paying for. */
  code?: string | null;
  /** Ticket price before any discount. */
  originalAmount?: number | null;
  /** Amount subtracted by the discount code, 0 when none applied. */
  discountAmount?: number | null;
  /** Final amount payable (original - discount). */
  amount?: number | null;
  /** Discount code the customer applied, if any. */
  discountCode?: string | null;
}

export interface TransferNoteToken {
  token: string;
  label: string;
  description: string;
  example: string;
}

/**
 * Tokens an admin may place in a template. Kept in one list so the Admin UI,
 * the validation on save and the renderer cannot drift apart.
 */
export const TRANSFER_NOTE_TOKENS: TransferNoteToken[] = [
  {
    token: '{code}',
    label: 'Mã đặt chỗ',
    description: 'Mã đặt chỗ của khách',
    example: 'ABC123',
  },
  {
    token: '{amount}',
    label: 'Số tiền thanh toán',
    description: 'Số tiền cuối cùng phải trả, đã trừ mã giảm giá',
    example: '850000',
  },
  {
    token: '{original}',
    label: 'Giá vé gốc',
    description: 'Giá vé trước khi áp mã giảm giá',
    example: '1000000',
  },
  {
    token: '{discount}',
    label: 'Số tiền được giảm',
    description: 'Số tiền mã giảm giá đã trừ, 0 nếu không có',
    example: '150000',
  },
  {
    token: '{discount_code}',
    label: 'Mã giảm giá',
    description: 'Mã giảm giá khách đã áp dụng',
    example: 'DL10',
  },
];

export const DEFAULT_TRANSFER_NOTE_TEMPLATE = 'VJ {code}';

const KNOWN_TOKENS = new Set(TRANSFER_NOTE_TOKENS.map((t) => t.token));

/** Matches `{anything}` so unknown tokens survive rendering untouched. */
const TOKEN_PATTERN = /\{[a-zA-Z0-9_]+\}/g;

/**
 * Renders an amount for embedding in a bank transfer note.
 * Returns an empty string for a missing value so a template never shows "NaN".
 */
function renderAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(Math.round(value));
}

/**
 * Substitutes the known tokens in a transfer-note template.
 *
 * Tokens we do not recognise are left verbatim rather than blanked, so a typo
 * is visible to the admin instead of silently producing an empty note.
 */
export function renderTransferNote(
  template: string | null | undefined,
  vars: TransferNoteVars
): string {
  if (!template) return vars.code ?? '';

  return template.replace(TOKEN_PATTERN, (match) => {
    if (!KNOWN_TOKENS.has(match)) return match;
    switch (match) {
      case '{code}':
        return vars.code ?? '';
      case '{amount}':
        return renderAmount(vars.amount);
      case '{original}':
        return renderAmount(vars.originalAmount);
      case '{discount}':
        return renderAmount(vars.discountAmount ?? 0);
      case '{discount_code}':
        return vars.discountCode ?? '';
      default:
        return match;
    }
  });
}

/** Tokens in a template that the renderer does not know how to substitute. */
export function findUnknownTransferNoteTokens(template: string | null | undefined): string[] {
  if (!template) return [];
  const found = template.match(TOKEN_PATTERN) ?? [];
  return [...new Set(found.filter((t) => !KNOWN_TOKENS.has(t)))];
}

/**
 * Validates a template on save. An unknown token is a hard error rather than a
 * warning: it would otherwise ship a transfer note containing a literal
 * `{amout}` that the customer would copy into their bank app.
 */
export function validateTransferNoteTemplate(
  template: unknown
): { valid: true; template: string } | { valid: false; message: string } {
  if (template === undefined || template === null || template === '') {
    return { valid: true, template: DEFAULT_TRANSFER_NOTE_TEMPLATE };
  }
  if (typeof template !== 'string') {
    return { valid: false, message: 'Nội dung thanh toán không hợp lệ' };
  }
  const trimmed = template.trim();
  if (trimmed.length > 200) {
    return { valid: false, message: 'Nội dung thanh toán tối đa 200 ký tự' };
  }
  const unknown = findUnknownTransferNoteTokens(trimmed);
  if (unknown.length > 0) {
    return {
      valid: false,
      message: `Biến không hợp lệ: ${unknown.join(', ')}. Chỉ dùng: ${[...KNOWN_TOKENS].join(', ')}`,
    };
  }
  return { valid: true, template: trimmed };
}
