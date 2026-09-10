import { sql } from '@/lib/neon';

// ─── SSTK (Self-Service Toolkit) ─────────────────────────────────────────────

export interface SstkToolLogRecord {
  id: string;
  tool_key: string;
  tool_label: string;
  executed_by: string;
  params_json: string;
  result_summary: string;
  status: 'success' | 'error' | 'partial';
  created_at: string;
}

export async function getSstkLogs(limit = 50): Promise<SstkToolLogRecord[]> {
  const rows = await sql`
    SELECT id, tool_key, tool_label, executed_by, params_json, result_summary, status, created_at
    FROM sstk_tool_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as SstkToolLogRecord[];
}

export async function insertSstkLog(
  toolKey: string,
  toolLabel: string,
  executedBy: string,
  paramsJson: string,
  resultSummary: string,
  status: 'success' | 'error' | 'partial' = 'success'
): Promise<void> {
  await sql`
    INSERT INTO sstk_tool_logs (tool_key, tool_label, executed_by, params_json, result_summary, status)
    VALUES (${toolKey}, ${toolLabel}, ${executedBy}, ${paramsJson}, ${resultSummary}, ${status})
  `;
}
