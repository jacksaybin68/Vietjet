import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { POST as validateDiscount } from '@/app/api/ma-giam-gia/xac-thuc/route';
import * as db from '@/lib/db';

vi.mock('@/lib/neon', async () => {
  const queryMock = vi.fn().mockResolvedValue([{ total: '0' }]);
  const tagged = vi.fn().mockResolvedValue([]);
  const sqlMock = Object.assign(tagged, {
    query: queryMock,
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  });
  return { sql: sqlMock };
});

const CSRF_TOKEN = 'test-csrf-token';

const userToken = () =>
  signAccessToken({
    userId: 'test-user-id',
    email: 'user@vietjetsim.vn',
    role: 'user',
    fullName: 'Test User',
  });

const withCsrf = (accessToken?: string) => ({
  cookie: `access_token=${accessToken ?? ''}; csrf_token=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
});

const jsonRequest = (
  url: string,
  body: unknown,
  headers: Record<string, string>,
  method = 'POST'
) =>
  new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const activeDiscount = (overrides: Record<string, unknown> = {}) => ({
  id: 'disc-1',
  code: 'SAVE20',
  type: 'percentage' as const,
  value: 20,
  min_booking_amount: 0,
  max_discount_amount: null,
  start_date: new Date(Date.now() - 86_400_000).toISOString(),
  end_date: new Date(Date.now() + 86_400_000).toISOString(),
  usage_limit: null,
  usage_per_user_limit: null,
  used_count: 0,
  is_active: true,
  agency_id: null,
  issued_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('POST /api/ma-giam-gia/xac-thuc (áp mã giảm giá)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input validation', () => {
    it('rejects a request with an empty code', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: '', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Vui lòng nhập mã giảm giá');
    });

    it('rejects a request with a whitespace-only code', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: '   ', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
    });

    it('rejects a missing booking amount', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(activeDiscount());

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20' },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Giá trị đơn hàng không hợp lệ');
    });

    it('rejects CSRF-less requests with 403', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        { cookie: `access_token=${userToken()}` }
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(403);
    });
  });

  describe('Code lookup', () => {
    it('returns 404 for a non-existent code', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(null);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'NOTFOUND', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Mã giảm giá không tồn tại');
    });

    it('matches codes case-insensitively', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(activeDiscount());
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'save20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(200);
      // The route passes the trimmed input; upper-casing happens inside the SQL query.
      expect(db.getDiscountCodeByCode).toHaveBeenCalledWith('save20');
    });
  });

  describe('Status and date checks', () => {
    it('rejects an inactive (paused) code', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        is_active: false,
      });

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Mã giảm giá này đã bị tạm dừng');
    });

    it('rejects a code not yet started', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        start_date: new Date(Date.now() + 86_400_000).toISOString(),
      });

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Mã giảm giá chưa được áp dụng');
    });

    it('rejects an expired code', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        end_date: new Date(Date.now() - 86_400_000).toISOString(),
      });

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Mã giảm giá đã hết hạn');
    });
  });

  describe('Usage limits', () => {
    it('rejects when the global usage limit is reached', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        usage_limit: 5,
        used_count: 5,
      });

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Mã giảm giá đã hết lượt sử dụng');
    });

    it('rejects when the per-user limit is reached', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        usage_per_user_limit: 1,
      });
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(1);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Bạn đã sử dụng mã giảm giá này rồi');
    });

    it('allows a code with no per-user limit for an anonymous user', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        usage_per_user_limit: 1,
      });
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        { cookie: `csrf_token=${CSRF_TOKEN}`, 'x-csrf-token': CSRF_TOKEN }
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(200);
    });
  });

  describe('Minimum booking amount', () => {
    it('rejects a booking below the minimum amount', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        min_booking_amount: 200000,
      });
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toContain('200.000');
    });

    it('accepts a booking at exactly the minimum amount', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        min_booking_amount: 100000,
      });
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(200);
    });
  });

  describe('Discount calculation', () => {
    it.each([
      [20, 100000, 20000],
      [10, 250000, 25000],
      [50, 100000, 50000],
    ])('applies %i%% percentage discount on %i₫ → %i₫', async (pct, amount, expected) => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(activeDiscount({ value: pct }));
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: amount },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.discount.discountAmount).toBe(expected);
      expect(body.message).toBe('Áp dụng mã giảm giá thành công');
    });

    it('applies a fixed-amount discount', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        type: 'fixed',
        value: 50000,
      });
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 200000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.discount.discountAmount).toBe(50000);
      expect(body.discount.type).toBe('fixed');
    });

    it('caps a percentage discount at max_discount_amount', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(),
        value: 50,
        max_discount_amount: 30000,
      });
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 200000 }, // 50% of 200k = 100k, capped at 30k
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.discount.discountAmount).toBe(30000);
    });

    it('returns the discount id and code in the response', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(activeDiscount());
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.discount.id).toBe('disc-1');
      expect(body.discount.code).toBe('SAVE20');
    });
  });

  describe('Server error handling', () => {
    it('returns 500 when the database throws', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockRejectedValue(new Error('DB down'));

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'SAVE20', bookingAmount: 100000 },
        withCsrf(userToken())
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Có lỗi xảy ra khi kiểm tra mã giảm giá');
    });
  });
});
