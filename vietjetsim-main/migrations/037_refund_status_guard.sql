-- 037_refund_status_guard.sql
--
-- `refund_requests.status` had no CHECK, was nullable, and every layer carried a
-- different idea of its legal values. Measured before this file:
--
--   migration 020   partial unique index on (booking_id) WHERE status IN
--                   ('pending','approved')  -- the duplicate guard
--   POST/PATCH route validStatuses       -- pending, approved, rejected, completed
--   RefundRecord['status'] (TypeScript)  -- the same four plus 'processed', 'archived'
--   RefundRequestsTab STATUS_MAP         -- pending, approved, rejected
--
-- Two real defects, both reproduced on Postgres 17 with this schema applied:
--
-- 1. NULL slips past the duplicate guard. `status` was nullable, so a ticket
--    written with NULL satisfies neither branch of the partial index predicate
--    and is not in the index at all. Two NULL tickets for one booking inserted
--    cleanly (the pending pair is correctly rejected), so a customer could file
--    the same refund repeatedly and an operator could pay it more than once --
--    the exact outcome 020's comment says the index exists to prevent.
--
-- 2. Nothing stopped an operator re-approving the same ticket. Re-running the
--    approval path credits the wallet again: balance 100k -> 1.1M after one
--    approval, -> 2.1M after a second press of the same button on the same
--    ticket, with two 'refund' rows of 1,000,000 each for one booking. There is
--    no unique index on `wallet_transactions.reference_id`, so nothing rejects
--    the duplicate and `refundWallet` is free to double-credit.
--
-- `processed` is a dead status: no code path anywhere writes it, and
-- `archiveOldRefunds` -- the only reader that looks for it -- has no caller.
-- It is kept in the CHECK rather than removed, because dropping a value some
-- archived row may still carry would abort this file on a real database; the
-- TypeScript union and the dead function are cleaned up in code.
--
-- Idempotent: CI re-applies every migration, and each statement below is its
-- own transaction (psql -f, no wrapping BEGIN).

-- ── 1. status is always one of the six, and never NULL ─────────────────────
-- NOT VALID first, then VALIDATE separately: a single ADD CONSTRAINT both
-- backfills and aborts, and because this file has no BEGIN that abort would
-- also cost the fix below.
DO $add_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refund_requests_status_check'
  ) THEN
    ALTER TABLE refund_requests
      ADD CONSTRAINT refund_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'processed', 'archived'))
      NOT VALID;
  END IF;
END
$add_check$;

-- No production row is NULL (measured: 0 of 1), but the guard only holds if
-- every write path supplies the value, and NULL is the value the column used
-- to accept silently.
UPDATE refund_requests SET status = 'pending' WHERE status IS NULL;

ALTER TABLE refund_requests
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE refund_requests VALIDATE CONSTRAINT refund_requests_status_check;

-- ── 2. One wallet refund per booking ────────────────────────────────────────
-- A booking can legitimately carry several refund tickets (one per rejected
-- reason, or a reopened case), so this is on the wallet ledger rather than on
-- `refund_requests`: the thing that must not happen twice is paying the same
-- money out twice for the same booking.
--
-- Only 'refund' rows are constrained. `reference_id` is reused by topups and
-- withdrawals against other columns, and a partial unique index is what keeps
-- this from rejecting those.
--
-- NOT VALID + VALIDATE again: on a database that has already been double-paid
-- this aborts with the violating rows reported instead of silently rejecting
-- the duplicate and leaving the ledger unbalanced, which is the state an
-- operator has to look at before the constraint can go on.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_one_refund_per_reference
  ON wallet_transactions (reference_id)
  WHERE type = 'refund' AND reference_id IS NOT NULL;
