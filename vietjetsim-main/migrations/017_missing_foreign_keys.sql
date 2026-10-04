-- 017_missing_foreign_keys.sql
--
-- `bookings.discount_code_id` is a plain UUID column with no foreign key, so a
-- booking can reference a discount code that no longer exists (or never did).
-- The types already line up (`discount_codes.id UUID`, see 003_discount_system).
--
-- `ADD CONSTRAINT ... FOREIGN KEY` validates existing rows immediately, so on
-- exactly the databases this file exists to repair — ones holding a booking
-- pointing at a deleted code — the ALTER aborts with `violates foreign key
-- constraint`, and because CI runs `psql -f` with no `BEGIN` the guard block
-- leaves the file half-applied. `NOT VALID` is the form that can be installed
-- first and proved afterwards: enforced for every new write, unproven for the
-- rows already there. The DO block below clears the orphans and only then
-- validates, so the constraint ends up actually trusted rather than merely
-- present.

--
-- Why a new file rather than an ALTER at the end of 000_core_schema.sql:
-- `discount_codes` is created by 003, which runs *after* 000, so the ALTER
-- would fail on a fresh database. Same for a wallet FK — that one already
-- exists in 002_user_wallet.sql (`wallet_transactions.wallet_id ... REFERENCES
-- user_wallets(id) ON DELETE CASCADE`), so re-adding it would fail as a
-- duplicate constraint.
--
-- Written as a DO block because PostgreSQL has no `ADD CONSTRAINT IF NOT
-- EXISTS`; this keeps the migration re-runnable on a database that already has
-- the constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_bookings_discount_code'
      AND conrelid = 'bookings'::regclass
  ) THEN
    -- Installed first and unproven: from here on a new write cannot introduce a
    -- dangling reference, without the rows already there blocking the run.
    ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_discount_code
      FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) NOT VALID;

    -- A booking keeps its price and its seat; only the dangling pointer is
    -- dropped, so the booking still shows up in the customer's list and in
    -- admin reports. Leaving the pointer would defeat the point of the FK.
    UPDATE bookings SET discount_code_id = NULL WHERE discount_code_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM discount_codes d WHERE d.id = bookings.discount_code_id);

    -- Now that no row violates it, trust the constraint so the planner can rely
    -- on it and so a future `convalidated = false` check finds nothing.
    ALTER TABLE bookings VALIDATE CONSTRAINT fk_bookings_discount_code;
  END IF;
END
$$;
