import type { UserRole } from '@/types/database';

/** The authenticated user as returned by the auth routes (camelCase). */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}

/** `GET /api/xac-thuc/toi` always answers 200, using a null user for no session. */
export interface CurrentUserResponse {
  user: AuthUser | null;
  message?: string;
}

export type { UserRole };
