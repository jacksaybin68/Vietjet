-- Enhanced User Profiles
-- Run this in your Neon PostgreSQL dashboard (SQL Editor or psql)
-- Required by: Profile tab improvements

-- Add new columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob DATE;
-- The CHECK on `gender` is a separate statement, not inline on the ADD COLUMN.
-- `ADD COLUMN IF NOT EXISTS` is a no-op *in its entirety* when the column is
-- already there: Postgres emits `NOTICE: column ... already exists, skipping`
-- and discards the rest of the definition, constraints included. Measured on a
-- database whose `user_profiles.gender` existed without one — which is exactly
-- the state this file meets on any Neon database, since its own header tells
-- the reader to paste it into a console where the column may already have been
-- added by hand — after three applies the count of constraints on `gender` was
-- still 0. The column was writable with any value, since only the `<select>` in
-- `ProfileTab.tsx` limits the choices and the profile route passes the field
-- through unfiltered.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Vietnam';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'vi';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_dob ON user_profiles(dob);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);

-- ── Constrain `gender` ─────────────────────────────────────────────────────
--
-- Guarded on `conrelid` as well as `conname`: a constraint name is unique per
-- *schema*, not per table, so a bare name match could skip this block on the
-- strength of an unrelated constraint and leave the column unchecked forever.
-- Adding an existing constraint raises, hence the guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_gender_check'
      AND conrelid = 'user_profiles'::regclass
  ) THEN
    -- NOT VALID, because the column may hold values written before the
    -- constraint existed — which is the whole reason this block is reachable at
    -- all. It installs now and is validated after the repair below, instead of
    -- aborting on the rows it was written to bring into line.
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_gender_check
      CHECK (gender IN ('male', 'female', 'other')) NOT VALID;
  END IF;
END $$;

-- Reset an unrecognised value to the column's default rather than deleting the
-- row: the profile carries the customer's booking history, and a bad enum value
-- is no reason to lose the account. Runs before VALIDATE on purpose — a file
-- this way cannot abort, it repairs and then checks.
UPDATE user_profiles
SET gender = 'male'
WHERE gender IS NOT NULL
  AND gender NOT IN ('male', 'female', 'other');

ALTER TABLE user_profiles VALIDATE CONSTRAINT user_profiles_gender_check;