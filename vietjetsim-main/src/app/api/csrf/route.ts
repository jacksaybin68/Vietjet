/**
 * CSRF Token Endpoint
 * Returns a CSRF token in the response cookie.
 * Client should call this before making mutation requests.
 */

import { NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, generateCsrfToken, getCsrfTokenFromRequest } from '@/lib/csrf';

const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function GET(request: Request) {
  // Reuse the token the client already holds — normally bootstrapped by
  // `src/proxy.ts` — instead of rotating it. Rotating on every call makes the
  // value the client is about to echo back in `x-csrf-token` change underneath
  // it, and turns a first-time GET into two `Set-Cookie: csrf_token=…` headers
  // (this one plus the proxy's) whose surviving value depends on header
  // ordering. One issuer, one value per response.
  const existing = await getCsrfTokenFromRequest(request);
  const token = existing ?? generateCsrfToken();

  const response = NextResponse.json({
    success: true,
    message: 'CSRF token generated',
  });

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_COOKIE_MAX_AGE,
  });

  return response;
}
