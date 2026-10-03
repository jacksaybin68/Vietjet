/**
 * Bank-transfer payment confirmation.
 *
 * The customer confirms a transfer by re-typing what the page showed them:
 * the transfer memo and the amount. Both are compared against the values the
 * server derived, never against what the browser sent — the browser's copies
 * are attacker-controlled, so accepting them would make the check theatre.
 *
 * Every method other than `bank` pays at the point of sale and needs nothing
 * here; callers should skip validation entirely for those.
 */

/** Non-digit separators a bank app or a human may type into the amount:
 *  whitespace, dots, commas, underscores and the non-breaking space that a
 *  bank app's copy button often carries along with the digits. */
const AMOUNT_SEPARATORS = /[\s.,_\u00a0\u202f]/g;

/**
 * Normalizes an amount the customer typed into an integer number of đồng.
 *
 * Banks and Vietnamese keyboards routinely produce `1.500.000`, `1,500,000` or
 * `1 500 000` for one and a half million, and copy-pasting out of a bank app
 * can carry a currency suffix. Stripping the separators is what lets the
 * comparison below be an equality rather than a fuzzy match, which would
 * otherwise let `15000` pass as `15000000`.
 *
 * Returns NaN for anything that is not digits once separated — a partially
 * typed amount must fail loudly, not coerce to 0.
 */
export function normalizeTransferAmount(input: string | number | null | undefined): number {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : Number.NaN;
  if (input === null || input === undefined) return Number.NaN;

  const digits = String(input)
    .replace(AMOUNT_SEPARATORS, '')
    .replace(/[^\d-]/g, '');
  if (!digits || digits === '-') return Number.NaN;

  const value = Number(digits);
  return Number.isFinite(value) ? value : Number.NaN;
}

export interface BankTransferExpectation {
  /** The memo the page displayed, from the admin's template. */
  transferNote: string;
  /** The amount the page displayed, in đồng. */
  amount: number;
}

export type BankTransferValidation =
  | { valid: true }
  | { valid: false; field: 'transferNote' | 'amount'; message: string };

/**
 * Checks the customer's re-typed memo and amount against what was displayed.
 *
 * The memo comparison trims and collapses whitespace because a bank app may
 * store it padded, but it is otherwise exact: a memo carrying the booking code
 * is the only thing that lets an operator match the transfer to the booking, so
 * an approximate match is worse than none.
 */
export function validateBankTransferInput(
  input: { transferNote?: string | null; amount?: string | number | null },
  expected: BankTransferExpectation
): BankTransferValidation {
  const note = (input.transferNote ?? '').trim().replace(/\s+/g, ' ');
  const expectedNote = expected.transferNote.trim().replace(/\s+/g, ' ');

  if (!note) {
    return {
      valid: false,
      field: 'transferNote',
      message: 'Vui lòng nhập nội dung chuyển khoản đúng như hướng dẫn.',
    };
  }
  if (note !== expectedNote) {
    return {
      valid: false,
      field: 'transferNote',
      message: `Nội dung chuyển khoản không khớp. Vui lòng nhập chính xác: ${expectedNote}`,
    };
  }

  const entered = normalizeTransferAmount(input.amount);
  if (Number.isNaN(entered)) {
    return { valid: false, field: 'amount', message: 'Vui lòng nhập số tiền đã chuyển khoản.' };
  }
  if (entered !== expected.amount) {
    return {
      valid: false,
      field: 'amount',
      message: `Số tiền không khớp. Vui lòng nhập chính xác: ${expected.amount.toLocaleString('vi-VN')} ₫`,
    };
  }

  return { valid: true };
}
