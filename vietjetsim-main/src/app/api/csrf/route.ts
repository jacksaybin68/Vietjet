/**
 * CSRF Token Endpoint
 * Returns a CSRF token in the response cookie.
 * Client should call this before making mutation requests.
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_TOKEN_LENGTH = 32; // bytes
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function GET() {
  const token = generateCsrfToken();

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
