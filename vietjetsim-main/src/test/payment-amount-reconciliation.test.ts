/**
 * Reconciliation between the amount the payment page sends and the amount the
 * server is willing to charge.
 *
 * `POST /api/thanh-toan` re-derives the charge from the booking row and
 * refuses any `amount` that differs from it — which is the right rule, but it
 * only holds if both sides derive the *same* number. These tests pin the three
 * places where they did not:
 *
 *   1. Cash + Points — the page sends the total minus the points' cash value,
 *      while the server compared it against the total *before* subtracting
 *      the points. Every mixed payment was rejected with "Số tiền phải đúng".
 *   2. Percentage discounts — the page sized the discount against the fare
 *      subtotal, the server against the booking total, so the two never met.
 *   3. SkyPoint-only — the points covered the fare but the payment row still
 *      recorded the full cash amount.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const BOOKING = {
  id: 'bk-1',
  user_id: 'user-1',
  booking_code: 'ABC123',
  status: 'pending',
  total_price: 2_000_000,
  passengers: [{ name: 'NGUYEN VAN A', email: 'a@example.com' }],
};

const BANK_ACCOUNT = {
  id: 'bank-1',
  bank_name: 'Vietcombank',
  account_number: '123',
  account_holder: 'CONG TY',
  is_active: true,
  transfer_note_template: '{code}I98O',
};

/** Loyalty program: 1 SkyPoint is worth 1.000 VND. */
const LOYALTY = {
  loyalty: { available_points: 5000 },
  program: { points_per_1000_vnd: 1 },
};

const mocks = vi.hoisted(() => ({
  getBookingById: vi.fn(),
  // The payment route resolves the booking by PNR *or* by id (the customer
  // only holds the six-character code), so it calls `getBookingByCodeOrId`.
  getBookingByCodeOrId: vi.fn(),
  getActiveBankAccounts: vi.fn(),
  getUserLoyaltyWithProgram: vi.fn(),
  spendLoyaltyPoints: vi.fn(),
  refundLoyaltyPoints: vi.fn(),
  awardBookingLoyaltyPoints: vi.fn(),
  findUserById: vi.fn(),
  getDiscountCodeById: vi.fn(),
  getDiscountCodeByCode: vi.fn(),
  countUserDiscountUsage: vi.fn(),
  createPaymentAndConfirmBooking: vi.fn(),
}));

vi.mock('@/lib/db', () => mocks);

vi.mock('@/lib/auth', () => ({
  verifyAuthRequest: vi.fn().mockResolvedValue({
    user: { userId: 'user-1', email: 'a@example.com', role: 'user' },
    error: null,
    response: null,
  }),
}));

vi.mock('@/lib/mail', () => ({
  sendPaymentInstructionEmail: vi.fn().mockResolvedValue(true),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(true),
  sendPaymentPendingReviewEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/payment-invoice', () => ({
  sendAutomaticPaymentInvoiceEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue(null),
}));

import { POST as createPayment } from '@/app/api/thanh-toan/route';

const req = (body: unknown) =>
  new NextRequest('http://localhost:4028/api/thanh-toan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/thanh-toan — amount reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBookingById.mockResolvedValue(BOOKING);
    mocks.getBookingByCodeOrId.mockResolvedValue(BOOKING);
    mocks.getActiveBankAccounts.mockResolvedValue([BANK_ACCOUNT]);
    mocks.getUserLoyaltyWithProgram.mockResolvedValue(LOYALTY);
    mocks.spendLoyaltyPoints.mockResolvedValue(undefined);
    mocks.awardBookingLoyaltyPoints.mockResolvedValue({ pointsEarned: 0 });
    mocks.refundLoyaltyPoints.mockResolvedValue(undefined);
    mocks.findUserById.mockResolvedValue(null);
    mocks.countUserDiscountUsage.mockResolvedValue(0);
    mocks.createPaymentAndConfirmBooking.mockImplementation(async (p: { amount: number }) => ({
      payment: {
        id: 'pay-1',
        booking_id: 'bk-1',
        method: 'bank',
        status: 'completed',
        amount: p.amount,
        created_at: new Date().toISOString(),
      },
      booking: { ...BOOKING, status: 'confirmed' },
    }));
  });

  it('charges exactly the booking total when no discount and no points are involved', async () => {
    const res = await createPayment(req({ booking_id: 'bk-1', method: 'card', amount: 2_000_000 }));

    expect(res.status).toBe(201);
    expect(mocks.createPaymentAndConfirmBooking).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2_000_000 })
    );
  });

  it('accepts a Cash + Points payment whose amount is reduced by the points', async () => {
    // 1.000 points at 1 point = 1.000 VND is worth 1.000.000 VND, so the
    // customer pays 1.000.000 VND cash. The page sends that reduced figure.
    const res = await createPayment(
      req({
        booking_id: 'bk-1',
        method: 'card',
        amount: 1_000_000,
        points_to_redeem: 1000,
      })
    );

    expect(res.status).toBe(201);
    expect(mocks.spendLoyaltyPoints).toHaveBeenCalledWith(
      'user-1',
      1000,
      expect.stringContaining('Cash + Points'),
      // The booking is linked to the points transaction so a refund can
      // hand them back.
      'bk-1'
    );
    // The charge is the cash actually owed — the points are not money.
    expect(mocks.createPaymentAndConfirmBooking).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1_000_000 })
    );
  });

  it('rejects a Cash + Points payment whose amount does not match the points', async () => {
    const res = await createPayment(
      req({
        booking_id: 'bk-1',
        method: 'card',
        amount: 1_000_000,
        points_to_redeem: 500, // worth 500.000 VND, so 1.500.000 is owed
      })
    );

    expect(res.status).toBe(400);
    expect(mocks.spendLoyaltyPoints).not.toHaveBeenCalled();
  });

  it('sizes a percentage discount against the booking total, not the fare subtotal', async () => {
    mocks.getDiscountCodeByCode.mockResolvedValue({
      id: 'dc-1',
      code: 'DL10',
      type: 'percentage',
      value: 10,
      min_booking_amount: 0,
      max_discount_amount: null,
      start_date: '2020-01-01',
      end_date: '2030-01-01',
      is_active: true,
      usage_limit: null,
      usage_per_user_limit: null,
      used_count: 0,
    });

    // 10% of the 2.000.000 booking total is 200.000, so 1.800.000 is owed.
    const res = await createPayment(
      req({
        booking_id: 'bk-1',
        method: 'card',
        amount: 1_800_000,
        discount_code: 'DL10',
      })
    );

    expect(res.status).toBe(201);
    expect(mocks.createPaymentAndConfirmBooking).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1_800_000, discount_amount: 200_000 })
    );
  });

  it('records a SkyPoint-only payment as the cash actually charged', async () => {
    // Paying entirely with SkyPoint: the customer hands over no cash, so the
    // amount sent is 0 — the fare was covered by the points.
    const res = await createPayment(req({ booking_id: 'bk-1', method: 'skypoint', amount: 0 }));

    expect(res.status).toBe(201);
    expect(mocks.spendLoyaltyPoints).toHaveBeenCalledWith(
      'user-1',
      2000, // 2.000.000 VND at 1 point = 1.000 VND
      expect.stringContaining('SkyPoint'),
      'bk-1'
    );
    expect(mocks.createPaymentAndConfirmBooking).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0 })
    );
  });

  it('rejects a SkyPoint-only payment that still claims to charge the full fare', async () => {
    const res = await createPayment(
      req({ booking_id: 'bk-1', method: 'skypoint', amount: 2_000_000 })
    );

    expect(res.status).toBe(400);
    expect(mocks.spendLoyaltyPoints).not.toHaveBeenCalled();
  });
});
