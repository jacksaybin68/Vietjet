-- ============================================================================
-- CƠ SỞ DỮ LIỆU: CHUYẾN BAY VIETJET (CHIỀU ĐI)
-- Hệ quản trị: PostgreSQL (có thể điều chỉnh cho MySQL)
-- ============================================================================

-- Tạo database (chạy riêng nếu chưa có)
-- CREATE DATABASE vietjet_flights;
-- \c vietjet_flights;

-- Xóa bảng nếu đã tồn tại (cẩn thận trong môi trường production)
DROP TABLE IF EXISTS flight_fares CASCADE;
DROP TABLE IF EXISTS flight_schedules CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS fare_classes CASCADE;
DROP TABLE IF EXISTS aircraft_types CASCADE;
DROP TABLE IF EXISTS airports CASCADE;
DROP TABLE IF EXISTS airlines CASCADE;

-- ============================================================================
-- 1. HÀNG HẢI KHÔNG
-- ============================================================================
CREATE TABLE airlines (
    airline_code VARCHAR(10) PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    iata_code VARCHAR(3),
    icao_code VARCHAR(4),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. SÂN BAY
-- ============================================================================
CREATE TABLE airports (
    airport_code VARCHAR(10) PRIMARY KEY,
    airport_name VARCHAR(200) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100),
    timezone VARCHAR(50),
    iata_code VARCHAR(3),
    icao_code VARCHAR(4),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. LOẠI MÁY BAY
-- ============================================================================
CREATE TABLE aircraft_types (
    aircraft_code VARCHAR(20) PRIMARY KEY,
    aircraft_name VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100),
    capacity_economy INTEGER,
    capacity_business INTEGER,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 4. HẠNG VÉ / CABINE
-- ============================================================================
CREATE TABLE fare_classes (
    fare_class_code VARCHAR(20) PRIMARY KEY,
    fare_class_name VARCHAR(100) NOT NULL,
    cabin_type VARCHAR(20), -- Business / Economy
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 5. CHUYẾN BAY (LỊCH TRÌNH CỐ ĐỊNH)
-- ============================================================================
CREATE TABLE flights (
    flight_id VARCHAR(20) PRIMARY KEY,
    airline_code VARCHAR(10) REFERENCES airlines(airline_code),
    flight_number VARCHAR(10) NOT NULL,
    departure_airport VARCHAR(10) REFERENCES airports(airport_code),
    arrival_airport VARCHAR(10) REFERENCES airports(airport_code),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    aircraft_code VARCHAR(20) REFERENCES aircraft_types(aircraft_code),
    flight_duration_minutes INTEGER,
    days_of_week JSONB DEFAULT '[]', -- [1,2,3,4,5,6,7]
    flight_type VARCHAR(20) DEFAULT 'chiều', -- sáng, chiều, tối
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(flight_number, departure_airport, arrival_airport, departure_time)
);

-- ============================================================================
-- 6. LỊCH TRÌNH BAY THEO NGÀY (CHUYẾN THỰC TẾ)
-- ============================================================================
CREATE TABLE flight_schedules (
    schedule_id BIGSERIAL PRIMARY KEY,
    flight_id VARCHAR(20) REFERENCES flights(flight_id),
    flight_date DATE NOT NULL,
    departure_time_actual TIMESTAMP,
    arrival_time_actual TIMESTAMP,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, delayed, cancelled, completed
    aircraft_registration VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(flight_id, flight_date)
);

-- ============================================================================
-- 7. GIÁ VÉ THEO CHUYẾN BAY / NGÀY
-- ============================================================================
CREATE TABLE flight_fares (
    fare_id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT REFERENCES flight_schedules(schedule_id),
    fare_class_code VARCHAR(20) REFERENCES fare_classes(fare_class_code),
    price NUMERIC(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    available_seats INTEGER DEFAULT 0,
    fare_basis_code VARCHAR(20),
    conditions TEXT,
    source VARCHAR(100), -- Nguồn dữ liệu: API, Manual, Partner
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(schedule_id, fare_class_code)
);

-- ============================================================================
-- CHỈ MỤC (INDEXES) ĐỂ TỐI ƯU TRUY VẤN
-- ============================================================================
CREATE INDEX idx_flights_route ON flights(departure_airport, arrival_airport);
CREATE INDEX idx_flights_type ON flights(flight_type);
CREATE INDEX idx_schedules_date ON flight_schedules(flight_date);
CREATE INDEX idx_schedules_flight_date ON flight_schedules(flight_id, flight_date);
CREATE INDEX idx_fares_schedule ON flight_fares(schedule_id);
CREATE INDEX idx_fares_class ON flight_fares(fare_class_code);

-- ============================================================================
-- VIEW: BẢNG TÓM TẮT CHUYẾN BAY CHIỀU ĐI (DÙNG CHO BÁO CÁO / UI)
-- Các cột: Mã chuyến bay | Giờ khởi hành – đến | Máy bay | Business | SkyBoss | Deluxe | Eco
-- ============================================================================
CREATE OR REPLACE VIEW v_afternoon_flights AS
SELECT
    f.flight_id AS "Mã chuyến bay",
    f.departure_time AS "Giờ khởi hành",
    f.arrival_time AS "Giờ đến",
    f.departure_time || ' – ' || f.arrival_time AS "Giờ khởi hành – đến",
    at.aircraft_name AS "Máy bay",
    fb.price AS "Giá Business (VND)",
    fs.price AS "Giá SkyBoss (VND)",
    fd.price AS "Giá Deluxe (VND)",
    fe.price AS "Giá Eco (VND)",
    fsched.flight_date AS "Ngày bay",
    fsched.status AS "Trạng thái"
FROM flight_schedules fsched
JOIN flights f ON fsched.flight_id = f.flight_id
LEFT JOIN aircraft_types at ON f.aircraft_code = at.aircraft_code
LEFT JOIN flight_fares fb ON fsched.schedule_id = fb.schedule_id AND fb.fare_class_code = 'Business'
LEFT JOIN flight_fares fs ON fsched.schedule_id = fs.schedule_id AND fs.fare_class_code = 'SkyBoss'
LEFT JOIN flight_fares fd ON fsched.schedule_id = fd.schedule_id AND fd.fare_class_code = 'Deluxe'
LEFT JOIN flight_fares fe ON fsched.schedule_id = fe.schedule_id AND fe.fare_class_code = 'Eco'
WHERE f.flight_type = 'chiều'
ORDER BY f.departure_time;

-- ============================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (để kiểm thử nhanh, sẽ được bổ sung trong seed_data.sql)
-- ============================================================================

INSERT INTO airlines (airline_code, airline_name, iata_code, icao_code, country) VALUES
('VJ', 'Vietjet Air', 'VJ', 'VJC', 'Vietnam');

INSERT INTO airports (airport_code, airport_name, city, country, timezone, iata_code, icao_code) VALUES
('SGN', 'Tân Sơn Nhất', 'Thành phố Hồ Chí Minh', 'Vietnam', 'Asia/Ho_Chi_Minh', 'SGN', 'VVTS'),
('HAN', 'Nội Bài', 'Hà Nội', 'Vietnam', 'Asia/Ho_Chi_Minh', 'HAN', 'VVNB'),
('DAD', 'Đà Nẵng', 'Đà Nẵng', 'Vietnam', 'Asia/Ho_Chi_Minh', 'DAD', 'VVDN'),
('CXR', 'Cam Ranh', 'Nha Trang', 'Vietnam', 'Asia/Ho_Chi_Minh', 'CXR', 'VVCR'),
('HPH', 'Cát Bi', 'Hải Phòng', 'Vietnam', 'Asia/Ho_Chi_Minh', 'HPH', 'VVCI'),
('VCA', 'Cần Thơ', 'Cần Thơ', 'Vietnam', 'Asia/Ho_Chi_Minh', 'VCA', 'VVCT');

INSERT INTO aircraft_types (aircraft_code, aircraft_name, manufacturer, capacity_economy, capacity_business) VALUES
('A321', 'Airbus A321', 'Airbus', 230, 0),
('A320', 'Airbus A320', 'Airbus', 180, 0),
('B787', 'Boeing 787 Dreamliner', 'Boeing', 300, 30),
('A330', 'Airbus A330', 'Airbus', 280, 20);

INSERT INTO fare_classes (fare_class_code, fare_class_name, cabin_type, description) VALUES
('Business', 'Business', 'Business', 'Hạng thương gia'),
('SkyBoss', 'SkyBoss', 'Business', 'Hạng SkyBoss - ưu đãi cao cấp'),
('Deluxe', 'Deluxe', 'Economy', 'Hạng Deluxe -經濟 class cao cấp'),
('Eco', 'Eco', 'Economy', 'Hạng經濟 tiêu chuẩn');

COMMIT;