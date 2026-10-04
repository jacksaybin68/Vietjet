-- 012_add_booking_code.sql - Add booking_code column to bookings table
-- This adds a human-readable booking code (PNR) for each booking

-- Add booking_code column to bookings table if not exists
--
-- The guard filters on `table_schema = current_schema()`, not just `table_name`.
-- `information_schema.columns` spans the whole database, so on one carrying a
-- second schema an unqualified match also finds a same-named column there. The
-- guard would then report "already present", skip every statement below —
-- including the `generate_booking_code()` function — and 013 would fail on the
-- `ALTER TABLE ... SET DEFAULT` that expects both. `current_schema()` is the
-- right scope: the `ALTER TABLE` is unqualified and resolves the same way.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = current_schema() AND table_name = 'bookings' AND column_name = 'booking_code'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_code VARCHAR(20) UNIQUE;
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
    
    -- Update existing bookings to have a booking code
    -- Format: VJ + 6 random alphanumeric characters
    UPDATE bookings 
    SET booking_code = 'VJ' || SUBSTRING(MD5(id::text) FROM 1 FOR 6)
    WHERE booking_code IS NULL;
    
    -- Make booking_code non-nullable
    ALTER TABLE bookings ALTER COLUMN booking_code SET NOT NULL;
  END IF;
END $do$;

-- `generate_booking_code()` lives *outside* the column guard above.
--
-- It used to be the last statement inside the `IF`, so the function's existence
-- was conditional on the column's — and the column outlives any one attempt to
-- add it. `CREATE OR REPLACE FUNCTION` is idempotent on its own, so guarding it
-- against nothing bought no safety and cost correctness: on a database where
-- the column is present and the function is not, re-running this file skipped
-- both, and `013` — which does `ALTER TABLE bookings ALTER COLUMN
-- booking_code SET DEFAULT generate_booking_code()` — aborted with
-- `ERROR: function generate_booking_code() does not exist`.
--
-- That failure is invisible afterwards. The column is already NOT NULL with no
-- default, which is exactly the shape that makes the feature impossible:
-- nothing in the application supplies `booking_code`, so every insert failed
-- with `null value in column "booking_code" of relation "bookings" violates
-- not-null constraint` — no booking could be created at all, and the endpoint
-- returns that driver error to the customer. Measured end to end on a database
-- in that state: re-running `012` recreated nothing, `013` aborted, and the
-- insert failed.
--
-- The body is 034's six-character alphanumeric generator, which supersedes the
-- `VJ`-prefixed one this file used to define; keeping one definition means a
-- `CREATE OR REPLACE` here and the one in `034` cannot drift. `013` only names
-- the function, so it resolves to whichever definition ran last.
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

-- Add booking_code to API responses and search queries
