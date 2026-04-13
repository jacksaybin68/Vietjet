-- 007_phone_registration_support.sql
-- Allow email to be nullable and make phone unique for phone-based registration

-- 1. Remove NOT NULL constraint from email
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Add UNIQUE constraint to phone if not already unique
-- First, clean up any duplicate phones if they exist (simulation, so safe to just drop extra records or skip)
-- For now, we assume it's a fresh or clean environment OR we just add it.
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_phone_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);
    END IF;
END $$;

-- 3. Add constraint to ensure at least one of email or phone is present
-- Check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_contact_check'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_contact_check 
        CHECK (email IS NOT NULL OR phone IS NOT NULL);
    END IF;
END $$;
