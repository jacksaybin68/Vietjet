import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { hashToken } from '@/lib/auth';

const sqlMock = vi.fn();

vi.mock('@/lib/neon', () => ({
  sql: Object.assign((...args: unknown[]) => sqlMock(...args), {
    query: vi.fn().mockResolvedValue([]),
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  }),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-new-password'), compare: vi.fn() },
  hash: vi.fn().mockResolvedValue('hashed-new-password'),
  compare: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  updateUserPassword: vi.fn().mockResolvedValue(undefined),
  invalidateUserRefreshTokens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/security-db', () => ({
  deleteAllUserSessions: vi.fn().mockResolvedValue(undefined),
}));

import { POST as forgot } from '@/app/api/xac-thuc/quen-mat-khau/route';
import { POST as reset, GET as verifyToken } from '@/app/api/xac-thuc/dat-lai-mat-khau/route';
import { updateUserPassword, invalidateUserRefreshTokens } from '@/lib/db';
import { deleteAllUserSessions } from '@/lib/security-db';

const CSRF_TOKEN = 'csrf-test-token';

function makeRequest(url: string, body?: unknown, method = 'POST') {
  return new NextRequest(`http://localhost:4028${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `csrf_token=${CSRF_TOKEN}`,
      'x-csrf-token': CSRF_TOKEN,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Forgot password request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects a mutation without a valid CSRF token', async () => {
    const req = new NextRequest('http://localhost:4028/api/xac-thuc/quen-mat-khau', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });

    const res = await forgot(req);
    expect(res.status).toBe(403);
  });

  it('requires an identifier', async () => {
    const res = await forgot(makeRequest('/api/xac-thuc/quen-mat-khau', { email: '  ' }));
    expect(res.status).toBe(400);
  });

  it('answers generically for an unknown account and issues no token', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const res = await forgot(makeRequest('/api/xac-thuc/quen-mat-khau', { email: 'nobody@x.com' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(body).not.toHaveProperty('resetUrl');
  });

  it('issues a hashed token and echoes the link outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    sqlMock
      .mockResolvedValueOnce([{ id: 'user-1', email: 'user@vietjetsim.vn' }]) // lookup
      .mockResolvedValueOnce([]) // invalidate existing tokens
      .mockResolvedValueOnce([]); // insert new token

    const res = await forgot(
      makeRequest('/api/xac-thuc/quen-mat-khau', { email: 'user@vietjetsim.vn' })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.resetUrl).toContain('/dat-lai-mat-khau?token=');
  });
});

describe('Reset password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects an invalid or expired token', async () => {
    sqlMock.mockResolvedValueOnce([]); // getValidResetRequest finds nothing

    const res = await reset(
      makeRequest('/api/xac-thuc/dat-lai-mat-khau', { token: 'deadbeef', password: 'Strong@Pass1' })
    );
    expect(res.status).toBe(400);
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('enforces the password policy before consuming the token', async () => {
    const res = await reset(
      makeRequest('/api/xac-thuc/dat-lai-mat-khau', { token: 'abc', password: 'weak' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('8 ký tự');
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('updates the password, spends the token and revokes sessions', async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: 'rec-1', user_id: 'user-1', email: 'u@x.com' }]) // valid token
      .mockResolvedValueOnce([{ id: 'rec-1' }]); // conditional consume succeeds

    const res = await reset(
      makeRequest('/api/xac-thuc/dat-lai-mat-khau', {
        token: 'valid-token',
        password: 'Strong@Pass1',
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(updateUserPassword).toHaveBeenCalledWith('user-1', 'hashed-new-password');
    expect(invalidateUserRefreshTokens).toHaveBeenCalledWith('user-1');
    expect(deleteAllUserSessions).toHaveBeenCalledWith('user-1');
  });

  it('does not change the password when the token loses the consume race', async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: 'rec-1', user_id: 'user-1', email: 'u@x.com' }]) // still valid
      .mockResolvedValueOnce([]); // another request already spent it

    const res = await reset(
      makeRequest('/api/xac-thuc/dat-lai-mat-khau', {
        token: 'raced-token',
        password: 'Strong@Pass1',
      })
    );

    expect(res.status).toBe(400);
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('reports token validity without a session', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'rec-1', user_id: 'user-1', email: null }]);
    const ok = await verifyToken(
      new NextRequest('http://localhost:4028/api/xac-thuc/dat-lai-mat-khau?token=live')
    );
    expect((await ok.json()).valid).toBe(true);

    sqlMock.mockResolvedValueOnce([]);
    const bad = await verifyToken(
      new NextRequest('http://localhost:4028/api/xac-thuc/dat-lai-mat-khau?token=gone')
    );
    expect((await bad.json()).valid).toBe(false);
  });
});

describe('password-reset token hashing', () => {
  it('never stores the plaintext token', () => {
    const token = 'plaintext-token';
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toHaveLength(64);
  });
});
