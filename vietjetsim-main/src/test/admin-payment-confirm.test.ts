import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAdminUser = {
  userId: 'admin-uuid-1',
  email: 'admin@vietjet.shop',
  role: 'admin',
};

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminRequest: vi.fn().mockImplementation(async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    if (authHeader === 'Bearer invalid') {
      return {
        payload: null,
        error: 'Unauthorized',
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      };
    }
    return {
      payload: mockAdminUser,
      error: undefined,
      response: undefined,
    };
  }),
}));

vi.mock('@/lib/mail', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(true),
  sendPaymentSuccessEmail: vi.fn().mockResolvedValue(true),
  sendPaymentInstructionEmail: vi.fn().mockResolvedValue(true),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(true),
  sendRefundNotificationEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/db', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(true),
}));

// Mutable booking state so a test can drive the same handler twice, and so the
// atomic `UPDATE … WHERE status = 'pending' RETURNING id` behaves like Postgres
// (returns a row only for the request that actually moves the status).
const bookingState = vi.hoisted(() => ({
  status: 'pending',
  flightRestores: 0,
}));

vi.mock('@/lib/neon', () => {
  const sqlMock = vi
    .fn()
    .mockImplementation(async (strings: TemplateStringsArray, ..._values: any[]) => {
      const query = strings.join(' ');

      if (query.includes('UPDATE bookings') && query.includes('RETURNING id')) {
        const target = query.includes("status = 'confirmed'") ? 'confirmed' : 'cancelled';
        if (bookingState.status !== 'pending') return [];
        bookingState.status = target;
        return [{ id: 'bk-uuid-101' }];
      }

      if (query.includes('UPDATE flights') && query.includes('available = available +')) {
        bookingState.flightRestores += 1;
        return [];
      }

      if (query.includes('FROM bookings b')) {
        return [
          {
            id: 'bk-uuid-101',
            paymentId: 'pay-uuid-201',
            bookingId: 'bk-uuid-101',
            bookingCode: 'VJ7788',
            amount: 2500000,
            method: 'vietqr',
            status: 'pending',
            bookingStatus: 'pending',
            createdAt: new Date().toISOString(),
            userEmail: 'passenger@example.com',
            userName: 'Nguyen Van Khach',
          },
        ];
      }

      if (query.includes('SELECT * FROM bookings WHERE id =')) {
        return [
          {
            id: 'bk-uuid-101',
            booking_code: 'VJ7788',
            total_price: 2500000,
            flight_id: 'flight-uuid-1',
            user_id: 'user-uuid-1',
            status: bookingState.status,
          },
        ];
      }

      if (query.includes('SELECT * FROM payments WHERE booking_id =')) {
        return [
          {
            id: 'pay-uuid-201',
            booking_id: 'bk-uuid-101',
            status: 'pending',
            amount: 2500000,
            method: 'vietqr',
          },
        ];
      }

      if (query.includes('SELECT email, full_name FROM user_profiles')) {
        return [
          {
            email: 'passenger@example.com',
            full_name: 'Nguyen Van Khach',
          },
        ];
      }

      if (query.includes('SELECT COUNT(*) as count FROM passengers')) {
        return [{ count: 1 }];
      }

      return [];
    });

  return { sql: sqlMock };
});

describe('Admin Payment Confirmation System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingState.status = 'pending';
    bookingState.flightRestores = 0;
  });

  it('GET /api/quan-tri/giao-dich lists transactions and pending bookings', async () => {
    const { GET: getTransactions } = await import('@/app/api/quan-tri/giao-dich/route');

    const req = new NextRequest('http://localhost:4028/api/quan-tri/giao-dich?status=pending');
    const res = await getTransactions(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].bookingCode).toBe('VJ7788');
    expect(data[0].status).toBe('pending');
  });

  it('PATCH /api/quan-tri/giao-dich confirms pending payment and sends confirmation email', async () => {
    const { PATCH: processPayment } = await import('@/app/api/quan-tri/giao-dich/route');
    const { sendBookingConfirmationEmail } = await import('@/lib/mail');
    const { writeAuditLog } = await import('@/lib/db');

    const req = new NextRequest('http://localhost:4028/api/quan-tri/giao-dich', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: 'bk-uuid-101',
        action: 'confirm',
        note: 'Tiền đã vào tài khoản MB Bank',
      }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('completed');
    expect(data.bookingCode).toBe('VJ7788');

    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'passenger@example.com',
        fullName: 'Nguyen Van Khach',
        bookingCode: 'VJ7788',
        amount: 2500000,
      })
    );

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment:confirm',
        targetType: 'booking',
        targetId: 'bk-uuid-101',
      })
    );
  });

  it('PATCH /api/quan-tri/giao-dich rejects payment and cancels booking', async () => {
    const { PATCH: processPayment } = await import('@/app/api/quan-tri/giao-dich/route');
    const { writeAuditLog } = await import('@/lib/db');

    const req = new NextRequest('http://localhost:4028/api/quan-tri/giao-dich', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: 'bk-uuid-101',
        action: 'reject',
        note: 'Khách không chuyển tiền quá thời hạn 15 phút',
      }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('failed');

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment:reject',
        targetType: 'booking',
        targetId: 'bk-uuid-101',
      })
    );
  });

  it('confirming twice does not re-award points or resend the invoice', async () => {
    const { PATCH: processPayment } = await import('@/app/api/quan-tri/giao-dich/route');
    const { sendBookingConfirmationEmail } = await import('@/lib/mail');
    const { writeAuditLog } = await import('@/lib/db');

    const sendConfirm = async () => {
      const req = new NextRequest('http://localhost:4028/api/quan-tri/giao-dich', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bk-uuid-101', action: 'confirm' }),
      });
      return processPayment(req);
    };

    const first = await sendConfirm();
    expect(first.status).toBe(200);
    expect((await first.json()).status).toBe('completed');
    const emailsAfterFirst = (sendBookingConfirmationEmail as any).mock.calls.length;
    const auditsAfterFirst = (writeAuditLog as any).mock.calls.length;

    const second = await sendConfirm();
    expect(second.status).toBe(200);
    const secondData = await second.json();
    expect(secondData.status).toBe('completed');
    expect(secondData.idempotent).toBe(true);

    expect((sendBookingConfirmationEmail as any).mock.calls.length).toBe(emailsAfterFirst);
    expect((writeAuditLog as any).mock.calls.length).toBe(auditsAfterFirst);
  });

  it('rejecting twice releases the seats only once', async () => {
    const { PATCH: processPayment } = await import('@/app/api/quan-tri/giao-dich/route');

    const sendReject = async () => {
      const req = new NextRequest('http://localhost:4028/api/quan-tri/giao-dich', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bk-uuid-101', action: 'reject' }),
      });
      return processPayment(req);
    };

    expect((await sendReject()).status).toBe(200);
    expect(bookingState.flightRestores).toBe(1);

    const second = await sendReject();
    expect(second.status).toBe(200);
    expect((await second.json()).idempotent).toBe(true);
    // A second reject used to add the passenger count back to
    // `flights.available` again, inventing seats on every click.
    expect(bookingState.flightRestores).toBe(1);
  });

  it('refuses to reject a booking that was already confirmed', async () => {
    bookingState.status = 'confirmed';
    const { PATCH: processPayment } = await import('@/app/api/quan-tri/giao-dich/route');

    const req = new NextRequest('http://localhost:4028/api/quan-tri/giao-dich', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bk-uuid-101', action: 'reject' }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(409);
    expect(bookingState.flightRestores).toBe(0);
  });

  it('PATCH /api/quan-tri/giao-dich rejects unauthenticated requests with 401', async () => {
    const { PATCH: processPayment } = await import('@/app/api/quan-tri/giao-dich/route');

    const req = new NextRequest('http://localhost:4028/api/quan-tri/giao-dich', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer invalid',
      },
      body: JSON.stringify({
        bookingId: 'bk-uuid-101',
        action: 'confirm',
      }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(401);
  });
});
