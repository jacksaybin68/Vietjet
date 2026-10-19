'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/database';
import { updateUser } from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';
import { getCsrfHeaders } from '@/lib/csrf-client';

import { isAdminRole } from '@/lib/roles';
import { normalizePhone } from '@/lib/utils';

export { isAdminRole };

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
  skyjoyMemberId?: string;
  createdAt?: string;
  updatedAt?: string;
  // Snake_case aliases some API responses still use.
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/** Metadata gửi kèm khi đăng ký (đã bao gồm các trường SkyJoy mở rộng). */
export interface SignUpMetadata {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  dob?: string;
  /** Danh xưng: ong | ba | co | anh. */
  salutation?: string;
  /** Họ, viết hoa không dấu (NGUYEN). */
  lastName?: string;
  /** Tên đệm & tên, viết hoa không dấu (VAN A). */
  firstName?: string;
  /** Mã giới thiệu SkyJoy (mã hội viên của người giới thiệu). */
  referralCode?: string;
  /** Mã OTP SMS đã nhận, bắt buộc khi đăng ký bằng số điện thoại. */
  otpCode?: string;
  captchaToken?: string;
  captchaAnswer?: string;
}

export interface CaptchaChallenge {
  token: string;
  question: string;
  expiresIn: number;
}

export interface SocialProviderConfig {
  id: string;
  label: string;
  enabled: boolean;
}

export interface SendOtpInput {
  /** Số điện thoại cho `purpose: 'register'`. */
  phone?: string;
  /** Email / số điện thoại / mã hội viên cho `purpose: 'login'`. */
  identifier?: string;
  purpose: 'register' | 'login';
  captchaToken?: string;
  captchaAnswer?: string;
}

export interface SendOtpResult {
  success: boolean;
  message?: string;
  phone?: string;
  expiresInMinutes?: number;
  /** Chỉ có ở môi trường không phải production (chưa cấu hình SMS gateway). */
  devCode?: string;
}

/** Shape returned by the `/api/xac-thuc/*` handlers the provider wraps. */
export interface AuthResponse {
  user?: User;
  success?: boolean;
  message?: string;
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
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<AuthResponse>;
  signIn: (
    email: string,
    password: string,
    token?: string,
    captcha?: { token?: string; answer?: string }
  ) => Promise<AuthResponse>;
  signInWithOtp: (identifier: string, code: string) => Promise<AuthResponse>;
  /** Gửi OTP SMS cho đăng ký hoặc đăng nhập. */
  requestOtp: (input: SendOtpInput) => Promise<SendOtpResult>;
  /** Lấy CAPTCHA mới (câu hỏi + chữ ký) từ server. */
  getCaptcha: () => Promise<CaptchaChallenge>;
  /** Danh sách Social Login kèm trạng thái cấu hình. */
  getSocialProviders: () => Promise<SocialProviderConfig[]>;
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

/**
 * Gọi một endpoint `/api/xac-thuc/*`.
 *
 * `T` cho phép route trả shape riêng (CaptchaChallenge, SendOtpResult…) mà không
 * phải ép kiểu ở chỗ gọi. Lỗi vẫn luôn là `Error` mang theo payload đã parse, nên
 * `requires2FA` / `captchaRequired` đọc được từ `error`.
 */
async function fetchAuth<T = AuthResponse>(endpoint: string, options?: RequestInit): Promise<T> {
  const { headers, ...rest } = options ?? {};
  const res = await fetch(`/api/xac-thuc${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...getCsrfHeaders(),
      ...headers,
    },
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    // Preserve the server's machine-readable fields (e.g. requires2FA) so
    // callers can branch on them instead of string-matching the message.
    throw Object.assign(new Error(data.error || data.message || 'Auth request failed'), data);
  }

  return data as T;
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
  const isAdmin = isAdminRole(role);
  const isUser = !isAdmin;

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
      const data = await fetchAuth('/toi');
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
          createdAt: data.user.createdAt || data.user.created_at || '',
          updatedAt: data.user.updatedAt || data.user.updated_at || '',
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

  const signUp = async (email: string, password: string, metadata?: SignUpMetadata) => {
    const data = await fetchAuth('/dang-ky', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: metadata?.fullName,
        phone: normalizePhone(metadata?.phone),
        avatar_url: metadata?.avatarUrl,
        dob: metadata?.dob,
        salutation: metadata?.salutation,
        last_name: metadata?.lastName,
        first_name: metadata?.firstName,
        referral_code: metadata?.referralCode,
        otp_code: metadata?.otpCode,
        captchaToken: metadata?.captchaToken,
        captchaAnswer: metadata?.captchaAnswer,
      }),
    });

    if (data.user) {
      setUser(data.user);
      setRole(data.user.role || 'user');
    }

    return data;
  };

  const signIn = async (
    email: string,
    password: string,
    token?: string,
    captcha?: { token?: string; answer?: string }
  ) => {
    const data = await fetchAuth('/dang-nhap', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        token,
        captchaToken: captcha?.token,
        captchaAnswer: captcha?.answer,
      }),
    });

    if (data.user) {
      setUser(data.user);
      setRole(data.user.role || 'user');
    }

    return data;
  };

  /** Đăng nhập không cần mật khẩu bằng OTP SMS đã nhận. */
  const signInWithOtp = async (identifier: string, code: string) => {
    const data = await fetchAuth('/dang-nhap-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, code }),
    });

    if (data.user) {
      setUser(data.user);
      setRole(data.user.role || 'user');
    }

    return data;
  };

  const requestOtp = async (input: SendOtpInput) => {
    return fetchAuth<SendOtpResult>('/otp/gui', { method: 'POST', body: JSON.stringify(input) });
  };

  const getCaptcha = async () => {
    return fetchAuth<CaptchaChallenge>('/captcha');
  };

  const getSocialProviders = async () => {
    const data = await fetchAuth<{ providers?: SocialProviderConfig[] }>('/social');
    return data.providers ?? [];
  };

  const signOut = async () => {
    try {
      await fetchAuth('/dang-xuat', { method: 'POST' });
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
      await updateUser(userId, { role: newRole });

      // Refresh current user to sync state
      await fetchCurrentUser();
    } catch (err) {
      return { error: getApiErrorMessage(err, 'Network error') };
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
    signInWithOtp,
    requestOtp,
    getCaptcha,
    getSocialProviders,
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
