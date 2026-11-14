import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quan-tri/dashboard/summary/route';
import { signAccessToken } from '@/lib/auth';
import type { DashboardSummary } from '@/features/admin/types/dashboard';

describe('GET /api/quan-tri/dashboard/summary', () => {
  it('returns 401 Unauthorized when request carries no token', async () => {
    const req = new NextRequest('http://localhost:4028/api/quan-tri/dashboard/summary');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 Forbidden when user is not an admin', async () => {
    const token = signAccessToken({
      userId: 'user-regular',
      email: 'user@example.com',
      role: 'user',
      fullName: 'Regular User',
    });
    const req = new NextRequest('http://localhost:4028/api/quan-tri/dashboard/summary', {
      headers: {
        cookie: `access_token=${token}`,
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 200 with valid DashboardSummary structure for super_admin', async () => {
    const token = signAccessToken({
      userId: 'admin-super',
      email: 'admin@vietjetsim.vn',
      role: 'admin',
      fullName: 'Super Admin',
    });
    const req = new NextRequest('http://localhost:4028/api/quan-tri/dashboard/summary', {
      headers: {
        cookie: `access_token=${token}`,
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data: DashboardSummary = await res.json();

    // Verify KPI structure
    expect(data).toHaveProperty('kpi');
    expect(typeof data.kpi.bookingsToday).toBe('number');
    expect(typeof data.kpi.revenueToday).toBe('number');
    expect(typeof data.kpi.activeUsers).toBe('number');
    expect(typeof data.kpi.loadFactor).toBe('number');
    expect(data.kpi.loadFactor).toBeGreaterThanOrEqual(0);
    expect(data.kpi.loadFactor).toBeLessThanOrEqual(100);

    // Verify Revenue array (last 30 days)
    expect(data).toHaveProperty('revenue');
    expect(Array.isArray(data.revenue)).toBe(true);
    expect(data.revenue.length).toBe(30);
    for (const point of data.revenue) {
      expect(point).toHaveProperty('date');
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof point.revenue).toBe('number');
      expect(typeof point.bookings).toBe('number');
    }

    // Verify Seat Distribution
    expect(data).toHaveProperty('seatDistribution');
    expect(Array.isArray(data.seatDistribution)).toBe(true);
    expect(data.seatDistribution.length).toBe(4);
    const classNames = data.seatDistribution.map((s) => s.name);
    expect(classNames).toEqual(['Eco', 'Deluxe', 'SkyBoss', 'Business']);
    for (const seat of data.seatDistribution) {
      expect(typeof seat.count).toBe('number');
      expect(typeof seat.percent).toBe('number');
      expect(seat).toHaveProperty('color');
    }

    // Verify Top Routes (up to 5)
    expect(data).toHaveProperty('topRoutes');
    expect(Array.isArray(data.topRoutes)).toBe(true);
    expect(data.topRoutes.length).toBeLessThanOrEqual(5);
    for (const route of data.topRoutes) {
      expect(route).toHaveProperty('route');
      expect(typeof route.bookings).toBe('number');
      expect(typeof route.revenue).toBe('number');
    }

    // Verify Cancellation Rate
    expect(data).toHaveProperty('cancellationRate');
    expect(typeof data.cancellationRate.total).toBe('number');
    expect(typeof data.cancellationRate.cancelled).toBe('number');
    expect(typeof data.cancellationRate.rate).toBe('number');
    expect(data.cancellationRate.rate).toBeGreaterThanOrEqual(0);
    expect(data.cancellationRate.rate).toBeLessThanOrEqual(100);

    // Verify Recent Bookings (up to 10)
    expect(data).toHaveProperty('recentBookings');
    expect(Array.isArray(data.recentBookings)).toBe(true);
    expect(data.recentBookings.length).toBeLessThanOrEqual(10);
    for (const booking of data.recentBookings) {
      expect(booking).toHaveProperty('id');
      expect(booking).toHaveProperty('bookingCode');
      expect(booking).toHaveProperty('customerName');
      expect(booking).toHaveProperty('route');
      expect(typeof booking.totalPrice).toBe('number');
      expect(booking).toHaveProperty('status');
      expect(booking).toHaveProperty('createdAt');
    }

    // Verify Upcoming Flights (up to 5)
    expect(data).toHaveProperty('upcomingFlights');
    expect(Array.isArray(data.upcomingFlights)).toBe(true);
    expect(data.upcomingFlights.length).toBeLessThanOrEqual(5);
    for (const flight of data.upcomingFlights) {
      expect(flight).toHaveProperty('id');
      expect(flight).toHaveProperty('flightNo');
      expect(flight).toHaveProperty('route');
      expect(flight).toHaveProperty('departTime');
      expect(typeof flight.availableSeats).toBe('number');
      expect(flight).toHaveProperty('status');
    }
  });

  it('returns 200 with valid DashboardSummary structure for admin with analytics:view', async () => {
    const token = signAccessToken({
      userId: 'admin-1',
      email: 'admin-analytics@vietjetsim.vn',
      role: 'admin',
      fullName: 'Admin User',
    });
    const req = new NextRequest('http://localhost:4028/api/quan-tri/dashboard/summary', {
      headers: {
        cookie: `access_token=${token}`,
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data: DashboardSummary = await res.json();
    expect(data.kpi).toBeDefined();
    expect(data.revenue.length).toBe(30);
    expect(data.seatDistribution.length).toBe(4);
  });
});
