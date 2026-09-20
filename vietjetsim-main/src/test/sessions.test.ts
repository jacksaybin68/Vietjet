import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';

const sessionsMock = vi.fn();
const historyMock = vi.fn();
const deleteMock = vi.fn();
const deleteAllMock = vi.fn();

vi.mock('@/lib/security-db', () => ({
  getUserSessions: (...a: unknown[]) => sessionsMock(...a),
  getLoginHistory: (...a: unknown[]) => historyMock(...a),
  deleteUserSession: (...a: unknown[]) => deleteMock(...a),
  deleteAllUserSessions: (...a: unknown[]) => deleteAllMock(...a),
}));

let currentSessionId: string | undefined = 'session-1';
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (currentSessionId ? { name, value: currentSessionId } : undefined),
  }),
}));

vi.mock('@/lib/neon', () => {
  const sqlMock = Object.assign(vi.fn().mockResolvedValue([]), {
    query: vi.fn().mockResolvedValue([]),
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  });
  return { sql: sqlMock };
});

import {
  GET as getSessions,
  DELETE as deleteSession,
} from '@/app/api/nguoi-dung/bao-mat/phien/route';

const CSRF_TOKEN = 'test-csrf-token';
const TOKEN = signAccessToken({
  userId: 'user-1',
  email: 'user@vietjetsim.vn',
  role: 'user',
  fullName: 'Test User',
});

const headers = {
  cookie: `access_token=${TOKEN}; csrf_token=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
};

function req(query: string, method = 'GET') {
  return new NextRequest(`http://localhost:4028/api/nguoi-dung/bao-mat/phien${query}`, {
    method,
    headers,
  });
}

const session = (id: string) => ({
  id,
  device_name: 'Chrome trên Windows',
  device_type: 'desktop',
  browser: 'Chrome',
  os: 'Windows',
  ip_address: '127.0.0.1',
  last_active: '2026-01-01T00:00:00.000Z',
  is_current: false,
  created_at: '2026-01-01T00:00:00.000Z',
});

describe('Session management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSessionId = 'session-1';
    sessionsMock.mockResolvedValue([session('session-1'), session('session-2')]);
    historyMock.mockResolvedValue([]);
    deleteMock.mockResolvedValue(undefined);
    deleteAllMock.mockResolvedValue(undefined);
  });

  it('requires authentication', async () => {
    const res = await getSessions(new NextRequest('http://localhost:4028/x'));
    expect(res.status).toBe(401);
  });

  it('marks the session named by the cookie as current', async () => {
    const res = await getSessions(req('?type=sessions'));
    const body = await res.json();

    expect(body.sessions.find((s: { id: string }) => s.id === 'session-1').is_current).toBe(true);
    expect(body.sessions.find((s: { id: string }) => s.id === 'session-2').is_current).toBe(false);
  });

  it('marks nothing current when the cookie is absent', async () => {
    currentSessionId = undefined;
    const res = await getSessions(req('?type=sessions'));
    const body = await res.json();

    expect(body.sessions.every((s: { is_current: boolean }) => !s.is_current)).toBe(true);
  });

  it('returns login history for type=history', async () => {
    historyMock.mockResolvedValue([{ id: 'h1', success: true }]);
    const res = await getSessions(req('?type=history'));

    expect((await res.json()).history).toHaveLength(1);
    expect(sessionsMock).not.toHaveBeenCalled();
  });

  it('scopes single-session deletion to the authenticated user', async () => {
    const res = await deleteSession(req('?sessionId=session-2', 'DELETE'));

    expect(res.status).toBe(200);
    // The user id always comes from the token, never from the query string.
    expect(deleteMock).toHaveBeenCalledWith('user-1', 'session-2');
  });

  it('rejects deletion without a session id', async () => {
    const res = await deleteSession(req('', 'DELETE'));
    expect(res.status).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('logs out all sessions through the action parameter', async () => {
    const res = await deleteSession(req('?action=logoutAll', 'DELETE'));

    expect(res.status).toBe(200);
    expect(deleteAllMock).toHaveBeenCalledWith('user-1');
  });

  it('refuses a mutating request without a CSRF token', async () => {
    const res = await deleteSession(
      new NextRequest('http://localhost:4028/api/nguoi-dung/bao-mat/phien?sessionId=x', {
        method: 'DELETE',
        headers: { cookie: `access_token=${TOKEN}` },
      })
    );

    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
