-- Enhanced User Profiles
-- Run this in your Neon PostgreSQL dashboard (SQL Editor or psql)
-- Required by: Profile tab improvements

-- Add new columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other'));
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