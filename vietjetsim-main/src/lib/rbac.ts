// ──────────────────────────────────────────────────────────────────────
// VietjetSim RBAC (Role-Based Access Control) System
// Simplified: Only 2 roles — 'user' (regular user) and 'admin' (full access)
// ──────────────────────────────────────────────────────────────────────

import { UserRole } from './auth';

// ═════════════════════════════════════════════════════════════════════
// 1. PERMISSION DEFINITIONS
// ═════════════════════════════════════════════════════════════════════

export type Permission =
  | 'user:list'
  | 'user:view'
  | 'user:create'
  | 'user:edit'
  | 'user:delete'
  | 'user:role_change'
  | 'flight:list'
  | 'flight:view'
  | 'flight:create'
  | 'flight:edit'
  | 'flight:delete'
  | 'flight:status_change'
  | 'flight:price_edit'
  | 'booking:list'
  | 'booking:view'
  | 'booking:create'
  | 'booking:edit'
  | 'booking:cancel'
  | 'booking:status_change'
  | 'payment:view'
  | 'payment:refund'
  | 'payment:process'
  | 'refund:list'
  | 'refund:approve'
  | 'refund:reject'
  | 'system:config'
  | 'content:manage'
  | 'announcement:crud'
  | 'airport:manage'
  | 'chat:view'
  | 'chat:send'
  | 'chat:delete'
  | 'analytics:view'
  | 'analytics:export'
  | 'report:generate'
  | 'sstk:execute'
  | 'sstk:view_logs'
  | 'rbac:manage'
  | 'rbac:audit_log'
  | 'admin:invite'
  | 'discount:list'
  | 'discount:view'
  | 'discount:create'
  | 'discount:edit'
  | 'discount:delete'
  | 'discount:status_change';

export const PERMISSION_LABELS: Record<Permission, string> = {
  'user:list': 'Xem danh sách người dùng',
  'user:view': 'Xem chi tiết người dùng',
  'user:create': 'Tạo người dùng mới',
  'user:edit': 'Chỉnh sửa thông tin user',
  'user:delete': 'Xóa người dùng',
  'user:role_change': 'Thay đổi role người dùng',
  'flight:list': 'Xem danh sách chuyến bay',
  'flight:view': 'Xem chi tiết chuyến bay',
  'flight:create': 'Tạo chuyến bay mới',
  'flight:edit': 'Cập nhật thông tin chuyến bay',
  'flight:delete': 'Xóa chuyến bay',
  'flight:status_change': 'Thay đổi trạng thái chuyến bay',
  'flight:price_edit': 'Thay đổi giá vé',
  'booking:list': 'Xem danh sách đặt vé',
  'booking:view': 'Xem chi tiết đặt vé',
  'booking:create': 'Tạo đặt vé (đại diện)',
  'booking:edit': 'Chỉnh sửa đặt vé',
  'booking:cancel': 'Huỷ đặt vé',
  'booking:status_change': 'Cập nhật trạng thái đặt vé',
  'payment:view': 'Xem thanh toán',
  'payment:refund': 'Hoàn tiền',
  'payment:process': 'Xử lý thanh toán',
  'refund:list': 'Xem danh sách hoàn tiền',
  'refund:approve': 'Phê duyệt hoàn tiền',
  'refund:reject': 'Từ chối hoàn tiền',
  'system:config': 'Cấu hình hệ thống',
  'content:manage': 'Quản lý nội dung',
  'announcement:crud': 'Tạo/sửa/xóa thông báo',
  'airport:manage': 'Quản lý sân bay',
  'chat:view': 'Xem cuộc hội thoại',
  'chat:send': 'Gửi tin nhắn',
  'chat:delete': 'Xóa tin nhắn',
  'analytics:view': 'Xem thống kê',
  'analytics:export': 'Xuất báo cáo',
  'report:generate': 'Tạo báo cáo',
  'sstk:execute': 'Thực thi SSTK',
  'sstk:view_logs': 'Xem nhật ký SSTK',
  'rbac:manage': 'Quản lý RBAC',
  'rbac:audit_log': 'Xem nhật ký RBAC',
  'admin:invite': 'Mời admin mới',
  'discount:list': 'Xem danh sách mã giảm giá',
  'discount:view': 'Xem chi tiết mã giảm giá',
  'discount:create': 'Tạo mã giảm giá',
  'discount:edit': 'Chỉnh sửa mã giảm giá',
  'discount:delete': 'Xóa mã giảm giá',
  'discount:status_change': 'Thay đổi trạng thái mã giảm giá',
};

// ═════════════════════════════════════════════════════════════════════
// 2. PERMISSION CATEGORIES
// ═════════════════════════════════════════════════════════════════════

export interface PermissionCategory {
  key: string;
  name: string;
  label: string;
  icon: string;
  permissions: Permission[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'user_management',
    name: 'user_management',
    label: 'Quản lý người dùng',
    icon: 'UsersIcon',
    permissions: [
      'user:list',
      'user:view',
      'user:create',
      'user:edit',
      'user:delete',
      'user:role_change',
    ],
  },
  {
    key: 'flight_management',
    name: 'flight_management',
    label: 'Quản lý chuyến bay',
    icon: 'PlaneIcon',
    permissions: [
      'flight:list',
      'flight:view',
      'flight:create',
      'flight:edit',
      'flight:delete',
      'flight:status_change',
      'flight:price_edit',
    ],
  },
  {
    key: 'booking_management',
    name: 'booking_management',
    label: 'Quản lý đặt vé',
    icon: 'TicketIcon',
    permissions: [
      'booking:list',
      'booking:view',
      'booking:create',
      'booking:edit',
      'booking:cancel',
      'booking:status_change',
    ],
  },
  {
    key: 'payment_refund',
    name: 'payment_refund',
    label: 'Thanh toán & Hoàn tiền',
    icon: 'CreditCardIcon',
    permissions: [
      'payment:view',
      'payment:refund',
      'payment:process',
      'refund:list',
      'refund:approve',
      'refund:reject',
    ],
  },
  {
    key: 'content_system',
    name: 'content_system',
    label: 'Nội dung & Cấu hình',
    icon: 'Cog6ToothIcon',
    permissions: ['system:config', 'content:manage', 'announcement:crud', 'airport:manage'],
  },
  {
    key: 'chat_support',
    name: 'chat_support',
    label: 'Chat & Hỗ trợ',
    icon: 'ChatBubbleLeftRightIcon',
    permissions: ['chat:view', 'chat:send', 'chat:delete'],
  },
  {
    key: 'analytics',
    name: 'analytics',
    label: 'Thống kê & Báo cáo',
    icon: 'ChartBarIcon',
    permissions: ['analytics:view', 'analytics:export', 'report:generate'],
  },
  {
    key: 'sstk',
    name: 'sstk',
    label: 'Self-Service Toolkit',
    icon: 'WrenchIcon',
    permissions: ['sstk:execute', 'sstk:view_logs'],
  },
  {
    key: 'rbac_admin',
    name: 'rbac_admin',
    label: 'Quản trị RBAC',
    icon: 'ShieldCheckIcon',
    permissions: ['rbac:manage', 'rbac:audit_log', 'admin:invite'],
  },
  {
    key: 'discount',
    name: 'discount',
    label: 'Mã giảm giá',
    icon: 'TagIcon',
    permissions: [
      'discount:list',
      'discount:view',
      'discount:create',
      'discount:edit',
      'discount:delete',
      'discount:status_change',
    ],
  },
];

// ═════════════════════════════════════════════════════════════════════
// 3. ROLE → PERMISSION MAPPING (Simplified: only user + admin)
// ═════════════════════════════════════════════════════════════════════

export type AllRoles = UserRole;

export const ROLE_LEVELS: Record<string, number> = {
  user: 0,
  admin: 1,
};

const ADMIN_PERMISSIONS = new Set<Permission>(PERMISSION_CATEGORIES.flatMap((c) => c.permissions));

/**
 * Check if a role has a specific permission.
 * - 'admin' → always true (full access)
 * - 'user'  → always false
 */
export function hasPermission(
  userRole: AllRoles,
  permission: Permission,
  _customPermissions?: Permission[] | null
): boolean {
  if (userRole === 'admin') return true;
  return false;
}

export function hasAllPermissions(
  userRole: AllRoles,
  permissions: Permission[],
  customPermissions?: Permission[] | null
): boolean {
  return permissions.every((p) => hasPermission(userRole, p, customPermissions));
}

export function hasAnyPermission(
  userRole: AllRoles,
  permissions: Permission[],
  customPermissions?: Permission[] | null
): boolean {
  return permissions.some((p) => hasPermission(userRole, p, customPermissions));
}

export function getRolePermissions(
  role: AllRoles,
  _customPermissions?: Permission[] | null
): Permission[] {
  if (role === 'admin') return Array.from(ADMIN_PERMISSIONS) as Permission[];
  return [];
}

export function getRoleInfo(role: AllRoles): {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  level: number;
} {
  if (role === 'admin') {
    return {
      label: 'Quản trị viên',
      description: 'Quản trị viên toàn quyền',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      level: ROLE_LEVELS.admin,
    };
  }
  return {
    label: 'Người dùng',
    description: 'Người dùng thường',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    level: ROLE_LEVELS.user,
  };
}

/**
 * Admin can only manage 'user' role. Cannot manage other admins.
 */
export function canManageRole(actorRole: AllRoles, targetRole: AllRoles): boolean {
  if (actorRole === 'admin' && targetRole === 'user') return true;
  return false;
}

export function isAdminRole(role: string): boolean {
  return role === 'admin';
}

// ─── Backward-compatibility bridge for AdminRBACPanel ───────────────────

/**
 * SYSTEM_ROLES bridge — includes simplified roles (admin, user) and legacy
 * role names so AdminRBACPanel UI compiles and runs without rewrite.
 * Legacy roles map to admin-level permissions for display purposes.
 */
export const SYSTEM_ROLES: Record<
  string,
  {
    name: string;
    label: string;
    description: string;
    color: string;
    bgColor: string;
    level: number;
    permissions: Set<Permission>;
  }
> = {
  admin: {
    name: 'admin',
    label: 'Quản trị viên',
    description: 'Quản trị viên toàn quyền',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    level: 1,
    permissions: ADMIN_PERMISSIONS,
  },
  user: {
    name: 'user',
    label: 'Người dùng',
    description: 'Người dùng thường',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    level: 0,
    permissions: new Set<Permission>([]),
  },
  // Legacy role names preserved for AdminRBACPanel compatibility
  super_admin: {
    name: 'super_admin',
    label: 'Super Admin',
    description: 'Quản trị viên cấp cao (legacy)',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    level: 2,
    permissions: ADMIN_PERMISSIONS,
  },
  admin_ops: {
    name: 'admin_ops',
    label: 'Admin Vận hành',
    description: 'Admin vận hành (legacy)',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    level: 1,
    permissions: ADMIN_PERMISSIONS,
  },
  admin_finance: {
    name: 'admin_finance',
    label: 'Admin Tài chính',
    description: 'Admin tài chính (legacy)',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    level: 1,
    permissions: ADMIN_PERMISSIONS,
  },
  admin_support: {
    name: 'admin_support',
    label: 'Admin Hỗ trợ',
    description: 'Admin hỗ trợ (legacy)',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    level: 1,
    permissions: ADMIN_PERMISSIONS,
  },
  admin_content: {
    name: 'admin_content',
    label: 'Admin Nội dung',
    description: 'Admin nội dung (legacy)',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    level: 1,
    permissions: ADMIN_PERMISSIONS,
  },
};

export type SystemRoleName = keyof typeof SYSTEM_ROLES;
