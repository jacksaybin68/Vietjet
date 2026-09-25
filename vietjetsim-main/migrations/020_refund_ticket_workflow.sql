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
