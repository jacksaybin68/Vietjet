-- 025_airport_codes_and_tuy_hoa.sql
--
-- 024 added eight airports, but three of the IATA codes it used are not the codes
-- those airports actually fly under. They are wrong in a way no amount of UI
-- work can hide: a customer picks "Rạch Giá ( RKG )", the URL carries RKG, and
-- the codes a real Vietjet ticket would print are VKG. Same for Điện Biên Phủ
-- (DIN, not DIH) and Chu Lai (VCL, not CXL).
--
-- Source of truth for the corrected codes, all VV-prefixed pairs from the
-- Vietnamese civil aviation register:
--   Điện Biên Phủ  VVDB/DIN    Rạch Giá  VVRG/VKG    Chu Lai  VVCA/VCL
--
-- TBB (Tuy Hòa) was missing entirely even though Vietjet flies it seven times a
-- week from Hanoi. Cà Mau (CAH) is deliberately absent: it closed in November
-- 2025 for a twelve-month upgrade, so offering it would send a customer to a
-- closed airport.
--
-- Why the airports are re-created instead of renamed in place: `flights` has a
-- foreign key to `airports(code)` with no ON UPDATE CASCADE, so updating the
-- code in place would violate it on every seeded flight. Each move therefore
-- inserts the new code, repoints the flights, and only then drops the old row.

-- ─── 1. Insert the corrected codes ───────────────────────────────────────────

INSERT INTO airports (code, name, city, country)
VALUES
  ('DIN', 'Ely Nguyen Binh Khiem', 'Điện Biên Phủ', 'Vietnam'),
  ('VKG', 'Rạch Giá',              'Rạch Giá',       'Vietnam'),
  ('VCL', 'Chu Lai',               'Chu Lai',        'Vietnam'),
  -- Tuy Hòa, Đắk Lắk. Opened as Đông Tác, now the gateway to the coast.
  ('TBB', 'Tuy Hòa',               'Phú Yên',        'Vietnam')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, city = EXCLUDED.city, country = EXCLUDED.country;

-- ─── 2. Repoint every flight and check-in row at the corrected codes ─────────
-- check_in carries the codes as plain text (no foreign key), so it is repointed
-- for the same reason as flights: an existing booking must keep showing the
-- airport it was actually booked with.

-- The renames below have to run as a delete-then-rename, not as a plain
-- UPDATE. 027 has already seeded routes under the *replacement* codes
-- (`DIN`, `VKG`, `VCL`) at the same departure instants this file's earlier
-- seeds used the old ones (`DIH`, `RKG`, `CXL`), so a row is waiting at
-- (replacement code, same route, same instant). Renaming onto it produces two
-- rows with the same `(from_code, to_code, depart_time)` and trips
-- `idx_flights_route_depart_time`.
--
-- The duplicate is resolved by dropping the old-code row first, per
-- (route, instant) pair, and only where nothing has booked it. The surviving
-- row is the one already carrying the correct code, so no flight is lost - the
-- two rows describe the same departure. `026` documents the same hazard from
-- the other side: it re-seeds this block and must not delete booked flights.
DELETE FROM flights f
 WHERE (f.from_code IN ('DIH', 'RKG', 'CXL') OR f.to_code IN ('DIH', 'RKG', 'CXL'))
   AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id = f.id)
   AND EXISTS (
     SELECT 1 FROM flights k
      WHERE k.depart_time = f.depart_time
        AND k.from_code = CASE f.from_code
                            WHEN 'DIH' THEN 'DIN' WHEN 'RKG' THEN 'VKG'
                            WHEN 'CXL' THEN 'VCL' ELSE k.from_code END
        AND k.to_code   = CASE f.to_code
                            WHEN 'DIH' THEN 'DIN' WHEN 'RKG' THEN 'VKG'
                            WHEN 'CXL' THEN 'VCL' ELSE k.to_code END
   );

UPDATE flights SET from_code = 'DIN' WHERE from_code = 'DIH';
UPDATE flights SET to_code   = 'DIN' WHERE to_code   = 'DIH';
UPDATE flights SET from_code = 'VKG' WHERE from_code = 'RKG';
UPDATE flights SET to_code   = 'VKG' WHERE to_code   = 'RKG';
UPDATE flights SET from_code = 'VCL' WHERE from_code = 'CXL';
UPDATE flights SET to_code   = 'VCL' WHERE to_code   = 'CXL';

UPDATE check_in SET from_code = 'DIN' WHERE from_code = 'DIH';
UPDATE check_in SET to_code   = 'DIN' WHERE to_code   = 'DIH';
UPDATE check_in SET from_code = 'VKG' WHERE from_code = 'RKG';
UPDATE check_in SET to_code   = 'VKG' WHERE to_code   = 'RKG';
UPDATE check_in SET from_code = 'VCL' WHERE from_code = 'CXL';
UPDATE check_in SET to_code   = 'VCL' WHERE to_code   = 'CXL';

-- ─── 3. Drop the superseded codes ────────────────────────────────────────────
-- Safe now that nothing references them. `flights` in particular is the one
-- table that had to be repointed first, because its foreign key blocks an
-- in-place rename.

DELETE FROM airports WHERE code IN ('DIH', 'RKG', 'CXL');

-- ─── 4. Seed Tuy Hòa flights ─────────────────────────────────────────────────
-- Same shape as 024: both directions to Hanoi and Ho Chi Minh City, five daily
-- slots, deduped by the (from_code, to_code, depart_time) index so re-running
-- this file adds nothing twice.
--
-- `flight_no` has no unique constraint — only the route/departure index does —
-- so a colliding number would silently put two different routes under the same
-- flight number and the results list would show the same "VJ xxx" twice for
-- different cities. The existing seeds already reach VJ540 (014 and 024 both
-- number from `row_number() OVER ()`), so this file starts at VJ601, clear of
-- everything a fresh database gets before it.


-- Drop the fare columns' NOT NULL for this file's duration, the way 014, 024
-- and 027 do. 030 creates them and makes them NOT NULL with no default, so a
-- replay rejects the bare INSERT below before any pricing statement can run.
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
WITH schedule (slot, depart_hour, price, class, available) AS (
  VALUES
    (1, 6,  899000::numeric,  'economy',  180),
    (2, 9,  1299000::numeric, 'economy',  165),
    (3, 12, 749000::numeric,  'economy',  192),
    (4, 15, 1059000::numeric, 'economy',  150),
    (5, 19, 2490000::numeric, 'business', 24)
),
routes (from_code, to_code) AS (
  SELECT t.code, h.code
  FROM (VALUES ('TBB')) AS t(code)
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
  UNION ALL
  SELECT h.code, t.code
  FROM (VALUES ('TBB')) AS t(code)
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
)
INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
SELECT
  -- Pad to the number's own length with 3 as the floor: `LPAD(x, 3, '0')`
  -- truncates a longer input, which put two routes under one flight number.
  'VJ ' || LPAD(
    (row_number() OVER () + 600)::text,
    GREATEST(3, length((row_number() OVER () + 600)::text)),
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
ON CONFLICT (from_code, to_code, depart_time) DO NOTHING;

-- 030's own formula, verbatim, scoped by ROUTE rather than by flight number.
-- This file's routes are the Tuy Hoa links to the two hubs, and that is the
-- only thing identifying its rows - the numbers 601+ are shared with 026 and
-- 027, so a numeric range here would repaint rows this file does not own. On a
-- database where 030 has already priced everything the WHERE clause matches
-- nothing and the statement is a no-op.
--
-- TBB was added by this file, so nothing else can have a TBB route at the same
-- instants under the old codes - except on a replay, where the rename above has
-- already repointed those rows here.
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
       AND (f.from_code = 'TBB' OR f.to_code = 'TBB');
  END IF;
END
$fare$;

-- Re-apply NOT NULL, mirroring the block that dropped it. Only safe because the
-- pricing block covered this file's own rows and 030 backfilled the rest.
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
