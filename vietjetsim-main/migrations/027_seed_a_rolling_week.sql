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

-- ─── Stay order-agnostic ────────────────────────────────────────────────────
-- This is the one seed that gets re-applied: the window it opens is a rolling
-- week, so a database older than a week runs it again to extend the calendar.
-- 029/030 added `flights.economy_price` / `business_price` and made both NOT
-- NULL after this file was written, so a re-run would fail on the INSERT below
-- (it names no fare) unless the constraint is relaxed for its duration. On a
-- fresh database the columns do not exist yet, both DO blocks do nothing, and
-- 030 prices these rows when it runs later, in filename order.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flights'
      AND column_name = 'economy_price'
  ) THEN
    ALTER TABLE flights ALTER COLUMN economy_price DROP NOT NULL;
    ALTER TABLE flights ALTER COLUMN business_price DROP NOT NULL;
  END IF;
END $$;

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
-- Every regional airport is linked to both hubs, and the two hubs are linked to
-- each other. HAN↔SGN used to be excluded along with the hubs themselves, which
-- left the busiest route in the country with nothing to sell all week — and it
-- is the pair the hero form pre-fills, so the very first search a customer ran
-- came back empty. `vj_hub` below gives it its own fare and block time: a
-- 2h10m hop between the two cities is not a number anyone accepts.
routes (from_code, to_code, is_hub) AS (
  SELECT a.code, h.code, FALSE
  FROM airports a
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
  WHERE a.code NOT IN ('HAN', 'SGN')
  UNION ALL
  SELECT h.code, a.code, FALSE
  FROM airports a
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
  WHERE a.code NOT IN ('HAN', 'SGN')
  UNION ALL
  SELECT 'HAN', 'SGN', TRUE
  UNION ALL
  SELECT 'SGN', 'HAN', TRUE
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
  -- Pad to the number's own length with 3 as the floor, not `LPAD(x, 3, '0')`:
  -- LPAD truncates a longer input, and this block is not 88 rows but 88 routes
  -- x 5 slots = 440, so numbers 1000-1040 lost their last digit and collided
  -- with 100-140. The file's own note about staying "inside three digits" only
  -- holds if the padding never cuts.
  'VJ ' || LPAD(
    (row_number() OVER (PARTITION BY d.vn_date) + 600)::text,
    GREATEST(3, length((row_number() OVER (PARTITION BY d.vn_date) + 600)::text)),
    '0'
  ),
  r.from_code,
  r.to_code,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz
    + make_interval(mins => CASE WHEN r.is_hub THEN 125 ELSE 130 END),
  -- Hanoi–HCMC is the trunk route, and the 749,000đ regional fare is about half
  -- of what the real thing costs, so the hub pair gets the same ladder one step
  -- up. Otherwise the app quotes the busiest flight in the country for less
  -- than a taxi to Nội Bài.
  round(s.price * CASE WHEN r.is_hub THEN 1.85 ELSE 1 END),
  s.class,
  s.available
FROM routes r
CROSS JOIN schedule s
CROSS JOIN days d
ON CONFLICT (from_code, to_code, depart_time) DO NOTHING;

-- Price whatever this file just inserted, with the same ladder 030 applies to
-- the rows that already existed, then restore the constraint. No-op on a fresh
-- database, where the columns do not exist yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flights'
      AND column_name = 'economy_price'
  ) THEN
    UPDATE flights
    SET
      economy_price = CASE
        WHEN class = 'business' THEN ROUND(price / 2.77)
        ELSE ROUND(price)
      END,
      business_price = CASE
        WHEN class = 'business' THEN ROUND(price)
        ELSE ROUND(price * 2.77)
      END
    WHERE economy_price IS NULL OR business_price IS NULL;

    ALTER TABLE flights ALTER COLUMN economy_price SET NOT NULL;
    ALTER TABLE flights ALTER COLUMN business_price SET NOT NULL;
  END IF;
END $$;
