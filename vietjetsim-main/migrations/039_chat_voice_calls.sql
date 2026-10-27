-- 039_chat_voice_calls.sql
-- Real-time voice call logs and signaling between User and Admin

CREATE TABLE IF NOT EXISTS chat_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  caller_id TEXT NOT NULL,
  caller_role VARCHAR(10) NOT NULL CHECK (caller_role IN ('user', 'admin')),
  caller_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'connected', 'ended', 'rejected', 'missed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_calls_conv ON chat_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_calls_status ON chat_calls(status);

