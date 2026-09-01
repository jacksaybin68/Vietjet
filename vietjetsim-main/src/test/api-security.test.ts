import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { GET as getAdminFlights, POST as createAdminFlight } from '@/app/api/quan-tri/chuyen-bay/route';
import { GET as getUserBookings, POST as createUserBooking } from '@/app/api/dat-ve/route';
import * as db from '@/lib/db';

// Mock DB queries so route handlers don't fail on actual DB calls
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

  // Generates valid test JWTs with different roles
  const makeToken = (role: 'user' | 'admin_ops' | 'admin_finance' | 'super_admin' | 'admin_support') => {
    return signAccessToken({
      userId: `test-${role}-id`,
      email: `${role}@test.com`,
      role,
      fullName: `Test ${role}`,
    });
  };

  describe('verifyAdminRequest Authentication & Authorization Helper', () => {
    it('should reject unauthenticated requests (no token) with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay');
      const result = await verifyAdminRequest(req);
      
      expect(result.error).toBe('Unauthorized');
      expect(result.response?.status).toBe(401);
    });

    it('should reject invalid or expired tokens with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
        headers: { cookie: 'access_token=invalid-jwt-signature' },
      });
      const result = await verifyAdminRequest(req);
      
      expect(result.error).toBe('Invalid token');
      expect(result.response?.status).toBe(401);
    });

    it('should reject regular users (role: user) attempting to access admin functions with 403', async () => {
      const token = makeToken('user');
      const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
        headers: { cookie: `access_token=${token}` },
      });
      const result = await verifyAdminRequest(req);
      
      expect(result.error).toBe('Forbidden');
      expect(result.response?.status).toBe(403);
    });

    it('should allow admin with ops role to access flight-list permission', async () => {
      const token = makeToken('admin_ops');
      const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
        headers: { cookie: `access_token=${token}` },
      });
      const result = await verifyAdminRequest(req, 'flight:list');
      
      expect(result.error).toBeUndefined();
      expect(result.payload.role).toBe('admin_ops');
    });

    it('should block finance admin from flight:create permission with 403', async () => {
      const token = makeToken('admin_finance');
      const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
        headers: { cookie: `access_token=${token}` },
      });
      const result = await verifyAdminRequest(req, 'flight:create');
      
      expect(result.error).toBe('Insufficient permissions');
      expect(result.response?.status).toBe(403);
    });

    it('should allow super_admin to perform any action regardless of designated permission', async () => {
      const token = makeToken('super_admin');
      const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
        headers: { cookie: `access_token=${token}` },
      });
      
      // super_admin accessing sensitive security administration
      const result = await verifyAdminRequest(req, 'rbac:manage');
      
      expect(result.error).toBeUndefined();
      expect(result.payload.role).toBe('super_admin');
    });
  });

  describe('Route Handlers Access Control', () => {
    describe('Admin Flights Route (/api/quan-tri/chuyen-bay)', () => {
      it('GET - block unauthenticated guest', async () => {
        const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay');
        const res = (await getAdminFlights(req))!;
        
        expect(res.status).toBe(401);
      });

      it('GET - block regular user', async () => {
        const token = makeToken('user');
        const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
          headers: { cookie: `access_token=${token}` },
        });
        const res = (await getAdminFlights(req))!;
        
        expect(res.status).toBe(403);
      });

      it('GET - allow ops admin', async () => {
        const token = makeToken('admin_ops');
        const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
          headers: { cookie: `access_token=${token}` },
        });

        // Mock getAllFlights to return successfully
        vi.spyOn(db, 'getAllFlights').mockResolvedValueOnce({
          flights: [],
          total: 0,
        });

        const res = (await getAdminFlights(req))!;
        expect(res.status).toBe(200);
      });

      it('POST - block finance admin (insufficient permission)', async () => {
        const token = makeToken('admin_finance');
        const req = new NextRequest('http://localhost:3000/api/quan-tri/chuyen-bay', {
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
        
        const res = (await createAdminFlight(req))!;
        expect(res.status).toBe(403);
      });
    });

    describe('User Bookings Route (/api/dat-ve)', () => {
      it('GET - block unauthenticated guest with 401', async () => {
        const req = new NextRequest('http://localhost:3000/api/dat-ve');
        const res = await getUserBookings(req);
        
        expect(res.status).toBe(401);
      });

      it('GET - allow regular user to view their own bookings', async () => {
        const token = makeToken('user');
        const req = new NextRequest('http://localhost:3000/api/dat-ve', {
          headers: { cookie: `access_token=${token}` },
        });
        
        // Mock getBookingsByUserId db return values
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
