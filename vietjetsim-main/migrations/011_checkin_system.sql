-- 011_checkin_system.sql - Check-in System
-- Adds check-in functionality for flight bookings

-- Drop existing check_in table if exists (for idempotent migrations)
DROP TABLE IF EXISTS check_in CASCADE;

-- Create check_in table to track check-in status for passengers
CREATE TABLE IF NOT EXISTS check_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES seats(id) ON DELETE SET NULL,
  
  -- Check-in details
  check_in_number VARCHAR(20) NOT NULL UNIQUE,
  boarding_pass_number VARCHAR(20),
  seat_number VARCHAR(10) NOT NULL,
  
  -- Flight info (denormalized for quick access)
  flight_no VARCHAR(20) NOT NULL,
  from_code VARCHAR(10) NOT NULL,
  to_code VARCHAR(10) NOT NULL,
  depart_time TIMESTAMPTZ NOT NULL,
  
  -- Passenger info (denormalized)
  passenger_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(50),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  
  -- Timestamps
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_check_in_booking_id ON check_in(booking_id);
CREATE INDEX IF NOT EXISTS idx_check_in_passenger_id ON check_in(passenger_id);
CREATE INDEX IF NOT EXISTS idx_check_in_check_in_number ON check_in(check_in_number);
CREATE INDEX IF NOT EXISTS idx_check_in_boarding_pass_number ON check_in(boarding_pass_number);
CREATE INDEX IF NOT EXISTS idx_check_in_status ON check_in(status);

-- Add check-in status field to seats table if not exists
DO $$ 
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seats' AND column_name = 'check_in_status'
  ) THEN
    ALTER TABLE seats ADD COLUMN check_in_status VARCHAR(20) 
      DEFAULT 'not_checked_in' 
      CHECK (check_in_status IN ('not_checked_in', 'checked_in', 'boarded'));
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_seats_check_in_status ON seats(check_in_status);
  END IF;
END $$;

-- Add check_in_time to seats table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seats' AND column_name = 'check_in_time'
  ) THEN
    ALTER TABLE seats ADD COLUMN check_in_time TIMESTAMPTZ;
  END IF;
END $$;

-- Add is_online_check_in flag to check_in table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'check_in' AND column_name = 'is_online_check_in'
  ) THEN
    ALTER TABLE check_in ADD COLUMN is_online_check_in BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add baggage info to check_in table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'check_in' AND column_name = 'baggage_info'
  ) THEN
    ALTER TABLE check_in ADD COLUMN baggage_info JSONB;
  END IF;
END $$;

-- Add gate and terminal info
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'check_in' AND column_name = 'gate'
  ) THEN
    ALTER TABLE check_in ADD COLUMN gate VARCHAR(20);
    ALTER TABLE check_in ADD COLUMN terminal VARCHAR(20);
  END IF;
END $$;

-- Create function to generate check-in number
CREATE OR REPLACE FUNCTION generate_check_in_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  prefix TEXT := 'VJ';
  random_part TEXT;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YY');
  random_part := LPAD(CAST(FLOOR(RANDOM() * 999999) AS TEXT), 6, '0');
  RETURN prefix || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate boarding pass number
CREATE OR REPLACE FUNCTION generate_boarding_pass_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  prefix TEXT := 'BP';
  random_part TEXT;
  month_part TEXT;
BEGIN
  month_part := LPAD(TO_CHAR(CURRENT_DATE, 'MM'), 2, '0');
  random_part := LPAD(CAST(FLOOR(RANDOM() * 99999) AS TEXT), 5, '0');
  RETURN prefix || month_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update check_in_time on status change
CREATE OR REPLACE FUNCTION update_check_in_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.check_in_time := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_check_in_update ON check_in;

-- Create trigger
CREATE TRIGGER trg_check_in_update
  BEFORE UPDATE ON check_in
  FOR EACH ROW
  EXECUTE FUNCTION update_check_in_timestamp();

-- Create function to get check-in status for a booking
CREATE OR REPLACE FUNCTION get_booking_check_in_status(
  booking_id_param UUID
)
RETURNS TABLE (
  has_check_in BOOLEAN,
  check_in_id UUID,
  passenger_id UUID,
  passenger_name VARCHAR(255),
  seat_number VARCHAR(10),
  check_in_number VARCHAR(20),
  boarding_pass_number VARCHAR(20),
  status VARCHAR(20),
  check_in_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM check_in WHERE booking_id = booking_id_param) AS has_check_in,
    c.id AS check_in_id,
    c.passenger_id,
    c.passenger_name,
    c.seat_number,
    c.check_in_number,
    c.boarding_pass_number,
    c.status,
    c.check_in_time
  FROM check_in c
  WHERE c.booking_id = booking_id_param
  ORDER BY c.check_in_time DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Seed some initial data for testing (optional)
-- INSERT INTO check_in (booking_id, passenger_id, check_in_number, boarding_pass_number, seat_number, 
--   flight_no, from_code, to_code, depart_time, passenger_name, status)
-- VALUES ('uuid-here', 'passenger-uuid', 'VJ2400001', 'BP012400001', '12A', 
--   'VJ101', 'HAN', 'SGN', NOW() + INTERVAL '24 hours', 'NGUYEN VAN A', 'confirmed');
