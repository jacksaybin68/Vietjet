/**
 * Approving a refund must give back the SkyPoint the customer spent.
 *
 * The payment route records a `redeem` transaction when points are burned.
 * Nothing read it back, so a refunded booking left the customer short both
 * the cash and the points for the same cancelled trip.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAllRefunds: vi.fn(),
  updateRefundStatus: vi.fn(),
  updateBookingStatus: vi.fn(),
  refundWallet: vi.fn(),
  refundLoyaltyPointsForBooking: vi.fn(),
  setRefundVisibility: vi.fn(),
  updateRefundDetails: vi.fn(),
  isRefundFeatureEnabled: vi.fn(),
  setRefundFeatureEnabled: vi.fn(),
}));

vi.mock('@/lib/db', () => mocks);

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminRequest: vi.fn().mockResolvedValue({
    payload: { userId: 'admin-1', role: 'admin' },
    error: null,
    response: null,
  }),
}));

vi.mock('@/lib/neon', () => {
  const tagged = vi.fn((strings: TemplateStringsArray, ..._values: unknown[]) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (/from\s+refund_requests/i.test(text)) {
      return Promise.resolve([{ booking_id: 'bk-1', amount: 2_000_000, user_id: 'user-1' }]);
    }
    if (/from\s+payments/i.test(text)) {
      return Promise.resolve([{ method: 'bank', amount: 2_000_000 }]);
    }
    return Promise.resolve([]);
  });
  return { sql: Object.assign(tagged, { query: vi.fn(), begin: vi.fn() }) };
});

import { PATCH as updateRefund } from '@/app/api/quan-tri/hoan-tien/route';

const req = (body: Record<string, unknown>) =>
  new NextRequest('http://localhost:4028/api/quan-tri/hoan-tien', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('PATCH /api/quan-tri/hoan-tien — restoring SkyPoint on approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateRefundStatus.mockResolvedValue({ id: 'rf-1', status: 'approved' });
    mocks.updateBookingStatus.mockResolvedValue(undefined);
    mocks.refundLoyaltyPointsForBooking.mockResolvedValue({ pointsRefunded: 500 });
  });

  it('gives the points back when a refund is approved', async () => {
    const res = await updateRefund(req({ refundId: 'rf-1', status: 'approved' }));

    expect(res.status).toBe(200);
    expect(mocks.refundLoyaltyPointsForBooking).toHaveBeenCalledWith('bk-1', 'user-1');
  });

  it('does not touch points when the refund is only marked as pending', async () => {
    const res = await updateRefund(req({ refundId: 'rf-1', status: 'pending' }));

    expect(res.status).toBe(200);
    expect(mocks.refundLoyaltyPointsForBooking).not.toHaveBeenCalled();
  });
});
