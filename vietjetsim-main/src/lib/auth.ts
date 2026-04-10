import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET and/or JWT_REFRESH_SECRET environment variables are not set. ' +
    'Please create a .env.local file from .env.local.example and configure both secrets.'
  );
}

if (JWT_SECRET === 'dev-secret-key-do-not-use-in-production' ||
    JWT_REFRESH_SECRET === 'dev-refresh-secret-key-do-not-use-in-production') {
  console.warn(
    'WARNING: Using default JWT secret keys. This is ONLY acceptable for local development. ' +
    'NEVER deploy with default secrets!'
  );
}
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_SALT_ROUNDS = 12;

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// ─── Password Hashing ───────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ─── JWT Token Management ───────────────────────────────────────────────────

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET!) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function generateTokens(user: User): AuthTokens {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// ─── Password Policy ───────────────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password against policy:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (!@#$%^&*()_+\-=[\]{};':"|,.<>/?)
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ in hoa');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
  }
  if (!/\d/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 số');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Token Hashing (for refresh token DB storage) ──────────────────────────

/** SHA-256 hash of a token — only the hash is stored, never the plaintext. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generate a cryptographically random family UUID for refresh token grouping. */
export function generateTokenFamily(): string {
  return randomUUID();
}

// ─── API Route Cookie Helpers (Response-based) ──────────────────────────────
// Use these in API routes to set cookies on the response object

export function setAuthCookiesOnResponse(response: NextResponse, tokens: AuthTokens): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearAuthCookiesOnResponse(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

// ─── Server Component Cookie Helpers (cookies()-based) ──────────────────────
// Use these in Server Components, Middleware, or Server Actions

export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function getCurrentUserFromCookies(): Promise<JWTPayload | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  return verifyAccessToken(token);
}

// ─── Client-side Cookie Helpers ─────────────────────────────────────────────
// Use these in client components for reading tokens (read-only)

export function getClientToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp('(^| )' + ACCESS_TOKEN_COOKIE + '=([^;]+)'));
  return match ? match[2] : null;
}

export function parseTokenPayload(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Token from Request (for API routes) ─────────────────────────────────────

export async function getToken(request: Request): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyAccessToken(token);
  }

  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...value] = c.split('=');
        return [key, value.join('=')];
      })
    );
    const accessToken = cookies[ACCESS_TOKEN_COOKIE];
    if (accessToken) {
      return verifyAccessToken(accessToken);
    }
  }

  return null;
}

export async function verifyAuthRequest(request: Request) {
  const user = await getToken(request);
  if (!user) {
    return {
      user: null,
      error: 'Unauthorized',
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { user, error: null, response: null };
}



