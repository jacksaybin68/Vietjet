import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqlMock = vi.fn();

vi.mock('@/lib/neon', () => ({
  sql: (...args: unknown[]) => sqlMock(...args),
}));

import {
  getRolePermissionsFromDb,
  clearRolePermissionCache,
  bypassesPermissionTable,
} from '@/lib/role-permissions';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { SUPER_ADMIN_ROLE } from '@/lib/rbac';

/** Minimal NextRequest stand-in: the helper only reads cookies + headers. */
function makeRequest(options: { token?: string; origin?: string } = {}) {
  return {
    cookies: {
      get: (name: string) => (name === 'access_token' ? { value: options.token } : undefined),
    },
    headers: new Headers({ origin: options.origin ?? 'http://localhost:4028' }),
  } as never;
}

/** Build a signed-enough token by stubbing verifyAccessToken. */
const verifyTokenMock = vi.fn();
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    verifyAccessToken: (token: string) => {
      verifyTokenMock(token);
      return actual.verifyAccessToken(token);
    },
  };
});

vi.mock('@/lib/csrf', () => ({
  validateCsrfOrReject: async () => null,
}));

describe('role_permissions loader', () => {
  beforeEach(() => {
    sqlMock.mockReset();
    clearRolePermissionCache();
  });

  it('returns the grants stored for a role', async () => {
    sqlMock.mockResolvedValue([{ permission: 'flight:list' }, { permission: 'user:view' }]);
    const granted = await getRolePermissionsFromDb('admin_finance');
    expect(granted.has('flight:list')).toBe(true);
    expect(granted.has('user:view')).toBe(true);
    expect(granted.has('user:delete')).toBe(false);
  });

  it('is fail-closed when a role has no rows', async () => {
    sqlMock.mockResolvedValue([]);
    const granted = await getRolePermissionsFromDb('admin_content');
    expect(granted.size).toBe(0);
  });

  it('drops permission strings that are not part of the Permission union', async () => {
    sqlMock.mockResolvedValue([{ permission: 'flight:list' }, { permission: 'evil:invented' }]);
    const granted = await getRolePermissionsFromDb('admin_ops');
    expect(granted.has('flight:list')).toBe(true);
    expect(granted.has('evil:invented' as never)).toBe(false);
  });

  it('never queries for a non-admin role', async () => {
    sqlMock.mockResolvedValue([]);
    const granted = await getRolePermissionsFromDb('user');
    expect(granted.size).toBe(0);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('caches within the TTL so a hot route is not re-queried every call', async () => {
    sqlMock.mockResolvedValue([{ permission: 'flight:list' }]);
    await getRolePermissionsFromDb('admin_ops');
    await getRolePermissionsFromDb('admin_ops');
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a missing grants table as an operational error, not a 403', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    sqlMock.mockRejectedValue(new Error('relation "role_permissions" does not exist'));

    await expect(getRolePermissionsFromDb('admin')).rejects.toThrow('RBAC grants are unavailable');
    // The message has to name the migration, or an operator reads this as an
    // authorization problem and goes looking for the wrong table.
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('migrations/019_role_permissions.sql')
    );
    consoleError.mockRestore();
  });

  it('marks super_admin as bypassing the table', () => {
    expect(bypassesPermissionTable(SUPER_ADMIN_ROLE)).toBe(true);
    expect(bypassesPermissionTable('admin')).toBe(false);
    expect(bypassesPermissionTable(null)).toBe(false);
  });
});

describe('verifyAdminRequest permission enforcement', () => {
  beforeEach(() => {
    sqlMock.mockReset();
    verifyTokenMock.mockReset();
    clearRolePermissionCache();
  });

  async function authedAs(role: string) {
    const jwt = await import('@/lib/auth');
    const token = jwt.generateTokens({
      id: 'admin-1',
      email: 'a@b.vn',
      full_name: 'A',
      role,
    } as never).accessToken;
    return makeRequest({ token });
  }

  it('allows a request whose permission is granted to the role', async () => {
    sqlMock.mockResolvedValue([{ permission: 'booking:list' }]);
    const result = await verifyAdminRequest(await authedAs('admin_support'), 'booking:list');
    expect(result.error).toBeUndefined();
    expect(result.payload.role).toBe('admin_support');
  });

  it('rejects a request whose permission is not granted to the role', async () => {
    sqlMock.mockResolvedValue([{ permission: 'chat:view' }]);
    const result = await verifyAdminRequest(await authedAs('admin_support'), 'user:delete');
    expect(result.error).toBe('Forbidden');
    const body = await result.response!.json();
    expect(body.requiredPermission).toBe('user:delete');
    expect(result.response!.status).toBe(403);
  });

  it('rejects every guarded permission for a role with no rows (fail closed)', async () => {
    sqlMock.mockResolvedValue([]);
    const result = await verifyAdminRequest(await authedAs('admin_content'), 'flight:list');
    expect(result.error).toBe('Forbidden');
    expect(result.response!.status).toBe(403);
  });

  it('lets super_admin through without consulting the table', async () => {
    const result = await verifyAdminRequest(await authedAs(SUPER_ADMIN_ROLE), 'rbac:manage');
    expect(result.error).toBeUndefined();
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('still rejects a non-admin before any permission lookup', async () => {
    const result = await verifyAdminRequest(await authedAs('user'), 'flight:list');
    expect(result.error).toBe('Forbidden');
    expect(result.response!.status).toBe(403);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('does not consult the table when the route asks for no permission', async () => {
    const result = await verifyAdminRequest(await authedAs('admin_finance'));
    expect(result.error).toBeUndefined();
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('requires a token before anything else', async () => {
    const result = await verifyAdminRequest(makeRequest(), 'flight:list');
    expect(result.error).toBe('Unauthorized');
    expect(result.response!.status).toBe(401);
  });
});
