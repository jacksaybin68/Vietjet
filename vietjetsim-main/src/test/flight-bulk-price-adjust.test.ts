import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import {
  computeAdjustedPrices,
  POST as bulkAdjustPost,
} from '@/app/api/quan-tri/chuyen-bay/dieu-chinh-gia/route';

vi.mock('@/lib/role-permissions', () => ({
  getRolePermissionsFromDb: vi.fn(async () => new Set<never>([])),
  bypassesPermissionTable: () => true,
}));

vi.mock('@/lib/csrf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/csrf')>();
  return { ...actual, validateCsrfOrReject: vi.fn(async () => null) };
});

const mockSql = vi.fn();
vi.mock('@/lib/neon', () => ({
  sql: (...args: unknown[]) => mockSql(...args),
}));

const makeAdminToken = () =>
  signAccessToken({
    userId: 'test-admin-id',
    email: 'admin@vietjetsim.vn',
    role: 'admin',
    fullName: 'Test Admin',
  });

const CSRF_TOKEN = 'test-csrf-token';
const withCsrf = (accessToken: string) => ({
  cookie: `access_token=${accessToken}; csrf_token=${CSRF_TOKEN}; session_id=test-session`,
  'x-csrf-token': CSRF_TOKEN,
});

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay/dieu-chinh-gia', {
    method: 'POST',
    headers: withCsrf(makeAdminToken()),
    body: JSON.stringify(body),
  });
}

describe('computeAdjustedPrices', () => {
  it('giảm giá cố định (discount_fixed) và giữ thang giá Thương gia chuẩn', () => {
    const res = computeAdjustedPrices(1_000_000, 2_770_000, 'economy', 'discount_fixed', 100_000);
    expect(res.newEco).toBe(900_000);
    expect(res.newBiz).toBe(Math.round(900_000 * 2.77));
    expect(res.newPrice).toBe(900_000);
  });

  it('tăng giá cố định (increase_fixed)', () => {
    const res = computeAdjustedPrices(800_000, 2_216_000, 'economy', 'increase_fixed', 200_000);
    expect(res.newEco).toBe(1_000_000);
    expect(res.newBiz).toBe(Math.round(1_000_000 * 2.77));
    expect(res.newPrice).toBe(1_000_000);
  });

  it('giảm giá theo phần trăm (discount_percent)', () => {
    const res = computeAdjustedPrices(1_000_000, 2_770_000, 'economy', 'discount_percent', 10);
    expect(res.newEco).toBe(900_000);
    expect(res.newBiz).toBe(Math.round(900_000 * 2.77));
  });

  it('tăng giá theo phần trăm (increase_percent)', () => {
    const res = computeAdjustedPrices(1_000_000, 2_770_000, 'economy', 'increase_percent', 15);
    expect(res.newEco).toBe(1_150_000);
    expect(res.newBiz).toBe(Math.round(1_150_000 * 2.77));
  });

  it('thiết lập giá cố định (set_fixed) cho khoang business cập nhật newPrice theo newBiz', () => {
    const res = computeAdjustedPrices(1_000_000, 2_770_000, 'business', 'set_fixed', 500_000);
    expect(res.newEco).toBe(500_000);
    expect(res.newBiz).toBe(Math.round(500_000 * 2.77));
    expect(res.newPrice).toBe(res.newBiz);
  });

  it('không bao giờ giảm xuống dưới sàn giá MIN_TICKET_PRICE_FLOOR (99.000₫)', () => {
    const res = computeAdjustedPrices(150_000, 415_500, 'economy', 'discount_fixed', 200_000);
    expect(res.newEco).toBe(99_000);
    expect(res.newBiz).toBeGreaterThanOrEqual(99_000);
  });
});

describe('POST /api/quan-tri/chuyen-bay/dieu-chinh-gia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối khi amount không hợp lệ (<= 0)', async () => {
    const res = await bulkAdjustPost(
      postRequest({
        action: 'discount_fixed',
        amount: 0,
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Bad Request');
  });

  it('hỗ trợ dryRun xem trước các chuyến bay sẽ thay đổi mà không ghi DB', async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 'fl-1',
        flight_no: 'VJ 101',
        from_code: 'HAN',
        to_code: 'SGN',
        depart_vn: '2026-10-25 06:00',
        price: '1000000',
        economy_price: '1000000',
        business_price: '2770000',
        class: 'economy',
      },
    ]);

    const res = await bulkAdjustPost(
      postRequest({
        action: 'discount_fixed',
        amount: 50_000,
        dryRun: true,
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      dryRun: boolean;
      matchedCount: number;
      samples: Array<{ new_economy_price: number; diff: number }>;
    };
    expect(body.dryRun).toBe(true);
    expect(body.matchedCount).toBe(1);
    expect(body.samples[0].new_economy_price).toBe(950_000);
    expect(body.samples[0].diff).toBe(-50_000);
  });
});
