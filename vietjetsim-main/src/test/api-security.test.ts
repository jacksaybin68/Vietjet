import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  GET as getAdminFlights,
  POST as createAdminFlight,
} from '@/app/api/quan-tri/chuyen-bay/route';
import { PATCH as updateAdminRefund } from '@/app/api/quan-tri/hoan-tien/route';
import { GET as getUserBookings } from '@/app/api/dat-ve/route';
import { POST as sendChatMessage } from '@/app/api/tro-chuyen/route';
import { POST as postCheckIn } from '@/app/api/checkin/route';
import { POST as postWallet } from '@/app/api/vi/route';
import {
  PATCH as patchNotification,
  DELETE as deleteNotification,
} from '@/app/api/thong-bao/[id]/route';
import { POST as createBooking } from '@/app/api/dat-ve/route';
import { POST as createRefund } from '@/app/api/hoan-tien/route';
import { PUT as updateProfile } from '@/app/api/nguoi-dung/profile/route';
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

describe('API & RBAC Security Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeAdminToken = () =>
    signAccessToken({
      userId: 'test-admin-id',
      email: `admin@vietjetsim.vn`,
      role: 'admin',
      fullName: 'Test Admin',
    });

  const makeUserToken = () =>
    signAccessToken({
      userId: 'test-user-id',
      email: `user@vietjetsim.vn`,
      role: 'user',
      fullName: 'Test User',
    });

  const CSRF_TOKEN = 'test-csrf-token';

  /**
   * Cookie + header pair required by the double-submit CSRF check on every
   * mutating admin request.
   */
  const withCsrf = (accessToken: string) => ({
    cookie: `access_token=${accessToken}; csrf_token=${CSRF_TOKEN}`,
    'x-csrf-token': CSRF_TOKEN,
  });

  describe('verifyAdminRequest Authentication & Authorization Helper', () => {
    it('should reject unauthenticated requests (no token) with 401', async () => {
      const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay');
      const result = await verifyAdminRequest(req);

      expect(result.error).toBe('Unauthorized');
      expect(result.response?.status).toBe(401);
    });

    it('should reject invalid or expired tokens with 401', async () => {
      const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
        headers: { cookie: 'access_token=invalid-jwt-signature' },
      });
      const result = await verifyAdminRequest(req);

      expect(result.error).toBe('Invalid token');
      expect(result.response?.status).toBe(401);
    });

    it('should reject regular users attempting to access admin functions with 403', async () => {
      const token = makeUserToken();
      const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
        headers: { cookie: `access_token=${token}` },
      });
      const result = await verifyAdminRequest(req);

      expect(result.error).toBe('Forbidden');
      expect(result.response?.status).toBe(403);
    });

    it('should allow admin to access admin APIs', async () => {
      const token = makeAdminToken();
      const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
        headers: { cookie: `access_token=${token}` },
      });
      const result = await verifyAdminRequest(req, 'flight:list');

      expect(result.error).toBeUndefined();
      expect(result.payload.role).toBe('admin');
    });

    it('should admit legacy admin-family roles that middleware also admits', async () => {
      // Both checks must agree, otherwise these accounts can open /quan-tri and
      // then 403 on every API call behind it.
      for (const role of ['super_admin', 'admin_ops', 'admin_finance']) {
        const token = signAccessToken({
          userId: 'legacy-admin',
          email: 'legacy@vietjetsim.vn',
          role: role as 'admin',
          fullName: 'Legacy Admin',
        });
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          headers: { cookie: `access_token=${token}` },
        });

        const result = await verifyAdminRequest(req);

        expect(result.error).toBeUndefined();
      }
    });

    it('should allow admin to access sensitive security administration', async () => {
      const token = makeAdminToken();
      const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
        headers: { cookie: `access_token=${token}` },
      });

      const result = await verifyAdminRequest(req, 'rbac:manage');

      expect(result.error).toBeUndefined();
      expect(result.payload.role).toBe('admin');
    });
  });

  describe('Route Handlers Access Control', () => {
    describe('Admin Flights Route (/api/quan-tri/chuyen-bay)', () => {
      it('GET - block unauthenticated guest', async () => {
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay');
        const res = (await getAdminFlights(req))!;

        expect(res.status).toBe(401);
      });

      it('GET - block regular user', async () => {
        const token = makeUserToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          headers: { cookie: `access_token=${token}` },
        });
        const res = (await getAdminFlights(req))!;

        expect(res.status).toBe(403);
      });

      it('GET - allow admin', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          headers: { cookie: `access_token=${token}` },
        });

        vi.spyOn(db, 'getAllFlights').mockResolvedValueOnce({
          flights: [],
          total: 0,
        });

        const res = (await getAdminFlights(req))!;
        expect(res.status).toBe(200);
      });

      it('POST - rejects a missing CSRF token with 403', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: { cookie: `access_token=${token}` },
          body: JSON.stringify({ flight_no: 'VJ101' }),
        });

        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(403);
      });

      it('POST - rejects a CSRF header that does not match the cookie', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: {
            cookie: `access_token=${token}; csrf_token=${CSRF_TOKEN}`,
            'x-csrf-token': 'forged-token',
          },
          body: JSON.stringify({ flight_no: 'VJ101' }),
        });

        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(403);
      });

      it('POST - allow admin to create flight', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: withCsrf(token),
          body: JSON.stringify({
            flight_no: 'VJ101',
            from_code: 'HAN',
            to_code: 'SGN',
            depart_time: '2026-10-10T10:00:00Z',
            arrive_time: '2026-10-10T12:00:00Z',
            price: 1500000,
            class: 'economy',
            available: 180,
          }),
        });

        vi.spyOn(db, 'createFlight').mockResolvedValueOnce({
          id: 'f1',
          flight_no: 'VJ101',
          from_code: 'HAN',
          to_code: 'SGN',
          depart_time: '2026-10-10T10:00:00Z',
          arrive_time: '2026-10-10T12:00:00Z',
          price: 1500000,
          class: 'economy',
          available: 180,
          status: 'active',
          gate: null,
          terminal: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        });

        const res = (await createAdminFlight(req))!;
        // REST convention: resource creation returns 201 Created
        expect(res.status).toBe(201);
      });

      /**
       * `flights.class` has a CHECK constraint limited to 'economy'/'business'.
       * The admin UI used to send 'Economy', which Postgres rejected with
       * flights_class_check and the handler reported as a bare 500.
       */
      it('POST - normalises class casing instead of letting the DB reject it', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: withCsrf(token),
          body: JSON.stringify({
            flight_no: 'VJ101',
            from_code: 'HAN',
            to_code: 'SGN',
            depart_time: '2026-10-10T10:00:00Z',
            arrive_time: '2026-10-10T12:00:00Z',
            price: 1500000,
            class: 'Economy',
            available: 180,
          }),
        });

        const spy = vi.spyOn(db, 'createFlight').mockResolvedValueOnce({
          id: 'f1',
          flight_no: 'VJ101',
          from_code: 'HAN',
          to_code: 'SGN',
          depart_time: '2026-10-10T10:00:00Z',
          arrive_time: '2026-10-10T12:00:00Z',
          price: 1500000,
          class: 'economy',
          available: 180,
          status: 'active',
          gate: null,
          terminal: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        });

        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(201);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ class: 'economy' }));
      });

      it('POST - rejects an unsupported class with 400 before touching the DB', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: withCsrf(token),
          body: JSON.stringify({
            flight_no: 'VJ101',
            from_code: 'HAN',
            to_code: 'SGN',
            depart_time: '2026-10-10T10:00:00Z',
            arrive_time: '2026-10-10T12:00:00Z',
            price: 1500000,
            class: 'first',
            available: 180,
          }),
        });

        const spy = vi.spyOn(db, 'createFlight');

        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toMatch(/economy, business/);
        expect(spy).not.toHaveBeenCalled();
      });

      /**
       * A unique index on (from_code, to_code, depart_time) means two flights
       * cannot occupy the same departure slot. That is a user mistake, so it
       * must read as 409, not as a server fault.
       */
      it('POST - reports a duplicate departure slot as 409, not 500', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: withCsrf(token),
          body: JSON.stringify({
            flight_no: 'VJ101',
            from_code: 'HAN',
            to_code: 'SGN',
            depart_time: '2026-10-10T10:00:00Z',
            arrive_time: '2026-10-10T12:00:00Z',
            price: 1500000,
            class: 'economy',
            available: 180,
          }),
        });

        // Shape a Neon/Postgres unique-violation carries across the bundler.
        vi.spyOn(db, 'createFlight').mockRejectedValueOnce({
          name: 'NeonDbError',
          code: '23505',
          constraint: 'idx_flights_route_depart_time',
          message: 'duplicate key value violates unique constraint',
        });

        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toBe('Conflict');
        expect(body.message).toMatch(/HAN/);
        expect(body.message).toMatch(/already departs/);
      });

      it('POST - still returns 500 for an unrelated database failure', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: withCsrf(token),
          body: JSON.stringify({
            flight_no: 'VJ101',
            from_code: 'HAN',
            to_code: 'SGN',
            depart_time: '2026-10-10T10:00:00Z',
            arrive_time: '2026-10-10T12:00:00Z',
            price: 1500000,
            class: 'economy',
            available: 180,
          }),
        });

        vi.spyOn(db, 'createFlight').mockRejectedValueOnce({
          name: 'NeonDbError',
          code: '23503',
          constraint: 'flights_from_code_fkey',
          message: 'foreign key violation',
        });

        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(500);
      });

      it('GET - forwards the search term to getAllFlights', async () => {
        const token = makeAdminToken();
        const req = new NextRequest(
          'http://localhost:4028/api/quan-tri/chuyen-bay?search=VJ101&limit=5',
          { headers: { cookie: `access_token=${token}` } }
        );

        const spy = vi.spyOn(db, 'getAllFlights').mockResolvedValueOnce({ flights: [], total: 0 });

        const res = (await getAdminFlights(req))!;
        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ search: 'VJ101', limit: 5 }));
      });
    });

    describe('User Bookings Route (/api/dat-ve)', () => {
      it('GET - block unauthenticated guest with 401', async () => {
        const req = new NextRequest('http://localhost:4028/api/dat-ve');
        const res = await getUserBookings(req);

        expect(res.status).toBe(401);
      });

      it('GET - allow regular user to view their own bookings', async () => {
        const token = makeUserToken();
        const req = new NextRequest('http://localhost:4028/api/dat-ve', {
          headers: { cookie: `access_token=${token}` },
        });

        const mockBookings: any = [{ id: 'b1', total_price: 2000000 }];
        vi.spyOn(db, 'getBookingsByUserId').mockResolvedValueOnce({
          bookings: mockBookings,
          total: 1,
        });

        const res = await getUserBookings(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.bookings).toEqual(mockBookings);
      });
    });
  });

  describe('Admin Refund Processing (status → seats + wallet)', () => {
    it('PATCH - requires admin role (403 for regular user)', async () => {
      const req = new NextRequest('http://localhost:4028/api/quan-tri/hoan-tien', {
        method: 'PATCH',
        headers: withCsrf(makeUserToken()),
        body: JSON.stringify({ refundId: 'r1', status: 'approved' }),
      });
      const res = (await updateAdminRefund(req))!;
      expect(res.status).toBe(403);
    });

    it('PATCH - rejects invalid status values', async () => {
      const req = new NextRequest('http://localhost:4028/api/quan-tri/hoan-tien', {
        method: 'PATCH',
        headers: withCsrf(makeAdminToken()),
        body: JSON.stringify({ refundId: 'r2', status: 'hacked' }),
      });
      const res = (await updateAdminRefund(req))!;
      expect(res.status).toBe(400);
    });

    it('PATCH - updates refund status to completed and returns success', async () => {
      vi.spyOn(db, 'updateRefundStatus').mockResolvedValueOnce({
        id: 'r3',
        booking_id: 'b1',
        user_id: 'u1',
        reason: 'test',
        bank_info: {},
        status: 'completed',
        admin_note: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      } as any);

      const req = new NextRequest('http://localhost:4028/api/quan-tri/hoan-tien', {
        method: 'PATCH',
        headers: withCsrf(makeAdminToken()),
        body: JSON.stringify({ refundId: 'r3', status: 'completed' }),
      });
      const res = (await updateAdminRefund(req))!;
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('PATCH - credits wallet when booking was paid via wallet', async () => {
      const refundRow = { booking_id: 'b1', amount: 500000, user_id: 'u1' };
      const paymentRow = { method: 'wallet', amount: 500000 };

      vi.spyOn(db, 'updateRefundStatus').mockResolvedValueOnce({
        id: 'r4',
        booking_id: 'b1',
        user_id: 'u1',
        reason: 'test',
        bank_info: {},
        status: 'approved',
        admin_note: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      } as any);

      const { sql } = await import('@/lib/neon');
      (sql as any).mockImplementation(async (strings: TemplateStringsArray) => {
        const q = strings.join(' ');
        if (q.includes('FROM refund_requests')) return [refundRow];
        if (q.includes('FROM payments')) return [paymentRow];
        return [];
      });

      const refundWalletSpy = vi
        .spyOn(db, 'refundWallet')
        .mockResolvedValueOnce({ id: 'tx-r', type: 'refund', amount: 500000 } as any);

      const req = new NextRequest('http://localhost:4028/api/quan-tri/hoan-tien', {
        method: 'PATCH',
        headers: withCsrf(makeAdminToken()),
        body: JSON.stringify({ refundId: 'r4', status: 'approved' }),
      });
      const res = (await updateAdminRefund(req))!;
      expect(res.status).toBe(200);
      expect(refundWalletSpy).toHaveBeenCalledWith('u1', 500000, 'b1', expect.any(String));
      const data = await res.json();
      expect(data.message).toContain('wallet credited');
    });

    it('PATCH - does NOT credit wallet when booking was paid by card', async () => {
      const refundRow = { booking_id: 'b2', amount: 300000, user_id: 'u2' };
      const paymentRow = { method: 'card', amount: 300000 };

      vi.spyOn(db, 'updateRefundStatus').mockResolvedValueOnce({
        id: 'r5',
        booking_id: 'b2',
        user_id: 'u2',
        reason: 'test',
        bank_info: {},
        status: 'approved',
        admin_note: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      } as any);

      const { sql } = await import('@/lib/neon');
      (sql as any).mockImplementation(async (strings: TemplateStringsArray) => {
        const q = strings.join(' ');
        if (q.includes('FROM refund_requests')) return [refundRow];
        if (q.includes('FROM payments')) return [paymentRow];
        return [];
      });

      const refundWalletSpy = vi.spyOn(db, 'refundWallet');

      const req = new NextRequest('http://localhost:4028/api/quan-tri/hoan-tien', {
        method: 'PATCH',
        headers: withCsrf(makeAdminToken()),
        body: JSON.stringify({ refundId: 'r5', status: 'approved' }),
      });
      const res = (await updateAdminRefund(req))!;
      expect(res.status).toBe(200);
      expect(refundWalletSpy).not.toHaveBeenCalled();
    });
  });

  describe('CSRF protection on user mutation routes', () => {
    it('chat POST - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen', {
        method: 'POST',
        headers: { cookie: `access_token=${makeUserToken()}` },
        body: JSON.stringify({ conversation_id: 'c1', content: 'hi' }),
      });
      const res = (await sendChatMessage(req))!;
      expect(res.status).toBe(403);
    });

    it('chat POST - rejects a forged CSRF header with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen', {
        method: 'POST',
        headers: {
          cookie: `access_token=${makeUserToken()}; csrf_token=${CSRF_TOKEN}`,
          'x-csrf-token': 'forged',
        },
        body: JSON.stringify({ conversation_id: 'c1', content: 'hi' }),
      });
      const res = (await sendChatMessage(req))!;
      expect(res.status).toBe(403);
    });

    it('check-in POST - refuses to check in a booking owned by someone else', async () => {
      const getBookingSpy = vi
        .spyOn(db, 'getBookingById')
        .mockResolvedValue({ id: 'b1', user_id: 'someone-else' } as never);

      const req = new NextRequest('http://localhost:4028/api/checkin', {
        method: 'POST',
        headers: withCsrf(makeUserToken()),
        body: JSON.stringify({
          bookingId: 'b1',
          seatNumber: '1A',
          flightNo: 'VJ100',
          fromCode: 'SGN',
          toCode: 'HAN',
          departTime: '2026-01-01T10:00:00Z',
          passengerName: 'Nguyen Van A',
        }),
      });
      const res = (await postCheckIn(req))!;

      expect(res.status).toBe(403);
      getBookingSpy.mockRestore();
    });

    it('check-in POST - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/checkin', {
        method: 'POST',
        headers: { cookie: `access_token=${makeUserToken()}` },
        body: JSON.stringify({ bookingId: 'b1' }),
      });
      const res = (await postCheckIn(req))!;
      expect(res.status).toBe(403);
    });

    it('wallet POST - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/vi', {
        method: 'POST',
        headers: { cookie: `access_token=${makeUserToken()}` },
        body: JSON.stringify({ action: 'topup', amount: 100000 }),
      });
      const res = (await postWallet(req))!;
      expect(res.status).toBe(403);
    });

    it('notification PATCH - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/thong-bao/n1', {
        method: 'PATCH',
        headers: { cookie: `access_token=${makeUserToken()}` },
        body: JSON.stringify({ is_read: true }),
      });
      const res = (await patchNotification(req, { params: Promise.resolve({ id: 'n1' }) }))!;
      expect(res.status).toBe(403);
    });

    it('notification DELETE - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/thong-bao/n1', {
        method: 'DELETE',
        headers: { cookie: `access_token=${makeUserToken()}` },
      });
      const res = (await deleteNotification(req, { params: Promise.resolve({ id: 'n1' }) }))!;
      expect(res.status).toBe(403);
    });

    it('booking POST - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/dat-ve', {
        method: 'POST',
        headers: { cookie: `access_token=${makeUserToken()}` },
        body: JSON.stringify({ flight_id: 'f1', total_price: 100, passengers: [{}] }),
      });
      const res = (await createBooking(req))!;
      expect(res.status).toBe(403);
    });

    it('refund POST - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/hoan-tien', {
        method: 'POST',
        headers: { cookie: `access_token=${makeUserToken()}` },
        body: JSON.stringify({ booking_id: 'b1', reason: 'x' }),
      });
      const res = (await createRefund(req))!;
      expect(res.status).toBe(403);
    });

    it('profile PUT - rejects a missing CSRF token with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/nguoi-dung/profile', {
        method: 'PUT',
        headers: { cookie: `access_token=${makeUserToken()}` },
        body: JSON.stringify({ full_name: 'New Name' }),
      });
      const res = (await updateProfile(req))!;
      expect(res.status).toBe(403);
    });
  });
});
