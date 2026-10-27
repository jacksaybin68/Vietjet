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
}));

vi.mock('@/lib/db', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/neon', () => {
  const sqlMock = vi
    .fn()
    .mockImplementation(async (strings: TemplateStringsArray, ..._values: any[]) => {
      const query = strings.join(' ');

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
            status: 'pending',
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
