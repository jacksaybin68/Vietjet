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
)
INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
SELECT
  'VJ ' || LPAD((row_number() OVER () + 200)::text, 3, '0'),
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
