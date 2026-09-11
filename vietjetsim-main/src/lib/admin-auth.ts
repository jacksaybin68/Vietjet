/**
 * Admin Route Helper — Simplified auth + authorization
 *
 * Only 2 roles in the system: 'user' and 'admin'.
 * 'admin' has full access to all admin APIs.
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

// We still import Permission type for API documentation purposes,
// but permission checks are simplified — admin always has full access.
import type { Permission } from '@/lib/rbac';

export interface VerifyAdminResult {
  payload: JWTPayload;
  error?: string;
  response?: NextResponse;
}

/**
 * Verify that a request is from an authenticated admin user.
 * Since we only have 1 admin role with full permissions, the permission
 * parameter is kept for backward compatibility but is not enforced.
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

  // Only 'admin' role is allowed
  if (payload.role !== 'admin') {
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
