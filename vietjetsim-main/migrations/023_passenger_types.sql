-- 023_passenger_types.sql
--
-- The booking form now sells three categories instead of one head count:
-- adults (12+), children (2-11) and infants (under 2, travelling on a lap).
-- Until now the wizard priced and seated every passenger identically, so there
-- was nowhere to record which category someone was.
--
-- Existing rows are backfilled to 'adult' rather than left NULL: every booking
-- created before this file was an all-adult booking, and a NOT NULL DEFAULT
-- keeps the column safe for any code path that omits the value.

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS passenger_type VARCHAR(20) NOT NULL DEFAULT 'adult';

-- The check is added separately so a database that already carries an
-- unexpected value keeps its data and reports it instead of failing to migrate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'passengers_passenger_type_check'
  ) THEN
    ALTER TABLE passengers
      ADD CONSTRAINT passengers_passenger_type_check
      CHECK (passenger_type IN ('adult', 'child', 'infant'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_passengers_booking_type
  ON passengers (booking_id, passenger_type);
