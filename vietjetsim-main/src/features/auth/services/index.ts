import { apiRequest } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';
import type { AuthResponse, CurrentUserResponse, LoginInput } from '../types';

// ─── Auth ───────────────────────────────────────────────────────────────────
// Login/register/logout rely on HttpOnly cookies set by the route handlers
// (`setAuthCookiesOnResponse`); no token ever reaches client-side JS.

export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, { method: 'POST', body: input });
}

export interface RegisterInput {
  email?: string;
  phone?: string;
  password: string;
  full_name: string;
  dob?: string;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, { method: 'POST', body: input });
}

export async function logout(): Promise<void> {
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
}

/** Returns `null` rather than throwing when there is no valid session. */
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>(API_ENDPOINTS.AUTH.ME);
}

/** Rotate the access token using the refresh cookie. Throws if the session is gone. */
export async function refreshSession(): Promise<void> {
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.AUTH.REFRESH, { method: 'POST' });
}

/**
 * Request a password reset link for an email or phone number. The server
 * always answers with the same generic success, so the result cannot reveal
 * whether the account exists.
 */
export async function requestPasswordReset(
  identifier: string
): Promise<{ success: boolean; resetUrl?: string }> {
  return apiRequest<{ success: boolean; resetUrl?: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
    method: 'POST',
    body: { email: identifier },
  });
}

/** Check whether a reset token is still valid before rendering the form. */
export async function isResetTokenValid(token: string): Promise<boolean> {
  const result = await apiRequest<{ valid: boolean }>(
    `${API_ENDPOINTS.AUTH.RESET_PASSWORD}?token=${encodeURIComponent(token)}`
  );
  return result.valid === true;
}

/** Complete a password reset with the token from the email link. */
export async function resetPassword(
  token: string,
  password: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
    method: 'POST',
    body: { token, password },
  });
}
