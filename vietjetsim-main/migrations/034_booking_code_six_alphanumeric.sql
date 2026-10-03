-- 034_booking_code_six_alphanumeric.sql
--
-- The PNR is now exactly six alphanumeric characters, no prefix: `FG7KH9`.
--
-- `generate_booking_code()` (migration 012) built
-- `VJ` || LPAD(FLOOR(RANDOM() * 999999), 6, '0'), so every code was a `VJ`
-- prefix followed by six *digits*. Two things changed:
--
--   * The prefix goes. It was never part of the reference the customer has to
--     remember — the whole string is typed into check-in and lookup — and it
--     made the code two characters longer for nothing.
--   * Letters join the digits. Six digits is a 10^6 space; the function's
--     collision loop had to care, and it gave up after ten tries and returned
--     an 11-character code instead, silently breaking the length guarantee.
--     `A-Z0-9` is 36 symbols, so six characters give 36^6 = 2,176,782,336 —
--     collisions are a non-event, and the loop below exists only to satisfy the
--     UNIQUE constraint, never to bound the length.
--
-- Existing rows are deliberately NOT rewritten. A PNR is already printed on
-- tickets and quoted in support chats; reissuing one would invalidate
-- references the customer is holding. Nothing in the app depends on the shape
-- — every lookup compares the whole stored value with `=` or `ILIKE` — so old
-- `VJ` codes keep working in check-in, booking lookup and refunds.
--
-- This replaces the function only. The column default from 013 already points
-- at the function by name, so it picks up the new behaviour without a re-ALTER.

CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS VARCHAR(20) AS $fn$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT;
  attempts INTEGER := 0;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := (
      SELECT STRING_AGG(
        SUBSTRING(alphabet FROM (FLOOR(RANDOM() * LENGTH(alphabet)) + 1)::INT FOR 1),
        ''
        ORDER BY i
      )
      FROM generate_series(1, 6) AS g(i)
    );

    SELECT EXISTS(SELECT 1 FROM bookings WHERE booking_code = code) INTO exists_check;
    IF NOT exists_check THEN
      RETURN code;
    END IF;

    attempts := attempts + 1;
    IF attempts > 20 THEN
      -- Raising beats the old fallback of returning a longer code: a PNR of the
      -- wrong length would reach a boarding pass, and 36^6 makes 20 consecutive
      -- collisions a fault worth surfacing rather than papering over.
      RAISE EXCEPTION 'generate_booking_code: no free code after 20 attempts';
    END IF;
  END LOOP;
END;
$fn$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_booking_code() IS
  'Sinh mã đặt chỗ gồm đúng 6 ký tự chữ–số, ví dụ FG7KH9. Không có tiền tố.';