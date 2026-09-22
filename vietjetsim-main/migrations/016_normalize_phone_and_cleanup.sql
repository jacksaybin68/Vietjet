-- 016_normalize_phone_and_cleanup.sql
-- Root-cause cleanup for data created before `normalizePhone` existed.
--
-- `user_profiles.phone` has carried a UNIQUE index since 007, but registration
-- and login compared the raw string, so `0986349061` and `986349061` were
-- accepted as two different people and each got its own wallet. This migration
-- canonicalises the stored numbers, merges the accounts that collapsed into
-- duplicates, and removes one demo table left behind by the Neon console.
--
-- Runs inside the caller's transaction, is safe to re-run, and refuses to
-- destroy anything it cannot merge safely (it raises instead of guessing).

-- ── 1. Canonicalise phone numbers ────────────────────────────────────────────
-- Same rule as `normalizePhone` in src/lib/utils.ts: strip punctuation, map a
-- +84/84 country code onto the trunk zero, and restore a missing leading zero
-- on a 9-digit local number. Numbers of any other shape are left alone rather
-- than forced into a local format.
--
-- The unique index is dropped for the duration because two rows can legally
-- collapse onto the same value here; step 2 resolves those collisions.
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_phone_key;

UPDATE user_profiles
SET phone = CASE
        WHEN regexp_replace(phone, '\D', '', 'g') ~ '^84' AND length(regexp_replace(phone, '\D', '', 'g')) > 9
            THEN '0' || substring(regexp_replace(phone, '\D', '', 'g') FROM 3)
        WHEN regexp_replace(phone, '\D', '', 'g') ~ '^0'
            THEN regexp_replace(phone, '\D', '', 'g')
        WHEN length(regexp_replace(phone, '\D', '', 'g')) = 9
            THEN '0' || regexp_replace(phone, '\D', '', 'g')
        ELSE phone
    END,
    updated_at = NOW()
WHERE phone IS NOT NULL
  AND phone <> CASE
        WHEN regexp_replace(phone, '\D', '', 'g') ~ '^84' AND length(regexp_replace(phone, '\D', '', 'g')) > 9
            THEN '0' || substring(regexp_replace(phone, '\D', '', 'g') FROM 3)
        WHEN regexp_replace(phone, '\D', '', 'g') ~ '^0'
            THEN regexp_replace(phone, '\D', '', 'g')
        WHEN length(regexp_replace(phone, '\D', '', 'g')) = 9
            THEN '0' || regexp_replace(phone, '\D', '', 'g')
        ELSE phone
    END;

-- ── 2. Merge accounts that normalisation collapsed together ──────────────────
DO $$
DECLARE
    grp          RECORD;
    -- user_profiles.id is TEXT, not uuid, so these must match it or every
    -- comparison against a child table's user_id fails with text <> uuid.
    survivor     TEXT;
    loser        TEXT;
    loser_wallet NUMERIC;
    survivor_has_wallet BOOLEAN;
BEGIN
    FOR grp IN
        SELECT phone
        FROM user_profiles
        WHERE phone IS NOT NULL
        GROUP BY phone
        HAVING count(*) > 1
    LOOP
        -- Survivor: prefer the row with an email (the account a human can sign
        -- into with credentials), then the oldest, then a stable id tie-break.
        SELECT id INTO survivor
        FROM user_profiles
        WHERE phone = grp.phone
        ORDER BY (email IS NULL), created_at, id
        LIMIT 1;

        FOR loser IN
            SELECT id FROM user_profiles
            WHERE phone = grp.phone AND id <> survivor
            ORDER BY created_at, id
        LOOP
            -- Refuse to guess when real money is involved: an operator must
            -- decide how to reconcile two funded wallets.
            SELECT balance INTO loser_wallet FROM user_wallets WHERE user_id = loser;
            IF loser_wallet IS NOT NULL AND loser_wallet <> 0 THEN
                RAISE EXCEPTION
                    'user % has a non-zero wallet balance (%); reconcile it manually before merging phone %',
                    loser, loser_wallet, grp.phone;
            END IF;

            -- Tables whose rows can simply follow the survivor. user_loyalty and
            -- the wallet are handled separately because user_id is unique there.
            UPDATE bookings               SET user_id = survivor WHERE user_id = loser;
            UPDATE notifications          SET user_id = survivor WHERE user_id = loser;
            UPDATE saved_payment_methods  SET user_id = survivor WHERE user_id = loser;
            UPDATE user_sessions          SET user_id = survivor WHERE user_id = loser;
            UPDATE login_history          SET user_id = survivor WHERE user_id = loser;
            UPDATE refund_requests        SET user_id = survivor WHERE user_id = loser;
            UPDATE chat_conversations     SET user_id = survivor WHERE user_id = loser;
            UPDATE account_recovery       SET user_id = survivor WHERE user_id = loser;
            UPDATE admin_roles            SET user_id = survivor WHERE user_id = loser;

            -- 2FA: move the enrollment only if the survivor has none, otherwise
            -- raise rather than silently disabling someone's second factor.
            SELECT EXISTS (SELECT 1 FROM user_2fa WHERE user_id = survivor) INTO survivor_has_wallet;
            IF EXISTS (SELECT 1 FROM user_2fa WHERE user_id = loser) THEN
                IF survivor_has_wallet THEN
                    RAISE EXCEPTION
                        'both % and % have a 2FA enrollment; resolve manually before merging',
                        survivor, loser;
                END IF;
                UPDATE user_2fa SET user_id = survivor WHERE user_id = loser;
            END IF;

            -- Loyalty: same conditional move.
            SELECT EXISTS (SELECT 1 FROM user_loyalty WHERE user_id = survivor) INTO survivor_has_wallet;
            IF EXISTS (SELECT 1 FROM user_loyalty WHERE user_id = loser) THEN
                IF survivor_has_wallet THEN
                    UPDATE loyalty_transactions lt
                       SET user_loyalty_id = (SELECT id FROM user_loyalty WHERE user_id = survivor)
                     WHERE lt.user_loyalty_id = (SELECT id FROM user_loyalty WHERE user_id = loser);
                    DELETE FROM user_loyalty WHERE user_id = loser;
                ELSE
                    UPDATE user_loyalty SET user_id = survivor WHERE user_id = loser;
                END IF;
            END IF;

            -- Wallet: user_id is unique, and we already proved the balance is 0.
            UPDATE wallet_transactions wt
               SET wallet_id = (SELECT id FROM user_wallets WHERE user_id = survivor)
             WHERE wt.wallet_id = (SELECT id FROM user_wallets WHERE user_id = loser)
               AND EXISTS (SELECT 1 FROM user_wallets WHERE user_id = survivor);
            DELETE FROM user_wallets WHERE user_id = loser AND balance = 0;

            DELETE FROM user_profiles WHERE id = loser;
            RAISE NOTICE 'merged duplicate user % into % for phone %', loser, survivor, grp.phone;
        END LOOP;
    END LOOP;
END $$;

-- Restore the unique guarantee now that every value is canonical and unique.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_phone_key') THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);
    END IF;
END $$;

-- ── 3. Retire role values the application does not recognise ─────────────────
-- `manager` is not in ADMIN_ROLES, so such a row is silently a non-admin: it
-- cannot open /quan-tri. Storing 'user' makes the effective permission explicit
-- instead of leaving a role name that reads as privileged but behaves as not.
UPDATE user_profiles SET role = 'user', updated_at = NOW() WHERE role NOT IN (
    'user', 'admin', 'super_admin', 'admin_ops', 'admin_finance', 'admin_support', 'admin_content'
);

-- ── 4. Drop the leftover Neon console demo table ─────────────────────────────
DROP TABLE IF EXISTS playing_with_neon;
