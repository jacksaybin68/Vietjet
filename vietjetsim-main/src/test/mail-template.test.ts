import { describe, it, expect, afterEach } from 'vitest';
import {
  buildBookingConfirmationHtml,
  buildPaymentInstructionHtml,
  buildPaymentSuccessHtml,
  buildPaymentFailedHtml,
  buildRefundNotificationHtml,
  buildOtpEmailHtml,
  buildPasswordResetHtml,
  buildPasswordChangedHtml,
  buildRegistrationSuccessHtml,
  isGmailHost,
  mailLogoUrl,
  normalizeMailFrom,
  resolveMailFrom,
  siteUrl,
} from '@/lib/mail';

afterEach(() => {
  delete process.env.MAIL_SITE_URL;
});

describe('template email khách hàng', () => {
  it('mail đặt vé có đủ khối chuyên nghiệp', () => {
    const { subject, html, text } = buildBookingConfirmationHtml({
      fullName: 'Nguyễn Văn A',
      bookingCode: 'FG7KH9',
      amount: 4900000,
      method: 'bank',
    });
    expect(subject).toContain('FG7KH9');
    expect(html).toContain('alt="Vietjet Air"');
    expect(html).toContain('FG7KH9');
    expect(html).toContain('4.900.000');
    expect(html).toContain('Chuyển khoản ngân hàng');
    expect(html).toContain('/tai-khoan');
    expect(html).toContain('1900 1886');
    expect(html).toContain('role="presentation"');
    expect(text).toContain('FG7KH9');
  });

  it('escape input khách hàng để chống HTML injection', () => {
    const { html } = buildBookingConfirmationHtml({
      fullName: '<script>alert(1)</script>',
      bookingCode: 'FG7KH9',
      amount: 1000,
      method: 'bank',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('mail reset mật khẩu có hạn dùng + link dự phòng', () => {
    const { html, text } = buildPasswordResetHtml({
      token: 'abc123',
      expiresAt: new Date(Date.now() + 15 * 60000),
    });
    expect(html).toContain('15 phút');
    expect(html).toContain('/dat-lai-mat-khau?token=abc123');
    expect(html).toContain('Sao chép liên kết');
    expect(text).toContain('abc123');
  });

  it('chỉ dùng CSS inline, tương thích Outlook/Gmail', () => {
    const { html } = buildBookingConfirmationHtml({
      fullName: 'A',
      bookingCode: 'X',
      amount: 1,
      method: 'card',
    });
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toContain('display:flex');
    expect(html).not.toContain('display: flex');
    expect(html).not.toContain('grid');
    expect(html).not.toContain('<link');
  });
});

describe('link trong mail ra domain thật', () => {
  it('MAIL_SITE_URL thắng NEXT_PUBLIC_SITE_URL', () => {
    expect(
      siteUrl({
        MAIL_SITE_URL: 'https://vietjet.shop',
        NEXT_PUBLIC_SITE_URL: 'http://localhost:4028',
      } as unknown as NodeJS.ProcessEnv)
    ).toBe('https://vietjet.shop');
  });

  it('mail đặt vé và reset đều trỏ vietjet.shop, không localhost', () => {
    process.env.MAIL_SITE_URL = 'https://vietjet.shop';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:4028';
    const booking = buildBookingConfirmationHtml({
      fullName: 'A',
      bookingCode: 'X',
      amount: 1,
      method: 'card',
    });
    const reset = buildPasswordResetHtml({ token: 't', expiresAt: new Date(Date.now() + 60000) });
    for (const html of [booking.html, reset.html]) {
      expect(html).toContain('https://vietjet.shop');
      expect(html).not.toContain('localhost');
    }
  });
});

describe('visual hiện đại, không giống AI tạo', () => {
  it('phẳng, trang trọng, không emoji/tagline/gradient/pill', () => {
    const { html } = buildBookingConfirmationHtml({
      fullName: 'A',
      bookingCode: 'FG7KH9',
      amount: 1000,
      method: 'bank',
    });
    expect(html).toContain('alt="Vietjet Air"');
    expect(html).toContain('Kính chào');
    expect(html).toContain('MÃ ĐẶT CHỖ (PNR)');
    expect(html).toContain('Email này được gửi tự động');
    expect(html).not.toContain('ENJOY FLYING');
    expect(html).not.toContain('linear-gradient');
    expect(html).not.toContain('&#9992;');
    expect(html).not.toContain('dashed');
    expect(html).not.toContain('Xin chào');
  });
});
describe('logo thật trong header', () => {
  it('dùng ảnh PNG tuyệt đối, có kích thước cố định và alt', () => {
    process.env.MAIL_SITE_URL = 'https://vietjet.shop';
    expect(mailLogoUrl()).toBe('https://vietjet.shop/logo-internal.png');
    const { html } = buildBookingConfirmationHtml({
      fullName: 'A',
      bookingCode: 'X',
      amount: 1,
      method: 'card',
    });
    expect(html).toContain('src="https://vietjet.shop/logo-internal.png"');
    expect(html).toContain('width="230"');
    expect(html).toContain('height="40"');
    expect(html).toContain('alt="Vietjet Air"');
  });

  it('MAIL_LOGO_URL ghi đè khi cần', () => {
    expect(
      mailLogoUrl({
        MAIL_LOGO_URL: 'https://cdn.example.com/l.png',
      } as unknown as NodeJS.ProcessEnv)
    ).toBe('https://cdn.example.com/l.png');
  });
});

describe('mẫu đăng ký thành công và đổi mật khẩu', () => {
  it('mail chào mừng có tên, quyền lợi và CTA đặt vé', () => {
    const { subject, html, text } = buildRegistrationSuccessHtml({ fullName: 'Trần Thị B' });
    expect(subject).toContain('Chào mừng');
    expect(html).toContain('Trần Thị B');
    expect(html).toContain('Đặt vé ngay');
    expect(html).toContain('1900 1886');
    expect(text).toContain('Trần Thị B');
  });

  it('mail đổi mật khẩu cảnh báo khi không phải chính chủ', () => {
    const { subject, html } = buildPasswordChangedHtml();
    expect(subject).toContain('Mật khẩu đã được thay đổi');
    expect(html).toContain('đăng xuất');
    expect(html).toContain('1900 1886');
    expect(html).toContain('/dang-nhap');
  });

  it('escape tên trong mail chào mừng', () => {
    const { html } = buildRegistrationSuccessHtml({ fullName: '<b>C' });
    expect(html).not.toContain('<b>C');
    expect(html).toContain('&lt;b&gt;C');
  });
});
describe('mẫu email thanh toán và nghiệp vụ đặt vé mở rộng', () => {
  it('mail thông báo thanh toán (chờ VNPAY-QR/chuyển khoản)', () => {
    const { subject, html, text } = buildPaymentInstructionHtml({
      fullName: 'Hoàng Văn C',
      bookingCode: 'VJ9876',
      amount: 2500000,
      bankName: 'Ngân hàng Quốc tế Việt Nam (VIB)',
      accountNumber: '876922729',
      accountHolder: 'DANG THI NGOC HAN',
      transferNote: 'VJ VJ9876',
      expiresInMinutes: 30,
    });
    expect(subject).toContain('Thông báo thanh toán');
    expect(subject).toContain('VJ9876');
    expect(html).toContain('Hoàng Văn C');
    expect(html).toContain('VJ9876');
    expect(html).toContain('2.500.000');
    expect(html).toContain('876922729');
    expect(html).toContain('DANG THI NGOC HAN');
    expect(html).toContain('Thanh toán ngay bằng VNPAY-QR');
    expect(text).toContain('876922729');
  });

  it('QR trong mail chỉ mở ngân hàng + chủ tài khoản, không điền sẵn tiền/nội dung', () => {
    const { html } = buildPaymentInstructionHtml({
      fullName: 'Hoàng Văn C',
      bookingCode: 'VJ9876',
      amount: 2500000,
      bankName: 'Ngân hàng Quốc tế Việt Nam (VIB)',
      accountNumber: '876922729',
      accountHolder: 'DANG THI NGOC HAN',
      transferNote: 'VJ VJ9876',
      expiresInMinutes: 30,
    });

    // `img.vietqr.io` embeds `amount` / `addInfo` into the scannable payload
    // when they are present, which is exactly what we must not do: the customer
    // types both by hand.
    expect(html).not.toContain('amount=');
    expect(html).not.toContain('addInfo=');
    expect(html).toContain('accountName=DANG%20THI%20NGOC%20HAN');
    expect(html).toContain('tự nhập');
  });

  it('mail thanh toán thành công có trạng thái xác nhận và chi tiết bay', () => {
    const { subject, html, text } = buildPaymentSuccessHtml({
      fullName: 'Lê Thị D',
      bookingCode: 'VJ1234',
      amount: 3200000,
      method: 'vietqr',
      flightNumber: 'VJ128',
      route: 'Hà Nội (HAN) → TP.HCM (SGN)',
      departureTime: '14:30 15/11/2026',
    });
    expect(subject).toContain('Thanh toán thành công & Xác nhận vé');
    expect(subject).toContain('VJ1234');
    expect(html).toContain('Lê Thị D');
    expect(html).toContain('VJ1234');
    expect(html).toContain('3.200.000');
    expect(html).toContain('VJ128');
    expect(html).toContain('Hà Nội (HAN) → TP.HCM (SGN)');
    expect(html).toContain('Xem vé điện tử &amp; Quản lý chuyến bay');
    expect(text).toContain('VJ128');
  });

  it('mail thanh toán thất bại có lý do và nút thử lại', () => {
    const { subject, html, text } = buildPaymentFailedHtml({
      fullName: 'Phạm Minh E',
      bookingCode: 'VJ5555',
      amount: 1800000,
      reason: 'Biên lai giao dịch không khớp với số tiền yêu cầu',
    });
    expect(subject).toContain('Thông báo thanh toán chưa thành công');
    expect(subject).toContain('VJ5555');
    expect(html).toContain('Phạm Minh E');
    expect(html).toContain('1.800.000');
    expect(html).toContain('Biên lai giao dịch không khớp');
    expect(html).toContain('Thử lại thanh toán');
    expect(html).toContain('1900 1886');
    expect(text).toContain('Thử lại thanh toán');
  });

  it('mail thông báo hoàn tiền hiển thị phương thức và thời gian', () => {
    const { subject, html, text } = buildRefundNotificationHtml({
      fullName: 'Vũ Thị F',
      bookingCode: 'VJ7777',
      amount: 2100000,
      refundMethod: 'Tài khoản ngân hàng Vietcombank',
      reason: 'Hoàn vé theo yêu cầu của khách hàng',
    });
    expect(subject).toContain('Xác nhận hoàn tiền');
    expect(subject).toContain('VJ7777');
    expect(html).toContain('Vũ Thị F');
    expect(html).toContain('2.100.000');
    expect(html).toContain('Tài khoản ngân hàng Vietcombank');
    expect(html).toContain('3 đến 7 ngày làm việc');
    expect(text).toContain('2.100.000');
  });

  it('mail mã xác thực OTP đăng ký hiển thị hộp mã 6 số', () => {
    const { subject, html, text } = buildOtpEmailHtml({
      code: '864209',
      expiresInMinutes: 5,
      purpose: 'register',
    });
    expect(subject).toContain('864209');
    expect(subject).toContain('đăng ký tài khoản');
    expect(html).toContain('864209');
    expect(html).toContain('5 phút');
    expect(text).toContain('864209');
  });
});

describe('helper cấu hình mail', () => {
  it('normalizeMailFrom bóc dấu nháy thừa', () => {
    expect(normalizeMailFrom('"Vietjet Air <a@b>"')).toBe('Vietjet Air <a@b>');
    expect(normalizeMailFrom("'x@y'")).toBe('x@y');
    expect(normalizeMailFrom('  a@b  ')).toBe('a@b');
  });

  it('isGmailHost chỉ nhận smtp.gmail.com', () => {
    expect(isGmailHost('smtp.gmail.com')).toBe(true);
    expect(isGmailHost(' smtp.gmail.com ')).toBe(true);
    expect(isGmailHost('smtp.hostinger.com')).toBe(false);
  });

  it('resolveMailFrom ưu tiên MAIL_FROM rồi SMTP_USER', () => {
    expect(resolveMailFrom({ MAIL_FROM: '"A <a@x>"' } as unknown as NodeJS.ProcessEnv)).toBe(
      'A <a@x>'
    );
    expect(resolveMailFrom({ SMTP_USER: 'b@y' } as unknown as NodeJS.ProcessEnv)).toBe('b@y');
  });
});
