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

-- Relax the fare columns for this file's duration, then restore them below,
-- the way 027 does. 030 creates them *and* makes them NOT NULL with no default,
-- so on a replay the bare INSERT below is rejected on the null before any
-- pricing statement can reach it. Dropping the constraint here is what lets
-- the insert through; the DO block after it prices these rows, and the second
-- block re-applies NOT NULL. On a fresh database the columns do not exist yet,
-- every block here is a no-op, and 030 both creates and prices them later.
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

-- No `economy_price` / `business_price` in the column list, and that has to stay:
-- 030 is what creates those columns, so on a fresh database naming them here
-- aborts this INSERT with "column economy_price does not exist" during the
-- *first* apply. 030 then backfills whatever this file left null.
--
-- The replay is the other direction: the columns exist by then and reject a
-- null, so the bare column list fails CI's "Re-applying migrations must be
-- safe" step with "null value in column economy_price". The DO block below
-- prices these rows when the columns are there and does nothing when they are
-- not, which is the same shape as 027's own guard.
--
-- A CTE collects the rows this run actually inserted, so the pricing step
-- addresses them by identity rather than by flight number. Numbering cannot do
-- that job: `row_number() OVER ()` numbers the *select*, not the insert, so a
-- number advances even when `ON CONFLICT DO NOTHING` skips the row. On a
-- replay the new rows therefore land anywhere in the 101+ range instead of the
-- tidy 101-160 block, and a number-range WHERE leaves the strays unpriced —
-- which is what fails 030's NOT NULL. The name is file-specific so two seed
-- files sharing one transaction cannot collide.
--
-- No `ON COMMIT DROP`: CI applies each file with `psql -f` and no `BEGIN`, so
-- every statement is its own transaction and the table would be gone before the
-- INSERT below could name it. Dropped explicitly at the end of the file, which
-- behaves the same either way.
CREATE TEMP TABLE _vj_seeded_014 (
  id           uuid PRIMARY KEY,
  class        text,
  price        numeric
);

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
),
inserted AS (
  INSERT INTO flights (flight_no, from_code, to_code, depart_time, arrive_time, price, class, available)
  SELECT
    -- Pad to the number's own length with 3 as the floor: `LPAD(x, 3, '0')`
    -- *truncates* when x is longer than 3, so the first number past 999
    -- silently lost a digit and two routes ended up under one flight number.
    'VJ ' || LPAD(
      (row_number() OVER () + 100)::text,
      GREATEST(3, length((row_number() OVER () + 100)::text)),
      '0'
    ),
    r.from_code,
    r.to_code,
    (CURRENT_DATE + INTERVAL '1 day') + make_interval(hours => s.depart_hour),
    (CURRENT_DATE + INTERVAL '1 day') + make_interval(hours => s.depart_hour) + INTERVAL '2 hours 10 minutes',
    s.price,
    s.class,
    s.available
  FROM routes r
  CROSS JOIN schedule s
  ON CONFLICT (from_code, to_code, depart_time) DO NOTHING
  RETURNING id, class, price
)
INSERT INTO _vj_seeded_014 (id, class, price)
SELECT id, class, price FROM inserted;

-- 030's own formula, verbatim: a business row's economy fare is `price / 2.77`,
-- every other class takes `price` as its economy fare. Addressed by the ids the
-- CTE above collected, so it prices this run's rows and nothing else. Only runs
-- once the columns exist, so it is a no-op on a fresh database where 030 has
-- yet to run.
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
      FROM _vj_seeded_014 s
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

DROP TABLE IF EXISTS _vj_seeded_014;

-- ─── Demo accounts ──────────────────────────────────────────────────────────
-- Passwords are bcrypt (12 rounds) hashes of the README's documented demo
-- credentials: user@vietjetsim.vn / user123 and admin@vietjetsim.vn / admin123.
--
-- The insert is guarded on *both* email domains, not just the one this file
-- writes. `022_rename_demo_email_domain.sql` renames these two rows to
-- @vietjetair.vn, which frees the old addresses; a re-run of the whole
-- migration set (CI's idempotency step, or anyone re-seeding) would then
-- re-create the accounts here under the old domain with fresh user ids. The
-- wallet insert below would mint the same 970400… account numbers for those new
-- ids and collide with the live wallets on the unique account_number. Checking
-- both domains keeps a re-run a no-op.

DO $seed$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE email IN ('user@vietjetsim.vn', 'admin@vietjetsim.vn',
                    'user@vietjetair.vn', 'admin@vietjetair.vn')
  ) THEN
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
  END IF;
END
$seed$;

-- Every user gets a wallet so payment flows have somewhere to debit. The
-- account numbers are derived from the row's position among the demo accounts,
-- so they are stable across a re-run *because* the guard above keeps the
-- accounts from being re-created. Only wallets for accounts that do not have
-- one yet are minted, which is a second line of defence against a unique
-- account_number collision.

INSERT INTO user_wallets (user_id, balance, currency, account_number)
SELECT
  u.id,
  5000000.00,
  'VND',
  '970400' || LPAD((row_number() OVER (ORDER BY u.email))::text, 6, '0')
FROM user_profiles u
WHERE u.email IN ('user@vietjetsim.vn', 'admin@vietjetsim.vn')
  AND NOT EXISTS (SELECT 1 FROM user_wallets w WHERE w.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
