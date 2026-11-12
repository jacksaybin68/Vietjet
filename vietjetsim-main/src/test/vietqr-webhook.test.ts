import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

let bookingStatus = 'pending';
let paymentStatus = 'pending';

vi.mock('@/lib/neon', () => {
  const sqlMock = vi.fn().mockImplementation(async (strings: any, ..._values: any[]) => {
    const query = Array.isArray(strings) ? strings.join('?') : String(strings);

    if (query.includes('SELECT * FROM bookings WHERE UPPER(booking_code)')) {
      const codeParam = _values[0];
      if (String(codeParam).toUpperCase() === 'VJ9999') {
        return [];
      }
      return [
        {
          id: 'bk-uuid-101',
          booking_code: 'VJ7788',
          total_price: 2500000,
          flight_id: 'flight-uuid-1',
          user_id: 'user-uuid-1',
          status: bookingStatus,
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
          status: bookingStatus,
        },
      ];
    }

    if (query.includes('SELECT * FROM payments WHERE booking_id')) {
      return [
        {
          id: 'pay-uuid-201',
          booking_id: 'bk-uuid-101',
          status: paymentStatus,
          amount: 2500000,
          method: 'vietqr',
          transfer_note: 'VJ VJ7788',
        },
      ];
    }

    return [];
  });

  (sqlMock as unknown as { query: unknown; transaction: unknown }).query = async () => [];
  (sqlMock as unknown as { query: unknown; transaction: unknown }).transaction = vi.fn().mockImplementation(async () => {
    bookingStatus = 'confirmed';
    paymentStatus = 'completed';
    return [
      [{ id: 'bk-uuid-101', booking_code: 'VJ7788', status: 'confirmed', total_price: 2500000 }],
      [
        {
          id: 'pay-uuid-201',
          booking_id: 'bk-uuid-101',
          status: 'completed',
          amount: 2500000,
          method: 'vietqr',
          transfer_note: 'VJ VJ7788',
        },
      ],
      [],
    ];
  });

  return { sql: sqlMock };
});

vi.mock('@/lib/payment-invoice', () => ({
  sendAutomaticPaymentInvoiceEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/thanh-toan/webhook/vietqr/route';

describe('VietQR simulated webhook', () => {
  const originalSecret = process.env.VIETQR_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingStatus = 'pending';
    paymentStatus = 'pending';
    process.env.VIETQR_WEBHOOK_SECRET = 'test-secret';
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.VIETQR_WEBHOOK_SECRET = originalSecret;
    } else {
      delete process.env.VIETQR_WEBHOOK_SECRET;
    }
  });

  it('should reject request without secret header', async () => {
    const req = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingCode: 'VJ7788',
        amount: 2500000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should accept request with correct secret header', async () => {
    const req = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vietqr-webhook-secret': 'test-secret',
      },
      body: JSON.stringify({
        bookingCode: 'VJ7788',
        amount: 2500000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.alreadyPaid).toBe(false);
    expect(data.booking.code).toBe('VJ7788');
    expect(data.booking.status).toBe('confirmed');
    expect(data.payment?.status).toBe('completed');
    expect(data.transactionId).toBeDefined();
  });

  it('should be idempotent – replay returns alreadyPaid', async () => {
    const req1 = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vietqr-webhook-secret': 'test-secret',
      },
      body: JSON.stringify({
        bookingCode: 'VJ7788',
        amount: 2500000,
      }),
    });
    const firstRes = await POST(req1);
    expect(firstRes.status).toBe(200);
    const firstData = await firstRes.json();
    expect(firstData.alreadyPaid).toBe(false);

    // Second identical call: booking is now confirmed in mock state
    const req2 = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vietqr-webhook-secret': 'test-secret',
      },
      body: JSON.stringify({
        bookingCode: 'VJ7788',
        amount: 2500000,
      }),
    });
    const secondRes = await POST(req2);
    expect(secondRes.status).toBe(200);
    const secondData = await secondRes.json();
    expect(secondData.alreadyPaid).toBe(true);
  });

  it('should return 404 when booking not found', async () => {
    const req = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vietqr-webhook-secret': 'test-secret',
      },
      body: JSON.stringify({
        bookingCode: 'VJ9999',
        amount: 1000000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.message).toBe('Không tìm thấy đặt chỗ');
  });

  it('should return 409 when amount does not match expected', async () => {
    const req = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vietqr-webhook-secret': 'test-secret',
      },
      body: JSON.stringify({
        bookingCode: 'VJ7788',
        amount: 1000000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.message).toContain('Số tiền không khớp');
  });

  it('should handle missing amount gracefully (confirms with booking expected amount)', async () => {
    const req = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vietqr-webhook-secret': 'test-secret',
      },
      body: JSON.stringify({
        bookingCode: 'VJ7788',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.alreadyPaid).toBe(false);
    expect(data.payment?.status).toBe('completed');
  });
});
