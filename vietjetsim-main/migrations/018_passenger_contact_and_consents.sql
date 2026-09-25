-- Contact and identity details captured during the passenger step.
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT 'VN',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email VARCHAR(254),
  ADD COLUMN IF NOT EXISTS residence VARCHAR(255),
  ADD COLUMN IF NOT EXISTS skyjoy_member_id VARCHAR(20);

-- Booking-level privacy choices. Only policy_accepted is mandatory in the UI.
CREATE TABLE IF NOT EXISTS booking_consents (
  booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  marketing BOOLEAN NOT NULL DEFAULT FALSE,
  survey BOOLEAN NOT NULL DEFAULT FALSE,
  retain_for_future_booking BOOLEAN NOT NULL DEFAULT FALSE,
  policy_accepted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
