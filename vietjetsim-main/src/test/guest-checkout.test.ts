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
  sendPaymentSuccessEmail: vi.fn().mockResolvedValue(true),
  sendPaymentInstructionEmail: vi.fn().mockResolvedValue(true),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(true),
  sendPaymentPendingReviewEmail: vi.fn().mockResolvedValue(true),
  sendRefundNotificationEmail: vi.fn().mockResolvedValue(true),
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
    // `GET /api/dat-ve/[id]` resolves a booking by code *or* id since 7f97446 —
    // the mock has to answer for both names or the route gets `undefined` and
    // the guest lookup 500s.
    getBookingByCodeOrId: vi.fn().mockImplementation(async (codeOrId: string) => {
      if (codeOrId === 'guest-bk-123' || codeOrId === mockBooking.booking_code) {
        return { ...mockBooking };
      }
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
    awardBookingLoyaltyPoints: vi.fn().mockResolvedValue({ pointsEarned: 100, newTier: 'Red' }),
  };
});

vi.mock('@/lib/neon', () => ({
  sql: vi.fn().mockResolvedValue([]),
}));

describe('Guest Checkout & Payment without Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * The cookie `POST /api/dat-ve` hands the browser when it creates a guest
   * booking. It is what tells the server "this browser is the guest that made
   * the booking" — without it an anonymous caller that merely knows the id is
   * refused, because a booking UUID is not a secret.
   */
  const guestCookie = () => ({
    cookie: `vj_guest_bookings=${encodeURIComponent(JSON.stringify(['guest-bk-123']))}`,
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

  it('returns 409 when the selected seat was taken concurrently', async () => {
    const db = await import('@/lib/db');
    (db.createBooking as any).mockRejectedValueOnce({
      code: '23505',
      constraint: 'idx_seats_flight_seat_unique',
    });

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
        seats: ['12A'],
        fareClass: 'eco',
        consents: { policyAccepted: true },
      }),
    });

    const res = await createBookingPost(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('Seat no longer available');
  });

  it('allows unauthenticated guest to fetch booking details via GET /api/dat-ve/[id]', async () => {
    const { GET: getBookingDetails } = await import('@/app/api/dat-ve/[id]/route');

    const req = new NextRequest('http://localhost:4028/api/dat-ve/guest-bk-123', {
      headers: guestCookie(),
    });
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
      'http://localhost:4028/api/thanh-toan/vietqr?bookingId=guest-bk-123',
      { headers: guestCookie() }
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
      'http://localhost:4028/api/thanh-toan/trang-thai?bookingId=guest-bk-123',
      { headers: guestCookie() }
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
      headers: { 'Content-Type': 'application/json', ...guestCookie() },
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

  it('ignores a client-supplied discount without a valid code', async () => {
    const { POST: submitPayment } = await import('@/app/api/thanh-toan/route');

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...guestCookie() },
      body: JSON.stringify({
        booking_id: 'guest-bk-123',
        method: 'card',
        amount: 0,
        discount_amount: 1500000,
      }),
    });

    const res = await submitPayment(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid payment amount');
  });

  it('rejects skypoint payment without login with 401', async () => {
    const { POST: submitPayment } = await import('@/app/api/thanh-toan/route');

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...guestCookie() },
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

  it('refuses VietQR for an anonymous caller who only knows the UUID', async () => {
    const { GET: getVietQr } = await import('@/app/api/thanh-toan/vietqr/route');

    const req = new NextRequest(
      'http://localhost:4028/api/thanh-toan/vietqr?bookingId=guest-bk-123'
    );
    const res = await getVietQr(req);

    // A booking UUID is not a secret: without the guest cookie or the PNR it
    // must not disclose the receiving bank account and amount.
    expect(res.status).toBe(403);
  });

  it('refuses payment status for an anonymous caller who only knows the UUID', async () => {
    const { GET: getStatus } = await import('@/app/api/thanh-toan/trang-thai/route');

    const req = new NextRequest(
      'http://localhost:4028/api/thanh-toan/trang-thai?bookingId=guest-bk-123'
    );
    const res = await getStatus(req);

    expect(res.status).toBe(403);
  });

  it('accepts the PNR as the credential for anonymous VietQR and status lookups', async () => {
    const { GET: getVietQr } = await import('@/app/api/thanh-toan/vietqr/route');
    const { GET: getStatus } = await import('@/app/api/thanh-toan/trang-thai/route');

    const qrReq = new NextRequest('http://localhost:4028/api/thanh-toan/vietqr?bookingId=VJ9999');
    expect((await getVietQr(qrReq)).status).toBe(200);

    const statusReq = new NextRequest(
      'http://localhost:4028/api/thanh-toan/trang-thai?bookingId=VJ9999'
    );
    expect((await getStatus(statusReq)).status).toBe(200);
  });

  it('rejects wallet payment without login with 401', async () => {
    const { POST: submitPayment } = await import('@/app/api/thanh-toan/route');

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...guestCookie() },
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
