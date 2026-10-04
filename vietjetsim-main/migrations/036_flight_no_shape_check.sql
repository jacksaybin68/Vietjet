-- 036_flight_no_shape_check.sql
--
-- `flight_no` had no CHECK at all. Three writers each decided what a flight
-- number looks like, and they disagreed:
--
--   PATCH /api/quan-tri/chuyen-bay/[id]   /^[A-Z]{2}\s?\d{2,4}$/i   rejects VJ101-1000
--   admin FlightsTab form                 /^[A-Z]{2}\s?\d{2,4}$/i   rejects VJ101-1000
--   POST /api/quan-tri/chuyen-bay         no check at all
--   createFlight()                        no check at all
--
-- So two live flights could not be edited through the screen meant to edit
-- them. Measured on the pre-change database: `VJ101-1000` and `VJ789-1043`,
-- 10 characters each, one booking apiece (VJDEMO01 completed, VJ644052
-- confirmed). Migration 035 deliberately left both alone — `flight_no` is a
-- lookup key, not a label — and this file is the other half of that: accept
-- the shape they already are, so an operator can edit them.
--
-- The letter-suffix form `VJ341B` is rejected deliberately. 593 rows carried
-- it once, a trailing `B` for business, and migration 035 renumbered all of
-- them into the numeric 3xxx block. `flights.class` carries the cabin now, so
-- the suffix was duplication — and it is unreadable to the admin console,
-- which was the original defect.
--
-- Pattern, and why each half is what it is:
--
--   ^[A-Z]{2}            carrier, two letters
--   [ ]?                 at most one space — `VJ 101` and `VJ101` both exist
--   [0-9]{2,4}           2–4 digits; nothing in the data uses 2, but the
--                        handlers always allowed it and narrowing now would
--                        reject a number the API has accepted since 000
--   (-[0-9]{4})?         the demo seed's `<route>-<block>` suffix
--
-- Case-sensitive because every writer uppercases first: PATCH does it at
-- route.ts:251 and :281, and `normalizeFlightNo` in src/lib/flight-no.ts is
-- what createFlight uses. A lowercase value is a caller that skipped
-- normalisation, and storing it would produce a number the booking-PNR join
-- (which compares the raw column) cannot match.
--
-- Idempotent, and re-appliable on data that already satisfies it.

DO $add_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flights_flight_no_shape_check'
  ) THEN
    ALTER TABLE flights
      ADD CONSTRAINT flights_flight_no_shape_check
      CHECK (flight_no ~ '^[A-Z]{2} ?[0-9]{2,4}(-[0-9]{4})?$') NOT VALID;
  END IF;
END
$add_check$;

-- NOT VALID skips the scan of existing rows so the ALTER above commits on its
-- own (CI runs `psql -f`, so every statement is its own transaction). This
-- statement is the scan, and it does the rejecting: the database would
-- otherwise hold the constraint unproven forever, which is how a bad row gets
-- in later through a path that never went through a handler.
--
-- Measured before adding the constraint: 8600 rows, 0 rejected. Every flight
-- number in the live database already satisfies the pattern.
ALTER TABLE flights
  VALIDATE CONSTRAINT flights_flight_no_shape_check;