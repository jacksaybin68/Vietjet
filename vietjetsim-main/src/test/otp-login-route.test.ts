import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const sqlMock = vi.fn();
const verifyOtpMock = vi.fn();
const lookupMock = vi.fn();
const sessionMock = vi.fn();
const recordLoginMock = vi.fn();
const bumpMock = vi.fn();
const clearMock = vi.fn();

vi.mock('@/lib/neon', () => ({
  sql: Object.assign((...args: unknown[]) => sqlMock(...args), {
    query: vi.fn().mockResolvedValue([]),
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  }),
}));

vi.mock('@/lib/skyjoy-otp', () => ({
  verifyPhoneOtp: (...a: unknown[]) => verifyOtpMock(...a),
}));

vi.mock('@/lib/account-lookup', () => ({
  findAccountByIdentifier: (...a: unknown[]) => lookupMock(...a),
}));

vi.mock('@/lib/security-db', () => ({
  createUserSession: (...a: unknown[]) => sessionMock(...a),
  recordLoginAttempt: (...a: unknown[]) => recordLoginMock(...a),
  registerFailedLoginAttempt: (...a: unknown[]) => bumpMock(...a),
  clearFailedLoginAttempts: (...a: unknown[]) => clearMock(...a),
}));

vi.mock('@/lib/db', () => ({
  storeRefreshToken: vi.fn().mockResolvedValue(undefined),
}));

import { POST as loginOtp } from '@/app/api/xac-thuc/dang-nhap-otp/route';

const ACCOUNT = {
  id: 'user-1',
  email: 'user@example.com',
  password_hash: null,
  full_name: 'Vietjet User',
  role: 'user',
  phone: '0986349061',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  locked_until: null as string | null,
  failed_login_attempts: 0,
  salutation: null,
  last_name: null,
  first_name: null,
  skyjoy_member_id: 'SJ12345678',
};

function otpRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/dang-nhap-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sqlMock.mockResolvedValue([]);
  lookupMock.mockResolvedValue({ ...ACCOUNT });
  verifyOtpMock.mockResolvedValue(true);
  sessionMock.mockResolvedValue({ id: 'session-1' });
  recordLoginMock.mockResolvedValue(undefined);
  bumpMock.mockResolvedValue(null);
  clearMock.mockResolvedValue(undefined);
});

describe('POST /api/xac-thuc/dang-nhap-otp', () => {
  it('rejects a request missing the identifier or code', async () => {
    const res = await loginOtp(otpRequest({ identifier: 'user@example.com' }));
    expect(res.status).toBe(400);
  });

  it('issues a session for the correct code and resets the failure counter', async () => {
    const res = await loginOtp(otpRequest({ identifier: 'user@example.com', code: '123456' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie') ?? '').toContain('access_token=');
    expect(verifyOtpMock).toHaveBeenCalledWith('0986349061', 'login', '123456');
    expect(clearMock).toHaveBeenCalledWith('user-1');
    expect(bumpMock).not.toHaveBeenCalled();
  });

  it('gives the same 401 for an unknown account as for a wrong code', async () => {
    lookupMock.mockResolvedValue(null);
    const unknown = await loginOtp(otpRequest({ identifier: 'ghost@example.com', code: '123456' }));
    const unknownBody = await unknown.json();

    lookupMock.mockResolvedValue({ ...ACCOUNT });
    verifyOtpMock.mockResolvedValue(false);
    const wrong = await loginOtp(otpRequest({ identifier: 'user@example.com', code: '000000' }));
    const wrongBody = await wrong.json();

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknownBody.error).toBe(wrongBody.error);
    expect(unknown.headers.get('set-cookie') ?? '').not.toContain('access_token=');
  });

  it('rejects an account with no phone number on file', async () => {
    lookupMock.mockResolvedValue({ ...ACCOUNT, phone: null });
    const res = await loginOtp(otpRequest({ identifier: 'user@example.com', code: '123456' }));
    expect(res.status).toBe(401);
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it('counts a wrong code toward the lockout', async () => {
    verifyOtpMock.mockResolvedValue(false);
    const res = await loginOtp(otpRequest({ identifier: 'user@example.com', code: '000000' }));

    expect(res.status).toBe(401);
    expect(bumpMock).toHaveBeenCalledWith('user-1');
    expect(recordLoginMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ success: false, failureReason: 'invalid_otp' })
    );
  });

  it('locks the account once the failure counter crosses the threshold', async () => {
    verifyOtpMock.mockResolvedValue(false);
    bumpMock.mockResolvedValue({
      failed_login_attempts: 5,
      locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    const res = await loginOtp(otpRequest({ identifier: 'user@example.com', code: '000000' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.locked).toBe(true);
    expect(res.headers.get('set-cookie') ?? '').not.toContain('access_token=');
  });

  it('refuses an already-locked account even with the right code', async () => {
    lookupMock.mockResolvedValue({
      ...ACCOUNT,
      locked_until: new Date(Date.now() + 60_000).toISOString(),
    });

    const res = await loginOtp(otpRequest({ identifier: 'user@example.com', code: '123456' }));

    expect(res.status).toBe(403);
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });
});
