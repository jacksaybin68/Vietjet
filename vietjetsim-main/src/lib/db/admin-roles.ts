import { sql } from '@/lib/neon';
import type { Permission } from '@/lib/rbac';

export interface AdminRoleRecord {
  id: string;
  user_id: string;
  role_name: string; // 'super_admin' | 'admin_ops' | 'admin_finance' | etc.
  custom_permissions: string | null; // JSON array or NULL = use system defaults
  granted_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Admin Roles CRUD ───────────────────────────────────────────────────────

export async function getAdminRole(userId: string): Promise<AdminRoleRecord | null> {
  const rows = await sql`
    SELECT * FROM admin_roles WHERE user_id = ${userId}
  `;
  return (rows as AdminRoleRecord[])[0] || null;
}

export async function getAllAdminRoles(): Promise<AdminRoleRecord[]> {
  const rows = await sql`
    SELECT ar.*, u.email, u.full_name
    FROM admin_roles ar
    JOIN user_profiles u ON ar.user_id = u.id
    ORDER BY ar.created_at DESC
  `;
  return rows as AdminRoleRecord[];
}

export async function assignAdminRole(
  userId: string,
  roleName: string,
  grantedBy: string,
  customPermissions?: Permission[] | null
): Promise<AdminRoleRecord> {
  const permsJson = customPermissions ? JSON.stringify(customPermissions) : null;

  const existing = await getAdminRole(userId);
  if (existing) {
    const result = await sql`
      UPDATE admin_roles
      SET role_name = ${roleName}, custom_permissions = ${permsJson}, updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;
    return (result as AdminRoleRecord[])[0];
  }

  const result = await sql`
    INSERT INTO admin_roles (user_id, role_name, custom_permissions, granted_by)
    VALUES (${userId}, ${roleName}, ${permsJson}, ${grantedBy})
    RETURNING *
  `;
  return (result as AdminRoleRecord[])[0];
}

export async function removeAdminRole(userId: string): Promise<void> {
  await sql`DELETE FROM admin_roles WHERE user_id = ${userId}`;
}
