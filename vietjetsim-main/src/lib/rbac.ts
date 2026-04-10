// ──────────────────────────────────────────────────────────────────────
// VietjetSim RBAC (Role-Based Access Control) System
// ──────────────────────────────────────────────────────────────────────

import { UserRole } from './auth';

// ═════════════════════════════════════════════════════════════════════
// 1. PERMISSION DEFINITIONS — Granular permission flags
// ═════════════════════════════════════════════════════════════════════

export type Permission =
  // ── User Management ──────────
  | 'user:list'
  | 'user:view'
  | 'user:create'
  | 'user:edit'
  | 'user:delete'
  | 'user:role_change'
  // ── Flight Management ────────
  | 'flight:list'
  | 'flight:view'
  | 'flight:create'
  | 'flight:edit'
  | 'flight:delete'
  | 'flight:status_change'
  | 'flight:price_edit'
  // ── Booking Management ────────
  | 'booking:list'
  | 'booking:view'
  | 'booking:create'
  | 'booking:edit'
  | 'booking:cancel'
  | 'booking:status_change'
  // ── Payment & Refund ──────────
  | 'payment:view'
  | 'payment:refund'
  | 'payment:process'
  | 'refund:list'
  | 'refund:approve'
  | 'refund:reject'
  // ── Content & System Config ───
  | 'system:config'
  | 'content:manage'
  | 'announcement:crud'
  | 'airport:manage'
  // ── Chat & Support ────────────
  | 'chat:view'
  | 'chat:send'
  | 'chat:delete'
  // ── Analytics & Reports ──────
  | 'analytics:view'
  | 'analytics:export'
  | 'report:generate'
  // ── SSTK (Self-Service Toolkit)
  | 'sstk:execute'
  | 'sstk:view_logs'
  // ── RBAC Administration ───────
  | 'rbac:manage'
  | 'rbac:audit_log'
  | 'admin:invite'
  // ── Discount Management ────────
  | 'discount:list'
  | 'discount:view'
  | 'discount:create'
  | 'discount:edit'
  | 'discount:delete'
  | 'discount:status_change';

/** Human-readable labels for each permission (Vietnamese) */
export const PERMISSION_LABELS: Record<Permission, string> = {
  // User Management
  'user:list': 'Xem danh sách người dùng',
  'user:view': 'Xem chi tiết người dùng',
  'user:create': 'Tạo người dùng mới',
  'user:edit': 'Chỉnh sửa thông tin user',
  'user:delete': 'Xóa người dùng',
  'user:role_change': 'Thay đổi role người dùng',
  // Flight Management
  'flight:list': 'Xem danh sách chuyến bay',
  'flight:view': 'Xem chi tiết chuyến bay',
  'flight:create': 'Tạo chuyến bay mới',
  'flight:edit': 'Cập nhật thông tin chuyến bay',
  'flight:delete': 'Xóa chuyến bay',
  'flight:status_change': 'Thay đổi trạng thái chuyến bay',
  'flight:price_edit': 'Thay đổi giá vé',
  // Booking Management
  'booking:list': 'Xem danh sách đặt vé',
  'booking:view': 'Xem chi tiết đặt vé',
  'booking:create': 'Tạo đặt vé (đại diện)',
  'booking:edit': 'Chỉnh sửa đặt vé',
  'booking:cancel': 'Huỷ đặt vé',
  'booking:status_change': 'Cập nhật trạng thái đặt vé',
  // Payment & Refund
  'payment:view': 'Xem thanh toán',
  'payment:refund': 'Hoàn tiền',
  'payment:process': 'Xử lý thanh toán',
  'refund:list': 'Xem danh sách hoàn tiền',
  'refund:approve': 'Phê duyệt hoàn tiền',
  'refund:reject': 'Từ chối hoàn tiền',
  // Content & System Config
  'system:config': 'Cấu hình hệ thống',
  'content:manage': 'Quản lý nội dung',
  'announcement:crud': 'Tạo/sửa/xóa thông báo',
  'airport:manage': 'Quản lý sân bay',
  // Chat & Support
  'chat:view': 'Xem cuộc hội thoại',
  'chat:send': 'Gửi tin nhắn',
  'chat:delete': 'Xóa tin nhắn',
  // Analytics & Reports
  'analytics:view': 'Xem phân tích dữ liệu',
  'analytics:export': 'Xuất báo cáo',
  'report:generate': 'Tạo báo cáo tổng hợp',
  // SSTK
  'sstk:execute': 'Thực thi công cụ SSTK',
  'sstk:view_logs': 'Xem log thực thi SSTK',
  // RBAC Administration
  'rbac:manage': 'Quản lý phân quyền',
  'rbac:audit_log': 'Xem audit log hệ thống',
  'admin:invite': 'Mời admin mới',
  // Discount Management
  'discount:list': 'Xem danh sách mã giảm giá',
  'discount:view': 'Xem chi tiết mã giảm giá',
  'discount:create': 'Tạo mã giảm giá mới',
  'discount:edit': 'Chỉnh sửa mã giảm giá',
  'discount:delete': 'Xóa mã giảm giá',
  'discount:status_change': 'Thay đổi trạng thái mã giảm giá',
};

/** Category grouping for UI display */
export type PermissionCategory = {
  key: string;
  label: string;
  icon: string;
  permissions: Permission[];
};

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'users',
    label: 'Quản lý Người dùng',
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
    key: 'flights',
    label: 'Quản lý Chuyến bay',
    icon: 'PaperAirplaneIcon',
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
    key: 'bookings',
    label: 'Quản lý Đặt vé',
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
    key: 'finance',
    label: 'Thanh toán & Hoàn tiền',
    icon: 'BanknotesIcon',
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
    key: 'system',
    label: 'Hệ thống & Nội dung',
    icon: 'Cog6ToothIcon',
    permissions: ['system:config', 'content:manage', 'announcement:crud', 'airport:manage'],
  },
  {
    key: 'support',
    label: 'Hỗ trợ & Chat',
    icon: 'ChatBubbleLeftRightIcon',
    permissions: ['chat:view', 'chat:send', 'chat:delete'],
  },
  {
    key: 'analytics',
    label: 'Phân tích & Báo cáo',
    icon: 'PresentationChartBarIcon',
    permissions: ['analytics:view', 'analytics:export', 'report:generate'],
  },
  {
    key: 'tools',
    label: 'Công cụ (SSTK)',
    icon: 'WrenchScrewdriverIcon',
    permissions: ['sstk:execute', 'sstk:view_logs'],
  },
  {
    key: 'security',
    label: 'Bảo mật & Phân quyền',
    icon: 'ShieldCheckIcon',
    permissions: ['rbac:manage', 'rbac:audit_log', 'admin:invite'],
  },
];

// ═════════════════════════════════════════════════════════════════════
// 2. ROLE DEFINITIONS — Predefined roles with permission sets
// ═════════════════════════════════════════════════════════════════════

export type SystemRoleName =
  | 'super_admin'
  | 'admin_ops'
  | 'admin_finance'
  | 'admin_support'
  | 'admin_content';

export interface RoleDefinition {
  name: SystemRoleName;
  label: string;
  description: string;
  color: string; // Tailwind color class for badge
  bgColor: string; // Background color
  level: number; // Higher = more powerful
  permissions: Set<Permission>;
}

/**
 * Role Hierarchy (level-based):
 * super_admin (5): Full access to everything — god mode
 * admin_ops    (4): Operations — flights, bookings, users, analytics
 * admin_finance(3): Finance — payments, refunds, reports
 * admin_support(2): Support — chat, content, announcements
 * admin_content (1): Read-only + limited content editing
 */
export const SYSTEM_ROLES: Record<SystemRoleName, RoleDefinition> = {
  super_admin: {
    name: 'super_admin',
    label: 'Super Admin',
    description: 'Toàn quyền — truy cập và điều khiển mọi tính năng của hệ thống',
    color: 'text-white',
    bgColor: 'bg-gradient-to-r from-red-700 to-red-900',
    level: 5,
    permissions: new Set<Permission>(
      PERMISSION_CATEGORIES.flatMap((c) => c.permissions) as Permission[]
    ),
  },
  admin_ops: {
    name: 'admin_ops',
    label: 'Admin Vận hành',
    description: 'Quản lý chuyến bay, đặt vé, người dùng và phân tích dữ liệu',
    color: 'text-blue-900',
    bgColor: 'bg-gradient-to-r from-blue-600 to-blue-800',
    level: 4,
    permissions: new Set<Permission>([
      'user:list',
      'user:view',
      'user:edit',
      'user:role_change',
      'flight:list',
      'flight:view',
      'flight:create',
      'flight:edit',
      'flight:status_change',
      'flight:price_edit',
      'booking:list',
      'booking:view',
      'booking:create',
      'booking:edit',
      'booking:cancel',
      'booking:status_change',
      'payment:view',
      'payment:process',
      'refund:list',
      'refund:approve',
      'refund:reject',
      'announcement:crud',
      'airport:manage',
      'discount:list',
      'discount:create',
      'discount:edit',
      'discount:delete',
      'system:config',
      'content:manage',
      'analytics:view',
      'analytics:export',
      'report:generate',
      'sstk:execute',
      'sstk:view_logs',
    ]),
  },
  admin_finance: {
    name: 'admin_finance',
    label: 'Admin Tài chính',
    description: 'Quản lý thanh toán, hoàn tiền, báo cáo tài chính',
    color: 'text-emerald-900',
    bgColor: 'bg-gradient-to-r from-emerald-600 to-emerald-800',
    level: 3,
    permissions: new Set<Permission>([
      'booking:list',
      'booking:view',
      'booking:status_change',
      'payment:view',
      'payment:refund',
      'payment:process',
      'refund:list',
      'refund:approve',
      'refund:reject',
      'analytics:view',
      'analytics:export',
      'report:generate',
      'sstk:execute',
      'sstk:view_logs',
    ]),
  },
  admin_support: {
    name: 'admin_support',
    label: 'Admin Hỗ trợ',
    description: 'Quản lý chat hỗ trợ, nội dung, thông báo cho khách hàng',
    color: 'text-purple-900',
    bgColor: 'bg-gradient-to-r from-purple-600 to-purple-800',
    level: 2,
    permissions: new Set<Permission>([
      'user:list',
      'user:view',
      'flight:list',
      'flight:view',
      'booking:list',
      'booking:view',
      'chat:view',
      'chat:send',
      'chat:delete',
      'content:manage',
      'announcement:crud',
      'airport:manage',
      'analytics:view',
    ]),
  },
  admin_content: {
    name: 'admin_content',
    label: 'Admin Nội dung',
    description: 'Đọc dữ liệu hệ thống, chỉnh sửa nội dung cơ bản',
    color: 'text-amber-900',
    bgColor: 'bg-gradient-to-r from-amber-500 to-amber-700',
    level: 1,
    permissions: new Set<Permission>([
      'flight:list',
      'flight:view',
      'booking:list',
      'booking:view',
      'chat:view',
      'content:manage',
      'announcement:crud',
      'analytics:view',
    ]),
  },
};

// All valid role names (including legacy 'admin' and 'user')
export type AllRoles = UserRole | SystemRoleName;

// ═════════════════════════════════════════════════════════════════════
// 3. PERMISSION CHECK ENGINE
// ═════════════════════════════════════════════════════════════════════

/**
 * Check if a given role has a specific permission.
 *
 * - For 'super_admin': always returns true (full access)
 * - For system roles: checks the role's permission set
 * - For legacy 'admin': treated as admin_ops
 * - For 'user': no admin permissions
 */
export function hasPermission(
  userRole: AllRoles,
  permission: Permission,
  customPermissions?: Permission[] | null
): boolean {
  // Super admin has everything
  if (userRole === 'super_admin') return true;

  // Legacy admin → treat as admin_ops
  const resolvedRole: SystemRoleName | 'user' =
    userRole === 'admin' ? 'admin_ops' : (userRole as SystemRoleName | 'user');

  // Regular users have no admin permissions
  if (resolvedRole === 'user') return false;

  // Check system role definition
  const roleDef = SYSTEM_ROLES[resolvedRole];
  if (roleDef) {
    return roleDef.permissions.has(permission);
  }

  // Check custom/overridden permissions from DB
  if (customPermissions && Array.isArray(customPermissions)) {
    return customPermissions.includes(permission);
  }

  return false;
}

/**
 * Check if a role has ALL of the required permissions.
 */
export function hasAllPermissions(
  userRole: AllRoles,
  permissions: Permission[],
  customPermissions?: Permission[] | null
): boolean {
  return permissions.every((p) => hasPermission(userRole, p, customPermissions));
}

/**
 * Check if a role has ANY of the required permissions.
 */
export function hasAnyPermission(
  userRole: AllRoles,
  permissions: Permission[],
  customPermissions?: Permission[] | null
): boolean {
  return permissions.some((p) => hasPermission(userRole, p, customPermissions));
}

/**
 * Get all permissions for a role.
 */
export function getRolePermissions(
  role: AllRoles,
  customPermissions?: Permission[] | null
): Permission[] {
  if (role === 'super_admin') {
    return PERMISSION_CATEGORIES.flatMap((c) => c.permissions) as Permission[];
  }

  const resolvedRole = role === 'admin' ? 'admin_ops' : (role as SystemRoleName | 'user');
  if (resolvedRole === 'user') return [];

  const roleDef = SYSTEM_ROLES[resolvedRole];
  if (roleDef) return Array.from(roleDef.permissions);

  return customPermissions || [];
}

/**
 * Get role display info.
 */
export function getRoleInfo(role: AllRoles): {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  level: number;
} {
  if (role === 'user')
    return {
      label: 'Người dùng',
      description: 'Người dùng thường',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      level: 0,
    };
  if (role === 'admin') return SYSTEM_ROLES.admin_ops;

  const def = SYSTEM_ROLES[role as SystemRoleName];
  return def || { label: String(role), description: '', color: '', bgColor: '', level: 0 };
}

/**
 * Check if targetRole can be managed by actorRole.
 * A role can only manage roles at or below its own level.
 */
export function canManageRole(actorRole: AllRoles, targetRole: AllRoles): boolean {
  const actorLevel = getRoleInfo(actorRole).level;
  const targetLevel = getRoleInfo(targetRole).level;
  return actorLevel > targetLevel;
}

/**
 * Check if a role is an admin role (not a regular user)
 */
export function isAdminRole(role: string): boolean {
  return role !== 'user';
}
