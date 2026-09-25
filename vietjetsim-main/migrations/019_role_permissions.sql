-- 019_role_permissions.sql
--
-- Turns the RBAC model from advisory into enforced.
--
-- Before this file, `verifyAdminRequest(request, permission)` ignored its
-- `permission` argument and every admin-family role reached every admin route.
-- This table holds the real grants that `verifyAdminRequest` now checks.
--
-- Policy:
--   * `super_admin` bypasses the table entirely (see lib/admin-auth.ts) so an
--     operator always keeps a way in if a grant is misconfigured.
--   * `admin` is seeded with every permission so the existing admin account
--     keeps full access the moment this migration is applied.
--   * The legacy specialist roles get scoped grants instead of the blanket
--     "all admin roles are equal" behaviour they used to have.
--   * `user` is never an admin role, so it gets no rows.
--
-- Fully idempotent: CI re-applies every migration and fails on any statement
-- that is not safe to run twice.

CREATE TABLE IF NOT EXISTS role_permissions (
  role_name VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_name, permission)
);

COMMENT ON TABLE role_permissions IS
  'Per-role permission grants enforced by verifyAdminRequest(). super_admin bypasses this table.';

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions (role_name);

-- ─── admin: full access (backwards compatible for the existing admin account) ──
INSERT INTO role_permissions (role_name, permission)
SELECT 'admin', unnest(ARRAY[
  'user:list', 'user:view', 'user:create', 'user:edit', 'user:delete', 'user:role_change',
  'flight:list', 'flight:view', 'flight:create', 'flight:edit', 'flight:delete',
  'flight:status_change', 'flight:price_edit',
  'booking:list', 'booking:view', 'booking:create', 'booking:edit', 'booking:cancel',
  'booking:status_change',
  'payment:view', 'payment:refund', 'payment:process',
  'refund:list', 'refund:approve', 'refund:reject',
  'system:config', 'content:manage', 'announcement:crud', 'airport:manage',
  'chat:view', 'chat:send', 'chat:delete',
  'analytics:view', 'analytics:export', 'report:generate',
  'sstk:execute', 'sstk:view_logs',
  'rbac:manage', 'rbac:audit_log', 'admin:invite',
  'discount:list', 'discount:view', 'discount:create', 'discount:edit',
  'discount:delete', 'discount:status_change',
  'agency:list', 'agency:view', 'agency:create', 'agency:edit', 'agency:delete',
  'agency:status_change'
])
ON CONFLICT (role_name, permission) DO NOTHING;

-- ─── super_admin: listed for the RBAC console, enforcement bypasses anyway ────
INSERT INTO role_permissions (role_name, permission)
SELECT 'super_admin', permission FROM role_permissions WHERE role_name = 'admin'
ON CONFLICT (role_name, permission) DO NOTHING;

-- ─── admin_ops: runs the airline day to day ──────────────────────────────────
INSERT INTO role_permissions (role_name, permission)
SELECT 'admin_ops', unnest(ARRAY[
  'flight:list', 'flight:view', 'flight:create', 'flight:edit',
  'flight:status_change', 'flight:price_edit',
  'booking:list', 'booking:view', 'booking:status_change',
  'airport:manage',
  'announcement:crud',
  'user:list', 'user:view',
  'analytics:view', 'report:generate'
])
ON CONFLICT (role_name, permission) DO NOTHING;

-- ─── admin_finance: money, refunds and reporting ─────────────────────────────
INSERT INTO role_permissions (role_name, permission)
SELECT 'admin_finance', unnest(ARRAY[
  'payment:view', 'payment:refund', 'payment:process',
  'refund:list', 'refund:approve', 'refund:reject',
  'booking:list', 'booking:view',
  'discount:list', 'discount:view', 'discount:create', 'discount:edit',
  'discount:status_change',
  'analytics:view', 'analytics:export', 'report:generate'
])
ON CONFLICT (role_name, permission) DO NOTHING;

-- ─── admin_support: customers, check-in and chat ─────────────────────────────
INSERT INTO role_permissions (role_name, permission)
SELECT 'admin_support', unnest(ARRAY[
  'chat:view', 'chat:send',
  'booking:list', 'booking:view', 'booking:edit',
  'refund:list',
  'user:list', 'user:view',
  'flight:list', 'flight:view'
])
ON CONFLICT (role_name, permission) DO NOTHING;

-- ─── admin_content: catalogue and marketing surface ──────────────────────────
INSERT INTO role_permissions (role_name, permission)
SELECT 'admin_content', unnest(ARRAY[
  'content:manage', 'announcement:crud', 'airport:manage',
  'flight:list', 'flight:view',
  'discount:list', 'discount:view', 'discount:create', 'discount:edit',
  'discount:delete', 'discount:status_change',
  'agency:list', 'agency:view', 'agency:create', 'agency:edit',
  'agency:delete', 'agency:status_change',
  'analytics:view'
])
ON CONFLICT (role_name, permission) DO NOTHING;