/**
 * The discount amount has to be the same number on both sides of the payment.
 *
 * `POST /api/ma-giam-gia/xac-thuc` sizes the discount the page will subtract,
 * and `POST /api/thanh-toan` sizes the discount it will actually charge. These
 * tests pin the shared computation both now call.
 */

import { describe, it, expect } from 'vitest';
import { computeDiscountAmount } from '@/lib/discount';

describe('computeDiscountAmount', () => {
  it('takes a percentage off the booking amount', () => {
    expect(computeDiscountAmount({ type: 'percentage', value: 10 }, 2_000_000)).toBe(200_000);
    expect(computeDiscountAmount({ type: 'percentage', value: 30 }, 1_000_000)).toBe(300_000);
  });

  it('takes a fixed amount off the booking amount', () => {
    expect(computeDiscountAmount({ type: 'fixed', value: 150_000 }, 2_000_000)).toBe(150_000);
  });

  it('caps a percentage at its maximum', () => {
    expect(
      computeDiscountAmount(
        { type: 'percentage', value: 50, max_discount_amount: 300_000 },
        2_000_000
      )
    ).toBe(300_000);
  });

  it('ignores the cap for a fixed amount — the cap is for percentage codes', () => {
    expect(
      computeDiscountAmount(
        { type: 'fixed', value: 500_000, max_discount_amount: 300_000 },
        2_000_000
      )
    ).toBe(500_000);
  });

  it('never discounts more than the booking is worth', () => {
    expect(computeDiscountAmount({ type: 'fixed', value: 5_000_000 }, 2_000_000)).toBe(2_000_000);
    expect(computeDiscountAmount({ type: 'percentage', value: 150 }, 2_000_000)).toBe(2_000_000);
  });

  it('never returns a negative amount', () => {
    expect(computeDiscountAmount({ type: 'percentage', value: -10 }, 2_000_000)).toBe(0);
    expect(computeDiscountAmount({ type: 'fixed', value: -500 }, 2_000_000)).toBe(0);
  });

  it('treats a missing or nonsensical amount as nothing to discount', () => {
    expect(computeDiscountAmount({ type: 'percentage', value: 10 }, 0)).toBe(0);
    expect(computeDiscountAmount({ type: 'percentage', value: 10 }, -100)).toBe(0);
    expect(computeDiscountAmount({ type: 'percentage', value: 10 }, Number.NaN)).toBe(0);
  });

  it('treats a missing or nonsensical value as no discount', () => {
    expect(computeDiscountAmount({ type: 'percentage', value: null }, 2_000_000)).toBe(0);
    expect(computeDiscountAmount({ type: 'percentage', value: 0 }, 2_000_000)).toBe(0);
  });

  it('reads the value and the cap out of the strings a NUMERIC column returns', () => {
    // `DECIMAL(15, 2)` arrives from the driver as a string, so arithmetic on it
    // concatenates rather than adds — `('2000000.00' * 10)` is fine but
    // `('2000000.00' + 10)` is not, and neither is comparing them as strings.
    expect(computeDiscountAmount({ type: 'percentage', value: '10.00' }, 2_000_000)).toBe(200_000);
    expect(
      computeDiscountAmount(
        { type: 'percentage', value: '50.00', max_discount_amount: '300000.00' },
        2_000_000
      )
    ).toBe(300_000);
  });
});
