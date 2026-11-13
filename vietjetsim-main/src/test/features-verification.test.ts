import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as validateDiscount } from '@/app/api/ma-giam-gia/xac-thuc/route';
import { GET as getBookingDetail } from '@/app/api/dat-ve/[id]/route';
import { POST as processPayment } from '@/app/api/thanh-toan/route';
import { computeDiscountAmount } from '@/lib/discount';
import { signAccessToken } from '@/lib/auth';
import * as db from '@/lib/db';

// Mock Neon DB
vi.mock('@/lib/neon', async () => {
  const queryMock = vi.fn().mockResolvedValue([{ total: '0' }]);
  const tagged = vi.fn().mockResolvedValue([]);
  const sqlMock = Object.assign(tagged, {
    query: queryMock,
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  });
  return { sql: sqlMock };
});

const CSRF_TOKEN = 'test-csrf-token';

const customerUser = () => ({
  userId: 'user-cus-123',
  email: 'khachhang@vietjetsim.vn',
  role: 'user' as const,
  fullName: 'NGUYEN VAN A',
});

const customerToken = () => signAccessToken(customerUser());

const withCsrf = (token?: string) => ({
  cookie: `access_token=${token ?? ''}; csrf_token=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
  'content-type': 'application/json',
});

describe('1. Tính năng trả sau (Bay trước trả sau - MOVI)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('xác nhận phương thức MOVI được chấp nhận trong ALLOWED_METHODS tại API thanh toán', async () => {
    const booking = {
      id: 'b-movi-1',
      booking_code: 'MV8899',
      user_id: 'user-cus-123',
      flight_id: 'f-1',
      total_price: 2_500_000,
      status: 'pending',
      created_at: new Date().toISOString(),
      passengers: [{ name: 'NGUYEN VAN A', email: 'khachhang@vietjetsim.vn' }],
    };

    vi.spyOn(db, 'getBookingByCodeOrId').mockResolvedValue(booking as any);
    const createPaymentSpy = vi.spyOn(db, 'createPaymentAndConfirmBooking').mockResolvedValue({
      payment: {
        id: 'pay-movi-1',
        booking_id: booking.id,
        amount: 2_500_000,
        method: 'movi',
        status: 'completed',
        created_at: new Date().toISOString(),
      } as any,
      booking: { ...booking, status: 'confirmed' } as any,
    });

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        booking_id: booking.id,
        method: 'movi',
        amount: 2_500_000,
        transfer_note: 'MOVI: NGUYEN VAN A - CCCD 001201012345 - SĐT 0987654321',
      }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.booking_status).toBe('confirmed');
    expect(body.payment.method).toBe('movi');
    expect(createPaymentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: booking.id,
        method: 'movi',
        amount: 2_500_000,
        transfer_note: expect.stringContaining('MOVI: NGUYEN VAN A'),
      })
    );
  });

  it('từ chối thanh toán trả sau nếu số tiền gửi lên không khớp với giá trị đặt chỗ', async () => {
    const booking = {
      id: 'b-movi-2',
      booking_code: 'MV8892',
      user_id: 'user-cus-123',
      total_price: 2_500_000,
      status: 'pending',
    };

    vi.spyOn(db, 'getBookingByCodeOrId').mockResolvedValue(booking as any);

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        booking_id: booking.id,
        method: 'movi',
        amount: 1_000_000, // Sai số tiền
      }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Số tiền phải đúng 2.500.000 VND');
  });

  it('từ chối thanh toán lại nếu đặt chỗ đã được xác nhận (chống double-charge)', async () => {
    const booking = {
      id: 'b-movi-3',
      booking_code: 'MV8893',
      user_id: 'user-cus-123',
      total_price: 2_500_000,
      status: 'confirmed', // Đã thanh toán
    };

    vi.spyOn(db, 'getBookingByCodeOrId').mockResolvedValue(booking as any);

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        booking_id: booking.id,
        method: 'movi',
        amount: 2_500_000,
      }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Already paid');
  });
});

describe('2. Tính năng kiểm tra chuyến bay (My Flights & PNR Lookup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cho phép tra cứu chuyến bay công khai bằng mã đặt chỗ PNR và ẩn thông tin nhạy cảm (PII)', async () => {
    const booking = {
      id: 'b-lookup-1',
      booking_code: 'VJ8888',
      flight_no: 'VJ128',
      from_code: 'SGN',
      to_code: 'HAN',
      depart_time: '2026-11-20T08:00:00Z',
      arrive_time: '2026-11-20T10:10:00Z',
      status: 'confirmed',
      total_price: 1_850_000,
      user_id: 'other-user-999',
      passengers: [
        { name: 'NGUYEN VAN ANH', email: 'nguyen.van.anh@gmail.com' },
        { name: 'TRAN THI MAI', email: 'tran.mai@gmail.com' },
      ],
    };

    vi.spyOn(db, 'getBookingByCodeOrId').mockResolvedValue(booking as any);

    // Khách vãng lai không đăng nhập tra cứu đúng PNR
    const req = new NextRequest('http://localhost:4028/api/dat-ve/VJ8888', {
      method: 'GET',
    });

    const res = await getBookingDetail(req, { params: Promise.resolve({ id: 'VJ8888' }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.booking.booking_code).toBe('VJ8888');
    expect(body.booking.flight_no).toBe('VJ128');
    expect(body.booking.from_code).toBe('SGN');
    expect(body.booking.to_code).toBe('HAN');
    expect(body.booking.status).toBe('confirmed');

    // Kiểm tra bảo mật PII: Tên hành khách được thu gọn thành chữ viết tắt
    expect(body.booking.passengers[0].name).toBe('N.V.A.');
    expect(body.booking.passengers[1].name).toBe('T.T.M.');
    // Email liên hệ bị ẩn ký tự nhạy cảm
    expect(body.booking.contact_email_masked).toMatch(/^n\*+h@gmail\.com$/);
  });

  it('trả về 404 khi mã đặt chỗ không tồn tại trong hệ thống', async () => {
    vi.spyOn(db, 'getBookingByCodeOrId').mockResolvedValue(null);

    const req = new NextRequest('http://localhost:4028/api/dat-ve/NOTFND', {
      method: 'GET',
    });

    const res = await getBookingDetail(req, { params: Promise.resolve({ id: 'NOTFND' }) });
    expect(res.status).toBe(404);
  });

  it('cho phép chủ sở hữu đặt chỗ đã đăng nhập xem đầy đủ họ tên hành khách', async () => {
    const booking = {
      id: 'b-lookup-owner',
      booking_code: 'VJ9999',
      flight_no: 'VJ130',
      from_code: 'HAN',
      to_code: 'SGN',
      status: 'confirmed',
      total_price: 2_100_000,
      user_id: 'user-cus-123',
      passengers: [{ name: 'NGUYEN VAN A', email: 'khachhang@vietjetsim.vn' }],
    };

    vi.spyOn(db, 'getBookingByCodeOrId').mockResolvedValue(booking as any);

    const req = new NextRequest('http://localhost:4028/api/dat-ve/VJ9999', {
      method: 'GET',
      headers: {
        cookie: `access_token=${customerToken()}`,
      },
    });

    const res = await getBookingDetail(req, { params: Promise.resolve({ id: 'VJ9999' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Chủ sở hữu xem thấy đầy đủ họ tên không bị rút gọn
    expect(body.booking.passengers[0].name).toBe('NGUYEN VAN A');
  });
});

describe('3. Tính năng áp mã giảm giá cho khách thanh toán', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tính toán chính xác mức giảm giá tỷ lệ % và tôn trọng trần giảm tối đa (max_discount_amount)', () => {
    // 20% của 2.000.000 = 400.000, nhưng trần tối đa là 300.000
    const discountWithCap = {
      type: 'percentage' as const,
      value: 20,
      max_discount_amount: 300_000,
    };
    expect(computeDiscountAmount(discountWithCap, 2_000_000)).toBe(300_000);

    // 10% của 2.000.000 = 200.000 (dưới trần)
    const discountNoCap = {
      type: 'percentage' as const,
      value: 10,
      max_discount_amount: null,
    };
    expect(computeDiscountAmount(discountNoCap, 2_000_000)).toBe(200_000);
  });

  it('xác thực thành công mã giảm giá hợp lệ và trả về số tiền được khấu trừ', async () => {
    const mockDiscount = {
      id: 'disc-vietjet-50',
      code: 'VJ50K',
      type: 'fixed' as const,
      value: 50_000,
      min_booking_amount: 500_000,
      max_discount_amount: null,
      start_date: new Date(Date.now() - 3600_000).toISOString(),
      end_date: new Date(Date.now() + 86400_000).toISOString(),
      usage_limit: 100,
      usage_per_user_limit: 1,
      used_count: 5,
      is_active: true,
    };

    vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(mockDiscount as any);
    vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(0);

    const req = new NextRequest('http://localhost:4028/api/ma-giam-gia/xac-thuc', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        code: 'VJ50K',
        bookingAmount: 1_500_000,
      }),
    });

    const res = await validateDiscount(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discount.code).toBe('VJ50K');
    expect(body.discount.discountAmount).toBe(50_000);
  });

  it('từ chối khi đơn hàng chưa đạt giá trị tối thiểu (min_booking_amount)', async () => {
    const mockDiscount = {
      id: 'disc-big',
      code: 'BIGSALE',
      type: 'percentage' as const,
      value: 10,
      min_booking_amount: 3_000_000, // Đòi hỏi tối thiểu 3.000.000
      max_discount_amount: null,
      start_date: new Date(Date.now() - 3600_000).toISOString(),
      end_date: new Date(Date.now() + 86400_000).toISOString(),
      usage_limit: 100,
      usage_per_user_limit: null,
      used_count: 0,
      is_active: true,
    };

    vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(mockDiscount as any);

    const req = new NextRequest('http://localhost:4028/api/ma-giam-gia/xac-thuc', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        code: 'BIGSALE',
        bookingAmount: 1_500_000, // Chỉ 1.500.000
      }),
    });

    const res = await validateDiscount(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain('Mã giảm giá chỉ áp dụng cho đơn hàng từ 3.000.000₫');
  });

  it('từ chối mã giảm giá khi đã hết hạn sử dụng', async () => {
    const expiredDiscount = {
      id: 'disc-exp',
      code: 'OLDPROMO',
      type: 'fixed' as const,
      value: 100_000,
      min_booking_amount: 0,
      max_discount_amount: null,
      start_date: new Date(Date.now() - 86400_000 * 2).toISOString(),
      end_date: new Date(Date.now() - 3600_000).toISOString(), // Đã hết hạn 1 giờ trước
      usage_limit: 100,
      usage_per_user_limit: null,
      used_count: 10,
      is_active: true,
    };

    vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(expiredDiscount as any);

    const req = new NextRequest('http://localhost:4028/api/ma-giam-gia/xac-thuc', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        code: 'OLDPROMO',
        bookingAmount: 2_000_000,
      }),
    });

    const res = await validateDiscount(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toBe('Mã giảm giá đã hết hạn');
  });

  it('từ chối mã giảm giá khi đã hết lượt sử dụng toàn hệ thống', async () => {
    const exhaustedDiscount = {
      id: 'disc-max',
      code: 'FLASH10',
      type: 'percentage' as const,
      value: 10,
      min_booking_amount: 0,
      max_discount_amount: null,
      start_date: new Date(Date.now() - 3600_000).toISOString(),
      end_date: new Date(Date.now() + 86400_000).toISOString(),
      usage_limit: 50,
      usage_per_user_limit: null,
      used_count: 50, // Đã dùng hết 50/50
      is_active: true,
    };

    vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(exhaustedDiscount as any);

    const req = new NextRequest('http://localhost:4028/api/ma-giam-gia/xac-thuc', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        code: 'FLASH10',
        bookingAmount: 2_000_000,
      }),
    });

    const res = await validateDiscount(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toBe('Mã giảm giá đã hết lượt sử dụng');
  });

  it('từ chối khi người dùng đã dùng hết số lần cho phép của mã đó (usage_per_user_limit)', async () => {
    const perUserDiscount = {
      id: 'disc-user-limit',
      code: 'WELCOME100',
      type: 'fixed' as const,
      value: 100_000,
      min_booking_amount: 0,
      max_discount_amount: null,
      start_date: new Date(Date.now() - 3600_000).toISOString(),
      end_date: new Date(Date.now() + 86400_000).toISOString(),
      usage_limit: 1000,
      usage_per_user_limit: 1, // Chỉ 1 lần/user
      used_count: 10,
      is_active: true,
    };

    vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(perUserDiscount as any);
    vi.spyOn(db, 'countUserDiscountUsage').mockResolvedValue(1); // User đã dùng 1 lần

    const req = new NextRequest('http://localhost:4028/api/ma-giam-gia/xac-thuc', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        code: 'WELCOME100',
        bookingAmount: 2_000_000,
      }),
    });

    const res = await validateDiscount(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toBe('Bạn đã sử dụng mã giảm giá này rồi');
  });

  it('áp dụng mã giảm giá thành công khi thanh toán, tự động trừ đúng số tiền', async () => {
    const mockDiscount = {
      id: 'disc-applied',
      code: 'SALE200K',
      type: 'fixed' as const,
      value: 200_000,
      min_booking_amount: 1_000_000,
      max_discount_amount: null,
      start_date: new Date(Date.now() - 3600_000).toISOString(),
      end_date: new Date(Date.now() + 86400_000).toISOString(),
      usage_limit: null,
      usage_per_user_limit: null,
      used_count: 0,
      is_active: true,
    };

    const booking = {
      id: 'b-discount-pay',
      booking_code: 'VJDISC',
      user_id: 'user-cus-123',
      flight_id: 'f-1',
      total_price: 2_500_000,
      status: 'pending',
      created_at: new Date().toISOString(),
      passengers: [{ name: 'NGUYEN VAN A', email: 'khachhang@vietjetsim.vn' }],
    };

    vi.spyOn(db, 'getBookingByCodeOrId').mockResolvedValue(booking as any);
    vi.spyOn(db, 'getDiscountCodeByCode').mockResolvedValue(mockDiscount as any);
    vi.spyOn(db, 'getDiscountCodeById').mockResolvedValue(mockDiscount as any);

    const createPaymentSpy = vi.spyOn(db, 'createPaymentAndConfirmBooking').mockResolvedValue({
      payment: {
        id: 'pay-disc-1',
        booking_id: booking.id,
        amount: 2_300_000, // 2.500.000 - 200.000 = 2.300.000
        method: 'card',
        status: 'completed',
        created_at: new Date().toISOString(),
      } as any,
      booking: { ...booking, status: 'confirmed' } as any,
    });

    const req = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: withCsrf(customerToken()),
      body: JSON.stringify({
        booking_id: booking.id,
        method: 'card',
        discount_code: 'SALE200K',
        amount: 2_300_000, // Đã trừ giảm giá 200K
      }),
    });

    const res = await processPayment(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(createPaymentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: booking.id,
        amount: 2_300_000,
        discount_code_id: 'disc-applied',
        discount_amount: 200_000,
      })
    );
  });
});
