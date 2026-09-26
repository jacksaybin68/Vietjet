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

UPDATE user_profiles
   SET email = 'user@vietjetair.vn'
 WHERE email = 'user@vietjetsim.vn';

UPDATE user_profiles
   SET email = 'admin@vietjetair.vn'
 WHERE email = 'admin@vietjetsim.vn';
