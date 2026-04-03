import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── GET: Get audit logs with filters ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'rbac:audit_log');
    if (error || !response) return response!;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('user_id') || '';
    const resource = searchParams.get('resource') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (action) {
      whereConditions.push(`action ILIKE $${paramIndex++}`);
      params.push('%' + action + '%');
    }

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (resource) {
      whereConditions.push(`resource ILIKE $${paramIndex++}`);
      params.push('%' + resource + '%');
    }

    if (dateFrom) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      params.push(dateTo + ' 23:59:59');
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Query with pagination
    const logsQuery = sql`
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
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.params(...params);

    const countQuery = sql`
      SELECT COUNT(*) as total FROM audit_logs al
      ${whereClause ? sql.unsafe(whereClause) : sql``}
    `.params(...params);

    const [logs, countResult] = await Promise.all([logsQuery, countQuery]);
    const total = Number(countResult[0]?.total || 0);

    // Get unique actions and resources for filter options
    const actionsQuery = sql`
      SELECT DISTINCT action FROM audit_logs ORDER BY action
    `;
    const resourcesQuery = sql`
      SELECT DISTINCT resource FROM audit_logs ORDER BY resource
    `;

    const [actions, resources] = await Promise.all([actionsQuery, resourcesQuery]);

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
