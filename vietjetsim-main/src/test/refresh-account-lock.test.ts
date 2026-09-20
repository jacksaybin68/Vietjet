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
  getStoredRefreshToken: vi.fn().mockResolvedValue({ family_id: 'family-1' }),
  rotateRefreshToken: vi.fn().mockResolvedValue({ success: true }),
  revokeRefreshTokenFamily: vi.fn(),
}));

import { POST as refresh } from '@/app/api/xac-thuc/lam-moi/route';
import { signRefreshToken } from '@/lib/auth';

function refreshRequest(token: string) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/lam-moi', {
    method: 'POST',
    headers: { cookie: `refresh_token=${token}` },
  });
}

const tokenPayload = {
  userId: 'user-1',
  email: 'locked@vietjetsim.vn',
  role: 'user' as const,
  fullName: 'Locked User',
};

describe('Refresh blocked for locked accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses to rotate tokens for a locked account', async () => {
    sqlMock.mockResolvedValueOnce([{ locked_until: '9999-12-31T23:59:59.000Z' }]);

    const res = await refresh(refreshRequest(signRefreshToken(tokenPayload)));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/khoá/i);
  });

  it('rejects an unsigned/invalid refresh token with 401', async () => {
    const res = await refresh(refreshRequest('not-a-jwt'));

    expect(res.status).toBe(401);
    expect(sqlMock).not.toHaveBeenCalled();
  });
});