// ⚠️ CRITICAL: Next.js requires this file at the PROJECT ROOT.
// JWT-based authentication middleware - replaces Supabase auth

import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { JWTPayload } from '@/lib/auth';
import { isAdminRole as sharedIsAdminRole } from '@/lib/roles';
import { isPublicApiRoute, isPublicRoute } from '@/lib/route-access';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'dev-secret-key-do-not-use-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET is missing or equals the development default while ' +
        'NODE_ENV=production. Configure JWT_SECRET in your deployment environment before starting.'
    );
  }
  console.warn(
    'WARNING: JWT_SECRET is missing — falling back to the development secret. ' +
      'This is ONLY acceptable for local development.'
  );
}

const effectiveJwtSecret = JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

// Must match `CSRF_COOKIE_NAME` in `@/lib/csrf-client`; duplicated because the
// Edge middleware bundle cannot import `next/headers`-dependent modules.
const CSRF_COOKIE_NAME = 'csrf_token';

// ─── HMAC-SHA256 Verification (Edge Runtime Compatible) ───────────────────────

async function verifyJwtSignature(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Pin the algorithm to HS256 (defense-in-depth against alg-confusion attacks).
    let header: { alg?: string };
    try {
      header = JSON.parse(base64UrlDecode(headerB64));
    } catch {
      return null;
    }
    if (header?.alg !== 'HS256') return null;

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
      ['verify', 'sign']
    );

    // Timing-safe signature verification via constant-time comparison in WebCrypto.
    const signatureIsValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      base64UrlToUint8Array(signatureB64),
      signingInputData
    );
    if (!signatureIsValid) return null;

    // Decode payload only after signature is verified
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson) as JWTPayload;

    // Enforce token expiry at the Edge: an expired access token must not grant
    // access to protected pages/APIs even if its signature is still valid.
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function base64UrlToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  // Explicit ArrayBuffer backing so the value satisfies crypto.subtle's BufferSource
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Delegates to the shared role rules so middleware and API routes cannot
 * disagree about who is an admin.
 */
function isAdminRole(role: string): boolean {
  return sharedIsAdminRole(role);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;

  // ─── Rate Limiting for Auth Endpoints ──────────────────────────────
  if (
    pathname.startsWith('/api/xac-thuc/dang-nhap') ||
    pathname.startsWith('/api/xac-thuc/dang-ky')
  ) {
    const limited = rateLimit(request, RATE_LIMITS.strict);
    if (limited) return limited;
  }
  if (pathname.startsWith('/api/xac-thuc/lam-moi')) {
    const limited = rateLimit(request, RATE_LIMITS.auth);
    if (limited) return limited;
  }
  // Password recovery issues/consumes tokens, so treat it like the login endpoints.
  if (
    pathname.startsWith('/api/xac-thuc/quen-mat-khau') ||
    pathname.startsWith('/api/xac-thuc/dat-lai-mat-khau')
  ) {
    const limited = rateLimit(request, RATE_LIMITS.strict);
    if (limited) return limited;
  }

  // Get access token from cookies
  const accessToken = request.cookies.get('access_token')?.value;
  let user: JWTPayload | null = null;

  if (accessToken) {
    // Verify JWT signature before trusting the payload
    user = await verifyJwtSignature(accessToken, effectiveJwtSecret);
  }

  const publicPage = isPublicRoute(pathname);
  const publicApi = isPublicApiRoute(pathname);

  // API routes for auth are public
  const isAuthApiRoute = pathname.startsWith('/api/xac-thuc/');

  // If not authenticated and trying to access protected route
  if (!user && !publicPage && !isAuthApiRoute && !publicApi) {
    // API routes must answer 401 (not redirect) so clients can branch on
    // status — redirecting an XHR to /dang-nhap breaks the caller's error
    // handling and lets the browser swallow the auth failure as a page load.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
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
  if (pathname.startsWith('/api/') && !isAuthApiRoute && !publicApi) {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Header values are ByteStrings: any character above U+00FF (e.g. Vietnamese
    // diacritics) throws "Cannot convert argument to a ByteString" in the Edge
    // runtime. None of the x-user-* headers are read downstream — route handlers
    // resolve identity from the signed JWT via verifyAuthRequest — so drop
    // non-latin-1 characters rather than corrupting them.
    const byteString = (v: string) =>
      Array.from(v).every((ch) => ch.codePointAt(0)! <= 0xff) ? v : '';

    // Add user info to request headers for downstream API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', byteString(user.userId));
    requestHeaders.set('x-user-email', byteString(user.email));
    requestHeaders.set('x-user-role', byteString(user.role));
    requestHeaders.set('x-user-fullname', byteString(user.fullName));

    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Bootstrap the double-submit CSRF cookie for any browser session that does
  // not have one yet, so mutation calls guarded by `validateCsrfOrReject`
  // succeed without requiring an explicit token-fetch round trip.
  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
