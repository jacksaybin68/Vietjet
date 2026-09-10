-- 012_add_booking_code.sql - Add booking_code column to bookings table
-- This adds a human-readable booking code (PNR) for each booking

-- Add booking_code column to bookings table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'booking_code'
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
    
    -- Create a function to generate booking codes
    CREATE OR REPLACE FUNCTION generate_booking_code()
    RETURNS VARCHAR(20) AS $$
    DECLARE
      prefix TEXT := 'VJ';
      random_part TEXT;
      attempts INTEGER := 0;
      code TEXT;
      exists_check BOOLEAN;
    BEGIN
      LOOP
        random_part := LPAD(CAST(FLOOR(RANDOM() * 999999) AS TEXT), 6, '0');
        code := prefix || random_part;
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM bookings WHERE booking_code = code) INTO exists_check;
        
        IF NOT exists_check THEN
          RETURN code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts > 10 THEN
          -- Fallback: use longer code
          random_part := LPAD(CAST(FLOOR(RANDOM() * 99999999) AS TEXT), 8, '0');
          code := prefix || random_part;
          RETURN code;
        END IF;
      END LOOP;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$
;

-- Add booking_code to API responses and search queries
