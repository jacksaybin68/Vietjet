import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { GET as listAgencies, POST as createAgencyRoute } from '@/app/api/quan-tri/dai-ly/route';
import {
  PATCH as updateAgencyRoute,
  DELETE as deleteAgencyRoute,
} from '@/app/api/quan-tri/dai-ly/[id]/route';
import { POST as createDiscountRoute } from '@/app/api/quan-tri/ma-giam-gia/route';
import { POST as validateDiscount } from '@/app/api/ma-giam-gia/xac-thuc/route';
import * as db from '@/lib/db';

vi.mock('@/lib/neon', async () => {
  const { SYSTEM_ROLES } = await import('@/lib/rbac');
  const queryMock = vi.fn().mockResolvedValue([{ total: '0' }]);
  // `verifyAdminRequest` is fail-closed, so the permission lookup has to answer
  // with real grants. Without this branch every admin route 403s and the test
  // would be asserting against a database no deployment has.
  const tagged = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (/from\s+role_permissions/i.test(text)) {
      const role = String(values[0]);
      return Promise.resolve(
        Array.from(SYSTEM_ROLES[role]?.permissions ?? []).map((permission) => ({ permission }))
      );
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

const CSRF_TOKEN = 'test-csrf-token';

const adminToken = () =>
  signAccessToken({
    userId: 'test-admin-id',
    email: 'admin@vietjetsim.vn',
    role: 'admin',
    fullName: 'Test Admin',
  });

const userToken = () =>
  signAccessToken({
    userId: 'test-user-id',
    email: 'user@vietjetsim.vn',
    role: 'user',
    fullName: 'Test User',
  });

const withCsrf = (accessToken: string) => ({
  cookie: `access_token=${accessToken}; csrf_token=${CSRF_TOKEN}`,
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

describe('Agency discount issuance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/quan-tri/dai-ly', () => {
    it('rejects a non-admin session with 403', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly',
        { code: 'DL-01', name: 'Đại lý 01' },
        withCsrf(userToken())
      );
      const res = await createAgencyRoute(req);
      expect(res.status).toBe(403);
    });

    it('rejects an admin request without the CSRF pair', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly',
        { code: 'DL-01', name: 'Đại lý 01' },
        { cookie: `access_token=${adminToken()}` }
      );
      const res = await createAgencyRoute(req);
      expect(res.status).toBe(403);
    });

    it('requires a code and a name', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly',
        { code: '', name: '' },
        withCsrf(adminToken())
      );
      const res = await createAgencyRoute(req);
      expect(res.status).toBe(400);
    });

    it('rejects a commission rate outside 0-100', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly',
        { code: 'DL-01', name: 'Đại lý 01', commission_rate: 150 },
        withCsrf(adminToken())
      );
      const res = await createAgencyRoute(req);
      expect(res.status).toBe(400);
    });

    it('creates an agency for an admin and normalises the code to upper case', async () => {
      const spy = vi.spyOn(db, 'createAgency').mockResolvedValue({
        id: 'agency-1',
        code: 'DL-SG-01',
        name: 'Đại lý Sài Gòn',
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        address: null,
        commission_rate: 5,
        notes: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly',
        { code: 'dl-sg-01', name: 'Đại lý Sài Gòn', commission_rate: 5 },
        withCsrf(adminToken())
      );
      const res = await createAgencyRoute(req);
      expect(res.status).toBe(201);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'dl-sg-01', commission_rate: 5 })
      );
    });
  });

  describe('GET /api/quan-tri/dai-ly', () => {
    it('rejects an unauthenticated request with 401', async () => {
      const req = new NextRequest('http://localhost:4028/api/quan-tri/dai-ly');
      const res = await listAgencies(req);
      expect(res.status).toBe(401);
    });

    it('lists agencies for an admin', async () => {
      vi.spyOn(db, 'getAllAgencies').mockResolvedValue({
        agencies: [
          {
            id: 'agency-1',
            code: 'DL-01',
            name: 'Đại lý 01',
            contact_name: null,
            contact_email: null,
            contact_phone: null,
            address: null,
            commission_rate: 0,
            notes: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
      });

      const req = new NextRequest('http://localhost:4028/api/quan-tri/dai-ly', {
        headers: { cookie: `access_token=${adminToken()}` },
      });
      const res = await listAgencies(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agencies).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });
  });

  describe('PATCH /api/quan-tri/dai-ly/[id]', () => {
    it('rejects a non-admin with 403', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly/agency-1',
        { is_active: false },
        withCsrf(userToken()),
        'PATCH'
      );
      const res = await updateAgencyRoute(req, { params: Promise.resolve({ id: 'agency-1' }) });
      expect(res.status).toBe(403);
    });

    it('rejects an out-of-range commission rate', async () => {
      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly/agency-1',
        { commission_rate: -1 },
        withCsrf(adminToken()),
        'PATCH'
      );
      const res = await updateAgencyRoute(req, { params: Promise.resolve({ id: 'agency-1' }) });
      expect(res.status).toBe(400);
    });

    it('does not let a client rewrite immutable fields', async () => {
      const spy = vi.spyOn(db, 'updateAgency').mockResolvedValue({
        id: 'agency-1',
        code: 'DL-01',
        name: 'Đại lý 01',
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        address: null,
        commission_rate: 0,
        notes: null,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/dai-ly/agency-1',
        {
          is_active: false,
          id: 'attacker-id',
          created_at: '1970-01-01',
          updated_at: '1970-01-01',
          discount_count: 999,
        },
        withCsrf(adminToken()),
        'PATCH'
      );
      const res = await updateAgencyRoute(req, { params: Promise.resolve({ id: 'agency-1' }) });
      expect(res.status).toBe(200);
      const [, updates] = spy.mock.calls[0];
      expect(updates).not.toHaveProperty('id');
      expect(updates).not.toHaveProperty('created_at');
      expect(updates).not.toHaveProperty('updated_at');
      expect(updates).not.toHaveProperty('discount_count');
      expect(updates).toEqual({ is_active: false });
    });
  });

  describe('DELETE /api/quan-tri/dai-ly/[id]', () => {
    it('rejects a non-admin with 403 before touching the row', async () => {
      const spy = vi.spyOn(db, 'deleteAgency').mockResolvedValue(undefined);
      const req = new NextRequest('http://localhost:4028/api/quan-tri/dai-ly/agency-1', {
        method: 'DELETE',
        headers: {
          cookie: `access_token=${userToken()}; csrf_token=${CSRF_TOKEN}`,
          'x-csrf-token': CSRF_TOKEN,
        },
      });
      const res = await deleteAgencyRoute(req, { params: Promise.resolve({ id: 'agency-1' }) });
      expect(res.status).toBe(403);
      expect(spy).not.toHaveBeenCalled();
    });

    it('deletes for an admin', async () => {
      const spy = vi.spyOn(db, 'deleteAgency').mockResolvedValue(undefined);
      const req = new NextRequest('http://localhost:4028/api/quan-tri/dai-ly/agency-1', {
        method: 'DELETE',
        headers: withCsrf(adminToken()),
      });
      const res = await deleteAgencyRoute(req, { params: Promise.resolve({ id: 'agency-1' }) });
      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledWith('agency-1');
    });
  });

  describe('Discount issued to an agency', () => {
    it('persists agency_id and records the issuing admin', async () => {
      const spy = vi.spyOn(db, 'createDiscountCode').mockResolvedValue({} as never);

      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/ma-giam-gia',
        {
          code: 'dl10',
          type: 'percentage',
          value: 10,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          agency_id: 'agency-1',
        },
        withCsrf(adminToken())
      );
      const res = await createDiscountRoute(req);
      expect(res.status).toBe(201);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ agency_id: 'agency-1', issued_by: 'test-admin-id' })
      );
    });

    it('leaves agency_id null for a platform-wide code', async () => {
      const spy = vi.spyOn(db, 'createDiscountCode').mockResolvedValue({} as never);

      const req = jsonRequest(
        'http://localhost:4028/api/quan-tri/ma-giam-gia',
        {
          code: 'ALL20',
          type: 'percentage',
          value: 20,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
        },
        withCsrf(adminToken())
      );
      await createDiscountRoute(req);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ agency_id: null }));
    });
  });

  describe('Customer redemption of an agency code', () => {
    const activeDiscount = (value: number) => ({
      id: 'disc-1',
      code: 'DL10',
      type: 'percentage' as const,
      value,
      min_booking_amount: 0,
      max_discount_amount: null,
      start_date: new Date(Date.now() - 86_400_000).toISOString(),
      end_date: new Date(Date.now() + 86_400_000).toISOString(),
      usage_limit: null,
      usage_per_user_limit: null,
      used_count: 0,
      is_active: true,
      agency_id: 'agency-1',
      issued_by: 'test-admin-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it.each([
      [10, 100000, 10000],
      [20, 100000, 20000],
      [30, 100000, 30000],
    ])('applies a %i%% agency code to a booking', async (pct, amount, expected) => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(activeDiscount(pct));
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'DL10', bookingAmount: amount },
        { cookie: 'csrf_token=abc', 'x-csrf-token': 'abc' }
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.discount.discountAmount).toBe(expected);
    });

    it('rejects a paused agency code', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(10),
        is_active: false,
      });

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'DL10', bookingAmount: 100000 },
        { cookie: 'csrf_token=abc', 'x-csrf-token': 'abc' }
      );
      const res = await validateDiscount(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.valid).toBe(false);
    });

    it('honours max_discount_amount for a percentage code', async () => {
      vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue({
        ...activeDiscount(30),
        max_discount_amount: 20000,
      });
      vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

      const req = jsonRequest(
        'http://localhost:4028/api/ma-giam-gia/xac-thuc',
        { code: 'DL10', bookingAmount: 100000 },
        { cookie: 'csrf_token=abc', 'x-csrf-token': 'abc' }
      );
      const res = await validateDiscount(req);
      const body = await res.json();
      expect(body.discount.discountAmount).toBe(20000);
    });
  });
});
