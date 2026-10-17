import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/quan-tri/thu-thap-hang-loat/route';

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminRequest: vi.fn().mockResolvedValue({ error: false, payload: { userId: 'admin' } }),
}));

vi.mock('@/lib/openclaw/waf-solver', () => ({
  getCachedWafToken: vi.fn().mockResolvedValue(null),
  getOrRefreshWafToken: vi.fn().mockResolvedValue(null),
  fetchFreshWafToken: vi.fn().mockResolvedValue({ success: false, error: 'Mocked in test' }),
}));

vi.mock('@/lib/openclaw/web-collection', () => ({
  collectVietjetSchedule: vi.fn().mockImplementation((from: string, to: string, date: string) => {
    if (from === 'BLK') {
      return Promise.resolve({
        reachable: false,
        reason: 'CloudFront/WAF chặn HTTP 403',
      });
    }
    return Promise.resolve({
      reachable: true,
      route: `${from}-${to}`,
      date,
      flights: [
        {
          flightNo: 'VJ 123',
          from,
          to,
          departTime: '08:00',
          arriveTime: '10:00',
          price: 1200000,
          fares: [{ cabin: 'Economy', amount: 1200000 }],
        },
      ],
    });
  }),
  importWebFlights: vi.fn().mockResolvedValue({
    imported: ['VJ 123 08:00'],
    skipped: [],
  }),
}));

describe('POST /api/quan-tri/thu-thap-hang-loat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('báo lỗi khi thiếu danh sách chặng hoặc ngày', async () => {
    const req = new NextRequest('http://localhost:4028/api/quan-tri/thu-thap-hang-loat', {
      method: 'POST',
      body: JSON.stringify({ routes: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('chạy thu thập song song thành công cho nhiều chặng và ngày', async () => {
    const req = new NextRequest('http://localhost:4028/api/quan-tri/thu-thap-hang-loat', {
      method: 'POST',
      body: JSON.stringify({
        routes: [
          { from: 'HAN', to: 'SGN' },
          { from: 'BLK', to: 'SGN' },
        ],
        dates: ['2026-10-19', '2026-10-20'],
        importOnSuccess: true,
        concurrency: 2,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(4);
    expect(data.succeeded).toBe(2);
    expect(data.blocked).toBe(2);
    expect(data.imported).toBe(2);
    expect(data.results.length).toBe(4);
  });
});
