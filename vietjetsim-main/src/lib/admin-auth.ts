/**
 * Admin Route Helper — RBAC-aware authentication + authorization
 *
 * Replaces the repetitive auth-check boilerplate in every admin API route.
 * Verifies JWT → checks role → optionally checks fine-grained permission.
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
import { hasPermission } from '@/lib/rbac';
import type { Permission } from '@/lib/rbac';

export interface VerifyAdminResult {
  /** Decoded JWT payload (always present on success) */
  payload: JWTPayload;
  /** Error response to return directly */
  error?: string;
  /** Pre-built error NextResponse */
  response?: NextResponse;
}

/**
 * Verify that a request is from an authenticated admin user with optional permission check.
 *
 * @param request - The incoming NextRequest
 * @param permission - Optional specific Permission required for this action
 * @returns VerifyAdminResult — check `.error` / `.response` for early returns
 */
export async function verifyAdminRequest(
  request: NextRequest,
  permission?: Permission
): Promise<VerifyAdminResult> {
  // Step 1: Extract and verify token
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

  // Step 2: Check user is admin or has a system role
  const userRole = payload.role as Parameters<typeof hasPermission>[0];
  if (userRole !== 'admin' && userRole !== 'super_admin' &&
      !['admin_ops', 'admin_finance', 'admin_support', 'admin_content'].includes(userRole)) {
    return {
      payload,
      error: 'Forbidden',
      response: NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  // Step 3: Fine-grained permission check (RBAC)
  if (permission && !hasPermission(userRole, permission)) {
    return {
      payload,
      error: 'Insufficient permissions',
      response: NextResponse.json(
        { error: 'Forbidden', message: `Permission required: ${permission}` },
        { status: 403 }
      ),
    };
  }

  // All checks passed
  return { payload };
}
