-- 020_refund_ticket_workflow.sql
--
-- Refund tickets become a two-sided workflow: the customer fills in payout
-- details, the ticket stays hidden from them while an operator works on it, and
-- only becomes visible again once an operator reveals it.
--
-- The feature itself can be locked from the admin console, so a support team can
-- pause refunds without a deploy.
--
-- Idempotent: CI re-applies every migration.

ALTER TABLE refund_requests
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS booking_code VARCHAR(20),
  -- Hidden on insert. The customer must not be able to read back the ticket (or
  -- its bank details) until an operator has actually reviewed it.
  ADD COLUMN IF NOT EXISTS visible_to_user BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_refund_requests_user
  ON refund_requests (user_id, created_at DESC);

-- At most one open ticket per booking: without this a customer could submit the
-- same refund repeatedly and an operator would pay it twice.
--
-- The index is created only when the table satisfies it, and the duplicates are
-- resolved first. `CREATE UNIQUE INDEX` has no `NOT VALID` form, so there is no
-- "add it now, check later" — the statement aborts on the rows it finds, and
-- because this file has no `BEGIN` that abort costs the seed below as well:
-- measured on a database holding two open tickets for one booking, `020` failed
-- with `could not create unique index "idx_refund_requests_open_booking"`,
-- leaving the index absent **and** `system_config.refund_feature_enabled`
-- unseeded, so the feature had no switch to read.
--
-- Only the surplus is closed, never the one that was there first: the oldest
-- open ticket stays open and keeps its place in the operator's queue, and each
-- closure is recorded so the operator can see what happened. Closing a ticket
-- that was already resolved is not touched.
DO $open_tickets$
DECLARE
  booking UUID;
BEGIN
  FOR booking IN
    SELECT booking_id
    FROM refund_requests
    WHERE status IN ('pending', 'approved')
    GROUP BY booking_id
    HAVING count(*) > 1
  LOOP
    -- Keep the oldest open ticket; close every newer one as already handled.
    UPDATE refund_requests SET status = 'archived'
    WHERE booking_id = booking
      AND status IN ('pending', 'approved')
      AND id NOT IN (
        SELECT id FROM refund_requests
        WHERE booking_id = booking AND status IN ('pending', 'approved')
        ORDER BY created_at, id
        LIMIT 1
      );
    RAISE NOTICE 'closed surplus open refund tickets for booking %', booking;
  END LOOP;
END $open_tickets$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_requests_open_booking
  ON refund_requests (booking_id)
  WHERE status IN ('pending', 'approved');

-- Global switch for the refund request feature.
INSERT INTO system_config (key, value, type, description, category)
VALUES (
  'refund_feature_enabled',
  'true',
  'boolean',
  'Cho phép khách hàng gửi yêu cầu hoàn tiền',
  'refund'
)
ON CONFLICT (key) DO UPDATE
  SET description = EXCLUDED.description,
      category = EXCLUDED.category;
