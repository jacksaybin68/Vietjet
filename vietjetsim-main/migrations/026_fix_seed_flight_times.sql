-- 026_fix_seed_flight_times.sql
--
-- The seeded flights do not depart at the hour their slot table says they do.
--
-- 014, 024 and 025 build departure times as
--
--     (CURRENT_DATE + INTERVAL 'n days') + make_interval(hours => s.depart_hour)
--
-- against a `TIMESTAMPTZ` column. That expression is read in the *session*
-- time zone, and a stock Postgres session — including Neon — is `TimeZone = GMT`.
-- The slot meant to be 06:00 is stored as 06:00 UTC and shows as 13:00 in
-- Vietnam, so all 430 migration-seeded flights have been departing seven hours
-- late. A search for the morning departures has always come back empty.
--
-- `scripts/seed-future-flights.cjs` never had the problem: it builds an explicit
-- `+07:00` offset before posting, which is why the routes it creates are right
-- and the ones the migrations create are not.
--
-- The fix is to delete and re-seed rather than shift the timestamps. Subtracting
-- seven hours is correct once but not idempotent — running this file twice
-- lands everything fourteen hours off — and no "is this row already fixed?"
-- predicate can tell the rows apart, because the five slots are symmetric: a
-- row stored at 12:00 UTC reads 19:00 in Vietnam, which is itself one of the
-- five slots. A row that needs shifting and a row that is already correct look
-- identical. Recreating the rows from the slot table has no such ambiguity.
--
-- The `flight_no` pattern is the discriminator. 014/024/025 write
-- `'VJ ' || LPAD(..., 3, '0')` — "VJ 601" with a space. The seed script writes
-- "VJ301" with no space, and admin-created flights carry a suffix
-- ("VJ303-1029"). `^VJ [0-9]{3}$` matches the migrations' rows and nothing
-- else, so a booking, a check-in or a hand-entered flight can never be caught
-- in the delete.
--
-- Times below are written as text with a literal +07:00 offset, exactly as
-- `seed-future-flights.cjs` posts them. An offset in the literal makes the
-- stored instant independent of the session time zone, which is the whole bug.

-- The `NOT EXISTS` is load-bearing on a database anyone has booked from. This
-- DELETE reaches 601-999, and those numbers are 025's on a replay rather than
-- this file's own - but on any real database the block also holds *booked*
-- flights: this one has six bookings on VJ 601 alone. Deleting a booked flight
-- aborts the whole migration on `bookings_flight_id_fkey`, and even with the
-- constraint relaxed it would silently detach a customer's ticket from the
-- flight it was issued for. Skipped rows are left exactly where they are; the
-- INSERT below then collides on `idx_flights_route_depart_time` and skips them
-- too, which is the correct outcome - the flight still exists, still carries
-- the booking, and its departure time is unchanged by a re-seed.
--
-- Deliberately NOT `^VJ [0-9]{3,4}$`: widening it to reach the 1000s this file
-- also emits sweeps up those bookings.
DELETE FROM flights f
 WHERE f.flight_no ~ '^VJ [0-9]{3}$'
   AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id = f.id);

-- The same five slots, both directions to the two hubs, that 014 and 024 use.

-- Drop the fare columns' NOT NULL for this file's duration, the way 014, 024,
-- 025 and 027 do. 030 creates them and makes them NOT NULL with no default, so
-- a replay rejects the bare INSERT below before any pricing statement can run.
-- No-op on a fresh database, where 030 has yet to create the columns.
DO $relax$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flights'
      AND column_name = 'economy_price'
  ) THEN
    ALTER TABLE flights ALTER COLUMN economy_price DROP NOT NULL;
    ALTER TABLE flights ALTER COLUMN business_price DROP NOT NULL;
  END IF;
END
$relax$;
WITH schedule (depart_hour, price, class, available) AS (
  VALUES
    (6,  899000::numeric,  'economy',  180),
    (9,  1299000::numeric, 'economy',  165),
    (12, 749000::numeric,  'economy',  192),
    (15, 1059000::numeric, 'economy',  150),
    (19, 2490000::numeric, 'business', 24)
),
airports (code) AS (
  VALUES
    ('HAN'), ('SGN'), ('DAD'), ('PQC'), ('CXR'), ('HPH'), ('HUI'),
    ('VDO'), ('VCA'), ('PXU'), ('BMV'), ('DLI'), ('VCS'), ('THD'),
    ('VII'), ('VDH'), ('UIH'), ('VCL'), ('DIN'), ('VKG'), ('HXX'),
    ('TUQ'), ('BBU'), ('TBB')
),
-- Regional airports link to the two hubs, both directions, as 014 and 024 do.
routes (from_code, to_code) AS (
  SELECT a.code, h.code
  FROM airports a
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
  WHERE a.code NOT IN ('HAN', 'SGN')
  UNION ALL
  SELECT h.code, a.code
  FROM airports a
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
  WHERE a.code NOT IN ('HAN', 'SGN')
),
-- The target day, twice: once for departures, once for arrivals. `vn_date` is
-- the calendar day in Vietnam; formatting it to text is what lets each row
-- append its own local hour and a fixed +07:00.
days (vn_date) AS (
  SELECT to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 2, 'YYYY-MM-DD')
)
INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
SELECT
  -- Pad to the number's own length with 3 as the floor: `LPAD(x, 3, '0')`
  -- truncates a longer input, and this block runs to 1040, so 41 rows a day
  -- were sharing a flight number with a row 900 numbers away.
  'VJ ' || LPAD(
    (row_number() OVER () + 600)::text,
    GREATEST(3, length((row_number() OVER () + 600)::text)),
    '0'
  ),
  r.from_code,
  r.to_code,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz
    + INTERVAL '2 hours 10 minutes',
  s.price,
  s.class,
  s.available
FROM routes r
CROSS JOIN schedule s
CROSS JOIN days d
ON CONFLICT (from_code, to_code, depart_time) DO NOTHING;

-- 030's own formula, verbatim. Scoped to this file's block, 601 upward. The
-- WHERE clause also requires the fare to be null, so on a database where 030
-- has already priced everything this statement is a no-op and no other
-- migration's rows are repainted.
DO $fare$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flights'
      AND column_name = 'economy_price'
  ) THEN
    UPDATE flights f
       SET economy_price = CASE WHEN f.class = 'business'
                                THEN round(f.price / 2.77) ELSE round(f.price) END,
           business_price = CASE WHEN f.class = 'business'
                                THEN round(f.price) ELSE round(f.price * 2.77) END
     WHERE (f.economy_price IS NULL OR f.business_price IS NULL)
       AND split_part(f.flight_no, ' ', 2) ~ '^[0-9]+$'
       AND split_part(f.flight_no, ' ', 2)::int BETWEEN 601 AND 1999;
  END IF;
END
$fare$;

-- Re-apply NOT NULL, mirroring the block that dropped it. Only safe because the
-- pricing block above covered this file's own rows and 030 backfilled the rest.
DO $restore$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flights'
      AND column_name = 'economy_price'
  ) THEN
    ALTER TABLE flights ALTER COLUMN economy_price SET NOT NULL;
    ALTER TABLE flights ALTER COLUMN business_price SET NOT NULL;
  END IF;
END
$restore$;
