import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createCaptchaChallenge } from '@/lib/captcha';

const sqlMock = vi.fn();
const compareMock = vi.fn();
const bumpMock = vi.fn();

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
  get2FAConfig: vi.fn().mockResolvedValue(null),
  consumeBackupCodeHash: vi.fn().mockResolvedValue(false),
  createUserSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
  recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
  registerFailedLoginAttempt: (...a: unknown[]) => bumpMock(...a),
  clearFailedLoginAttempts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: (...a: [string, string]) => compareMock(...a), hash: vi.fn() },
  compare: (...a: [string, string]) => compareMock(...a),
  hash: vi.fn(),
}));

import { POST as login } from '@/app/api/xac-thuc/dang-nhap/route';

function loginRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@vietjetair.vn',
    password_hash: 'stored-hash',
    full_name: 'Vietjet User',
    role: 'user',
    phone: '0987654321',
    avatar_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    locked_until: null,
    failed_login_attempts: 0,
    salutation: null,
    last_name: null,
    first_name: null,
    skyjoy_member_id: 'SJ12345678',
    ...overrides,
  };
}

/** A real, verifiable challenge for the adaptive-CAPTCHA gate. */
function solvedCaptcha(): { captchaToken: string; captchaAnswer: string } {
  const { token, question } = createCaptchaChallenge();
  const [a, op, b] = question.split(' ');
  return {
    captchaToken: token,
    captchaAnswer: String(op === '+' ? Number(a) + Number(b) : Number(a) - Number(b)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sqlMock.mockResolvedValue([account()]);
  compareMock.mockResolvedValue(true);
  bumpMock.mockResolvedValue(null);
});

describe('Adaptive CAPTCHA on password login', () => {
  it('does not demand a CAPTCHA while the failure count is low', async () => {
    sqlMock.mockResolvedValue([account({ failed_login_attempts: 2 })]);

    const res = await login(loginRequest({ email: 'user@vietjetair.vn', password: 'pw' }));

    expect(res.status).toBe(200);
    expect(compareMock).toHaveBeenCalled();
  });

  it('demands a CAPTCHA once the count reaches the threshold', async () => {
    sqlMock.mockResolvedValue([account({ failed_login_attempts: 3 })]);

    const res = await login(loginRequest({ email: 'user@vietjetair.vn', password: 'pw' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.captchaRequired).toBe(true);
    // The password must not even be compared until the challenge is answered.
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('accepts a solved CAPTCHA and drops the challenge flag', async () => {
    sqlMock.mockResolvedValue([account({ failed_login_attempts: 3 })]);

    const res = await login(
      loginRequest({ email: 'user@vietjetair.vn', password: 'pw', ...solvedCaptcha() })
    );

    expect(res.status).toBe(200);
    expect(compareMock).toHaveBeenCalled();
  });

  it('flags captchaRequired after a failure that pushes the count to the threshold', async () => {
    bumpMock.mockResolvedValue({ failed_login_attempts: 3, locked_until: null });
    compareMock.mockResolvedValue(false);

    const res = await login(loginRequest({ email: 'user@vietjetair.vn', password: 'wrong' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.failedAttempts).toBe(3);
    expect(body.captchaRequired).toBe(true);
  });
});

describe('Temporary lockout after five failures', () => {
  it('locks the account on the fifth failure', async () => {
    bumpMock.mockResolvedValue({
      failed_login_attempts: 5,
      locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    compareMock.mockResolvedValue(false);

    const res = await login(loginRequest({ email: 'user@vietjetair.vn', password: 'wrong' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.locked).toBe(true);
    expect(res.headers.get('set-cookie') ?? '').not.toContain('access_token=');
    expect(bumpMock).toHaveBeenCalledWith('user-1');
  });

  it('refuses an already-locked account before checking the password', async () => {
    sqlMock.mockResolvedValue([
      account({ locked_until: new Date(Date.now() + 60_000).toISOString() }),
    ]);

    const res = await login(loginRequest({ email: 'user@vietjetair.vn', password: 'pw' }));

    expect(res.status).toBe(403);
    expect(compareMock).not.toHaveBeenCalled();
    expect(bumpMock).not.toHaveBeenCalled();
  });

  it('clears the counter after a successful login', async () => {
    const { clearFailedLoginAttempts } = await import('@/lib/security-db');

    const res = await login(loginRequest({ email: 'user@vietjetair.vn', password: 'pw' }));

    expect(res.status).toBe(200);
    expect(clearFailedLoginAttempts).toHaveBeenCalledWith('user-1');
  });
});
