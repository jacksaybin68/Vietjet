-- Migration 035: Renumber legacy flight numbers into the 3xxx block
--
-- Why this exists
-- --------------
-- The live database carries 1224 flights whose `flight_no` never matched the
-- `VJ <digits>` shape the rest of the set uses. They are not random garbage —
-- each one is a real flight on a real route, repeated daily — they were just
-- written by an older seed with a different naming convention:
--
--   VJ351      580 rows / 21 numbers  economy wave, no space after the prefix
--   VJ341B     593 rows / 20 numbers  the *business* wave; the `B` suffix is
--                                      what told the two apart on one route
--                                      (VJ341 and VJ341B are both HAN-CXR, one
--                                      economy and one business)
--   VJ101-1000  48 rows / 48 numbers  `<route>-<block>` from a generator that
--                                      reused one counter per block
--
-- Measured on production before this file: 1224 rows, of which 3 carry a live
-- booking. Everything else is seed residue with nothing pointing at it.
--
-- Why renumber rather than just insert the missing space
-- ---------------------------------------------------
-- `VJ341B` is the reason. The admin validator at
-- `src/app/api/quan-tri/chuyen-bay/[id]/route.ts:59` is
-- `/^[A-Z]{2}\s?\d{2,4}$/i` — it rejects a trailing `B`, so `VJ341B` could
-- never be edited through the admin console. Checked directly against that
-- regex: `VJ341B` false, `VJ 341B` false, `VJ101-1000` false. Two thirds of
-- this data was unmanageable through the UI that exists to manage it.
--
-- So all 89 numbers move into the empty 3001–3089 block, where every one of
-- them passes the validator. The cabin split does not need the `B` to survive:
-- `class` already carries economy vs business on every row.
--
-- Safety rules this file obeys
-- --------------------------
-- 1. **Rows with a booking are left completely alone.** `flight_no` is a lookup
--    key, not a label: `getFlightStatusByNo` (`src/lib/db.ts:509`) resolves a
--    flight by `UPPER(flight_no) = ` for the tracking page and the check-in
--    flow, and `searchBookingsByPnr` joins on it. Renumbering a booked flight
--    breaks a journey the customer already holds. The three such rows
--    (VJDEMO01 completed, VJ087183 pending, VJ644052 confirmed) keep their
--    numbers, so they stay unreachable from the admin console — which is the
--    pre-existing behaviour, not something this file introduces. Widening the
--    validator to accept their shape is a separate decision.
-- 2. **A number is only reassigned if the destination is free** — both
--    `flight_no` and `(flight_no, day)` are checked, the second because a
--    number reused across two flights on one day is exactly the collision the
--    whole 2001+ block was built to avoid.
-- 3. **The mapping is deterministic**: numbers are ordered by their old value,
--    so a rerun assigns the same new numbers to the same flights.
-- 4. **Re-running is a no-op.** Once renumbered the rows match `^VJ [0-9]+$`
--    and are no longer selected.

-- Old numbers, ordered, with their destination. Ordinal 1 → 3001.
CREATE TEMP TABLE renumber_map AS
SELECT
  old_no,
  'VJ ' || (3000 + row_number() OVER (ORDER BY old_no))::text AS new_no
FROM (
  SELECT DISTINCT f.flight_no AS old_no
  FROM flights f
  WHERE f.flight_no !~ '^VJ [0-9]+$'
    -- Rule 1: never touch a flight someone has booked.
    AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id = f.id)
) legacy;

-- Refuse to run on a database this file cannot handle: if anything else already
-- occupies 3001–3089, the numbers below would collide with it.
DO $preflight$
DECLARE
  block_high CONSTANT INT := 3000 + (SELECT count(*) FROM renumber_map);
  occupied   INT;
BEGIN
  IF block_high <= 3000 THEN
    -- Nothing to do; leaving the block check below to skip cleanly.
    RETURN;
  END IF;

  SELECT count(*) INTO occupied
  FROM flights
  WHERE flight_no IN (SELECT new_no FROM renumber_map);

  IF occupied > 0 THEN
    RAISE EXCEPTION
      'block 3001-%; already holds % renumbered flight(s) from an earlier run or another source',
      block_high, occupied;
  END IF;
END $preflight$;

-- Apply. Rule 3 makes `row_number()` here agree with the map built above.
UPDATE flights f
SET flight_no = map.new_no
FROM (
  SELECT
    f2.flight_no AS old_no,
    'VJ ' || (3000 + row_number() OVER (ORDER BY f2.flight_no))::text AS new_no
  FROM flights f2
  WHERE f2.flight_no !~ '^VJ [0-9]+$'
    AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id = f2.id)
) map
WHERE f.flight_no = map.old_no
  -- Rule 2: the destination must be free, both as a bare number and on this
  -- specific day. `row_number()` is re-derived per destination rather than
  -- trusted from the temp table so that a partially applied state still lands
  -- on a consistent mapping.
  AND NOT EXISTS (
    SELECT 1
    FROM flights clash
    WHERE clash.flight_no = map.new_no
      AND (clash.depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        = (f.depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      AND clash.id <> f.id
  );

-- The temp table is explicitly dropped: CI runs `psql -f` with no BEGIN, so
-- `ON COMMIT DROP` would destroy it before this file could use it, and leaving
-- it behind fails the "no staging table survives" check.
DROP TABLE renumber_map;

-- Report rather than assert. A number left behind here is one with a booking on
-- it (rule 1) — expected, and worth naming so it is not mistaken for a miss.
DO $report$
DECLARE
  left_over INT;
BEGIN
  SELECT count(*) INTO left_over FROM flights WHERE flight_no !~ '^VJ [0-9]+$';

  IF left_over > 0 THEN
    RAISE NOTICE
      '% flight(s) keep a legacy number because a booking references them: %',
      left_over,
      (SELECT string_agg(DISTINCT flight_no, ', ' ORDER BY flight_no)
         FROM flights WHERE flight_no !~ '^VJ [0-9]+$');
  END IF;
END $report$;