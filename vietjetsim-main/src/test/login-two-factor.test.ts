import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { generateSync } from 'otplib';
import { hashBackupCode } from '@/lib/two-factor';

const sqlMock = vi.fn();
const configMock = vi.fn();
const consumeMock = vi.fn();
const createSessionMock = vi.fn();
const recordLoginMock = vi.fn();

vi.mock('@/lib/neon', () => ({
  sql: Object.assign((...args: unknown[]) => sqlMock(...args), {
    query: vi.fn().mockResolvedValue([]),
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  }),
}));

vi.mock('@/lib/db', () => ({
  storeRefreshToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/security-db', () => ({
  get2FAConfig: (...a: unknown[]) => configMock(...a),
  consumeBackupCodeHash: (...a: unknown[]) => consumeMock(...a),
  createUserSession: (...a: unknown[]) => createSessionMock(...a),
  recordLoginAttempt: (...a: unknown[]) => recordLoginMock(...a),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn().mockResolvedValue(true), hash: vi.fn() },
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn(),
}));

import { POST as login } from '@/app/api/xac-thuc/dang-nhap/route';

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

function loginRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

const userRow = {
  id: 'user-1',
  email: 'twofa@vietjetsim.vn',
  password_hash: 'hash',
  full_name: 'Two Factor User',
  role: 'user',
  phone: null,
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  locked_until: null,
};

describe('Login second factor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlMock.mockResolvedValue([userRow]);
    createSessionMock.mockResolvedValue({ id: 'session-1' });
    recordLoginMock.mockResolvedValue(undefined);
    consumeMock.mockResolvedValue(false);
  });

  it('challenges for a token when 2FA is enabled', async () => {
    configMock.mockResolvedValue({ secret: SECRET, is_enabled: true });

    const res = await login(loginRequest({ email: userRow.email, password: 'pw' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.requires2FA).toBe(true);
    // No session cookie may be issued before the second factor is proven.
    expect(res.headers.get('set-cookie') ?? '').not.toContain('access_token=');
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong token and records the failure', async () => {
    configMock.mockResolvedValue({ secret: SECRET, is_enabled: true });

    const res = await login(
      loginRequest({ email: userRow.email, password: 'pw', token: '000000' })
    );

    expect(res.status).toBe(401);
    expect(recordLoginMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ success: false, failureReason: 'invalid_2fa_token' })
    );
  });

  it('issues cookies for a valid TOTP token', async () => {
    configMock.mockResolvedValue({ secret: SECRET, is_enabled: true });

    const res = await login(
      loginRequest({
        email: userRow.email,
        password: 'pw',
        token: generateSync({ secret: SECRET }),
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie') ?? '').toContain('access_token=');
    expect(createSessionMock).toHaveBeenCalled();
  });

  it('accepts a valid backup code in place of a TOTP token', async () => {
    configMock.mockResolvedValue({ secret: SECRET, is_enabled: true });
    consumeMock.mockResolvedValue(true);

    const res = await login(
      loginRequest({ email: userRow.email, password: 'pw', token: 'abcd-efgh' })
    );

    expect(res.status).toBe(200);
    // The code is matched by digest, never stored or compared in the clear.
    expect(consumeMock).toHaveBeenCalledWith('user-1', hashBackupCode('abcd-efgh'));
  });

  it('does not consult 2FA state when the feature is off', async () => {
    configMock.mockResolvedValue(null);

    const res = await login(loginRequest({ email: userRow.email, password: 'pw' }));

    expect(res.status).toBe(200);
    expect(consumeMock).not.toHaveBeenCalled();
  });
});
