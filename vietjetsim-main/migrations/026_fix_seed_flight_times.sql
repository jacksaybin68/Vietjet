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

DELETE FROM flights WHERE flight_no ~ '^VJ [0-9]{3}$';

-- The same five slots, both directions to the two hubs, that 014 and 024 use.
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
  'VJ ' || LPAD((row_number() OVER () + 600)::text, 3, '0'),
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
