import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  getAllAdminRoles,
  assignAdminRole,
  removeAdminRole,
  getAuditLogs,
  writeAuditLog,
  getAllConfig,
  setConfigValue,
} from '@/lib/db';
import {
  SYSTEM_ROLES,
  Permission,
  PERMISSION_LABELS,
  getRolePermissions,
  hasPermission,
  canManageRole,
  type SystemRoleName,
} from '@/lib/rbac';

// ─── Auth helper (shared across all endpoints) with RBAC support ─────────────

async function authenticate(request: NextRequest, permission?: Permission) {
  const result = await verifyAdminRequest(request, permission);
  if (result.error || result.response) return { error: result.response! };

  // Get actor's role details for RBAC checks
  const actorRole = result.payload.role as SystemRoleName | 'user';

  return { userId: result.payload.userId, email: result.payload.email, actorRole };
}

// ═════════════════════════════════════════════════════════════════════
// GET /api/admin/rbac — List all roles + permissions overview
// ═════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    if (section === 'roles') {
      const roles = await getAllAdminRoles();
      return NextResponse.json({ roles });
    }

    if (section === 'audit') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '30');
      const actionFilter = searchParams.get('action') || undefined;
      const logs = await getAuditLogs({
        page,
        limit,
        action: actionFilter,
        startDate: searchParams.get('from') || undefined,
        endDate: searchParams.get('to') || undefined,
      });
      return NextResponse.json(logs);
    }

    if (section === 'config') {
      const category = searchParams.get('category') || undefined;
      const configs = await getAllConfig(category);
      return NextResponse.json({ configs });
    }

    // Default: full RBAC overview
    const roles = await getAllAdminRoles();
    const allRoles = Object.entries(SYSTEM_ROLES).map(([name, def]) => ({
      name: def.name,
      label: def.label,
      description: def.description,
      level: def.level,
      color: def.color,
      bgColor: def.bgColor,
      permissionCount: def.permissions.size,
      permissions: Array.from(def.permissions),
    }));

    return NextResponse.json({
      systemRoles: allRoles,
      permissionLabels: PERMISSION_LABELS,
      assignedRoles: roles,
    });
  } catch (err: any) {
    console.error('[RBAC-GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ═════════════════════════════════════════════════════════════════════
// POST /api/admin/rbac — Assign/Update role or set config value
// ═════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { action } = body;

    // ─── Action: assign_role ─────────────────────────────────────────
    if (action === 'assign_role') {
      const { targetUserId, roleName, customPermissions } = body as {
        targetUserId: string;
        roleName: SystemRoleName;
        customPermissions?: Permission[] | null;
      };

      if (!targetUserId || !roleName) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Thiếu targetUserId hoặc roleName' },
          { status: 400 }
        );
      }

      if (!SYSTEM_ROLES[roleName]) {
        const validNames = Object.keys(SYSTEM_ROLES).join(', ');
        return NextResponse.json(
          { error: 'Bad Request', message: `roleName không hợp lệ. Các giá trị: ${validNames}` },
          { status: 400 }
        );
      }

      const roleDef = await assignAdminRole(targetUserId, roleName, auth.userId, customPermissions);

      await writeAuditLog({
        adminId: auth.userId,
        adminEmail: auth.email!,
        action: 'rbac:role_assign',
        targetType: 'role',
        targetId: targetUserId,
        detailsJson: JSON.stringify({
          roleName,
          customPermissions: customPermissions?.length || 0,
        }),
        status: 'success',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({
        success: true,
        role: roleDef,
        message: `Đã gán role ${roleName} cho user`,
      });
    }

    // ─── Action: remove_role ──────────────────────────────────────────
    if (action === 'remove_role') {
      const { targetUserId } = body as { targetUserId: string };

      if (!targetUserId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Thiếu targetUserId' },
          { status: 400 }
        );
      }

      if (targetUserId === auth.userId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Không thể xóa role của chính mình' },
          { status: 400 }
        );
      }

      await removeAdminRole(targetUserId);

      await writeAuditLog({
        adminId: auth.userId,
        adminEmail: auth.email!,
        action: 'rbac:role_remove',
        targetType: 'role',
        targetId: targetUserId,
        detailsJson: JSON.stringify({ removedBy: auth.email }),
        status: 'success',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({ success: true, message: 'Đã xóa role admin của user' });
    }

    // ─── Action: set_config ────────────────────────────────────────────
    if (action === 'set_config') {
      const { key, value, type, description, category } = body as {
        key: string;
        value: string;
        type?: string;
        description?: string;
        category?: string;
      };

      if (!key || value === undefined) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Thiếu key hoặc value' },
          { status: 400 }
        );
      }

      const cfg = await setConfigValue(
        key,
        value,
        type || 'string',
        description || null,
        category || 'general',
        auth.userId
      );

      await writeAuditLog({
        adminId: auth.userId,
        adminEmail: auth.email!,
        action: 'system:config_change',
        targetType: 'config',
        targetId: cfg.id,
        detailsJson: JSON.stringify({ key, value, type }),
        status: 'success',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({
        success: true,
        config: cfg,
        message: `Đã cập nhật config: ${key}`,
      });
    }

    return NextResponse.json(
      {
        error: 'Bad Request',
        message: `Action "${action}" không hợp lệ. Dùng: assign_role, remove_role, set_config`,
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[RBAC-POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
