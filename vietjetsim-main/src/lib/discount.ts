/**
 * Discount amount computation — one implementation, two callers.
 *
 * `POST /api/ma-giam-gia/xac-thuc` (the page asks "is this code worth anything?")
 * and `POST /api/thanh-toan` (the server decides what to charge) both size a
 * discount, and they used to size it differently: the first against the fare
 * subtotal the browser sent, the second against the booking total. The page
 * then subtracted its own figure from the total and sent that as the amount,
 * while the server compared it against its own — so the two never met and a
 * percentage code was rejected with "Số tiền phải đúng …".
 *
 * The page's share of the breakdown is fabricated (it splits the booking total
 * into 65% fare / 25% tax / 10% ancillary), so the only base both sides can
 * agree on is the booking total. The page now sends that.
 */

export interface DiscountLike {
  /** `'percentage'` or `'fixed'`. */
  type: string;
  /** The code's value: a percent for `'percentage'`, an amount for `'fixed'`. */
  value: number | string | null;
  /** Cap that applies to a percentage code only. */
  max_discount_amount?: number | string | null;
}

/**
 * How much a discount takes off `bookingAmount`.
 *
 * The result never exceeds the booking amount, and never goes below zero — a
 * discount that leaves the customer owing a negative amount is not a discount.
 */
export function computeDiscountAmount(discount: DiscountLike, bookingAmount: number): number {
  const amount = Number(bookingAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  const value = Number(discount.value);
  if (!Number.isFinite(value) || value <= 0) return 0;

  let computed = discount.type === 'fixed' ? value : (amount * value) / 100;

  if (
    discount.type === 'percentage' &&
    discount.max_discount_amount !== null &&
    discount.max_discount_amount !== undefined
  ) {
    const cap = Number(discount.max_discount_amount);
    if (Number.isFinite(cap)) computed = Math.min(computed, cap);
  }

  return Math.max(0, Math.min(Math.round(computed), Math.round(amount)));
}
