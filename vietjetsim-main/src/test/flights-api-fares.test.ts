import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/chuyen-bay/route';
import * as db from '@/lib/db';

vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db')>('@/lib/db');
  return {
    ...actual,
    searchFlights: vi.fn(),
    getAvailableDepartDates: vi.fn(),
  };
});

describe('GET /api/chuyen-bay — Enriched 4 fare classes', () => {
  it('returns eco, deluxe, skyboss, and business prices for matching flights', async () => {
    vi.mocked(db.searchFlights).mockResolvedValueOnce([
      {
        id: 'fl-1',
        flight_no: 'VJ101',
        from_code: 'HAN',
        to_code: 'SGN',
        depart_time: '2026-11-20T06:00:00+07:00',
        arrive_time: '2026-11-20T08:10:00+07:00',
        price: 850000,
        economy_price: 900000,
        business_price: 2700000,
        class: 'economy',
        available: 150,
        status: 'active',
        gate: '12',
        terminal: 'T1',
        aircraft: 'Airbus A321',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    const req = new NextRequest(
      'http://localhost:4028/api/chuyen-bay?from=HAN&to=SGN&date=2026-11-20'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.flights).toHaveLength(1);

    const flight = data.flights[0];
    // Check aliases
    expect(flight.flightNo).toBe('VJ101');
    expect(flight.from).toBe('HAN');
    expect(flight.to).toBe('SGN');

    // Step calculation: (2700000 - 900000) / 3 = 600000
    // eco: 900000, deluxe: 1500000, skyboss: 2100000, business: 2700000
    expect(flight.economyPrice).toBe(900000);
    expect(flight.ecoPrice).toBe(900000);
    expect(flight.deluxePrice).toBe(1500000);
    expect(flight.skybossPrice).toBe(2100000);
    expect(flight.businessPrice).toBe(2700000);

    // fares object
    expect(flight.fares).toEqual({
      eco: 900000,
      deluxe: 1500000,
      skyboss: 2100000,
      business: 2700000,
    });
  });
});
