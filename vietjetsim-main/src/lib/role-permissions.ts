/**
 * Per-role permission grants loaded from the database.
 *
 * This is the enforcement half of RBAC. `SYSTEM_ROLES` in `lib/rbac.ts` is a
 * static description used by the admin console to render the matrix; the rows
 * in `role_permissions` (migration 019) are what the request path actually
 * trusts. When an operator edits a role in the console, the UI and this module
 * can drift until the grant is persisted — so the console must never be the
 * only record of a decision.
 */
import { sql } from '@/lib/neon';
import { SUPER_ADMIN_ROLE, type Permission } from '@/lib/rbac';
import { isAdminRole } from '@/lib/roles';

interface RolePermissionRow {
  permission: string;
}

/**
 * Grants change only when an admin edits the RBAC matrix, which is rare. A
 * short TTL keeps a role edit from needing a redeploy while still letting a
 * revoked permission expire on its own if the revoke path ever fails.
 */
const CACHE_TTL_MS = 30_000;

const grantCache = new Map<string, { permissions: Set<Permission>; expiresAt: number }>();

/** Only for tests: drop cached grants so a new fixture is picked up. */
export function clearRolePermissionCache(): void {
  grantCache.clear();
}

/**
 * Read the permissions granted to `role`.
 *
 * Returns an empty set for a role that has no rows, which is the fail-closed
 * answer: an unconfigured role can do nothing. `super_admin` is the documented
 * escape hatch and is resolved before this function is ever called.
 */
export async function getRolePermissionsFromDb(role: string): Promise<Set<Permission>> {
  const cached = grantCache.get(role);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  let permissions = new Set<Permission>();

  if (isAdminRole(role)) {
    let rows: RolePermissionRow[];
    try {
      rows = (await sql`
        SELECT permission FROM role_permissions WHERE role_name = ${role}
      `) as RolePermissionRow[];
    } catch (cause) {
      // A missing table means migration 019 never reached this database. That is
      // an operational fault, not an authorization answer, so it must not be
      // laundered into "allow" (that would silently reopen the hole) nor into a
      // bare 403 (that would point an operator at the wrong problem).
      console.error(
        `[RBAC] Could not read role_permissions for role "${role}". ` +
          'Apply migrations/019_role_permissions.sql before serving admin traffic.'
      );
      throw new Error('RBAC grants are unavailable', { cause });
    }

    permissions = new Set(rows.map((row) => row.permission).filter(isKnownPermission));
  }

  grantCache.set(role, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
  return permissions;
}

/** `super_admin` skips the table entirely, so it always reaches every route. */
export function bypassesPermissionTable(role: string | null | undefined): boolean {
  return role === SUPER_ADMIN_ROLE;
}

/** Narrow an unvalidated database string to a `Permission`. */
function isKnownPermission(value: string): value is Permission {
  return (KNOWN_PERMISSIONS as ReadonlySet<string>).has(value);
}

const KNOWN_PERMISSIONS = new Set<string>(
  (
    [
      'user:list',
      'user:view',
      'user:create',
      'user:edit',
      'user:delete',
      'user:role_change',
      'flight:list',
      'flight:view',
      'flight:create',
      'flight:edit',
      'flight:delete',
      'flight:status_change',
      'flight:price_edit',
      'booking:list',
      'booking:view',
      'booking:create',
      'booking:edit',
      'booking:cancel',
      'booking:status_change',
      'payment:view',
      'payment:refund',
      'payment:process',
      'refund:list',
      'refund:approve',
      'refund:reject',
      'system:config',
      'content:manage',
      'announcement:crud',
      'airport:manage',
      'chat:view',
      'chat:send',
      'chat:delete',
      'analytics:view',
      'analytics:export',
      'report:generate',
      'sstk:execute',
      'sstk:view_logs',
      'rbac:manage',
      'rbac:audit_log',
      'admin:invite',
      'discount:list',
      'discount:view',
      'discount:create',
      'discount:edit',
      'discount:delete',
      'discount:status_change',
      'agency:list',
      'agency:view',
      'agency:create',
      'agency:edit',
      'agency:delete',
      'agency:status_change',
    ] as Permission[]
  ).map(String)
);
