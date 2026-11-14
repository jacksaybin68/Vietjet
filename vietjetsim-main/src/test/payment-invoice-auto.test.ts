import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendBookingConfirmationEmailMock = vi.fn().mockResolvedValue(true);
let mockConfigSettings: Record<string, string> = {
  auto_send_payment_invoice_email: 'true',
  email_notifications: 'true',
};

vi.mock('@/lib/mail', () => ({
  sendBookingConfirmationEmail: (...args: any[]) => sendBookingConfirmationEmailMock(...args),
  sendPaymentSuccessEmail: (...args: any[]) => sendBookingConfirmationEmailMock(...args),
  siteUrl: () => 'https://vietjet.shop',
}));

vi.mock('@/lib/db', () => ({
  getConfigValue: vi.fn().mockImplementation(async (key: string) => {
    if (key in mockConfigSettings) {
      return { key, value: mockConfigSettings[key] };
    }
    return null;
  }),
}));

vi.mock('@/lib/neon', () => {
  const sqlMock = vi
    .fn()
    .mockImplementation(async (strings: TemplateStringsArray, ..._values: any[]) => {
      const query = strings.join(' ');

      if (query.includes('FROM system_config')) {
        return Object.entries(mockConfigSettings).map(([key, value]) => ({ key, value }));
      }

      if (query.includes('FROM bookings b')) {
        return [
          {
            id: 'bk-test-101',
            booking_code: 'VJAUTO88',
            flight_id: 'fl-1',
            user_id: 'usr-1',
            total_price: 3200000,
            status: 'confirmed',
            flight_no: 'VJ198',
            from_code: 'SGN',
            to_code: 'HAN',
            depart_time: new Date('2026-11-28T08:30:00Z').toISOString(),
            arrive_time: new Date('2026-11-28T10:40:00Z').toISOString(),
            account_email: 'customer@company.com',
            account_name: 'Tran Van Khach',
          },
        ];
      }

      if (query.includes('FROM passengers')) {
        return [
          {
            name: 'Tran Van Khach',
            email: 'customer.real@gmail.com',
            seat_number: '15B',
          },
        ];
      }

      if (query.includes('FROM payments')) {
        return [
          {
            id: 'pay-test-201',
            method: 'vietqr',
            amount: 3200000,
            status: 'completed',
          },
        ];
      }

      return [];
    });

  return { sql: sqlMock };
});

import { isAutoSendInvoiceEnabled, sendAutomaticPaymentInvoiceEmail } from '@/lib/payment-invoice';

describe('Tự động gửi hoá đơn thanh toán qua email cho khách hàng', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigSettings = {
      auto_send_payment_invoice_email: 'true',
      email_notifications: 'true',
    };
  });

  it('xác định tính năng đang bật khi cấu hình là true', async () => {
    const isEnabled = await isAutoSendInvoiceEnabled();
    expect(isEnabled).toBe(true);
  });

  it('tự động gửi email hoá đơn & vé điện tử với thông tin chuyến bay đầy đủ khi thanh toán hoàn tất', async () => {
    const result = await sendAutomaticPaymentInvoiceEmail('bk-test-101');
    expect(result.sent).toBe(true);
    expect(result.recipientEmail).toBe('customer.real@gmail.com');
    expect(result.bookingCode).toBe('VJAUTO88');

    expect(sendBookingConfirmationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendBookingConfirmationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer.real@gmail.com',
        bookingCode: 'VJAUTO88',
        amount: 3200000,
        flightNumber: 'VJ198',
        route: 'SGN → HAN',
        method: 'vietqr',
        passengers: [{ name: 'Tran Van Khach', seat: '15B' }],
      })
    );
  });

  it('bỏ qua gửi hoá đơn tự động nếu cấu hình auto_send_payment_invoice_email = false', async () => {
    mockConfigSettings['auto_send_payment_invoice_email'] = 'false';

    const result = await sendAutomaticPaymentInvoiceEmail('bk-test-101');
    expect(result.sent).toBe(false);
    expect(result.reason).toContain('tắt');
    expect(sendBookingConfirmationEmailMock).not.toHaveBeenCalled();
  });

  it('cho phép gửi cưỡng bức khi có cờ force: true dù cấu hình đang tắt', async () => {
    mockConfigSettings['auto_send_payment_invoice_email'] = 'false';

    const result = await sendAutomaticPaymentInvoiceEmail('bk-test-101', { force: true });
    expect(result.sent).toBe(true);
    expect(sendBookingConfirmationEmailMock).toHaveBeenCalledTimes(1);
  });
});
