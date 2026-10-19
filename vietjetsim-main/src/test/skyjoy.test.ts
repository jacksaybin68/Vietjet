import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SALUTATION,
  OTP_LENGTH,
  SALUTATIONS,
  generateSkyjoyMemberId,
  isSalutation,
  isSkyjoyMemberId,
  isValidOtpCode,
  isValidReferralCode,
  normalizeOtpCode,
  normalizePassportName,
  normalizeSkyjoyMemberId,
  salutationLabel,
} from '@/lib/skyjoy';

describe('SkyJoy salutation', () => {
  it('offers the four ICAO values and defaults to Ông', () => {
    expect(SALUTATIONS.map((s) => s.value)).toEqual(['ong', 'ba', 'co', 'anh']);
    expect(DEFAULT_SALUTATION).toBe('ong');
  });

  it('validates only the known values', () => {
    expect(isSalutation('ba')).toBe(true);
    expect(isSalutation('mr')).toBe(false);
    expect(isSalutation(null)).toBe(false);
  });

  it('maps a value to its Vietnamese label, empty for unknown', () => {
    expect(salutationLabel('co')).toBe('Cô');
    expect(salutationLabel('nope')).toBe('');
    expect(salutationLabel(null)).toBe('');
  });
});

describe('normalizePassportName', () => {
  it('uppercases and strips Vietnamese diacritics', () => {
    expect(normalizePassportName('Nguyễn Văn A')).toBe('NGUYEN VAN A');
  });

  it('handles đ/Đ, which NFD does not decompose', () => {
    expect(normalizePassportName('Đặng Thị Đào')).toBe('DANG THI DAO');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizePassportName('  Lê   Minh   Tuấn  ')).toBe('LE MINH TUAN');
  });

  it('drops control/symbol characters a pasted name might carry', () => {
    expect(normalizePassportName('Trần <script>')).toBe('TRAN SCRIPT');
    // Hyphen and apostrophe are kept on purpose (O'Connor, Nguyen-Thi).
    expect(normalizePassportName("O'Neil-Bảo")).toBe("O'NEIL-BAO");
  });

  it('returns an empty string for empty input', () => {
    expect(normalizePassportName('')).toBe('');
    expect(normalizePassportName(null)).toBe('');
    expect(normalizePassportName(undefined)).toBe('');
  });
});

describe('SkyJoy member id', () => {
  it('generates SJ + 8 digits', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateSkyjoyMemberId()).toMatch(/^SJ\d{8}$/);
    }
  });

  it('accepts 8–10 digits and rejects anything else', () => {
    expect(isSkyjoyMemberId('SJ12345678')).toBe(true);
    expect(isSkyjoyMemberId('sj1234567890')).toBe(true); // case + 10 digits
    expect(isSkyjoyMemberId('SJ1234567')).toBe(false); // 7 digits
    expect(isSkyjoyMemberId('SJ12345678901')).toBe(false); // 11 digits
    expect(isSkyjoyMemberId('AB12345678')).toBe(false);
  });

  it('normalises spacing and case before checking', () => {
    expect(normalizeSkyjoyMemberId('  sj 12345678 ')).toBe('SJ12345678');
    expect(isSkyjoyMemberId(' sj 12345678 ')).toBe(true);
  });
});

describe('Referral code', () => {
  it('is exactly the member-id shape', () => {
    expect(isValidReferralCode('SJ12345678')).toBe(true);
    expect(isValidReferralCode('not-a-code')).toBe(false);
    expect(isValidReferralCode(null)).toBe(false);
  });
});

describe('OTP helpers', () => {
  it('normalises to exactly six digits', () => {
    expect(OTP_LENGTH).toBe(6);
    expect(normalizeOtpCode('12 34-56')).toBe('123456');
    expect(normalizeOtpCode('1234567890')).toBe('123456');
    expect(normalizeOtpCode('abc')).toBe('');
  });

  it('validates only a full-length numeric code', () => {
    expect(isValidOtpCode('012345')).toBe(true);
    expect(isValidOtpCode('12345')).toBe(false);
    expect(isValidOtpCode('1234a5')).toBe(false);
    expect(isValidOtpCode(null)).toBe(false);
  });
});
