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

/**
 * The defect 036 exists to close.
 *
 * `VJ101-1000` and `VJ789-1043` are live flights carrying a booking each
 * (VJDEMO01 completed, VJ644052 confirmed). Migration 035 deliberately left
 * their numbers alone — `flight_no` is a lookup key, so renaming it would
 * rewrite a customer's booking history — but the PATCH validator ran
 * `/^[A-Z]{2}\s?\d{2,4}$/i`, which has no room for the `-1000` suffix. Those
 * two flights therefore could not be edited, priced or delayed through the
 * admin console at all. 036's CHECK admits the shape; this asserts the handler
 * does too, on both the stored value and a re-save of the same number.
 */
describe('PATCH /api/quan-tri/chuyen-bay/[id] seeded flight-number shape', () => {
  const LEGACY_NUMBERED = { ...FLIGHT, flight_no: 'VJ101-1000' };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, 'getFlightById').mockResolvedValue(LEGACY_NUMBERED as never);
  });

  it('accepts the stored number itself, so the flight becomes editable at all', async () => {
    const spy = vi.spyOn(db, 'updateFlight').mockResolvedValueOnce({
      ...LEGACY_NUMBERED,
      status: 'delayed',
    } as never);

    const res = await patchFlight(patchRequest({ status: 'delayed' }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith('flight-1', expect.objectContaining({ status: 'delayed' }));
  });

  it('accepts an unrelated edit while the row keeps that number', async () => {
    // The failing case in production: the operator opens the flight, changes
    // something else, and the whole save fails on the number they never touched.
    const spy = vi.spyOn(db, 'updateFlight').mockResolvedValueOnce({
      ...LEGACY_NUMBERED,
      economy_price: 949000,
    } as never);

    const res = await patchFlight(patchRequest({ economy_price: 949000 }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      'flight-1',
      expect.objectContaining({ economy_price: 949000 })
    );
  });

  it('accepts the shape as a new value, not only as an existing one', async () => {
    const spy = vi.spyOn(db, 'updateFlight').mockResolvedValueOnce({
      ...LEGACY_NUMBERED,
      flight_no: 'VJ789-1043',
    } as never);

    const res = await patchFlight(patchRequest({ flight_no: 'VJ789-1043' }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      'flight-1',
      expect.objectContaining({ flight_no: 'VJ789-1043' })
    );
  });

  it('still rejects the letter suffix 035 removed from the live data', async () => {
    const res = await patchFlight(patchRequest({ flight_no: 'VJ341B' }), {
      params: Promise.resolve({ id: 'flight-1' }),
    });
    const body = (await res.json()) as { message: string };

    expect(res.status).toBe(400);
    expect(body.message).toMatch(/không hợp lệ/);
  });
});
