'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/database';

/**
 * Check if a role has admin-level access.
 * Supports both legacy 'admin' and RBAC system roles.
 */
export function isAdminRole(role: string): boolean {
  return (
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'admin_ops' ||
    role === 'admin_finance' ||
    role === 'admin_support' ||
    role === 'admin_content'
  );
}

/**
 * Get display label for a role (Vietnamese).
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    user: 'Người dùng',
    admin: 'Quản trị viên',
    super_admin: 'Super Admin',
    admin_ops: 'Admin Vận hành',
    admin_finance: 'Admin Tài chính',
    admin_support: 'Admin Hỗ trợ',
    admin_content: 'Admin Nội dung',
  };
  return labels[role] || role;
}

/**
 * Get hierarchy level for a role (higher = more powerful).
 */
function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
    user: 0,
    admin_content: 1,
    admin_support: 2,
    admin_finance: 3,
    admin_ops: 4,
    admin: 4, // legacy admin treated as admin_ops level
    super_admin: 5,
  };
  return levels[role] ?? 0;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  avatarUrl?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  roleLabel: string;
  roleLevel: number;
  profile: Profile | null;
  isAdmin: boolean;
  isUser: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: { fullName?: string; phone?: string; avatarUrl?: string }
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<Profile | null>;
  fetchProfile: (userId: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ error?: string } | void>;
  changeUserRoleAdmin: (userId: string, newRole: UserRole) => Promise<{ error?: string } | void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ─── API Helpers ────────────────────────────────────────────────────────────

async function fetchAuth(endpoint: string, options?: RequestInit) {
  const res = await fetch(`/api/auth${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  return data;
}

// ─── AuthProvider ───────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('user');
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = isAdminRole(role);
  const isUser = role === 'user';
  const roleLabel = getRoleLabel(role);
  const roleLevel = getRoleLevel(role);

  // Fetch current user from /api/auth/me
  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await fetchAuth('/me');
      if (data.user) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || data.user.full_name || '',
          role: data.user.role || 'user',
          phone: data.user.phone,
          avatarUrl: data.user.avatarUrl || data.user.avatar_url,
          createdAt: data.user.createdAt || data.user.created_at,
          updatedAt: data.user.updatedAt || data.user.updated_at,
        };
        setUser(userData);
        setRole(userData.role);
        setProfile({
          id: userData.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          phone: userData.phone,
          avatarUrl: userData.avatarUrl,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString(),
        });
      } else {
        setUser(null);
        setRole('user');
        setProfile(null);
      }
    } catch {
      setUser(null);
      setRole('user');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh access token before it expires (every 10 minutes)
  const refreshToken = useCallback(async () => {
    try {
      const data = await fetchAuth('/refresh', { method: 'POST' });
      if (data.user) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.fullName || data.user.full_name || prev.fullName,
                role: data.user.role,
              }
            : null
        );
      }
    } catch {
      // Token refresh failed, user will be logged out on next request
    }
  }, []);

  // Set up token refresh timer
  useEffect(() => {
    if (user) {
      // Refresh every 10 minutes (access token expires in 15 minutes)
      refreshTimerRef.current = setInterval(refreshToken, 10 * 60 * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [user, refreshToken]);

  // Load user on mount
  useEffect(() => {
    fetchCurrentUser().catch(() => {
      /* Not logged in - silent */
    });
  }, [fetchCurrentUser]);

  // ─── Auth Methods ───────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    metadata: { fullName?: string; phone?: string; avatarUrl?: string } = {}
  ) => {
    const data = await fetchAuth('/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: metadata.fullName || '',
        phone: metadata.phone || '',
        avatar_url: metadata.avatarUrl || '',
      }),
    });

    if (data.user) {
      setUser(data.user);
      setRole(data.user.role || 'user');
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const data = await fetchAuth('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.user) {
      setUser(data.user);
      setRole(data.user.role || 'user');
    }

    return data;
  };

  const signOut = async () => {
    try {
      await fetchAuth('/logout', { method: 'POST' });
    } catch {
      // Continue logout even if API fails
    }

    setUser(null);
    setProfile(null);
    setRole('user');

    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    router.push('/sign-up-login');
  };

  const getCurrentUser = async () => {
    if (user) return user;
    await fetchCurrentUser().catch(() => {
      /* Not logged in - silent */
    });
    return user;
  };

  const isEmailVerified = () => {
    // JWT auth doesn't have email verification by default
    // Return true if user exists (assumes email was verified during registration)
    return user !== null;
  };

  const fetchProfile = async (userId: string) => {
    // Profile is already included in user data from JWT
    // This method exists for API compatibility
    if (user && user.id === userId) {
      setProfile({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString(),
      });
    }
  };

  const getUserProfile = async () => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    } as Profile;
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || data.message || 'Failed to update role' };
      }

      // Refresh current user to sync state
      await fetchCurrentUser();
    } catch (err: any) {
      return { error: err.message || 'Network error' };
    }
  };

  const changeUserRoleAdmin = async (userId: string, newRole: UserRole) => {
    return updateUserRole(userId, newRole);
  };

  // ─── Context Value ──────────────────────────────────────────────────────

  const value: AuthContextType = {
    user,
    loading,
    role,
    roleLabel,
    roleLevel,
    profile,
    isAdmin,
    isUser,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    fetchProfile,
    updateUserRole,
    changeUserRoleAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
