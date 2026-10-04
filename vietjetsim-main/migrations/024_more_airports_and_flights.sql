-- 024_more_airports_and_flights.sql
--
-- The hero picker now reads the `airports` table, so this file is the only place
-- a new airport has to appear. It does two things:
--
-- 1. Adds airports that were in the product but not in the list. The older ones
--    (DIH Dien Bien, CXL Chu Lai) are long-established. HXX, TUQ, RKG and BBU
--    are the airports opened in recent years — the IATA codes are recorded here
--    so they are easy to correct in one place if any of them needs changing.
--
-- 2. Seeds flights for every airport that had none. Ten of the seeded airports
--    (HPH, VDO, VCA, PXU, BMV, DLI, VCS, THD, VII, VDH) existed in the
--    airports table with no flights at all, so picking one returned an empty
--    result page. Each now links to Hanoi and Ho Chi Minh City.

INSERT INTO airports (code, name, city, country)
VALUES
  ('DIH', 'Ely Nguyen Binh Khiem',  'Điện Biên Phủ', 'Vietnam'),
  ('CXL', 'Chu Lai',               'Chu Lai',        'Vietnam'),
  ('HXX', 'Hà Giang',              'Hà Giang',       'Vietnam'),
  ('TUQ', 'Tuyên Quang',           'Tuyên Quang',    'Vietnam'),
  ('RKG', 'Rạch Giá',              'Rạch Giá',       'Vietnam'),
  ('BBU', 'Bãi Bụt',               'Quảng Trạch',    'Vietnam'),
  -- UIH already exists in the live database but was in neither the seed file
  -- nor the hard-coded list, so it is recorded here with the diacritics fixed.
  ('UIH', 'Phù Cát',               'Quy Nhơn',       'Vietnam')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

-- A seeded flight is identified by route plus exact departure time (the unique
-- index from 014), so re-running this file adds nothing twice.
-- No fare columns in the column list below, and the NOT NULL is dropped for
-- this file's duration instead, the way 014 and 027 do it. 030 creates these
-- columns and makes them NOT NULL with no default, so on a replay a bare INSERT
-- is rejected on the null before any pricing statement can reach it. The block
-- has to sit *before* the WITH, not inside it. On a fresh database the columns
-- do not exist yet and every DO block in this file is a no-op.
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

-- A CTE collects the rows this run actually inserted, so the pricing step below
-- addresses them by identity rather than by flight number. Numbering cannot do
-- that job: `row_number() OVER ()` numbers the *select*, not the insert, so a
-- number advances even when `ON CONFLICT DO NOTHING` skips the row. On a
-- replay the new rows land anywhere from 201 upward, not the tidy 201-370 block,
-- and a number-range WHERE leaves the strays unpriced — which is what fails
-- 030's NOT NULL. The name is file-specific so two seed files sharing one
-- transaction cannot collide.
--
-- No `ON COMMIT DROP`: CI applies each file with `psql -f` and no `BEGIN`, so
-- every statement is its own transaction and the table would be gone before the
-- INSERT below could name it. Dropped explicitly at the end of the file, which
-- behaves the same either way.
CREATE TEMP TABLE _vj_seeded_024 (
  id           uuid PRIMARY KEY,
  class        text,
  price        numeric
);

WITH schedule (slot, depart_hour, price, class, available) AS (
  VALUES
    (1, 6,  899000::numeric,  'economy',  180),
    (2, 9,  1299000::numeric, 'economy',  165),
    (3, 12, 749000::numeric,  'economy',  192),
    (4, 15, 1059000::numeric, 'economy',  150),
    (5, 19, 2490000::numeric, 'business', 24)
),
-- Both directions of every link, the way 014 seeds its own pairs: a customer
-- has to be able to fly HAN -> HPH just as much as HPH -> HAN.
routes (from_code, to_code) AS (
  SELECT t.code, h.code
  FROM (VALUES
    ('HPH'), ('VDO'), ('VCA'), ('PXU'), ('BMV'),
    ('DLI'), ('VCS'), ('THD'), ('VII'), ('VDH'),
    ('DIH'), ('CXL'), ('HXX'), ('TUQ'), ('RKG'), ('BBU'), ('UIH')
  ) AS t(code)
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
  UNION ALL
  SELECT h.code, t.code
  FROM (VALUES
    ('HPH'), ('VDO'), ('VCA'), ('PXU'), ('BMV'),
    ('DLI'), ('VCS'), ('THD'), ('VII'), ('VDH'),
    ('DIH'), ('CXL'), ('HXX'), ('TUQ'), ('RKG'), ('BBU'), ('UIH')
  ) AS t(code)
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
),
inserted AS (
  INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
  SELECT
    -- Pad to the number's own length with 3 as the floor: `LPAD(x, 3, '0')`
    -- truncates a longer input, which put two routes under one flight number.
    'VJ ' || LPAD(
      (row_number() OVER () + 200)::text,
      GREATEST(3, length((row_number() OVER () + 200)::text)),
      '0'
    ),
    r.from_code,
    r.to_code,
    (CURRENT_DATE + INTERVAL '2 days') + make_interval(hours => s.depart_hour),
    (CURRENT_DATE + INTERVAL '2 days') + make_interval(hours => s.depart_hour) + INTERVAL '2 hours 10 minutes',
    s.price,
    s.class,
    s.available
  FROM routes r
  CROSS JOIN schedule s
  ON CONFLICT (from_code, to_code, depart_time) DO NOTHING
  RETURNING id, class, price
)
INSERT INTO _vj_seeded_024 (id, class, price)
SELECT id, class, price FROM inserted;

-- 030's own formula, verbatim. Addressed by the ids the CTE above collected, so
-- it prices this run's rows and nothing else. Only runs once the columns exist,
-- so it is a no-op on a fresh database where 030 has yet to run.
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
      FROM _vj_seeded_024 s
     WHERE f.id = s.id;
  END IF;
END
$fare$;

-- Re-apply NOT NULL, mirroring the block that dropped it above. Only safe
-- because the pricing block covered this file's own rows and 030 already
-- backfilled every other flight's fares, so nothing is left null here.
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

DROP TABLE IF EXISTS _vj_seeded_024;
