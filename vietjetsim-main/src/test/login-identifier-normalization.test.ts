import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Login identifier / password normalisation.
 *
 * Text copied out of a password manager, a chat message or a spreadsheet
 * routinely arrives with surrounding whitespace, and users type email addresses
 * with whatever capitalisation they like. Both used to fail with "Email hoặc
 * mật khẩu không đúng" even though the credential was correct, which reads to
 * the user as a wrong account rather than a wrong keystroke.
 */

const sqlMock = vi.fn();
const compareMock = vi.fn();
const configMock = vi.fn();
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
  consumeBackupCodeHash: vi.fn().mockResolvedValue(false),
  createUserSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
  recordLoginAttempt: (...a: unknown[]) => recordLoginMock(...a),
}));

// Only the documented demo password authenticates, so a passing test proves the
// route reached a successful comparison rather than short-circuiting.
vi.mock('bcryptjs', () => ({
  default: {
    compare: (...a: [string, string]) => compareMock(...a),
    hash: vi.fn(),
  },
  compare: (...a: [string, string]) => compareMock(...a),
  hash: vi.fn(),
}));

import { POST as login } from '@/app/api/xac-thuc/dang-nhap/route';

const CORRECT_PASSWORD = 'user123';

const userRow = {
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
};

function loginRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:4028/api/xac-thuc/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

/** Values bound into the lookup query (index 0 is the template string array). */
function lookupParams(): unknown[] {
  return sqlMock.mock.calls[0].slice(1) as unknown[];
}

beforeEach(() => {
  vi.clearAllMocks();
  sqlMock.mockResolvedValue([userRow]);
  configMock.mockResolvedValue(null);
  recordLoginMock.mockResolvedValue(undefined);
  compareMock.mockImplementation(async (plain: string) => plain === CORRECT_PASSWORD);
});

describe('Login identifier normalisation', () => {
  it('trims surrounding whitespace from the identifier before looking it up', async () => {
    const res = await login(
      loginRequest({ email: '  user@vietjetair.vn  ', password: CORRECT_PASSWORD })
    );

    expect(res.status).toBe(200);
    expect(lookupParams()[0]).toBe('user@vietjetair.vn');
  });

  it('looks the account up case-insensitively', async () => {
    const res = await login(
      loginRequest({ email: 'User@VietjetAir.VN', password: CORRECT_PASSWORD })
    );

    expect(res.status).toBe(200);
    // The match must happen in SQL: callers cannot be trusted to send the
    // stored casing, and the mock cannot emulate Postgres for us.
    const [template] = sqlMock.mock.calls[0] as [string[]];
    expect(template.join('?')).toMatch(/LOWER\(email\)\s*=\s*LOWER\(\?\)/);
  });

  it('still accepts the exact stored email', async () => {
    const res = await login(
      loginRequest({ email: 'user@vietjetair.vn', password: CORRECT_PASSWORD })
    );

    expect(res.status).toBe(200);
    expect(lookupParams()[0]).toBe('user@vietjetair.vn');
  });
});

describe('Login password normalisation', () => {
  it('accepts a password padded with surrounding whitespace', async () => {
    const res = await login(
      loginRequest({ email: 'user@vietjetair.vn', password: `  ${CORRECT_PASSWORD}  ` })
    );

    expect(res.status).toBe(200);
    // Raw value first (a password may legitimately contain spaces), trimmed as
    // the fallback.
    expect(compareMock).toHaveBeenCalledWith(`  ${CORRECT_PASSWORD}  `, 'stored-hash');
    expect(compareMock).toHaveBeenCalledWith(CORRECT_PASSWORD, 'stored-hash');
  });

  it('does not retry the trimmed value when the password has no padding', async () => {
    const res = await login(
      loginRequest({ email: 'user@vietjetair.vn', password: CORRECT_PASSWORD })
    );

    expect(res.status).toBe(200);
    expect(compareMock).toHaveBeenCalledTimes(1);
  });

  it('accepts a password with significant inner spaces', async () => {
    compareMock.mockImplementation(async (plain: string) => plain === 'mat khau dai');

    const res = await login(
      loginRequest({ email: 'user@vietjetair.vn', password: 'mat khau dai' })
    );

    expect(res.status).toBe(200);
  });
});

describe('Login still rejects bad credentials', () => {
  it('returns 401 for a wrong password and issues no session cookie', async () => {
    const res = await login(
      loginRequest({ email: 'user@vietjetair.vn', password: 'wrong-password' })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/không đúng/i);
    expect(res.headers.get('set-cookie') ?? '').not.toContain('access_token=');
    expect(recordLoginMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ success: false, failureReason: 'invalid_password' })
    );
  });

  it('returns 401 when no account matches the identifier', async () => {
    sqlMock.mockResolvedValue([]);

    const res = await login(
      loginRequest({ email: '  nobody@vietjetair.vn  ', password: CORRECT_PASSWORD })
    );

    expect(res.status).toBe(401);
    // A miss must not be reported as a lock or as a password failure.
    expect(recordLoginMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the identifier or password is missing', async () => {
    const res = await login(loginRequest({ email: '   ', password: '' }));

    expect(res.status).toBe(400);
  });
});
