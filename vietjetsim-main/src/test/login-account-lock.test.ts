import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const sqlMock = vi.fn();

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

import { POST as login } from '@/app/api/xac-thuc/dang-nhap/route';

function loginRequest(email: string, password: string) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

const baseUser = {
  id: 'user-1',
  email: 'locked@vietjetsim.vn',
  password_hash: 'irrelevant-because-lock-is-checked-first',
  full_name: 'Locked User',
  role: 'user',
  phone: null,
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('Login blocked for locked accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a locked account with 403 before checking the password', async () => {
    sqlMock.mockResolvedValueOnce([{ ...baseUser, locked_until: '9999-12-31T23:59:59.000Z' }]);

    const res = await login(loginRequest('locked@vietjetsim.vn', 'whatever'));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/khoá/i);
  });

  it('rejects a locked account with a past-due temporary lock released', async () => {
    sqlMock.mockResolvedValueOnce([{ ...baseUser, locked_until: '2000-01-01T00:00:00.000Z' }]);

    const res = await login(loginRequest('locked@vietjetsim.vn', 'wrong-password'));

    // Past lock no longer applies, so the failure is the password (401), not the lock (403).
    expect(res.status).toBe(401);
  });

  it('returns 401 for an unknown identifier', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const res = await login(loginRequest('nobody@vietjetsim.vn', 'whatever'));

    expect(res.status).toBe(401);
  });
});