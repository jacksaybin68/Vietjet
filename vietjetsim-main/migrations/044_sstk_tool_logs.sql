-- Migration 044: Bảng ghi nhật ký thực thi công cụ quản trị hệ thống (sstk_tool_logs)

CREATE TABLE IF NOT EXISTS sstk_tool_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key VARCHAR(100) NOT NULL,
  tool_label VARCHAR(255) NOT NULL,
  executed_by VARCHAR(255) NOT NULL,
  params_json TEXT,
  result_summary TEXT,
  status VARCHAR(50) DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sstk_tool_logs_created ON sstk_tool_logs(created_at DESC);
