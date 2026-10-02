-- Store what each booked seat and ancillary actually cost.
--
-- Until now the server took `total_price` from the browser, so a client could
-- post 1 and buy a seat for one đồng. The fare is now priced from
-- `flights.price`, but the seat and service parts are still unpriced on the
-- server: `seats` recorded only a number, and the chosen ancillaries were never
-- persisted at all. Both columns close that gap — `createBooking` fills them, and
-- the total is summed from these rows rather than trusted from the client.

-- What a seat was sold for. NULL on rows that predate this migration: those
-- bookings were priced before the server owned the number, and back-filling
-- them would invent a price history.
ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2);

-- Seats that already belong to a booking have no stored price, so the total of
-- an old booking cannot be re-derived from its rows. `0` rather than NULL marks
-- that state, and the booking's own `total_price` remains the record for it.
UPDATE seats
SET price = 0
WHERE booking_id IS NOT NULL AND price IS NULL;

-- The services bought on a booking (baggage, meal, insurance, …). Keyed by the
-- stable option id from `ANCILLARY_OPTIONS` so the price can be recomputed
-- without trusting a client-supplied amount.
CREATE TABLE IF NOT EXISTS booking_ancillaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  -- Mirrors the keys of `ANCILLARY_OPTIONS` in features/bookings/pricing.ts.
  option_id VARCHAR(50) NOT NULL,
  -- Price per passenger, before tax, in VND.
  unit_price NUMERIC(12, 2) NOT NULL,
  -- How many passengers it applies to (infants are not charged for services).
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_ancillaries_booking
  ON booking_ancillaries (booking_id);
