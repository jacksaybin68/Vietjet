// Auth-related constants
import { API_ENDPOINTS } from '@/shared/constants';

export const AUTH_API_ENDPOINTS = API_ENDPOINTS.AUTH;

/** HttpOnly cookie names set by `setAuthCookiesOnResponse`. */
export const AUTH_COOKIES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Client-side mirror of `validatePassword` in `src/lib/auth.ts`. Kept in sync
 * with the server rule so the signup form can show errors before submitting;
 * the server remains the enforcement point.
 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_DIGIT: true,
  REQUIRE_SPECIAL: true,
} as const;

export const AUTH_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Email/Số điện thoại hoặc mật khẩu không đúng',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  UNAUTHORIZED: 'Bạn cần đăng nhập để tiếp tục',
} as const;
