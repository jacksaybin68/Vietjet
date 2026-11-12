CREATE UNIQUE INDEX IF NOT EXISTS idx_seats_flight_seat_unique
  ON seats (flight_id, seat_number)
  WHERE booking_id IS NOT NULL;
