/**
 * Role rules shared by server routes, middleware, and client components.
 *
 * This module must stay dependency-free (no `next/headers`, no Node built-ins):
 * `lib/rbac` pulls in server-only modules, so client bundles and the Edge
 * middleware cannot import it, yet all three need the same answers.
 */

/** Roles the API accepts when assigning a role. Anything else is legacy data. */
export const ASSIGNABLE_ROLES = ['user', 'admin'] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * Admin-family roles, including names left over from the earlier multi-admin
 * design. The database still holds `super_admin` rows and `middleware.ts` has
 * always admitted them to `/quan-tri`, so the API must agree — treating them as
 * non-admins let such accounts open the admin UI and then 403 on every request.
 */
const ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'admin_ops',
  'admin_finance',
  'admin_support',
  'admin_content',
]);

/** Privilege ordering, used to decide whether one role may manage another. */
const ROLE_LEVELS: Record<string, number> = {
  user: 0,
  admin: 1,
  admin_ops: 1,
  admin_finance: 1,
  admin_support: 1,
  admin_content: 1,
  super_admin: 2,
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && ADMIN_ROLES.has(role);
}

/** Collapse any role name onto the simplified `user` | `admin` pair. */
export function normalizeRole(role: string | null | undefined): AssignableRole {
  return isAdminRole(role) ? 'admin' : 'user';
}

export function roleLevel(role: string | null | undefined): number {
  return ROLE_LEVELS[role ?? ''] ?? 0;
}

/** Narrows an unvalidated request value to a role the API is willing to store. */
export function isAssignableRole(role: unknown): role is AssignableRole {
  return typeof role === 'string' && (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}
