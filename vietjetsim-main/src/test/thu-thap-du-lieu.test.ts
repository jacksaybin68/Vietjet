import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { POST as postNetwork } from '@/app/api/quan-tri/thu-thap-mang-luoi/route';
import { POST as postSchedule } from '@/app/api/quan-tri/thu-thap-lich-bay/route';
import * as webCollection from '@/lib/openclaw/web-collection';

// Mock DB
const mockInsertAirports = vi.fn();
const mockSelectAirports = vi.fn();
const mockInsertFlights = vi.fn();

vi.mock('@/lib/neon', async () => {
  const { SYSTEM_ROLES } = await import('@/lib/rbac');
  const queryMock = vi.fn().mockResolvedValue([{ total: '0' }]);
  const tagged = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (/from\s+role_permissions/i.test(text)) {
      const role = String(values[0]);
      return Promise.resolve(
        Array.from(SYSTEM_ROLES[role]?.permissions ?? []).map((permission) => ({ permission }))
      );
    }
    if (/SELECT UPPER\(code\) as code FROM airports/i.test(text)) {
      return mockSelectAirports();
    }
    if (/INSERT INTO airports/i.test(text)) {
      return mockInsertAirports(values);
    }
    if (/INSERT INTO flights/i.test(text)) {
      return mockInsertFlights(values);
    }
    return Promise.resolve([]);
  });
  const sqlMock = Object.assign(tagged, {
    query: queryMock,
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  });
  return { sql: sqlMock };
});

describe('OpenClaw Web Collection API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeAdminToken = () =>
    signAccessToken({
      userId: 'test-admin-id',
      email: 'admin@vietjetsim.vn',
      role: 'admin',
      fullName: 'Test Admin',
    });

  const makeUserToken = () =>
    signAccessToken({
      userId: 'test-user-id',
      email: 'user@example.com',
      role: 'user',
      fullName: 'Regular User',
    });

  const CSRF_TOKEN = 'test-csrf-token';

  const makeRequest = (
    url: string,
    body?: unknown,
    token?: string,
    headers: Record<string, string> = {}
  ) => {
    const reqHeaders: Record<string, string> = {
      'content-type': 'application/json',
      ...headers,
    };
    if (token) {
      reqHeaders.cookie = `access_token=${token}; csrf_token=${CSRF_TOKEN}`;
      reqHeaders['x-csrf-token'] = CSRF_TOKEN;
    }
    return new NextRequest(url, {
      method: 'POST',
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  describe('POST /api/quan-tri/thu-thap-mang-luoi (CMS Network Sync)', () => {
    it('chặn truy cập nếu không có token hoặc quyền user', async () => {
      const unauthReq = makeRequest('http://localhost:3000/api/quan-tri/thu-thap-mang-luoi', {
        dryRun: true,
      });
      const unauthRes = await postNetwork(unauthReq);
      expect(unauthRes.status).toBe(401);

      const userReq = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-mang-luoi',
        { dryRun: true },
        makeUserToken()
      );
      const userRes = await postNetwork(userReq);
      expect(userRes.status).toBe(403);
    });

    it('dryRun=true: so sánh mạng lưới với DB và trả diff mà không ghi DB', async () => {
      vi.spyOn(webCollection, 'collectVietjetNetwork').mockResolvedValueOnce({
        airports: [
          { code: 'HAN', name: 'Nội Bài', city: 'Hà Nội' },
          { code: 'SGN', name: 'Tân Sơn Nhất', city: 'TP. Hồ Chí Minh' },
          { code: 'ADL', name: 'Sân bay quốc tế Adelaide', city: 'Adelaide' },
        ],
        routes: ['HAN-SGN', 'ADL-SGN'],
        source: 'vietjetair.com CMS /api/v1/citypair',
      });

      // HAN và SGN đã có trong DB
      mockSelectAirports.mockResolvedValueOnce([{ code: 'HAN' }, { code: 'SGN' }]);

      const req = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-mang-luoi',
        { dryRun: true },
        makeAdminToken()
      );

      const res = await postNetwork(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.total).toBe(3);
      expect(json.existing).toEqual(['HAN', 'SGN']);
      expect(json.added).toHaveLength(1);
      expect(json.added[0].code).toBe('ADL');
      expect(json.added[0].country).toBe('Australia');
      expect(json.dryRun).toBe(true);

      // Không gọi INSERT vào airports
      expect(mockInsertAirports).not.toHaveBeenCalled();
    });

    it('dryRun=false: insert các sân bay mới vào bảng airports', async () => {
      vi.spyOn(webCollection, 'collectVietjetNetwork').mockResolvedValueOnce({
        airports: [
          { code: 'HAN', name: 'Nội Bài', city: 'Hà Nội' },
          { code: 'ADL', name: 'Sân bay quốc tế Adelaide', city: 'Adelaide' },
        ],
        routes: ['HAN-ADL'],
        source: 'vietjetair.com CMS /api/v1/citypair',
      });

      mockSelectAirports.mockResolvedValueOnce([{ code: 'HAN' }]);
      mockInsertAirports.mockResolvedValueOnce([
        {
          id: 'ap-1',
          code: 'ADL',
          name: 'Sân bay quốc tế Adelaide',
          city: 'Adelaide',
          country: 'Australia',
        },
      ]);

      const req = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-mang-luoi',
        { dryRun: false },
        makeAdminToken()
      );

      const res = await postNetwork(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.added).toHaveLength(1);
      expect(json.added[0].code).toBe('ADL');
      expect(mockInsertAirports).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/quan-tri/thu-thap-lich-bay (Booking Schedule Collect)', () => {
    it('chặn truy cập trái phép', async () => {
      const req = makeRequest('http://localhost:3000/api/quan-tri/thu-thap-lich-bay', {
        from: 'HAN',
        to: 'SGN',
        date: '2026-10-20',
      });
      const res = await postSchedule(req);
      expect(res.status).toBe(401);
    });

    it('báo lỗi nếu thiếu thông tin hoặc sân bay trùng nhau', async () => {
      const missingReq = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-lich-bay',
        { from: 'HAN' },
        makeAdminToken()
      );
      const missingRes = await postSchedule(missingReq);
      expect(missingRes.status).toBe(400);

      const sameReq = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-lich-bay',
        { from: 'HAN', to: 'HAN', date: '2026-10-20' },
        makeAdminToken()
      );
      const sameRes = await postSchedule(sameReq);
      expect(sameRes.status).toBe(400);
      const json = await sameRes.json();
      expect(json.message).toContain('trùng nhau');
    });

    it('trả về hướng dẫn cookie khi bị AWS WAF 403', async () => {
      vi.spyOn(webCollection, 'collectVietjetSchedule').mockResolvedValueOnce({
        reachable: false,
        reason: 'CloudFront/WAF chặn HTTP 403 với request máy chủ',
      });

      const req = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-lich-bay',
        { from: 'HAN', to: 'SGN', date: '2026-10-20' },
        makeAdminToken()
      );

      const res = await postSchedule(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reachable).toBe(false);
      expect(json.hint).toBeDefined();
      expect(json.hint).toContain('aws-waf-token');
    });

    it('trả về danh sách chuyến bay khi thành công (xem trước)', async () => {
      vi.spyOn(webCollection, 'collectVietjetSchedule').mockResolvedValueOnce({
        reachable: true,
        route: 'HAN-SGN',
        date: '2026-10-20',
        flights: [
          {
            flightNo: 'VJ 123',
            from: 'HAN',
            to: 'SGN',
            departTime: '06:00',
            arriveTime: '08:10',
            price: 790000,
            fares: [{ cabin: 'Eco', amount: 790000 }],
          },
        ],
      });

      const req = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-lich-bay',
        { from: 'HAN', to: 'SGN', date: '2026-10-20', importOnSuccess: false },
        makeAdminToken()
      );

      const res = await postSchedule(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reachable).toBe(true);
      expect(json.flights).toHaveLength(1);
      expect(json.flights[0].flightNo).toBe('VJ 123');
    });

    it('importOnSuccess=true: tự động nhập chuyến bay vào cơ sở dữ liệu', async () => {
      vi.spyOn(webCollection, 'collectVietjetSchedule').mockResolvedValueOnce({
        reachable: true,
        route: 'HAN-SGN',
        date: '2026-10-20',
        flights: [
          {
            flightNo: 'VJ 123',
            from: 'HAN',
            to: 'SGN',
            departTime: '06:00',
            arriveTime: '08:10',
            price: 790000,
            fares: [{ cabin: 'Eco', amount: 790000 }],
          },
        ],
      });

      vi.spyOn(webCollection, 'importWebFlights').mockResolvedValueOnce({
        imported: ['VJ 123 06:00'],
        updated: [],
        skipped: [],
      });

      const req = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-lich-bay',
        { from: 'HAN', to: 'SGN', date: '2026-10-20', importOnSuccess: true },
        makeAdminToken()
      );

      const res = await postSchedule(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reachable).toBe(true);
      expect(json.imported).toEqual(['VJ 123 06:00']);
    });

    it('action=import: nhập trực tiếp danh sách chuyến bay đã xem trước', async () => {
      vi.spyOn(webCollection, 'importWebFlights').mockResolvedValueOnce({
        imported: ['VJ 456 09:30'],
        updated: [],
        skipped: [],
      });

      const req = makeRequest(
        'http://localhost:3000/api/quan-tri/thu-thap-lich-bay',
        {
          from: 'HAN',
          to: 'SGN',
          date: '2026-10-20',
          action: 'import',
          flights: [
            {
              flightNo: 'VJ 456',
              from: 'HAN',
              to: 'SGN',
              departTime: '09:30',
              arriveTime: '11:40',
              price: 890000,
              fares: [],
            },
          ],
        },
        makeAdminToken()
      );

      const res = await postSchedule(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.imported).toEqual(['VJ 456 09:30']);
    });
  });
});
