// ⚠️ CRITICAL: Next.js requires this file at the PROJECT ROOT.
// JWT-based authentication middleware - replaces Supabase auth

import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { JWTPayload } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

// ─── HMAC-SHA256 Verification (Edge Runtime Compatible) ───────────────────────

async function verifyJwtSignature(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Re-create the signing input
    const signingInput = `${headerB64}.${payloadB64}`;

    // Decode the secret
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const signingInputData = encoder.encode(signingInput);

    // Import the secret key for HMAC-SHA256
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the input
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, signingInputData);

    // Compare signatures (timing-safe)
    const expectedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
    if (expectedSignature !== signatureB64) return null;

    // Decode payload only after signature is verified
    const payloadJson = base64UrlDecode(payloadB64);
    return JSON.parse(payloadJson) as JWTPayload;
  } catch {
    return null;
  }
}

function base64UrlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Check if a role has admin-level access.
 * Supports both legacy 'admin' and RBAC system roles.
 */
function isAdminRole(role: string): boolean {
  return (
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'admin_ops' ||
    role === 'admin_finance' ||
    role === 'admin_support' ||
    role === 'admin_content'
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;

  // ─── Rate Limiting for Auth Endpoints ──────────────────────────────
  if (pathname.startsWith('/api/xac-thuc/dang-nhap') || pathname.startsWith('/api/xac-thuc/dang-ky')) {
    const limited = rateLimit(request, RATE_LIMITS.strict);
    if (limited) return limited;
  }
  if (pathname.startsWith('/api/xac-thuc/lam-moi')) {
    const limited = rateLimit(request, RATE_LIMITS.auth);
    if (limited) return limited;
  }

  // Get access token from cookies
  const accessToken = request.cookies.get('access_token')?.value;
  let user: JWTPayload | null = null;

  if (accessToken) {
    // Verify JWT signature before trusting the payload
    user = await verifyJwtSignature(accessToken, JWT_SECRET);
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/dang-nhap', '/trang-chu'];
  const isPublicRoute =
    pathname === '/' ||
    publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  // API routes for auth are public
  const isAuthApiRoute = pathname.startsWith('/api/xac-thuc/');

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute && !isAuthApiRoute) {
    const redirectUrl = new URL('/dang-nhap', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated and trying to access login page, redirect to dashboard
  if (user && pathname === '/dang-nhap') {
    const redirectUrl = isAdminRole(user.role) ? '/quan-tri' : '/tai-khoan';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Admin routes require admin role (supports legacy 'admin' + RBAC system roles)
  if (pathname.startsWith('/quan-tri')) {
    if (!user) {
      return NextResponse.redirect(new URL('/dang-nhap', request.url));
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.redirect(new URL('/tai-khoan', request.url));
    }
  }

  // User dashboard and payment routes require authentication
  if (pathname.startsWith('/tai-khoan') || pathname.startsWith('/payment')) {
    if (!user) {
      const redirectUrl = new URL('/dang-nhap', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Admin API routes require admin role (block regular users early)
  if (pathname.startsWith('/api/quan-tri')) {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  // For protected API routes, verify JWT and attach user to headers
  if (pathname.startsWith('/api/') && !isAuthApiRoute) {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Add user info to request headers for downstream API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.userId);
    requestHeaders.set('x-user-email', user.email);
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-fullname', user.fullName);

    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
