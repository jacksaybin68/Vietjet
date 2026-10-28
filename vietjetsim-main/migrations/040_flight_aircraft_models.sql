-- 040_flight_aircraft_models.sql
-- Thêm cột aircraft vào bảng flights để hỗ trợ các dòng máy bay (Airbus A321neo, Airbus A321, Airbus A320, Airbus A330-300, Boeing 737 MAX)

ALTER TABLE flights ADD COLUMN IF NOT EXISTS aircraft VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_flights_aircraft ON flights(aircraft);
