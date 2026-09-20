/**
 * Role predicates shared by server routes and client components.
 *
 * This module must stay dependency-free: `lib/rbac` pulls in server-only
 * modules, so client bundles cannot import it.
 */

/** The simplified system has exactly one privileged role. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}
