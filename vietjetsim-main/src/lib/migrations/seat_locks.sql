-- Migration: seat_locks table for temporary seat reservation during booking flow
-- Run this against your Neon PostgreSQL database before using the seat-lock API.

CREATE TABLE IF NOT EXISTS seat_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  session_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(flight_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seat_locks_flight_expires ON seat_locks(flight_id, expires_at);

