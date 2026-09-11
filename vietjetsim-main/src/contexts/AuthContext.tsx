'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/database';

/**
 * Check if a role has admin access.
 * Simplified system: only 'admin' has admin access.
 */
export function isAdminRole(role: string): boolean {
  return role === 'admin';
}

/**
 * Get display label for a role (Vietnamese).
 */
function getRoleLabel(role: string): string {
  return role === 'admin' ? 'Quản trị viên' : 'Người dùng';
}

/**
 * Get hierarchy level for a role (higher = more powerful).
 */
function getRoleLevel(role: string): number {
  return role === 'admin' ? 1 : 0;
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
    metadata?: { fullName?: string; phone?: string; avatarUrl?: string; dob?: string }
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
  const res = await fetch(`/api/xac-thuc${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Auth request failed');
  }

  return data;
}

// ─── Auth Provider ──────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('user');
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive display values from role
  const roleLabel = getRoleLabel(role);
  const roleLevel = getRoleLevel(role);
  const isAdmin = role === 'admin';
  const isUser = role === 'user';

  // Refresh user profile periodically
  useEffect(() => {
    fetchCurrentUser();

    refreshTimerRef.current = setInterval(
      () => {
        fetchCurrentUser();
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const data = await fetchAuth('/lanh-dao');
      if (data?.user) {
        setUser(data.user);
        setRole(data.user.role || 'user');
        setProfile({
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || data.user.full_name || '',
          role: data.user.role || 'user',
          phone: data.user.phone,
          avatarUrl: data.user.avatarUrl || data.user.avatar_url,
          createdAt: data.user.createdAt || data.user.created_at,
          updatedAt: data.user.updatedAt || data.user.updated_at,
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
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { fullName?: string; phone?: string; avatarUrl?: string; dob?: string }
  ) => {
    const data = await fetchAuth('/dang-ky', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: metadata?.fullName,
        phone: metadata?.phone,
        avatar_url: metadata?.avatarUrl,
        dob: metadata?.dob,
      }),
    });

    if (data.user) {
      setUser(data.user);
      setRole(data.user.role || 'user');
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const data = await fetchAuth('/dang-nhap', {
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

    router.push('/dang-nhap');
  };

  const getCurrentUser = async () => {
    if (user) return user;
    await fetchCurrentUser().catch(() => {
      /* Not logged in - silent */
    });
    return user;
  };

  const isEmailVerified = () => {
    return user !== null;
  };

  const fetchProfile = async (userId: string) => {
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
      const res = await fetch('/api/quan-tri/nguoi-dung', {
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
}
