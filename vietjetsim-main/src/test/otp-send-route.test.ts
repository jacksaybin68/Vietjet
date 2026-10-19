import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createCaptchaChallenge } from '@/lib/captcha';

const sqlMock = vi.fn();
const createOtpMock = vi.fn();
const sendSmsMock = vi.fn();
const lookupMock = vi.fn();

vi.mock('@/lib/neon', () => ({
  sql: Object.assign((...args: unknown[]) => sqlMock(...args), {
    query: vi.fn().mockResolvedValue([]),
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  }),
}));

vi.mock('@/lib/skyjoy-otp', () => ({
  createPhoneOtp: (...a: unknown[]) => createOtpMock(...a),
  sendOtpSms: (...a: unknown[]) => sendSmsMock(...a),
}));

vi.mock('@/lib/account-lookup', () => ({
  findAccountByIdentifier: (...a: unknown[]) => lookupMock(...a),
}));

import { POST as sendOtp } from '@/app/api/xac-thuc/otp/gui/route';

function otpRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/otp/gui', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

/** A real, verifiable challenge so the CAPTCHA gate is exercised, not bypassed. */
function captchaFields(): { captchaToken: string; captchaAnswer: string } {
  const { token, question } = createCaptchaChallenge();
  const [a, op, b] = question.split(' ');
  return {
    captchaToken: token,
    captchaAnswer: String(op === '+' ? Number(a) + Number(b) : Number(a) - Number(b)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sqlMock.mockResolvedValue([]);
  createOtpMock.mockResolvedValue({ code: '654321', expiresAt: new Date() });
  sendSmsMock.mockResolvedValue(false);
  lookupMock.mockResolvedValue(null);
});

describe('POST /api/xac-thuc/otp/gui', () => {
  it('refuses to send without a valid CAPTCHA', async () => {
    const res = await sendOtp(otpRequest({ phone: '0986349061', purpose: 'register' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.captchaRequired).toBe(true);
    expect(createOtpMock).not.toHaveBeenCalled();
  });

  it('sends a registration OTP and echoes devCode outside production', async () => {
    const res = await sendOtp(
      otpRequest({ phone: '0986349061', purpose: 'register', ...captchaFields() })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.devCode).toBe('654321');
    expect(createOtpMock).toHaveBeenCalledWith('0986349061', 'register');
    expect(sendSmsMock).toHaveBeenCalledWith('0986349061', '654321', 'register');
  });

  it('rejects a registration OTP when the number already has an account', async () => {
    sqlMock.mockResolvedValue([{ id: 'existing' }]);

    const res = await sendOtp(
      otpRequest({ phone: '0986349061', purpose: 'register', ...captchaFields() })
    );

    expect(res.status).toBe(409);
    expect(createOtpMock).not.toHaveBeenCalled();
  });

  it('answers a login OTP request like a hit when the account is unknown', async () => {
    lookupMock.mockResolvedValue(null);

    const res = await sendOtp(
      otpRequest({ identifier: 'nobody@example.com', purpose: 'login', ...captchaFields() })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // No code was created, so there is nothing to leak back to the caller.
    expect(body.devCode).toBeUndefined();
    expect(createOtpMock).not.toHaveBeenCalled();
  });

  it('texts the number on file for a known login identifier', async () => {
    lookupMock.mockResolvedValue({ id: 'user-1', phone: '0986349061' });

    const res = await sendOtp(
      otpRequest({ identifier: 'user@example.com', purpose: 'login', ...captchaFields() })
    );

    expect(res.status).toBe(200);
    expect(createOtpMock).toHaveBeenCalledWith('0986349061', 'login');
    expect((await res.json()).devCode).toBe('654321');
  });
});
