-- 028_international_airports.sql
--
-- The picker was Vietnam-only. Every airport in the `airports` table was
-- domestic, so a customer could not search a route Vietjet actually flies —
-- Bangkok, Singapore, Seoul and the rest were simply not offered. This file
-- adds the nearby-Asia network the real airline serves from Vietnam.
--
-- ─── Why Cà Mau (CAH) is still missing ────────────────────────────────────────
-- It is the one civil airport in the register that Vietnam does not have in
-- this list, and it is absent on purpose, not by oversight. It closed in
-- November 2025 for a twelve-month upgrade, so offering it would send a
-- customer to an airport with no service. 025 recorded the same decision;
-- this file keeps it, and re-adding CAH belongs in a later migration once the
-- airport is actually open again.
--
-- ─── Why these codes ─────────────────────────────────────────────────────────
-- IATA codes come from the civil register, not from convenience: SIN, BKK, DMK,
-- KUL, CGK, MNL, PNH, RGN, VTE, ICN, KIX, NRT, HKG. Bangkok appears twice
-- because BKK (Suvarnabhumi) and DMK (Don Mueang) are different airports with
-- different terminals, and the two are separate routes to the same city.
-- KIX (Kansai) and NRT (Narita) are both Tokyo but are separate airports too.
--
-- ─── Why flights are seeded here and not left to the customer ────────────────
-- An airport with no flights is worse than a missing one: the customer picks
-- it, and the results page comes back empty — the exact failure 024 was written
-- to fix. So every airport added below gets the same rolling-week treatment
-- 027 gives the domestic list, in both directions from Hanoi and Ho Chi Minh
-- City, and with the same explicit `+07:00` timestamps.
--
-- International block times are real (roughly 2h to the Philippines, 5h to
-- Seoul and Osaka) instead of the flat 2h10m the domestic seeds use, and the
-- fares are higher, so the results page does not quote a Haiphong price for a
-- flight to Osaka.
--
-- Idempotent, like every other seed here: `ON CONFLICT (code) DO UPDATE` for
-- the airports, and `ON CONFLICT (from_code, to_code, depart_time) DO NOTHING`
-- for the flights, deduped by the unique index created in 014.

-- ─── 1. The airports ─────────────────────────────────────────────────────────

INSERT INTO airports (code, name, city, country)
VALUES
  ('SIN', 'Changi',            'Singapore',        'Singapore'),
  ('BKK', 'Suvarnabhumi',      'Bangkok',          'Thailand'),
  ('DMK', 'Don Mueang',        'Bangkok',          'Thailand'),
  ('KUL', 'Kuala Lumpur',      'Kuala Lumpur',     'Malaysia'),
  ('CGK', 'Soekarno-Hatta',    'Jakarta',          'Indonesia'),
  ('MNL', 'Ninoy Aquino',      'Manila',           'Philippines'),
  ('PNH', 'Phnom Penh',        'Phnom Penh',       'Cambodia'),
  ('RGN', 'Yangon',            'Yangon',           'Myanmar'),
  ('VTE', 'Wattay',            'Vientiane',        'Laos'),
  ('ICN', 'Incheon',           'Seoul',            'South Korea'),
  ('KIX', 'Kansai',            'Osaka',            'Japan'),
  ('NRT', 'Narita',            'Tokyo',            'Japan'),
  ('HKG', 'Hong Kong',         'Hong Kong',        'Hong Kong')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, city = EXCLUDED.city, country = EXCLUDED.country;

-- ─── 1b. Stay order-agnostic ────────────────────────────────────────────────
-- This file predates 029/030, which add `flights.economy_price` /
-- `business_price` and make both NOT NULL. Running 028 *after* those — which is
-- what happens on a database that already had 029/030 applied — would fail at
-- the INSERT below, because it names no fare and the columns have no default.
--
-- The two DO blocks bracket the insert instead of hard-coding a fare into it:
-- the first relaxes the constraint only when the columns are already present,
-- the second prices whatever this file just inserted with the same ladder 030
-- uses and restores the constraint. On a fresh database neither column exists,
-- both blocks do nothing, and 030 prices these rows when it runs later, in
-- filename order. The file stays a no-op-safe seed either way.
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

-- ─── 2. Flights across a rolling week ─────────────────────────────────────────
-- `block` is the sector's real airborne time, so the arrival reads sensibly
-- against the departure instead of showing "2h10m" to Seoul.

WITH intl (code, block, economy) AS (
  VALUES
    ('SIN', 210, 2450000::numeric),
    ('BKK', 165, 1650000::numeric),
    ('DMK', 165, 1650000::numeric),
    ('KUL', 185, 2050000::numeric),
    ('CGK', 275, 2850000::numeric),
    ('MNL', 205, 2650000::numeric),
    ('PNH', 140, 1450000::numeric),
    ('RGN', 140, 1850000::numeric),
    ('VTE', 115, 1550000::numeric),
    ('ICN', 320, 4900000::numeric),
    ('KIX', 350, 5600000::numeric),
    ('NRT', 340, 5400000::numeric),
    ('HKG', 200, 3250000::numeric)
),
-- Both directions from Hanoi and Ho Chi Minh City, the way 027 links the
-- domestic list: a customer flies HAN -> SIN as much as SIN -> HAN.
routes (from_code, to_code, block, economy) AS (
  SELECT h.code, i.code, i.block, i.economy
  FROM intl i
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
  UNION ALL
  SELECT i.code, h.code, i.block, i.economy
  FROM intl i
  CROSS JOIN (VALUES ('HAN'), ('SGN')) AS h(code)
),
-- Three daily departures rather than the five domestic slots: a long-haul
-- sector needs more ground time, and five rows a day on 52 routes is noise in
-- the results list. The domestic 06:00 business slot is dropped — that service
-- does not exist on these routes — so the slots start later.
schedule (depart_hour, price_factor, class, available) AS (
  VALUES
    (9,  1.00::numeric, 'economy', 180),
    (13, 1.15::numeric, 'economy', 160),
    (18, 1.30::numeric, 'economy', 150)
),
-- Seven days starting two days out, on the Vietnam calendar day rather than
-- the session's — a GMT session reads as the previous date, which is the whole
-- bug 026 fixed. Formatting to text lets each row append its own local hour
-- and a literal +07:00 so the stored instant never depends on the session TZ.
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
  -- Numbered within the day, the way 027 numbers the domestic week, so the same
  -- service keeps its number all week.
  --
  -- The offset is 1100, not 800, and that is load-bearing. 027's block is not
  -- 601-620: with 22 regional airports x 2 hubs x 2 directions x 5 slots it
  -- numbers 601 through 1040 on every day of its week. `flight_no` has no unique
  -- constraint, so starting at 801 would silently put two different routes under
  -- one number and the results list would print "VJ 850" for both Hanoi-Osaka
  -- and a domestic hop — the exact failure 025 documented. 1100 is clear of it
  -- and leaves room for a future 029 to take the next block.
  -- Pad to the number's own length with 3 as the floor, not `LPAD(x, 3, '0')`:
  -- LPAD truncates a longer input, so the 4-digit numbers this file reaches
  -- (1100..1256) were cut to "110".."125" and every one of them was shared by
  -- the same 1100-number block on four different routes in one day.
  'VJ ' || LPAD(
    (row_number() OVER (PARTITION BY d.vn_date) + 1100)::text,
    GREATEST(3, length((row_number() OVER (PARTITION BY d.vn_date) + 1100)::text)),
    '0'
  ),
  r.from_code,
  r.to_code,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz
    + make_interval(mins => r.block),
  round(r.economy * s.price_factor),
  s.class,
  s.available
FROM routes r
CROSS JOIN schedule s
CROSS JOIN days d
ON CONFLICT (from_code, to_code, depart_time) DO NOTHING;

-- ─── 3. Price the rows that were just inserted ──────────────────────────────
-- Only when 029/030 have already run (see 1b). The ladder is the same one 030
-- applies to every pre-existing row, so an international row and a domestic row
-- cost the same way, and the CHECK 030 installs (`economy_price <=
-- business_price`) is satisfied by construction: dividing a business row's fare
-- down and multiplying an economy row's up both keep the two on the right sides.
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