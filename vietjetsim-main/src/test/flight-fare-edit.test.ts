import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { PATCH as patchFlight } from '@/app/api/quan-tri/chuyen-bay/[id]/route';
import * as db from '@/lib/db';

vi.mock('@/lib/role-permissions', () => ({
  getRolePermissionsFromDb: vi.fn(async () => new Set<never>([])),
  bypassesPermissionTable: () => true,
}));

// The CSRF double-submit reads the cookie through `next/headers`, whose global
// mock (setup.ts) always answers `undefined` — so it 403s even when both halves
// match. Forcing the check here keeps the test about the fare ladder, not the
// harness; CSRF itself stays covered by api-security.test.ts.
vi.mock('@/lib/csrf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/csrf')>();
  return { ...actual, validateCsrfOrReject: vi.fn(async () => null) };
});
vi.mock('@/lib/neon', async () => {
  const { SYSTEM_ROLES } = await import('@/lib/rbac');
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
    query: vi.fn(),
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  });
  return { sql: sqlMock };
});

const makeAdminToken = () =>
  signAccessToken({
    userId: 'test-admin-id',
    email: `admin@vietjetsim.vn`,
    role: 'admin',
    fullName: 'Test Admin',
  });

const CSRF_TOKEN = 'test-csrf-token';
const withCsrf = (accessToken: string) => ({
  cookie: `access_token=${accessToken}; csrf_token=${CSRF_TOKEN}; session_id=test-session`,
  'x-csrf-token': CSRF_TOKEN,
});
const FLIGHT = {
  id: 'flight-1',
  flight_no: 'VJ 101',
  from_code: 'HAN',
  to_code: 'SGN',
  depart_time: '2026-10-05T06:00:00+07:00',
  arrive_time: '2026-10-05T08:10:00+07:00',
  price: '899000.00',
  economy_price: '899000.00',
  business_price: '2490000.00',
  class: 'economy',
  available: 180,
};

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay/flight-1', {
    method: 'PATCH',
    headers: withCsrf(makeAdminToken()),
    body: JSON.stringify(body),
  });
}

// Migration 030 prices every fare card from `economy_price`/`business_price`.
// The route accepted those fields (they sat in ALLOWED_FIELDS from the start)
// but `updateFlight`'s own whitelist dropped them before they reached SQL, so
// an operator editing a fare saw "Cập nhật thành công" while nothing changed —
// and since neither value moved, the ladder could split silently if a later
// edit touched only one side.
describe('PATCH /api/quan-tri/chuyen-bay/[id] fare pair', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // `getFlightById` runs the real SQL unless pinned — the mock below is the
    // ladder fixture every case in this file reads.
    vi.spyOn(db, 'getFlightById').mockResolvedValue(FLIGHT as never);
  });

  it('persists both fare columns when the operator edits a price', async () => {
    const spy = vi.spyOn(db, 'updateFlight').mockResolvedValueOnce(FLIGHT as never);

    const res = await patchFlight(patchRequest({ economy_price: 949000 }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      'flight-1',
      expect.objectContaining({ economy_price: 949000 })
    );
  });
  it('sends business fare edits to the database instead of dropping them', async () => {
    const spy = vi.spyOn(db, 'updateFlight').mockResolvedValueOnce(FLIGHT as never);

    const res = await patchFlight(patchRequest({ business_price: 3597000 }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      'flight-1',
      expect.objectContaining({ business_price: 3597000 })
    );
  });

  it('rejects an inverted ladder before it reaches the CHECK constraint', async () => {
    const res = await patchFlight(patchRequest({ economy_price: 3000000 }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });
    const body = (await res.json()) as { error: string; message: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
    expect(body.message).toMatch(/đảo/i);
  });

  it('rejects a non-positive fare instead of quoting it to customers', async () => {
    const res = await patchFlight(patchRequest({ economy_price: 0 }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });
    const body = (await res.json()) as { error: string; message: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
  });
});
