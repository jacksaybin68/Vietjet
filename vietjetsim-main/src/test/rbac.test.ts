import { describe, it, expect } from 'vitest';
import {
  Permission,
  hasPermission,
  getRolePermissions,
  canManageRole,
  isAdminRole,
  hasAnyPermission,
  hasAllPermissions,
  AllRoles,
} from '@/lib/rbac';

describe('RBAC Module', () => {
  describe('Permission Checks', () => {
    it('should grant all permissions to super_admin', () => {
      const permissions = getRolePermissions('super_admin');
      expect(permissions.length).toBeGreaterThanOrEqual(40);
      expect(permissions).toContain('user:list');
      expect(permissions).toContain('flight:create');
      expect(permissions).toContain('rbac:manage');
    });

    it('should grant user management permissions to admin role', () => {
      const permissions = getRolePermissions('admin');
      expect(permissions).toContain('user:list');
      expect(permissions).toContain('user:view');
      expect(permissions).toContain('user:edit');
    });

    it('should grant flight management permissions to admin_ops', () => {
      const permissions = getRolePermissions('admin_ops');
      expect(permissions).toContain('flight:list');
      expect(permissions).toContain('flight:create');
      expect(permissions).toContain('flight:edit');
      expect(permissions).toContain('booking:list');
    });

    it('should grant finance permissions to admin_finance', () => {
      const permissions = getRolePermissions('admin_finance');
      expect(permissions).toContain('payment:view');
      expect(permissions).toContain('refund:list');
      expect(permissions).toContain('refund:approve');
    });

    it('should grant support permissions to admin_support', () => {
      const permissions = getRolePermissions('admin_support');
      expect(permissions).toContain('chat:view');
      expect(permissions).toContain('chat:send');
      expect(permissions).toContain('announcement:crud');
    });

    it('should grant limited permissions to admin_content', () => {
      const permissions = getRolePermissions('admin_content');
      expect(permissions).toContain('flight:view');
      expect(permissions).toContain('booking:view');
      expect(permissions).not.toContain('flight:create');
      expect(permissions).not.toContain('user:delete');
    });

    it('should grant no permissions to regular user', () => {
      const permissions = getRolePermissions('user');
      expect(permissions).toHaveLength(0);
    });
  });

  describe('hasPermission', () => {
    it('should return true for super_admin with any permission', () => {
      expect(hasPermission('super_admin', 'user:delete')).toBe(true);
      expect(hasPermission('super_admin', 'rbac:manage')).toBe(true);
      expect(hasPermission('super_admin', 'system:config')).toBe(true);
    });

    it('should return false for admin_content with restricted permissions', () => {
      expect(hasPermission('admin_content', 'user:create')).toBe(false);
      expect(hasPermission('admin_content', 'flight:delete')).toBe(false);
    });

    it('should return false for regular user with any permission', () => {
      expect(hasPermission('user', 'flight:view')).toBe(false);
      expect(hasPermission('user', 'booking:list')).toBe(false);
    });

    it('should respect custom permissions override', () => {
      const customPerms: Permission[] = ['user:view', 'flight:list'];
      expect(hasPermission('user', 'user:view', customPerms)).toBe(true);
      expect(hasPermission('user', 'flight:list', customPerms)).toBe(true);
      expect(hasPermission('user', 'user:edit', customPerms)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      expect(hasAnyPermission('admin_ops', ['flight:create', 'user:delete'])).toBe(true);
      expect(hasAnyPermission('admin_content', ['flight:view', 'booking:list'])).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      expect(hasAnyPermission('admin_content', ['user:create', 'flight:delete'])).toBe(false);
      expect(hasAnyPermission('user', ['flight:view', 'booking:list'])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      expect(hasAllPermissions('admin_ops', ['flight:list', 'flight:create'])).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      expect(hasAllPermissions('admin_content', ['flight:create', 'flight:delete'])).toBe(false);
    });
  });

  describe('canManageRole', () => {
    it('should allow super_admin to manage any role', () => {
      expect(canManageRole('super_admin', 'admin')).toBe(true);
      expect(canManageRole('super_admin', 'admin_ops')).toBe(true);
      expect(canManageRole('super_admin', 'admin_content')).toBe(true);
    });

    it('should allow admin to manage lower roles', () => {
      expect(canManageRole('admin', 'admin_content')).toBe(true);
      expect(canManageRole('admin', 'user')).toBe(true);
    });

    it('should prevent admin from managing same or higher roles', () => {
      expect(canManageRole('admin', 'admin')).toBe(false);
      expect(canManageRole('admin', 'admin_ops')).toBe(false);
      expect(canManageRole('admin', 'super_admin')).toBe(false);
    });

    it('should prevent lower roles from managing higher roles', () => {
      expect(canManageRole('admin_content', 'admin_finance')).toBe(false);
      expect(canManageRole('admin_support', 'admin_ops')).toBe(false);
    });

    it('should prevent regular user from managing anyone', () => {
      expect(canManageRole('user', 'user')).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('should return true for admin roles', () => {
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('super_admin')).toBe(true);
      expect(isAdminRole('admin_ops')).toBe(true);
      expect(isAdminRole('admin_finance')).toBe(true);
      expect(isAdminRole('admin_support')).toBe(true);
      expect(isAdminRole('admin_content')).toBe(true);
    });

    it('should return false for regular user', () => {
      expect(isAdminRole('user')).toBe(false);
      expect(isAdminRole('guest')).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    it('should define correct role levels', () => {
      const roleOrder: AllRoles[] = [
        'super_admin',
        'admin_ops', // 'admin' maps to admin_ops
        'admin_finance',
        'admin_support',
        'admin_content',
        'user',
      ];

      for (let i = 0; i < roleOrder.length - 1; i++) {
        const higherRole = roleOrder[i];
        const lowerRole = roleOrder[i + 1];

        expect(canManageRole(higherRole, lowerRole)).toBe(true);
        expect(canManageRole(lowerRole, higherRole)).toBe(false);
      }
    });
  });
});
