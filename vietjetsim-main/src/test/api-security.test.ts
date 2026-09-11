import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  GET as getAdminFlights,
  POST as createAdminFlight,
} from '@/app/api/quan-tri/chuyen-bay/route';
import { GET as getUserBookings } from '@/app/api/dat-ve/route';
import * as db from '@/lib/db';

vi.mock('@/lib/neon', () => {
  const queryMock = vi.fn().mockResolvedValue([{ total: '0' }]);
  const sqlMock = Object.assign(vi.fn().mockResolvedValue([]), {
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

      it('POST - allow admin to create flight', async () => {
        const token = makeAdminToken();
        const req = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay', {
          method: 'POST',
          headers: { cookie: `access_token=${token}` },
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
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        });

        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(200);
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
});
