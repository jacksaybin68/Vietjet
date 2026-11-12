import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/dat-ve/route';
import { NextRequest } from 'next/server';

const createBookingMock = vi.fn();

vi.mock('@/lib/db', () => ({
  getFlightById: vi.fn(async (id: string) => ({
    id,
    flight_no: 'VJ121',
    from_code: 'HAN',
    to_code: 'SGN',
    economy_price: 1090000,
    business_price: 3019300,
    available: 100,
  })),
  createBooking: (...args: any[]) => createBookingMock(...args),
  recordBookingConsents: vi.fn(),
  getUserById: vi.fn(),
  findUserById: vi.fn(),
  findUserByEmail: vi.fn(async () => null),
  createUser: vi.fn(async () => ({ id: 'guest-u1' })),
  getActiveBankAccounts: vi.fn(async () => []),
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    verifyAuthRequest: vi.fn(async () => ({ user: { userId: 'user-auth-1', role: 'customer' } })),
  };
});

vi.mock('@/lib/mail', () => ({
  sendPaymentInstructionEmail: vi.fn(async () => true),
}));

describe('Booking total_price synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createBookingMock.mockResolvedValue({
      id: 'mock-bk-id',
      booking_code: 'VJAUTO99',
      total_price: 3423662,
    });
  });

  it('preserves client total_price when client booked round-trip or additional services > base flight fare', async () => {
    const req = new NextRequest('http://localhost/api/dat-ve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flight_id: 'flight-1',
        total_price: 3423662,
        passengers: [
          {
            name: 'HOANG NGUYEN',
            dob: '1998-10-12',
            idNumber: '012345678901',
            email: 'hoang@example.com',
            phone: '0901234567',
          },
        ],
        seats: ['8C'],
        consents: { policyAccepted: true },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createBookingMock).toHaveBeenCalledTimes(1);
    // Should respect the higher round-trip/services total: 3,423,662
    expect(createBookingMock.mock.calls[0][0].total_price).toBe(3423662);
  });

  it('rejects client total_price if it is maliciously lower than base flight price', async () => {
    const req = new NextRequest('http://localhost/api/dat-ve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flight_id: 'flight-1',
        total_price: 500, // malicious low price
        passengers: [
          {
            name: 'HOANG NGUYEN',
            dob: '1998-10-12',
            idNumber: '012345678901',
            email: 'hoang@example.com',
            phone: '0901234567',
          },
        ],
        seats: ['8C'],
        consents: { policyAccepted: true },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createBookingMock).toHaveBeenCalledTimes(1);
    // Should calculate base price with tax instead of 500
    expect(createBookingMock.mock.calls[0][0].total_price).toBeGreaterThan(1000000);
  });
});
