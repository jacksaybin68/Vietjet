import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createCaptchaChallenge } from '@/lib/captcha';

const sqlMock = vi.fn();
const awardMock = vi.fn();
const verifyOtpMock = vi.fn();

vi.mock('@/lib/neon', () => ({
  sql: Object.assign((...args: unknown[]) => sqlMock(...args), {
    query: vi.fn().mockResolvedValue([]),
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  }),
}));

vi.mock('@/lib/mail', () => ({
  sendRegistrationSuccessEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/db', () => ({
  awardLoyaltyPoints: (...a: unknown[]) => awardMock(...a),
}));

vi.mock('@/lib/skyjoy-otp', () => ({
  verifyPhoneOtp: (...a: unknown[]) => verifyOtpMock(...a),
}));

import { POST as register } from '@/app/api/xac-thuc/dang-ky/route';

const REFERRER = {
  id: 'referrer-1',
  email: 'ref@example.com',
  phone: '0900000000',
  skyjoy_member_id: 'SJ12345678',
};

const NEW_USER = {
  id: 'new-user-1',
  email: 'new@example.com',
  full_name: 'NGUYEN VAN A',
  role: 'user',
  phone: null,
  dob: null,
  salutation: 'ong',
  last_name: 'NGUYEN',
  first_name: 'VAN A',
  skyjoy_member_id: 'SJ87654321',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function solvedCaptcha(): { captchaToken: string; captchaAnswer: string } {
  const { token, question } = createCaptchaChallenge();
  const [a, op, b] = question.split(' ');
  return {
    captchaToken: token,
    captchaAnswer: String(op === '+' ? Number(a) + Number(b) : Number(a) - Number(b)),
  };
}

function registerRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/dang-ky', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

/** Flush the fire-and-forget `applyReferralBonus` promise chain. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Registration — referral bonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtpMock.mockResolvedValue(true);
    awardMock.mockResolvedValue({ id: 'tx-1' });

    // The email/phone existence probes must be empty; the INSERT returns the new
    // row; the referral lookup finds the referrer.
    sqlMock.mockImplementation((strings: string[]) => {
      const text = strings.join('?');
      if (/WHERE email = \?/.test(text)) return Promise.resolve([]);
      if (/WHERE phone = \?/.test(text)) return Promise.resolve([]);
      if (/INSERT INTO user_profiles/.test(text)) return Promise.resolve([NEW_USER]);
      if (/UPPER\(skyjoy_member_id\)/.test(text)) return Promise.resolve([REFERRER]);
      if (/INSERT INTO referral_events/.test(text)) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  it('credits both sides once when a valid code is used', async () => {
    const res = await register(
      registerRequest({
        email: 'new@example.com',
        password: 'Matkhau@1',
        full_name: 'Nguyễn Văn A',
        referral_code: 'SJ12345678',
        ...solvedCaptcha(),
      })
    );

    expect(res.status).toBe(201);
    await flush();
    await flush();

    expect(awardMock).toHaveBeenCalledTimes(2);
    expect(awardMock).toHaveBeenCalledWith(
      'new-user-1',
      500,
      expect.stringContaining('SJ12345678')
    );
    expect(awardMock).toHaveBeenCalledWith(
      'referrer-1',
      500,
      expect.stringContaining('SJ12345678')
    );
  });

  it('records the referral event with the bonus points', async () => {
    await register(
      registerRequest({
        email: 'new@example.com',
        password: 'Matkhau@1',
        full_name: 'Nguyễn Văn A',
        referral_code: 'SJ12345678',
        ...solvedCaptcha(),
      })
    );
    await flush();
    await flush();

    const eventIndex = sqlMock.mock.calls.findIndex((c) =>
      /INSERT INTO referral_events/.test((c[0] as string[]).join('?'))
    );
    expect(eventIndex).toBeGreaterThanOrEqual(0);
    const values = sqlMock.mock.calls[eventIndex].slice(1) as unknown[];
    // referee_user_id, referrer_user_id, referral_code, points_awarded
    expect(values[0]).toBe('new-user-1');
    expect(values[1]).toBe('referrer-1');
    expect(values[2]).toBe('SJ12345678');
    expect(values[3]).toBe(500);
  });

  it('ignores a malformed referral code', async () => {
    const res = await register(
      registerRequest({
        email: 'new@example.com',
        password: 'Matkhau@1',
        full_name: 'Nguyễn Văn A',
        referral_code: 'not-a-code',
        ...solvedCaptcha(),
      })
    );

    expect(res.status).toBe(201);
    await flush();
    expect(awardMock).not.toHaveBeenCalled();
    expect(
      sqlMock.mock.calls.some((c) => /referral_events/.test((c[0] as string[]).join('?')))
    ).toBe(false);
  });
});

describe('Registration — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtpMock.mockResolvedValue(true);
    awardMock.mockResolvedValue({ id: 'tx-1' });
    sqlMock.mockImplementation((strings: string[]) => {
      const text = strings.join('?');
      if (/INSERT INTO user_profiles/.test(text)) return Promise.resolve([NEW_USER]);
      return Promise.resolve([]);
    });
  });

  it('requires a valid CAPTCHA always', async () => {
    const res = await register(
      registerRequest({
        email: 'new@example.com',
        password: 'Matkhau@1',
        full_name: 'Nguyễn Văn A',
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).captchaRequired).toBe(true);
  });

  it('rejects an unknown salutation', async () => {
    const res = await register(
      registerRequest({
        email: 'new@example.com',
        password: 'Matkhau@1',
        full_name: 'Nguyễn Văn A',
        salutation: 'mr',
        ...solvedCaptcha(),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/danh xưng/i);
  });

  it('normalises a phone registration into passport-case name fields', async () => {
    const res = await register(
      registerRequest({
        phone: '0986349061',
        password: 'Matkhau@1',
        last_name: 'nguyễn',
        first_name: 'văn a',
        ...solvedCaptcha(),
      })
    );

    expect(res.status).toBe(201);
    expect(verifyOtpMock).toHaveBeenCalledWith('0986349061', 'register', '');

    const insertIndex = sqlMock.mock.calls.findIndex((c) =>
      /INSERT INTO user_profiles/.test((c[0] as string[]).join('?'))
    );
    const values = sqlMock.mock.calls[insertIndex].slice(1) as unknown[];
    // full_name, role, phone, dob, salutation, last_name, first_name
    expect(values[2]).toBe('NGUYEN VAN A');
    expect(values[6]).toBe('NGUYEN');
    expect(values[7]).toBe('VAN A');
    expect(values[3]).toBe('0986349061');
  });

  it('refuses a phone registration whose OTP does not check out', async () => {
    verifyOtpMock.mockResolvedValue(false);
    const res = await register(
      registerRequest({
        phone: '0986349061',
        password: 'Matkhau@1',
        last_name: 'nguyễn',
        first_name: 'văn a',
        ...solvedCaptcha(),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/OTP/i);
  });
});
