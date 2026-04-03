-- Refresh Token Rotation Store
-- Run this in your Neon PostgreSQL dashboard (SQL Editor or psql)
-- Required by: H3 (Refresh Token Rotation) implementation

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  family_id UUID NOT NULL,
  revoked BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups during refresh/rotation
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens(family_id);

-- Clean up old revoked tokens older than 30 days (run via cron/scheduler)
-- DELETE FROM refresh_tokens WHERE revoked = true AND used_at < NOW() - INTERVAL '30 days';
