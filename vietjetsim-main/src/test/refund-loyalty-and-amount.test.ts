/**
 * Refund-side gaps in the payment flow.
 *
 * A refund has to undo *everything* the payment took. Two things were not
 * undone:
 *
 *   1. SkyPoint spent on a booking was never given back. The customer paid
 *      part in points; when the booking was refunded they lost both the cash
 *      and the points.
 *   2. The refund request could be for more than was ever collected. A booking
 *      paid entirely with SkyPoint collects 0đ, yet the customer could ask for
 *      the full fare back in bank transfer money.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const BOOKING = {
  id: 'bk-1',
  user_id: 'user-1',
  booking_code: 'ABC123',
  status: 'confirmed',
  total_price: 2_000_000,
  passengers: [{ name: 'NGUYEN VAN A', email: 'a@example.com' }],
};

const mocks = vi.hoisted(() => ({
  getBookingByCodeOrId: vi.fn(),
  getRefundsByUserId: vi.fn(),
  createRefund: vi.fn(),
  isRefundFeatureEnabled: vi.fn(),
  getBookingCashPaid: vi.fn(),
}));

vi.mock('@/lib/db', () => mocks);

vi.mock('@/lib/auth', () => ({
  verifyAuthRequest: vi.fn().mockResolvedValue({
    user: { userId: 'user-1', email: 'a@example.com', role: 'user' },
    error: null,
    response: null,
  }),
}));

import { POST as createRefund } from '@/app/api/hoan-tien/route';

const req = (body: Record<string, unknown>) =>
  new NextRequest('http://localhost:4028/api/hoan-tien', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      booking_code: 'ABC123',
      reason: 'Hủy chuyến',
      bank_name: 'Vietcombank',
      account_number: '0123456789',
      account_holder: 'NGUYEN VAN A',
      phone: '0901234567',
      ...body,
    }),
  });

describe('POST /api/hoan-tien — refund amount must match what was collected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBookingByCodeOrId.mockResolvedValue(BOOKING);
    mocks.isRefundFeatureEnabled.mockResolvedValue(true);
    mocks.createRefund.mockResolvedValue({ id: 'rf-1' });
    mocks.getBookingCashPaid.mockResolvedValue({ cashPaid: 2_000_000, hasCompletedPayment: true });
  });

  it('accepts a refund for the full amount of a fully cash-paid booking', async () => {
    const res = await createRefund(req({ amount: 2_000_000 }));

    expect(res.status).toBe(201);
    expect(mocks.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2_000_000, booking_id: 'bk-1' })
    );
  });

  it('rejects a refund larger than the cash actually collected', async () => {
    // Cash + Points: 1.500.000 cash + 500.000 worth of points.
    mocks.getBookingCashPaid.mockResolvedValue({
      cashPaid: 1_500_000,
      hasCompletedPayment: true,
    });

    const res = await createRefund(req({ amount: 2_000_000 }));

    expect(res.status).toBe(400);
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it('rejects a cash refund for a booking paid entirely with SkyPoint', async () => {
    mocks.getBookingCashPaid.mockResolvedValue({ cashPaid: 0, hasCompletedPayment: true });

    const res = await createRefund(req({ amount: 2_000_000 }));

    expect(res.status).toBe(400);
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it('still allows a refund request when no payment has completed yet', async () => {
    // A bank transfer is only recorded as completed once an operator confirms
    // it, so the customer must still be able to ask for their money back.
    mocks.getBookingCashPaid.mockResolvedValue({ cashPaid: 0, hasCompletedPayment: false });

    const res = await createRefund(req({ amount: 2_000_000 }));

    expect(res.status).toBe(201);
    expect(mocks.createRefund).toHaveBeenCalled();
  });
});
