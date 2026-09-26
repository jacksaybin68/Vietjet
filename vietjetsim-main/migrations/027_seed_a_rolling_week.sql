-- 027_seed_a_rolling_week.sql
--
-- Migration-seeded flights only exist on one calendar day, so booking a
-- departure for any other date returns an empty result page. 026 left that
-- shape alone because it was correcting times, not the calendar.
--
-- `scripts/seed-future-flights.cjs` covers a rolling week but only on ten
-- routes. The migrations cover forty-four routes to and from Hanoi and Ho Chi
-- Minh City — the regional airports, Tu Hoa, Dien Bien, Rach Gia — and those
-- are the ones a customer cannot book at all, because a date other than the
-- single seeded one finds nothing.
--
-- This file extends the migrations' own rows across a week so every airport in
-- the picker has something to sell on every day a customer can pick.
--
-- A fresh, separate file rather than an edit to 026: 026 has been applied to
-- live databases, and a migration that is already applied must not change
-- meaning underneath them.
--
-- `flight_no` repeats per day, the way a real airline flies the same service
-- every morning — `VJ 601` at 06:00 on Monday and again on Tuesday. That is
-- what `scripts/seed-future-flights.cjs` already does with `VJ301`, and it
-- keeps the numbers inside three digits instead of climbing into the thousands
-- over a week of rows. The unique index is on
-- (from_code, to_code, depart_time), which a different day does not collide
-- with, so the repetition is safe.

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
-- Seven days starting two days out. Starting at +2 rather than today keeps
-- the window open the same way 014/024/026 do, so a customer never lands on a
-- departure that has already gone.
--
-- `vn_date` is the Vietnam calendar day, not the session's: a GMT session reads
-- as the previous date, which is the whole bug 026 fixed. Formatting to text
-- here lets each row append its own local hour and a literal +07:00, so the
-- stored instant does not depend on the session time zone again.
days (vn_date) AS (
  SELECT to_char(d, 'YYYY-MM-DD')
  FROM generate_series(
         (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 2,
         (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 8,
         INTERVAL '1 day'
       ) AS d
)
INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
SELECT
  -- Numbered within the day, so the same service keeps its number all week.
  'VJ ' || LPAD((row_number() OVER (PARTITION BY d.vn_date) + 600)::text, 3, '0'),
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
