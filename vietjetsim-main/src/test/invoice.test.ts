import { describe, expect, it } from 'vitest';
import {
  amountInWords,
  escapeHtml,
  formatVnd,
  invoiceNo,
  renderInvoiceHtml,
  type InvoiceBooking,
} from '@/features/admin/invoice';

const BOOKING: InvoiceBooking = {
  id: 'VJ2B4K9',
  userName: 'Nguyễn Văn An',
  flightNo: 'VJ 101',
  route: 'HAN → SGN',
  date: '20/03/2026',
  seat: '14A',
  amount: 1038900,
  status: 'confirmed',
  statusLabel: 'Xác nhận',
  payMethod: 'Thẻ tín dụng',
  createdAt: '16/03/2026 20:55',
};

describe('formatVnd', () => {
  it('định dạng tiền Việt', () => {
    expect(formatVnd(1038900)).toBe('1.038.900 ₫');
  });
  it('số âm và NaN về 0', () => {
    expect(formatVnd(-5)).toBe('0 ₫');
    expect(formatVnd(Number.NaN)).toBe('0 ₫');
  });
});

describe('amountInWords', () => {
  it('đọc số tiền phổ biến', () => {
    expect(amountInWords(1038900)).toBe('Một triệu không trăm ba mươi tám nghìn chín trăm đồng');
  });
  it('đọc đúng lẻ / mốt / lăm', () => {
    expect(amountInWords(1005)).toBe('Một nghìn không trăm lẻ năm đồng');
    expect(amountInWords(21)).toBe('Hai mươi mốt đồng');
    expect(amountInWords(15)).toBe('Mười lăm đồng');
  });
  it('0 về "Không đồng"', () => {
    expect(amountInWords(0)).toBe('Không đồng');
  });
});

describe('renderInvoiceHtml', () => {
  it('đủ khối chuyên nghiệp: số hóa đơn, 2 bên, bảng, chữ ký', () => {
    const html = renderInvoiceHtml(BOOKING);
    expect(html).toContain('HD-VJ2B4K9-16032026');
    expect(html).toContain('Đơn vị cung cấp');
    expect(html).toContain('Khách hàng');
    expect(html).toContain('TỔNG CỘNG');
    expect(html).toContain('Số tiền bằng chữ');
    expect(html).toContain('ĐẠI DIỆN VIETJET AIR');
    expect(html).toContain('1.038.900 ₫');
    expect(html).toContain('@page');
    expect(html).toContain('window.print()');
  });
  it('escape dữ liệu khách hàng để chống XSS', () => {
    const evil = { ...BOOKING, userName: '<img src=x onerror=alert(1)>' };
    const html = renderInvoiceHtml(evil);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain(escapeHtml(evil.userName));
  });
});

describe('invoiceNo', () => {
  it('ổn định theo mã đặt chỗ và ngày', () => {
    expect(invoiceNo(BOOKING)).toBe('HD-VJ2B4K9-16032026');
  });
});
