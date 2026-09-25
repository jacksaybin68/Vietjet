/**
 * Admin Route Helper — authentication + enforced per-permission authorization
 *
 * Roles collapse to 'user' and 'admin'; admin-family legacy names count as
 * admin (see `lib/roles.ts`).
 *
 * The `permission` argument IS enforced. It is resolved against the
 * `role_permissions` table (migration 019) via `lib/role-permissions.ts`, with
 * two documented exceptions:
 *   * `super_admin` bypasses the table, so an operator always has a way back in.
 *   * a route that passes no permission is admin-only, unchecked by design.
 *
 * A role with no rows in the table is fail-closed: it can call no guarded
 * route. That is deliberate — silently treating "unconfigured" as "allow
 * everything" would reintroduce the hole this closes.
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
import { getRolePermissionsFromDb, bypassesPermissionTable } from '@/lib/role-permissions';
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
 * Verify that a request is from an authenticated admin user who holds the
 * required `permission`.
 *
 * Order matters: token, then CSRF, then role, then permission. CSRF is checked
 * before the role gate so a cross-site request can never trigger admin side
 * effects, even with a valid stolen cookie.
 */
export async function verifyAdminRequest(
  request: NextRequest,
  permission?: Permission
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

  // No permission requested → admin-only route, nothing narrower to check.
  if (permission && !bypassesPermissionTable(payload.role)) {
    const granted = await getRolePermissionsFromDb(payload.role);
    if (!granted.has(permission)) {
      return {
        payload,
        error: 'Forbidden',
        response: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Tài khoản không có quyền thực hiện thao tác này',
            requiredPermission: permission,
          },
          { status: 403 }
        ),
      };
    }
  }

  return { payload };
}
