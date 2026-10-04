-- Migration 006: Add account_number to user_wallets
--
-- The UNIQUE constraint is added by its own statement at the end, not inline on
-- the `ADD COLUMN`, for the reason 005 spells out: `ADD COLUMN IF NOT EXISTS` is
-- a no-op in its entirety when the column is already present, so an inline
-- constraint is silently discarded every time. Measured on a database where
-- `account_number` existed without one, the count stayed 0 however often this
-- file was applied.
--
-- Unlike `gender`'s CHECK, this one is not repaired here. Two wallets sharing an
-- account number is not a value to normalise — it means one customer's payout
-- account was recorded on two of their wallets, and only the accounts team can
-- say which is right. So the constraint waits for a database that satisfies it,
-- and the block below reports what is in the way rather than guessing.

ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);

-- Create an index to look up wallet by account number quickly
CREATE INDEX IF NOT EXISTS idx_wallets_account_number ON user_wallets(account_number);

-- ── Constrain `account_number` ──────────────────────────────────────────────
--
-- `UNIQUE` has no `NOT VALID` form, so this cannot be "added now, checked
-- later": `ADD CONSTRAINT ... UNIQUE` aborts on the duplicate it finds, and this
-- file has no `BEGIN` around it. Detect and defer instead — check first, skip
-- with a notice if the table is not yet clean — which is the second branch of the
-- rule 007 and 020 also use.
--
-- The guard filters on `conrelid`: a constraint name is unique per *schema*, so
-- a bare `conname` match would skip the block on the strength of an unrelated
-- constraint and leave the column unconstrained.
DO $$
DECLARE
  shared INTEGER;
BEGIN
  SELECT count(*) INTO shared
  FROM (
    SELECT account_number
    FROM user_wallets
    WHERE account_number IS NOT NULL
    GROUP BY account_number
    HAVING count(*) > 1
  ) duplicated;

  IF shared > 0 THEN
    -- NULLs never collide, so an unwritten account number is not a duplicate.
    RAISE NOTICE
      'user_wallets.account_number: % value(s) are shared by more than one wallet; '
      'skipping the UNIQUE constraint until an operator resolves them',
      shared;
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_wallets_account_number_key'
      AND conrelid = 'user_wallets'::regclass
  ) THEN
    ALTER TABLE user_wallets
      ADD CONSTRAINT user_wallets_account_number_key UNIQUE (account_number);
  END IF;
END $$;