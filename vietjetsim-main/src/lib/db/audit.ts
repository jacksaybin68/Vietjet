import { sql } from '@/lib/neon';

export interface AuditLogRecord {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string; // e.g. 'user:delete', 'flight:create', 'rbac:role_change'
  target_type: string; // 'user', 'flight', 'booking', 'config', 'role'
  target_id?: string;
  details_json: string; // JSON object with action details
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'error' | 'denied';
  created_at: string;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

export async function writeAuditLog(log: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  detailsJson: string;
  status: 'success' | 'error' | 'denied';
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await sql`
    INSERT INTO audit_logs (admin_id, admin_email, action, target_type, target_id, details_json, ip_address, user_agent, status)
    VALUES (
      ${log.adminId}, ${log.adminEmail}, ${log.action}, ${log.targetType},
      ${log.targetId || null}, ${log.detailsJson},
      ${log.ipAddress || null}, ${log.userAgent || null}, ${log.status}
    )
  `;
}

export async function getAuditLogs(params?: {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const values: any[] = [];

  if (params?.adminId) {
    where += ` AND admin_id = $${values.length + 1}`;
    values.push(params.adminId);
  }
  if (params?.action) {
    where += ` AND action ILIKE $${values.length + 1}`;
    values.push(`%${params.action}%`);
  }
  if (params?.startDate) {
    where += ` AND created_at >= $${values.length + 1}`;
    values.push(params.startDate);
  }
  if (params?.endDate) {
    where += ` AND created_at <= $${values.length + 1}`;
    values.push(params.endDate);
  }

  values.push(limit, offset);

  const countRes = await sql.query(
    `SELECT COUNT(*) as total FROM audit_logs ${where}`,
    values.slice(0, -2)
  );
  const total = parseInt((countRes as any)[0].total, 10);

  const dataRes = await sql.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return { logs: dataRes as any as AuditLogRecord[], total };
}
