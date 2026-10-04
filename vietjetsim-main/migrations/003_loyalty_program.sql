-- Loyalty Program System
-- Run this in your Neon PostgreSQL dashboard (SQL Editor or psql)
-- Required by: Loyalty tab in User Dashboard

-- Loyalty Programs
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  points_per_1000_vnd DECIMAL(5,2) DEFAULT 1.00,
  min_points_to_redeem INTEGER DEFAULT 1000,
  points_expiry_months INTEGER DEFAULT 24,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- The name is how the program is addressed everywhere else: the seed below
  -- selects `WHERE name = 'VietjetSim Rewards'`, and `getOrEnrollLoyalty` picks
  -- `WHERE is_active = true LIMIT 1` with no ordering. With only `id` unique,
  -- each replay added another active program, so that `LIMIT 1` could return a
  -- different row between two calls — and `user_loyalty.program_id` pointed at
  -- the one picked, so a customer's tier ladder depended on which duplicate
  -- happened to win. Measured on a database this file had been re-run against:
  -- 4 programs with one name.
  UNIQUE (name)
);

-- User Loyalty Enrollment
CREATE TABLE IF NOT EXISTS user_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  program_id UUID NOT NULL REFERENCES loyalty_programs(id),
  total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
  available_points INTEGER DEFAULT 0 CHECK (available_points >= 0),
  lifetime_points INTEGER DEFAULT 0 CHECK (lifetime_points >= 0),
  tier VARCHAR(50) DEFAULT 'Bronze',
  tier_qualified_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Transaction History
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_loyalty_id UUID NOT NULL REFERENCES user_loyalty(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  points INTEGER NOT NULL CHECK (points != 0),
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'bonus', 'adjust')),
  description VARCHAR(255),
  expires_at TIMESTAMPTZ,
  expired BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Tiers Configuration
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES loyalty_programs(id),
  name VARCHAR(50) NOT NULL,
  min_lifetime_points INTEGER DEFAULT 0,
  points_multiplier DECIMAL(3,2) DEFAULT 1.00,
  benefits TEXT,
  tier_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- A tier is identified by its name *within* a program: that is the pair the
  -- four seed INSERTs below name, and the pair the ladder in
  -- `LOYALTY_TIERS` (src/features/loyalty/constants.ts) is keyed by. Without
  -- this the only unique index is `id`, so `ON CONFLICT DO NOTHING` had nothing
  -- to conflict on and every re-apply inserted four more tiers per program —
  -- measured 4 rows after one pass, 40 after four, with 12 duplicate
  -- (program, name) groups, and `getUserLoyaltyWithProgram` returning all of
  -- them to the loyalty tab.
  UNIQUE (program_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_active ON loyalty_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_user_loyalty_user_id ON user_loyalty(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loyalty_program ON user_loyalty(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_loyalty ON loyalty_transactions(user_loyalty_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_program ON loyalty_tiers(program_id);

-- ─── Collapse duplicates, then install the keys the seed depends on ────────
--
-- The two `UNIQUE` clauses above only take effect where the table is being
-- created. On a database that already has these tables — which is every
-- database this file has ever run twice on, since the seeds below re-inserted
-- unconditionally — the constraints are absent and the rows are duplicated, so
-- they have to be repaired here rather than assumed.
--
-- `UNIQUE` has no `NOT VALID` form, so the shape is the same one `007`/`016`
-- use: check for the violation *first*, merge or drop, and only then add the
-- constraint. Adding it before the cleanup would abort.
--
-- Order matters twice over. `loyalty_tiers.program_id` references
-- `loyalty_programs.id`, so a duplicate program cannot be deleted while its
-- tiers still point at it — and a customer's `user_loyalty.program_id` decides
-- which tier ladder they see, so it is repointed at the survivor rather than
-- left behind on a row about to disappear.

DO $dedupe$
DECLARE
  survivor loyalty_programs;
  loser    loyalty_programs;
BEGIN
  -- Two programs with the same name are the same program. Prefer the one
  -- customers are enrolled in, then the oldest, then a stable id tie-break.
  FOR survivor IN
    SELECT DISTINCT ON (name) *
    FROM loyalty_programs
    ORDER BY name,
             (SELECT count(*) FROM user_loyalty ul WHERE ul.program_id = loyalty_programs.id) > 0 DESC,
             created_at,
             id
  LOOP
    FOR loser IN
      SELECT * FROM loyalty_programs p
      WHERE p.name = survivor.name AND p.id <> survivor.id
      ORDER BY created_at, id
    LOOP
      UPDATE loyalty_tiers SET program_id = survivor.id WHERE program_id = loser.id;
      UPDATE user_loyalty SET program_id = survivor.id WHERE program_id = loser.id;
      DELETE FROM loyalty_programs WHERE id = loser.id;
      RAISE NOTICE 'merged duplicate loyalty program % into % for name %',
        loser.id, survivor.id, survivor.name;
    END LOOP;
  END LOOP;

  -- Tiers are identified by (program, name); keep the oldest of each pair.
  DELETE FROM loyalty_tiers
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             row_number() OVER (PARTITION BY program_id, name ORDER BY created_at, id) AS position
      FROM loyalty_tiers
    ) numbered
    WHERE position > 1
  );
END $dedupe$;

-- Install the keys now that the rows satisfy them. Guarded on `conname` and,
-- unlike a bare `conname` match, on `conrelid`: a constraint name is unique per
-- *schema*, not per table, so an unqualified match would let a same-named
-- constraint on another table make this block skip and leave the seed below
-- unprotected. Adding a key that is already present raises, hence the guard.
DO $keys$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loyalty_programs_name_key'
      AND conrelid = 'loyalty_programs'::regclass
  ) THEN
    ALTER TABLE loyalty_programs ADD CONSTRAINT loyalty_programs_name_key UNIQUE (name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loyalty_tiers_program_id_name_key'
      AND conrelid = 'loyalty_tiers'::regclass
  ) THEN
    ALTER TABLE loyalty_tiers
      ADD CONSTRAINT loyalty_tiers_program_id_name_key UNIQUE (program_id, name);
  END IF;
END $keys$;

-- Insert default loyalty program
--
-- The conflict target is named rather than left bare: a targetless
-- `ON CONFLICT DO NOTHING` only guards against the unique indexes the table
-- happens to have, so it silently degrades to "insert another row" the moment
-- one is missing — which is exactly what happened on every re-apply before the
-- keys above existed.
INSERT INTO loyalty_programs (name, description, points_per_1000_vnd, min_points_to_redeem, is_active)
VALUES ('VietjetSim Rewards', 'Chương trình tích điểm thưởng cho khách hàng VietjetSim', 1.00, 500, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default tiers
INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Bronze', 0, 1.00, 'Tích 1 điểm cho mỗi 1,000 VND', 1
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT (program_id, name) DO NOTHING;

INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Silver', 500000, 1.25, 'Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.', 2
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT (program_id, name) DO NOTHING;

INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Gold', 2000000, 1.5, 'Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.', 3
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT (program_id, name) DO NOTHING;

INSERT INTO loyalty_tiers (program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order)
SELECT id, 'Platinum', 5000000, 2.00, 'Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.', 4
FROM loyalty_programs WHERE name = 'VietjetSim Rewards'
ON CONFLICT (program_id, name) DO NOTHING;