-- 017_missing_foreign_keys.sql
--
-- `bookings.discount_code_id` is a plain UUID column with no foreign key, so a
-- booking can reference a discount code that no longer exists (or never did).
-- The types already line up (`discount_codes.id UUID`, see 003_discount_system).
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
    ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_discount_code
      FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id);
  END IF;
END
$$;
