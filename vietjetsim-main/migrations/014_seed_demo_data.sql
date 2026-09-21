-- 014_seed_demo_data.sql
-- Demo data required to exercise the app end-to-end.
--
-- The migrations create a complete schema but no rows, so a fresh database has
-- no airports and no flights: search returns nothing and the documented demo
-- accounts in the README cannot sign in. This migration is idempotent and safe
-- to run on an already-seeded database.
--
-- Note: flights are generated relative to CURRENT_DATE so the demo data stays in
-- the future however long after the migration it is run. The `available` column
-- is real capacity, not a sale counter, so an idempotent re-run must not decrement
-- it — the ON CONFLICT branches leave it untouched.

-- ─── Airports ───────────────────────────────────────────────────────────────

INSERT INTO airports (code, name, city, country)
VALUES
  ('SGN', 'Tân Sơn Nhất', 'TP Hồ Chí Minh', 'Vietnam'),
  ('HAN', 'Nội Bài', 'Hà Nội', 'Vietnam'),
  ('DAD', 'Đà Nẵng', 'Đà Nẵng', 'Vietnam'),
  ('PQC', 'Phú Quốc', 'Phú Quốc', 'Vietnam'),
  ('CXR', 'Cam Ranh', 'Nha Trang', 'Vietnam'),
  ('HUI', 'Phú Bài', 'Huế', 'Vietnam'),
  ('VDO', 'Vân Đồn', 'Quảng Ninh', 'Vietnam'),
  ('HPH', 'Cát Bi', 'Hải Phòng', 'Vietnam'),
  ('DLI', 'Liên Khương', 'Đà Lạt', 'Vietnam'),
  ('VII', 'Vinh', 'Vinh', 'Vietnam'),
  ('PXU', 'Pleiku', 'Pleiku', 'Vietnam'),
  ('VCA', 'Cần Thơ', 'Cần Thơ', 'Vietnam'),
  ('BMV', 'Buôn Ma Thuột', 'Buôn Ma Thuột', 'Vietnam'),
  ('VDH', 'Đồng Hới', 'Quảng Bình', 'Vietnam'),
  ('VCS', 'Côn Đảo', 'Côn Đảo', 'Vietnam'),
  ('THD', 'Thọ Xuân', 'Thanh Hóa', 'Vietnam')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, city = EXCLUDED.city, country = EXCLUDED.country;

-- ─── Flights ────────────────────────────────────────────────────────────────
-- Five slots per route across the seven busiest Vietnamese city pairs.

-- Created before the insert so the `ON CONFLICT` below can dedupe re-runs:
-- a seeded flight is identified by its route and exact departure time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_flights_route_depart_time
  ON flights (from_code, to_code, depart_time);

WITH routes (from_code, to_code) AS (
  VALUES
    ('SGN', 'HAN'), ('HAN', 'SGN'),
    ('SGN', 'DAD'), ('DAD', 'SGN'),
    ('HAN', 'DAD'), ('DAD', 'HAN'),
    ('SGN', 'PQC'), ('PQC', 'SGN'),
    ('HAN', 'PQC'), ('PQC', 'HAN'),
    ('SGN', 'CXR'), ('CXR', 'SGN'),
    ('SGN', 'HUI'), ('HUI', 'SGN')
),
schedule (slot, depart_hour, price, class, available) AS (
  VALUES
    (1, 6,  899000::numeric,  'economy',  180),
    (2, 9,  1299000::numeric, 'economy',  165),
    (3, 12, 749000::numeric,  'economy',  192),
    (4, 15, 1059000::numeric, 'economy',  150),
    (5, 19, 2490000::numeric, 'business', 24)
)
INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
SELECT
  'VJ ' || LPAD((row_number() OVER () + 100)::text, 3, '0'),
  r.from_code,
  r.to_code,
  (CURRENT_DATE + INTERVAL '1 day') + make_interval(hours => s.depart_hour),
  (CURRENT_DATE + INTERVAL '1 day') + make_interval(hours => s.depart_hour) + INTERVAL '2 hours 10 minutes',
  s.price,
  s.class,
  s.available
FROM routes r
CROSS JOIN schedule s
ON CONFLICT (from_code, to_code, depart_time) DO NOTHING;

-- ─── Demo accounts ──────────────────────────────────────────────────────────
-- Passwords are bcrypt (12 rounds) hashes of the README's documented demo
-- credentials: user@vietjetsim.vn / user123 and admin@vietjetsim.vn / admin123.

INSERT INTO user_profiles (email, password_hash, full_name, role, email_verified)
VALUES
  (
    'user@vietjetsim.vn',
    '$2b$12$KUzud4jhdQ3uls6Wduco3uf5kj/ZkOhuPywzWi1b6UJq.fh92qTcq',
    'Nguyễn Văn A',
    'user',
    true
  ),
  (
    'admin@vietjetsim.vn',
    '$2b$12$FISyKxhzJEDYcLJ6YkTqpubiTcKxGT4TkvU/qClLrCPEwOVZ0luvi',
    'Quản Trị Viên',
    'admin',
    true
  )
ON CONFLICT (email) DO NOTHING;

-- Every user gets a wallet so payment flows have somewhere to debit.
INSERT INTO user_wallets (user_id, balance, currency, account_number)
SELECT
  u.id,
  5000000.00,
  'VND',
  '970400' || LPAD((row_number() OVER (ORDER BY u.email))::text, 6, '0')
FROM user_profiles u
WHERE u.email IN ('user@vietjetsim.vn', 'admin@vietjetsim.vn')
ON CONFLICT (user_id) DO NOTHING;
