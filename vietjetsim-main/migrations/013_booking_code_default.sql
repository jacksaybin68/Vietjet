-- 013_booking_code_default.sql
-- Wire up booking code generation.
--
-- `012_add_booking_code.sql` added `bookings.booking_code` as NOT NULL (no default)
-- and defined a `generate_booking_code()` helper, but never connected the two.
-- Nothing in the application supplies `booking_code`, so every INSERT into
-- `bookings` failed the not-null constraint and no booking could ever be created.
--
-- Defaulting the column to the helper keeps the column authoritative in the
-- database, so concurrent inserts cannot collide on the pre-check in the function.

ALTER TABLE bookings
  ALTER COLUMN booking_code SET DEFAULT generate_booking_code();
