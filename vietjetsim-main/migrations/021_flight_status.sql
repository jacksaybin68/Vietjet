-- 021_flight_status.sql
--
-- Adds operational status + gate/terminal columns so flight tracking
-- ("Theo dõi chuyến bay") can surface a flight's real-time state by flight
-- number. The admin FlightsTab already rendered `active`/`delayed`/`cancelled`
-- against hard-coded mock rows; this persists that status on the row itself.
--
-- `status` reflects the *operational* state of the flight, independent from a
-- booking's `status` (pending/confirmed/…). Gate and terminal are shown to the
-- passenger only once the airline assigns them, so they stay nullable.
--
-- Idempotent: CI re-applies every migration.

ALTER TABLE flights
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'delayed', 'cancelled', 'completed', 'departed')),
  ADD COLUMN IF NOT EXISTS gate VARCHAR(20),
  ADD COLUMN IF NOT EXISTS terminal VARCHAR(20);

-- Flight tracking looks flights up by number; make that fast.
CREATE INDEX IF NOT EXISTS idx_flights_flight_no ON flights (flight_no);
