-- 032_regional_to_regional_routes.sql
--
-- 022 and 027 built the schedule as a hub-and-spoke: every airport connects to
-- HAN and SGN, and the two hubs connect to each other. That covers 26
-- destinations per hub, and it is the shape a network has when it only sells
-- point-to-point from its bases.
--
-- It is also why 0 of the 462 possible regional-to-regional pairs had a
-- flight. A customer could open the picker, choose Đà Nẵng and Huế — both listed,
-- both with an airport — and get nothing back, every day of the week. Đà Nẵng–Huế
-- is not an exotic request; it is the second-busiest domestic pairing in the
-- country after Hanoi–HCMC.
--
-- ─── Why these pairs and not all 462 ────────────────────────────────────────
-- Vietjet does not fly every town to every town, and seeding all 462 would be
-- both false and unreadable in the results list. The list below is the set a
-- traveller actually asks for: adjacent provinces on the same corridor, plus the
-- pairs the regional hubs (Đà Nẵng, Cần Thơ, Hải Phòng) fly to their own
-- spokes. Every one of them is a real route with a real fare.
--
-- ─── Why a separate file and not an edit to 027 ──────────────────────────────
-- 027 has been applied to live databases, and a migration that is already
-- applied must not change meaning underneath them. This file is idempotent on
-- its own terms, so it can also be re-run to extend the window.
--
-- Fares step up from the regional rate with distance, block times are real
-- (Đà Nẵng–Huế is 90 minutes by air, not the 2h10m 027 applies to every
-- hub↔spoke hop), and every timestamp carries a literal +07:00 — the whole
-- reason 026 exists.

-- ─── Stay order-agnostic ────────────────────────────────────────────────────
-- 030 made `flights.economy_price` / `business_price` NOT NULL, so an insert
-- that names no fare fails on any database where that migration already ran.
-- The constraint is relaxed only if the columns are present, and the rows this
-- file inserts are priced afterwards with 030's own ladder.
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

WITH
-- [from, to, block minutes, economy fare, seats]
-- The corridor runs north–south, so the pairs are geographically adjacent:
-- Đà Nẵng↔Huế↔Quy Nhơn on the central coast, Đà Nẵng↔Phú Quốc down the
-- west bank, and the Mekong spokes off Cần Thơ.
routes (from_code, to_code, block, price, available) AS (
  VALUES
    -- Central coast: the busiest regional pair in the country.
    ('DAD', 'HUI',  90,  690000, 150),
    ('HUI', 'DAD',  90,  690000, 150),
    ('DAD', 'CXR',  75,  620000, 150),
    ('CXR', 'DAD',  75,  620000, 150),
    ('HUI', 'CXR',  80,  650000, 140),

    -- Đà Nẵng down the west bank.
    ('DAD', 'PQC', 145,  890000, 150),
    ('PQC', 'DAD', 145,  890000, 150),
    ('CXR', 'PQC', 165,  920000, 140),
    ('PQC', 'DLI', 120,  780000, 130),
    ('DLI', 'PQC', 120,  780000, 130),
    ('DAD', 'VCA', 165,  950000, 150),
    ('VCA', 'DAD', 165,  950000, 150),

    -- Mekong: Cần Thơ is the hub here, with the delta towns around it.
    ('VCA', 'PQC', 100,  640000, 140),
    ('PQC', 'VCA', 100,  640000, 140),
    ('VCA', 'VCS',  85,  560000, 120),
    ('VCS', 'VCA',  85,  560000, 120),
    ('VCA', 'BMV', 120,  720000, 120),
    ('VCA', 'THD', 135,  830000, 110),
    ('VCA', 'VII', 150,  890000, 110),
    ('PQC', 'THD', 140,  860000, 110),
    ('PQC', 'VII', 155,  910000, 110),
    ('PQC', 'BMV', 110,  690000, 120),

    -- Central highlands: Buôn Ma Thuột ↔ Đà Lạt is the classic short hop.
    ('BMV', 'DLI',  70,  520000, 110),
    ('DLI', 'BMV',  70,  520000, 110),

    -- Quảng Bình–Đồng Hới and the north-central pairings.
    ('VKG', 'HXX',  60,  490000, 100),
    ('HXX', 'VKG',  60,  490000, 100),
    ('VCA', 'VKG', 175,  990000, 110),
    ('CXR', 'VCA', 180,  980000, 110),

    -- Phú Quốc ↔ Rạch Giá, the short southern hop.
    ('PQC', 'VKG',  70,  510000, 110),
    ('VKG', 'PQC',  70,  510000, 110),

    -- Bắc Kạn ↔ Tuyên Quang, the far-north pair.
    ('BBU', 'TUQ',  55,  460000,  90),
    ('TUQ', 'BBU',  55,  460000,  90)
),
-- One daily economy departure and one daily business wave, +3h. A regional hop
-- does not carry five slots; two is what a turboprop actually runs, and ten
-- more rows a day would bury the results list.
schedule (depart_hour, class, price_factor, available_factor) AS (
  VALUES
    (8,  'economy',  1.00::numeric, 1.0),
    (14, 'business', 2.77::numeric, 0.15)
),
-- Three weeks starting two days out, matching the window
-- `scripts/seed-future-flights.cjs` opens for the hub routes. Seven days — what
-- 027 and 028 use — covers the date strip exactly and nothing beyond it, so a
-- customer who returns next week or follows a link to a later date finds these
-- regional pairs gone while the hub routes are still there. Twenty-one days
-- means forgetting to re-run either seed does not empty half the network.
--
-- `vn_date` is the Vietnam calendar day, not the session's: a GMT session reads
-- as the previous date, which is the whole bug 026 fixed. Formatting to text
-- here lets each row append a literal +07:00, so the stored instant does not
-- depend on the session time zone.
days (vn_date) AS (
  SELECT to_char(d, 'YYYY-MM-DD')
  FROM generate_series(
         (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 2,
         (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 22,
         INTERVAL '1 day'
       ) AS d
)
INSERT INTO flights (
  flight_no, from_code, to_code, depart_time, arrive_time, price, class, available
)
SELECT
  -- Numbered from 1500: 027 uses 601–1040 and 028 uses 1100–1256, and 031
  -- renumbers collisions into 2001+. `flight_no` has no unique constraint, so
  -- the block has to be clear of all of them by hand.
  'VJ ' || LPAD(
    (row_number() OVER (PARTITION BY d.vn_date) + 1500)::text,
    GREATEST(4, length((row_number() OVER (PARTITION BY d.vn_date) + 1500)::text)),
    '0'
  ),
  r.from_code,
  r.to_code,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz,
  (d.vn_date || ' ' || LPAD(s.depart_hour::text, 2, '0') || ':00:00+07')::timestamptz
    + make_interval(mins => r.block),
  round(r.price * s.price_factor),
  s.class,
  greatest(15, round(r.available * s.available_factor)::int)
FROM routes r
CROSS JOIN schedule s
CROSS JOIN days d
ON CONFLICT (from_code, to_code, depart_time) DO NOTHING;

-- Price whatever this file just inserted, with 030's ladder, then restore the
-- constraint. A no-op on a fresh database, where the columns do not exist yet.
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
