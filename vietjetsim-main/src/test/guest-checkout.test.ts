import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing routes
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<any>('@/lib/auth');
  return {
    ...actual,
    verifyAuthRequest: vi.fn().mockResolvedValue({ user: null, error: null, response: null }),
    hashPassword: vi.fn().mockResolvedValue('hashed_guest_password'),
  };
});

vi.mock('@/lib/mail', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/db', async () => {
  const mockBooking = {
    id: 'guest-bk-123',
    user_id: 'guest-user-456',
    flight_id: 'flight-1',
    booking_code: 'VJ9999',
    status: 'pending',
    total_price: 1500000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockUser = {
    id: 'guest-user-456',
    email: 'khach@vietjetsim.vn',
    full_name: 'Nguyen Van Khach',
    role: 'user',
    phone: '0987654321',
  };

  return {
    getBookingById: vi.fn().mockImplementation(async (id: string) => {
      if (id === 'guest-bk-123') return { ...mockBooking };
      return null;
    }),
    findUserById: vi.fn().mockImplementation(async (id: string) => {
      if (id === 'guest-user-456') return { ...mockUser };
      return null;
    }),
    findUserByEmail: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue(mockUser),
    createBooking: vi.fn().mockResolvedValue(mockBooking),
    getFlightById: vi.fn().mockResolvedValue({
      id: 'flight-1',
      flight_number: 'VJ123',
      available: 50,
      price: 1000000,
    }),
    getActiveBankAccounts: vi.fn().mockResolvedValue([
      {
        id: 'bank-1',
        bank_name: 'MB Bank',
        bank_bin: '970422',
        account_number: '0987654321',
        account_holder: 'CONG TY VIETJET',
        transfer_note_template: 'VJ {code}',
        logo_url: null,
      },
    ]),
    getPaymentsByBookingId: vi.fn().mockResolvedValue([]),
    createPaymentAndConfirmBooking: vi.fn().mockImplementation(async (payload) => ({
      payment: {
        id: 'pay-guest-1',
        booking_id: payload.booking_id,
        method: payload.method,
        status: 'completed',
        amount: payload.amount,
        created_at: new Date().toISOString(),
      },
      booking: {
        ...mockBooking,
        status: 'confirmed',
      },
    })),
    getUserLoyaltyWithProgram: vi.fn().mockResolvedValue(null),
    spendLoyaltyPoints: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('@/lib/neon', () => ({
  sql: vi.fn().mockResolvedValue([]),
}));

describe('Guest Checkout & Payment without Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows unauthenticated guest to create booking via POST /api/dat-ve', async () => {
    const { POST: createBookingPost } = await import('@/app/api/dat-ve/route');

    const req = new NextRequest('http://localhost:4028/api/dat-ve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flight_id: 'flight-1',
        passengers: [
          {
            name: 'Nguyen Van Khach',
            type: 'adult',
            dob: '1990-01-01',
            idNumber: '001200001234',
            phone: '0987654321',
            email: 'khach@vietjetsim.vn',
            gender: 'male',
          },
        ],
        fareClass: 'eco',
        consents: { policyAccepted: true },
      }),
    });

    const res = await createBookingPost(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.booking).toBeDefined();
    expect(data.booking.id).toBe('guest-bk-123');
  });

  it('allows unauthenticated guest to fetch booking details via GET /api/dat-ve/[id]', async () => {
    const { GET: getBookingDetails } = await import('@/app/api/dat-ve/[id]/route');

    const req = new NextRequest('http://localhost:4028/api/dat-ve/guest-bk-123');
    const res = await getBookingDetails(req, {
      params: Promise.resolve({ id: 'guest-bk-123' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.booking.booking_code).toBe('VJ9999');
  });

  it('allows unauthenticated guest to generate VietQR via GET /api/thanh-toan/vietqr', async () => {
    const { GET: getVietQr } = await import('@/app/api/thanh-toan/vietqr/route');

    const req = new NextRequest(
      'http://localhost:4028/api/thanh-toan/vietqr?bookingId=guest-bk-123'
    );
    const res = await getVietQr(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pnr).toBe('VJ9999');
    expect(data.bank).toBeDefined();
    expect(data.payload).toBeDefined();
  });

  it('allows unauthenticated guest to poll status via GET /api/thanh-toan/trang-thai', async () => {
    const { GET: getStatus } = await import('@/app/api/thanh-toan/trang-thai/route');

    const req = new NextRequest(
      'http://localhost:4028/api/thanh-toan/trang-thai?bookingId=guest-bk-123'
    );
    const res = await getStatus(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.booking.id).toBe('guest-bk-123');
  });

  it('allows unauthenticated guest to pay via card via POST /api/thanh-toan', async () => {
    const { POST: submitPayment } = await import('@/app/api/thanh-toan/route');

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: 'guest-bk-123',
        method: 'card',
        amount: 1500000,
      }),
    });

    const res = await submitPayment(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.booking_status).toBe('confirmed');
  });

  it('rejects skypoint payment without login with 401', async () => {
    const { POST: submitPayment } = await import('@/app/api/thanh-toan/route');

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: 'guest-bk-123',
        method: 'skypoint',
        amount: 1500000,
      }),
    });

    const res = await submitPayment(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('rejects wallet payment without login with 401', async () => {
    const { POST: submitPayment } = await import('@/app/api/thanh-toan/route');

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: 'guest-bk-123',
        method: 'wallet',
        amount: 1500000,
      }),
    });

    const res = await submitPayment(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });
});
