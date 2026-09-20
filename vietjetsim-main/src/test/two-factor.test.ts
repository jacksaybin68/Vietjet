import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { generateSync } from 'otplib';
import {
  createBackupCodes,
  createTotpSecret,
  hashBackupCode,
  normalizeBackupCode,
  verifyTotpToken,
} from '@/lib/two-factor';
import { describeDevice } from '@/lib/user-agent';

// ---------------------------------------------------------------------------
// The 2FA route delegates persistence to security-db, so the interesting
// behaviour under test is the enrollment/verification state machine — not SQL.
// ---------------------------------------------------------------------------

const configMock = vi.fn();
const upsertMock = vi.fn();
const enableMock = vi.fn();
const disableMock = vi.fn();

vi.mock('@/lib/security-db', () => ({
  get2FAConfig: (...a: unknown[]) => configMock(...a),
  upsert2FASecret: (...a: unknown[]) => upsertMock(...a),
  enable2FA: (...a: unknown[]) => enableMock(...a),
  disable2FA: (...a: unknown[]) => disableMock(...a),
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
  GET as get2FA,
  POST as post2FA,
  DELETE as delete2FA,
} from '@/app/api/nguoi-dung/bao-mat/2fa/route';

const CSRF_TOKEN = 'test-csrf-token';
const accessToken = signAccessToken({
  userId: 'user-1',
  email: 'user@vietjetsim.vn',
  role: 'user',
  fullName: 'Test User',
});

function authHeaders(extra: Record<string, string> = {}) {
  return {
    cookie: `access_token=${accessToken}; csrf_token=${CSRF_TOKEN}`,
    'x-csrf-token': CSRF_TOKEN,
    'content-type': 'application/json',
    ...extra,
  };
}

function post(body: unknown) {
  return new NextRequest('http://localhost:4028/api/nguoi-dung/bao-mat/2fa', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

function get() {
  return new NextRequest('http://localhost:4028/api/nguoi-dung/bao-mat/2fa', {
    headers: authHeaders(),
  });
}

function del() {
  return new NextRequest('http://localhost:4028/api/nguoi-dung/bao-mat/2fa', {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

describe('TOTP and backup-code primitives', () => {
  it('accepts the code generated from a secret and rejects a wrong one', () => {
    const secret = createTotpSecret();
    const token = generateSync({ secret });

    expect(verifyTotpToken(secret, token)).toBe(true);
    expect(verifyTotpToken(secret, '000000')).toBe(false);
  });

  it('rejects malformed tokens without throwing', () => {
    const secret = createTotpSecret();
    expect(verifyTotpToken(secret, 'abcdef')).toBe(false);
    expect(verifyTotpToken(secret, '')).toBe(false);
    expect(verifyTotpToken('not-a-secret', '123456')).toBe(false);
  });

  it('hashes backup codes consistently and ignores formatting differences', () => {
    const plain = 'abcd-efgh';
    expect(hashBackupCode(plain)).toBe(hashBackupCode('ABCD EFGH'));
    expect(normalizeBackupCode(' ABCD-EFGH ')).toBe('abcdefgh');
  });

  it('issues unique, non-repeating backup codes', () => {
    const { plain, hashed } = createBackupCodes();
    expect(plain).toHaveLength(10);
    expect(new Set(plain).size).toBe(10);
    expect(new Set(hashed).size).toBe(10);
  });
});

describe('Device classification', () => {
  it('labels a desktop Chrome on Windows', () => {
    const d = describeDevice(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    );
    expect(d).toMatchObject({ os: 'Windows', browser: 'Chrome', device_type: 'desktop' });
  });

  it('labels mobile Safari on iOS', () => {
    const d = describeDevice(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
    );
    expect(d).toMatchObject({ os: 'iOS', browser: 'Safari', device_type: 'mobile' });
  });

  it('prefers Edge over the Chrome token Edge also sends', () => {
    const d = describeDevice(
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120'
    );
    expect(d.browser).toBe('Edge');
  });

  it('handles a missing user agent', () => {
    expect(describeDevice(null)).toMatchObject({ device_type: 'unknown' });
  });
});

describe('2FA API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue(undefined);
    enableMock.mockResolvedValue(undefined);
    disableMock.mockResolvedValue(undefined);
  });

  it('requires authentication', async () => {
    const res = await get2FA(new NextRequest('http://localhost:4028/api/nguoi-dung/bao-mat/2fa'));
    expect(res.status).toBe(401);
  });

  it('rejects a mutating request without a CSRF token', async () => {
    const req = new NextRequest('http://localhost:4028/api/nguoi-dung/bao-mat/2fa', {
      method: 'POST',
      headers: { cookie: `access_token=${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'setup' }),
    });
    const res = await post2FA(req);
    expect(res.status).toBe(403);
  });

  it('reports disabled state when no enrollment exists', async () => {
    configMock.mockResolvedValue(null);
    const res = await get2FA(get());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      twoFA: { isEnabled: false, backupCodesUsed: 0, backupCodesRemaining: 0, lastVerified: null },
    });
  });

  it('returns plain backup codes only at setup and persists hashes', async () => {
    configMock.mockResolvedValue(null);
    const res = await post2FA(post({ action: 'setup' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(body.uri).toContain('otpauth://totp/');
    expect(body.backupCodes).toHaveLength(10);

    const [, secret, hashed] = upsertMock.mock.calls[0];
    expect(secret).toBe(body.secret);
    expect(hashed).toHaveLength(10);
    // Persisted values must be digests, never the codes just returned.
    expect(hashed).not.toContain(body.backupCodes[0]);
    expect(hashed[0]).toBe(hashBackupCode(body.backupCodes[0]));
  });

  it('refuses a second enrollment once 2FA is active', async () => {
    configMock.mockResolvedValue({ user_id: 'user-1', secret: 's', is_enabled: true });
    const res = await post2FA(post({ action: 'setup' }));

    expect(res.status).toBe(409);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('enables 2FA only after a valid token', async () => {
    const secret = createTotpSecret();
    configMock.mockResolvedValue({ user_id: 'user-1', secret, is_enabled: false });

    const bad = await post2FA(post({ action: 'verify', token: '000000' }));
    expect(bad.status).toBe(401);
    expect(enableMock).not.toHaveBeenCalled();

    const good = await post2FA(post({ action: 'verify', token: generateSync({ secret }) }));
    expect(good.status).toBe(200);
    expect(enableMock).toHaveBeenCalledWith('user-1');
  });

  it('rejects verify when no enrollment session exists', async () => {
    configMock.mockResolvedValue(null);
    const res = await post2FA(post({ action: 'verify', token: '123456' }));

    expect(res.status).toBe(400);
    expect(enableMock).not.toHaveBeenCalled();
  });

  it('rejects unknown actions', async () => {
    const res = await post2FA(post({ action: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('disables 2FA for the authenticated user', async () => {
    const res = await delete2FA(del());

    expect(res.status).toBe(200);
    expect(disableMock).toHaveBeenCalledWith('user-1');
  });
});
