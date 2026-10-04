-- 007_phone_registration_support.sql
-- Allow email to be nullable and make phone unique for phone-based registration

-- 1. Remove NOT NULL constraint from email
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Make phone unique, so one number cannot register two accounts.
--
-- `ADD CONSTRAINT UNIQUE` builds its index inline and aborts on the duplicates
-- it finds. On a database already holding two accounts on one number that
-- happens, and because CI runs each file with `psql -f` and no `BEGIN`, step 1
-- has already committed while step 3 never runs: `email` is still NOT NULL -
-- the exact state this file exists to remove - and `phone` stays unconstrained.
--
-- UNIQUE has no `NOT VALID` form, so the duplicate check is done here instead.
-- When duplicates exist the constraint is skipped and said out loud, because
-- the alternative is aborting. 016 then merges those accounts properly (it
-- moves bookings, wallets and loyalty before deleting a row) and re-adds the
-- constraint itself, so the guarantee still lands - just one file later, with
-- the data repaired rather than abandoned.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_profiles_phone_key'
          AND conrelid = 'user_profiles'::regclass
    ) THEN
        IF EXISTS (
            SELECT 1 FROM user_profiles
            WHERE phone IS NOT NULL
            GROUP BY phone HAVING count(*) > 1
        ) THEN
            RAISE NOTICE
                '007: bo qua UNIQUE tren phone - con so dien thoai trung lap; 016 se gop cac tai khoan lai truoc.';
        ELSE
            ALTER TABLE user_profiles
              ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);
        END IF;
    END IF;
END $$;

-- 3. Require at least one of email or phone, so a signup cannot leave an
-- account with no way to reach it.
--
-- `NOT VALID` for the reason the other two constraints here needed it: this
-- CHECK is added straight after step 1 drops `email NOT NULL`, and any account
-- registered with a phone alone in that window has `email IS NULL`. Validated
-- eagerly the ADD aborts and, with no `BEGIN` around the file, step 2's work is
-- already committed and the migration ends half-applied.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_profiles_contact_check'
          AND conrelid = 'user_profiles'::regclass
    ) THEN
        ALTER TABLE user_profiles
          ADD CONSTRAINT user_profiles_contact_check
          CHECK (email IS NOT NULL OR phone IS NOT NULL) NOT VALID;

        -- A row with neither is unreachable: no login, no recovery. Give it an
        -- address derived from its own id (`user_profiles.id` is TEXT) rather
        -- than deleting the account, so the booking history survives and an
        -- operator can fix it.
        UPDATE user_profiles
        SET email = id || '@no-contact.local'
        WHERE email IS NULL AND phone IS NULL;

        ALTER TABLE user_profiles VALIDATE CONSTRAINT user_profiles_contact_check;
    END IF;
END $$;
