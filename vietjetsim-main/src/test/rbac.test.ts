import { describe, it, expect } from 'vitest';
import {
  Permission,
  hasPermission,
  getRolePermissions,
  canManageRole,
  isAdminRole,
  hasAnyPermission,
  hasAllPermissions,
  getRoleInfo,
} from '@/lib/rbac';
import { isAssignableRole, normalizeRole } from '@/lib/roles';

describe('RBAC Module', () => {
  describe('Permission Checks', () => {
    it('should grant all permissions to admin', () => {
      const permissions = getRolePermissions('admin');
      expect(permissions).toContain('user:list');
      expect(permissions).toContain('user:view');
      expect(permissions).toContain('user:create');
      expect(permissions).toContain('user:edit');
      expect(permissions).toContain('user:delete');
      expect(permissions).toContain('user:role_change');
      expect(permissions).toContain('flight:list');
      expect(permissions).toContain('flight:create');
      expect(permissions).toContain('flight:edit');
      expect(permissions).toContain('flight:delete');
      expect(permissions).toContain('flight:status_change');
      expect(permissions).toContain('flight:price_edit');
      expect(permissions).toContain('booking:list');
      expect(permissions).toContain('booking:create');
      expect(permissions).toContain('booking:edit');
      expect(permissions).toContain('booking:cancel');
      expect(permissions).toContain('booking:status_change');
      expect(permissions).toContain('payment:view');
      expect(permissions).toContain('payment:refund');
      expect(permissions).toContain('payment:process');
      expect(permissions).toContain('refund:list');
      expect(permissions).toContain('refund:approve');
      expect(permissions).toContain('refund:reject');
      expect(permissions).toContain('system:config');
      expect(permissions).toContain('content:manage');
      expect(permissions).toContain('announcement:crud');
      expect(permissions).toContain('airport:manage');
      expect(permissions).toContain('chat:view');
      expect(permissions).toContain('chat:send');
      expect(permissions).toContain('chat:delete');
      expect(permissions).toContain('analytics:view');
      expect(permissions).toContain('analytics:export');
      expect(permissions).toContain('report:generate');
      expect(permissions).toContain('sstk:execute');
      expect(permissions).toContain('sstk:view_logs');
      expect(permissions).toContain('rbac:manage');
      expect(permissions).toContain('rbac:audit_log');
      expect(permissions).toContain('admin:invite');
      expect(permissions).toContain('discount:list');
      expect(permissions).toContain('discount:view');
      expect(permissions).toContain('discount:create');
      expect(permissions).toContain('discount:edit');
      expect(permissions).toContain('discount:delete');
      expect(permissions).toContain('discount:status_change');
    });

    it('should grant no permissions to regular user', () => {
      const permissions = getRolePermissions('user');
      expect(permissions).toHaveLength(0);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin with any permission', () => {
      expect(hasPermission('admin', 'user:delete')).toBe(true);
      expect(hasPermission('admin', 'flight:create')).toBe(true);
      expect(hasPermission('admin', 'rbac:manage')).toBe(true);
      expect(hasPermission('admin', 'system:config')).toBe(true);
      expect(hasPermission('admin', 'discount:status_change')).toBe(true);
    });

    it('should return false for regular user with any permission', () => {
      expect(hasPermission('user', 'flight:view')).toBe(false);
      expect(hasPermission('user', 'booking:list')).toBe(false);
      expect(hasPermission('user', 'user:delete')).toBe(false);
    });

    it('should accept customPermissions parameter (backward compatible, ignored)', () => {
      const customPerms: Permission[] = ['user:view', 'flight:list'];
      expect(hasPermission('admin', 'user:delete', customPerms)).toBe(true);
      expect(hasPermission('user', 'user:view', customPerms)).toBe(false);
      expect(hasPermission('user', 'flight:list', customPerms)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true for admin', () => {
      expect(hasAnyPermission('admin', ['flight:create', 'user:delete'])).toBe(true);
    });

    it('should return false for user', () => {
      expect(hasAnyPermission('user', ['flight:view', 'booking:list'])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true for admin', () => {
      expect(hasAllPermissions('admin', ['flight:list', 'flight:create', 'user:view'])).toBe(true);
    });

    it('should return false for user', () => {
      expect(hasAllPermissions('user', ['flight:create', 'flight:delete'])).toBe(false);
    });
  });

  describe('canManageRole', () => {
    it('should allow admin to manage user role', () => {
      expect(canManageRole('admin', 'user')).toBe(true);
    });

    it('should prevent admin from managing other admins', () => {
      expect(canManageRole('admin', 'admin')).toBe(false);
    });

    it('should prevent user from managing anyone', () => {
      expect(canManageRole('user', 'user')).toBe(false);
      expect(canManageRole('user', 'admin')).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('should return true for admin', () => {
      expect(isAdminRole('admin')).toBe(true);
    });

    it('should treat legacy admin-family roles as admins', () => {
      // Accounts holding these exist in the database, and middleware has always
      // let them into /quan-tri, so the API must not disagree.
      for (const role of [
        'super_admin',
        'admin_ops',
        'admin_finance',
        'admin_support',
        'admin_content',
      ]) {
        expect(isAdminRole(role)).toBe(true);
      }
    });

    it('should return false for regular user, unknown, and empty roles', () => {
      expect(isAdminRole('user')).toBe(false);
      expect(isAdminRole('guest')).toBe(false);
      expect(isAdminRole(null)).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
      expect(isAdminRole('')).toBe(false);
    });
  });

  describe('canManageRole ordering', () => {
    it('lets a super admin manage a plain admin', () => {
      expect(canManageRole('super_admin', 'admin')).toBe(true);
    });

    it('stops an admin from managing a super admin', () => {
      expect(canManageRole('admin', 'super_admin')).toBe(false);
    });

    it('stops anyone from managing an equal-ranked role', () => {
      expect(canManageRole('admin_ops', 'admin_finance')).toBe(false);
    });
  });

  describe('normalizeRole and role assignment', () => {
    it('collapses legacy admin names onto admin', () => {
      expect(normalizeRole('super_admin')).toBe('admin');
      expect(normalizeRole('admin')).toBe('admin');
      expect(normalizeRole('user')).toBe('user');
      expect(normalizeRole('bogus')).toBe('user');
    });

    it('accepts only user and admin as assignable roles', () => {
      expect(isAssignableRole('admin')).toBe(true);
      expect(isAssignableRole('user')).toBe(true);
      // Legacy names remain valid stored data but must not be handed out.
      expect(isAssignableRole('super_admin')).toBe(false);
      expect(isAssignableRole('admin_ops')).toBe(false);
      expect(isAssignableRole(undefined)).toBe(false);
      expect(isAssignableRole(42)).toBe(false);
    });
  });

  describe('getRoleInfo', () => {
    it('should return correct info for admin', () => {
      const info = getRoleInfo('admin');
      expect(info.label).toBe('Quản trị viên');
      expect(info.level).toBe(1);
    });

    it('should return correct info for user', () => {
      const info = getRoleInfo('user');
      expect(info.label).toBe('Người dùng');
      expect(info.level).toBe(0);
    });
  });
});
