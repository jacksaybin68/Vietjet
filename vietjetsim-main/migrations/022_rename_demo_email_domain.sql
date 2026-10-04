-- 022_rename_demo_email_domain.sql
--
-- The brand moved from VietjetSim to Vietjet Air, and the two demo accounts'
-- email domain follows it: @vietjetsim.vn -> @vietjetair.vn.
--
-- Migration 014 is left untouched on purpose. It still seeds the old domain,
-- so this file has to cope with both cases: a database seeded before this
-- migration existed (the rows are already there and need renaming) and a fresh
-- one (014 inserts the old domain, this renames it right after). That keeps a
-- single code path instead of editing an already-applied migration.
--
-- Only the two documented demo accounts are touched. Any other row on the old
-- domain is deliberately left alone, so applying this can never orphan a real
-- account or lock anyone out of a login.

-- The guard has to look at the *source* row, not just at whether the target
-- address is free. "Skip if the new address exists" is the obvious version and
-- it is wrong: `scripts/setup-admin.sql` and `setup-admin.ts` both create
-- `admin@vietjetair.vn`, so on a database where the admin was set up before
-- this file ran, the admin row is already on the new address while
-- `admin@vietjetsim.vn` is still sitting on the old one. Skipping then leaves
-- the demo account on the old domain forever — measured, not theorised: the
-- set ends with both `admin@vietjetair.vn` and `admin@vietjetsim.vn` present,
-- and README/SETUP advertise only the new one, so the advertised admin login
-- is a different account from the seeded one.
--
-- So: rename when the target is free, or when it is occupied by *this very
-- row's own successor* — i.e. the source row is a leftover re-seed and the
-- target belongs to another id. The source row is a seeded demo account, not
-- customer data, so dropping it when it collides is safe and is what makes the
-- rename unconditional. Both accounts end on the new domain, always.
WITH renamed AS (
  UPDATE user_profiles
     SET email = 'user@vietjetair.vn'
   WHERE email = 'user@vietjetsim.vn'
     AND NOT EXISTS (
       SELECT 1 FROM user_profiles taken
        WHERE taken.email = 'user@vietjetair.vn'
          AND taken.id <> user_profiles.id
     )
  RETURNING 1
)
DELETE FROM user_profiles
 WHERE email = 'user@vietjetsim.vn'
   AND NOT EXISTS (SELECT 1 FROM renamed);

WITH renamed AS (
  UPDATE user_profiles
     SET email = 'admin@vietjetair.vn'
   WHERE email = 'admin@vietjetsim.vn'
     AND NOT EXISTS (
       SELECT 1 FROM user_profiles taken
        WHERE taken.email = 'admin@vietjetair.vn'
          AND taken.id <> user_profiles.id
     )
  RETURNING 1
)
DELETE FROM user_profiles
 WHERE email = 'admin@vietjetsim.vn'
   AND NOT EXISTS (SELECT 1 FROM renamed);
