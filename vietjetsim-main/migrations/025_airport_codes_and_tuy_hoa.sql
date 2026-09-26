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
  'VJ ' || LPAD((row_number() OVER () + 600)::text, 3, '0'),
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
