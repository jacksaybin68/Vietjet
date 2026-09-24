/**
 * Admin Route Helper — Simplified auth + authorization
 *
 * Roles collapse to 'user' and 'admin'; admin-family legacy names count as
 * admin (see `lib/roles.ts`). Admins have full access to all admin APIs.
 *
 * Usage (in an API route):
 *   import { verifyAdminRequest } from '@/lib/admin-auth';
 *
 *   export async function GET(request) {
 *     const { payload, error, response } = await verifyAdminRequest(request, 'flight:list');
 *     if (error) return response;
 *     // ... proceed with business logic
 *   }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import type { JWTPayload } from '@/lib/auth';
import { validateCsrfOrReject } from '@/lib/csrf';
import { isAdminRole } from '@/lib/roles';

// We still import Permission type for API documentation purposes,
// but permission checks are simplified — admin always has full access.
import type { Permission } from '@/lib/rbac';

export interface VerifyAdminSuccess {
  payload: JWTPayload;
  error?: undefined;
  response?: undefined;
}

export interface VerifyAdminFailure {
  payload: JWTPayload;
  error: string;
  /** Always present on failure — lets `if (error) return response;` narrow safely. */
  response: NextResponse;
}

export type VerifyAdminResult = VerifyAdminSuccess | VerifyAdminFailure;

/**
 * Verify that a request is from an authenticated admin user.
 * Since we only have 1 admin role with full permissions, the permission
 * parameter is kept for backward compatibility but is not enforced.
 *
 * Concretely: `isAdminRole()` accepts six role names (`admin`, `super_admin`,
 * `admin_ops`, `admin_finance`, `admin_support`, `admin_content`) and every
 * one of them gets full access to every admin route. `hasPermission()` in
 * `@/lib/rbac` behaves the same way, and the migrations define no
 * `role_permissions` table, so there is currently no per-permission check
 * anywhere in the request path.
 *
 * Callers still pass their required permission so the intent is captured at
 * each route and enforcement can be switched on in one place later — but do
 * not read that argument as a control that is active today.
 */
export async function verifyAdminRequest(
  request: NextRequest,
  _permission?: Permission
): Promise<VerifyAdminResult> {
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return {
      payload: {} as JWTPayload,
      error: 'Unauthorized',
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // CSRF is checked before the role gate so a cross-site request can never
  // trigger admin side effects, even with a valid stolen cookie.
  const csrfError = await validateCsrfOrReject(request);
  if (csrfError) {
    return { payload: {} as JWTPayload, error: 'CSRF validation failed', response: csrfError };
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return {
      payload: {} as JWTPayload,
      error: 'Invalid token',
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Token expired or invalid' },
        { status: 401 }
      ),
    };
  }

  if (!isAdminRole(payload.role)) {
    return {
      payload,
      error: 'Forbidden',
      response: NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return { payload };
}
