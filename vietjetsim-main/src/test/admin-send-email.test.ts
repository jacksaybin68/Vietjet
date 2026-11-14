import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAdminUser = {
  userId: 'admin-uuid-1',
  email: 'admin@vietjet.shop',
  role: 'admin',
};

const sendPaymentInstructionEmailMock = vi.fn().mockResolvedValue(true);
const sendPaymentSuccessEmailMock = vi.fn().mockResolvedValue(true);
const sendPaymentFailedEmailMock = vi.fn().mockResolvedValue(true);
const writeAuditLogMock = vi.fn().mockResolvedValue(true);

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
  sendPaymentInstructionEmail: (...args: any[]) => sendPaymentInstructionEmailMock(...args),
  sendPaymentSuccessEmail: (...args: any[]) => sendPaymentSuccessEmailMock(...args),
  sendPaymentFailedEmail: (...args: any[]) => sendPaymentFailedEmailMock(...args),
  siteUrl: () => 'https://vietjet.shop',
}));

vi.mock('@/lib/db', () => ({
  writeAuditLog: (...args: any[]) => writeAuditLogMock(...args),
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
            booking_code: 'VJ7788',
            flight_id: 'fl-1',
            user_id: 'usr-1',
            total_price: 2500000,
            status: 'pending',
            flight_no: 'VJ120',
            from_code: 'SGN',
            to_code: 'HAN',
            depart_time: new Date('2026-11-20T10:00:00Z').toISOString(),
            arrive_time: new Date('2026-11-20T12:10:00Z').toISOString(),
            account_email: 'khach@gmail.com',
            account_name: 'Nguyen Van Khach',
          },
        ];
      }

      if (query.includes('FROM passengers')) {
        return [{ name: 'Nguyen Van Khach', email: 'khach@gmail.com', seat_number: '12A' }];
      }

      if (query.includes('FROM bank_accounts')) {
        return [
          {
            bank_name: 'Ngân hàng Quốc tế Việt Nam (VIB)',
            account_number: '876922729',
            account_holder: 'DANG THI NGOC HAN',
            bank_bin: '970441',
            is_default: true,
          },
        ];
      }

      if (query.includes('SELECT id FROM payments')) {
        return [{ id: 'pay-uuid-201' }];
      }

      return [];
    });

  return { sql: sqlMock };
});

import { POST } from '@/app/api/quan-tri/dat-ve/gui-mail/route';

describe('Admin Send Booking Email API (Giao diện gửi Gmail thanh toán & xuất vé)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gửi email hướng dẫn thanh toán VietQR thành công', async () => {
    const req = new NextRequest('http://localhost:3000/api/quan-tri/dat-ve/gui-mail', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: 'bk-uuid-101',
        type: 'payment_instruction',
        toEmail: 'khach@gmail.com',
        fullName: 'Nguyen Van Khach',
        amount: 2500000,
        customNote: 'Vui lòng thanh toán trước 12:00',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Gửi hướng dẫn thanh toán');
    expect(sendPaymentInstructionEmailMock).toHaveBeenCalledTimes(1);
    expect(sendPaymentInstructionEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'khach@gmail.com',
        bookingCode: 'VJ7788',
        amount: 2500000,
        bankName: 'Ngân hàng Quốc tế Việt Nam (VIB)',
        accountNumber: '876922729',
        transferNote: 'VJ VJ7788',
      })
    );
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'booking:send_email',
        status: 'success',
      })
    );
  });

  it('gửi email xuất vé điện tử và tự động cập nhật trạng thái đơn vé sang confirmed', async () => {
    const req = new NextRequest('http://localhost:3000/api/quan-tri/dat-ve/gui-mail', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: 'bk-uuid-101',
        type: 'ticket_issuance',
        toEmail: 'khach@gmail.com',
        autoConfirmBooking: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('confirmed');
    expect(body.message).toContain('xuất vé điện tử');
    expect(sendPaymentSuccessEmailMock).toHaveBeenCalledTimes(1);
    expect(sendPaymentSuccessEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'khach@gmail.com',
        bookingCode: 'VJ7788',
        flightNumber: 'VJ120',
        route: 'SGN → HAN',
      })
    );
  });

  it('từ chối khi thiếu trường bắt buộc hoặc email không hợp lệ', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/quan-tri/dat-ve/gui-mail', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: '',
        type: 'payment_instruction',
      }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    const req2 = new NextRequest('http://localhost:3000/api/quan-tri/dat-ve/gui-mail', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: 'bk-uuid-101',
        type: 'payment_instruction',
        toEmail: 'email-khong-hop-le',
      }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });
});
