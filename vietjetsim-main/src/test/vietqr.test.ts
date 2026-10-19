import { describe, it, expect } from 'vitest';
import {
  buildVietQrPayload,
  crc16Ccitt,
  sanitizeVietQrText,
  VIETQR_GUID,
  VIETQR_CURRENCY_VND,
} from '@/lib/vietqr';

describe('VietQR EMVCo payload', () => {
  it('CRC16-CCITT khớp vector chuẩn của EMVCo ("123456789" → 0x29B1)', () => {
    expect(crc16Ccitt('123456789')).toBe('29B1');
  });

  it('sanitize bỏ dấu, in hoa và bỏ ký tự lạ', () => {
    expect(sanitizeVietQrText('VJ ABC123 — đặt chỗ Nguyễn Văn A')).toBe(
      'VJ ABC123 DAT CHO NGUYEN VAN A'
    );
  });

  it('payload đủ field bắt buộc: format, NAPAS GUID, tiền VND, quốc gia VN', () => {
    const payload = buildVietQrPayload({
      bin: '970422',
      accountNumber: '0123456789',
      amount: 1_500_000,
      addInfo: 'VJ ABC123',
      bankName: 'MB Bank',
    });

    expect(payload.startsWith('000201')).toBe(true); // Payload Format Indicator
    expect(payload).toContain(`00${String(VIETQR_GUID.length).padStart(2, '0')}${VIETQR_GUID}`);
    expect(payload).toContain('0106970422'); // BIN
    expect(payload).toContain('02100123456789'); // Số tài khoản
    expect(payload).toContain(`5303${VIETQR_CURRENCY_VND}`); // VND
    expect(payload).toContain('54071500000'); // Số tiền không dấu phân cách
    expect(payload).toContain('5802VN');
  });

  it('PNR nằm trong additional data (62/08) để ngân hàng hiện khi chuyển', () => {
    const payload = buildVietQrPayload({
      bin: '970419',
      accountNumber: '999999',
      amount: 850_000,
      addInfo: 'VJ XY7K9P',
    });
    expect(payload).toContain('VJ XY7K9P');
  });

  it('kết thúc bằng field CRC 6304 + đúng giá trị tính riêng', () => {
    const payload = buildVietQrPayload({
      bin: '970415',
      accountNumber: '123456',
      amount: 100_000,
      addInfo: 'VJ TEST',
    });
    const body = payload.slice(0, -8); // bỏ "6304" + 4 ký tự CRC
    expect(payload.startsWith(`${body}6304`)).toBe(true);
    expect(payload.slice(-4)).toBe(crc16Ccitt(`${body}6304`));
  });

  it('thiếu BIN hoặc STK thì ném lỗi thay vì trả payload hỏng', () => {
    expect(() =>
      buildVietQrPayload({ bin: '', accountNumber: '123', amount: 1, addInfo: 'X' })
    ).toThrow();
    expect(() =>
      buildVietQrPayload({ bin: '970422', accountNumber: 'abc', amount: 1, addInfo: 'X' })
    ).toThrow();
  });
});
