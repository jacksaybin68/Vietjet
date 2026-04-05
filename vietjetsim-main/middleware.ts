// ⚠️ CRITICAL: Next.js requires this file at the PROJECT ROOT.
// JWT-based authentication middleware - replaces Supabase auth

import { NextResponse, type NextRequest } from 'next/server';
// We use a simple base64 decoder in middleware.ts to avoid importing 'crypto' (Node.js) in Edge Runtime.
// Actual signature verification happens in the backend API routes.
function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { JWTPayload } from '@/lib/auth';

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
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    const limited = rateLimit(request, RATE_LIMITS.strict);
    if (limited) return limited;
  }
  if (pathname.startsWith('/api/auth/refresh')) {
    const limited = rateLimit(request, RATE_LIMITS.auth);
    if (limited) return limited;
  }

  // Get access token from cookies
  const accessToken = request.cookies.get('access_token')?.value;
  let user: JWTPayload | null = null;

  if (accessToken) {
    user = decodeJwt(accessToken) as JWTPayload | null;
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/sign-up-login', '/homepage'];
  const isPublicRoute =
    pathname === '/' ||
    publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  // API routes for auth are public
  const isAuthApiRoute = pathname.startsWith('/api/auth/');

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute && !isAuthApiRoute) {
    const redirectUrl = new URL('/sign-up-login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated and trying to access login page, redirect to dashboard
  if (user && pathname === '/sign-up-login') {
    const redirectUrl = isAdminRole(user.role) ? '/admin-dashboard' : '/user-dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Admin routes require admin role (supports legacy 'admin' + RBAC system roles)
  if (pathname.startsWith('/admin-dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/sign-up-login', request.url));
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.redirect(new URL('/user-dashboard', request.url));
    }
  }

  // User dashboard and payment routes require authentication
  if (pathname.startsWith('/user-dashboard') || pathname.startsWith('/payment')) {
    if (!user) {
      const redirectUrl = new URL('/sign-up-login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Admin API routes require admin role (block regular users early)
  if (pathname.startsWith('/api/admin')) {
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
