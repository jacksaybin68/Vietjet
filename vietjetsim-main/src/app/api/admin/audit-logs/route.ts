import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── GET: Get audit logs with filters ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'rbac:audit_log');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('user_id') || '';
    const resource = searchParams.get('resource') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const offset = (page - 1) * limit;

    // Build queries based on filters
    let logs;
    let total = 0;

    if (action && userId && resource && dateFrom && dateTo) {
      logs = await sql`
        SELECT 
          al.id,
          al.action,
          al.resource,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.email as user_email,
          u.full_name as user_name,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN user_profiles u ON al.user_id = u.id
        WHERE al.action ILIKE ${'%' + action + '%'}
          AND al.user_id = ${userId}
          AND al.resource ILIKE ${'%' + resource + '%'}
          AND al.created_at >= ${dateFrom}
          AND al.created_at <= ${dateTo + ' 23:59:59'}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM audit_logs al
        WHERE al.action ILIKE ${'%' + action + '%'}
          AND al.user_id = ${userId}
          AND al.resource ILIKE ${'%' + resource + '%'}
          AND al.created_at >= ${dateFrom}
          AND al.created_at <= ${dateTo + ' 23:59:59'}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (action && userId && dateFrom && dateTo) {
      logs = await sql`
        SELECT 
          al.id,
          al.action,
          al.resource,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.email as user_email,
          u.full_name as user_name,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN user_profiles u ON al.user_id = u.id
        WHERE al.action ILIKE ${'%' + action + '%'}
          AND al.user_id = ${userId}
          AND al.created_at >= ${dateFrom}
          AND al.created_at <= ${dateTo + ' 23:59:59'}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM audit_logs al
        WHERE al.action ILIKE ${'%' + action + '%'}
          AND al.user_id = ${userId}
          AND al.created_at >= ${dateFrom}
          AND al.created_at <= ${dateTo + ' 23:59:59'}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (action && dateFrom && dateTo) {
      logs = await sql`
        SELECT 
          al.id,
          al.action,
          al.resource,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.email as user_email,
          u.full_name as user_name,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN user_profiles u ON al.user_id = u.id
        WHERE al.action ILIKE ${'%' + action + '%'}
          AND al.created_at >= ${dateFrom}
          AND al.created_at <= ${dateTo + ' 23:59:59'}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM audit_logs al
        WHERE al.action ILIKE ${'%' + action + '%'}
          AND al.created_at >= ${dateFrom}
          AND al.created_at <= ${dateTo + ' 23:59:59'}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (action) {
      logs = await sql`
        SELECT 
          al.id,
          al.action,
          al.resource,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.email as user_email,
          u.full_name as user_name,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN user_profiles u ON al.user_id = u.id
        WHERE al.action ILIKE ${'%' + action + '%'}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM audit_logs al
        WHERE al.action ILIKE ${'%' + action + '%'}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (userId) {
      logs = await sql`
        SELECT 
          al.id,
          al.action,
          al.resource,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.email as user_email,
          u.full_name as user_name,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN user_profiles u ON al.user_id = u.id
        WHERE al.user_id = ${userId}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM audit_logs al
        WHERE al.user_id = ${userId}
      `;
      total = Number(countResult[0]?.total || 0);
    } else {
      logs = await sql`
        SELECT 
          al.id,
          al.action,
          al.resource,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.email as user_email,
          u.full_name as user_name,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN user_profiles u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as total FROM audit_logs al`;
      total = Number(countResult[0]?.total || 0);
    }

    // Get unique actions and resources for filter options
    const actions = await sql`SELECT DISTINCT action FROM audit_logs ORDER BY action`;
    const resources = await sql`SELECT DISTINCT resource FROM audit_logs ORDER BY resource`;

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        actions: actions.map((a: any) => a.action),
        resources: resources.map((r: any) => r.resource),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
