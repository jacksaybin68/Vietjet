-- ============================================================================
-- DỮ LIỆU MẪU: CHUYẾN BAY CHIỀU ĐI (NGÀY 2026-10-20)
-- Lưu ý: Đây là dữ liệu DEMO để kiểm thử cấu trúc database.
-- Dữ liệu thực tế cần nhập từ nguồn hợp pháp (API đối tác, GDS, v.v.)
-- ============================================================================

\c vietjet_flights;

-- Lịch trình bay theo ngày (chuyến thực tế)
-- Ngày bay: 2026-10-20 (Chủ nhật)
INSERT INTO flight_schedules (flight_id, flight_date, departure_time_actual, arrival_time_actual, status, aircraft_registration) VALUES
('VJ101', '2026-10-20', '2026-10-20 13:00:00+07', '2026-10-20 14:30:00+07', 'scheduled', 'VN-A331'),
('VJ102', '2026-10-20', '2026-10-20 14:00:00+07', '2026-10-20 15:20:00+07', 'scheduled', 'VN-A332'),
('VJ103', '2026-10-20', '2026-10-20 15:00:00+07', '2026-10-20 16:20:00+07', 'scheduled', 'VN-A333'),
('VJ104', '2026-10-20', '2026-10-20 16:00:00+07', '2026-10-20 17:20:00+07', 'scheduled', 'VN-A334'),
('VJ105', '2026-10-20', '2026-10-20 17:00:00+07', '2026-10-20 18:20:00+07', 'scheduled', 'VN-A335'),
('VJ106', '2026-10-20', '2026-10-20 18:00:00+07', '2026-10-20 19:20:00+07', 'scheduled', 'VN-A336'),
('VJ107', '2026-10-20', '2026-10-20 19:00:00+07', '2026-10-20 20:20:00+07', 'scheduled', 'VN-A337'),
('VJ108', '2026-10-20', '2026-10-20 20:00:00+07', '2026-10-20 21:20:00+07', 'scheduled', 'VN-A338');

-- Giá vé cho từng chuyến bay (mỗi cột là một hạng)
-- VJ101: SGN -> HAN, 13:00 - 14:30, Airbus A321
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ101'), 'Business', 2500000, 12, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ101'), 'SkyBoss', 1800000, 8, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ101'), 'Deluxe', 1200000, 25, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ101'), 'Eco', 850000, 150, 'ECOLOW', 'Manual');

-- VJ102: HAN -> SGN, 14:00 - 15:20, Airbus A321
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ102'), 'Business', 2400000, 10, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ102'), 'SkyBoss', 1750000, 6, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ102'), 'Deluxe', 1150000, 28, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ102'), 'Eco', 820000, 160, 'ECOLOW', 'Manual');

-- VJ103: SGN -> DAD, 15:00 - 16:20, Airbus A320
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ103'), 'Business', 2200000, 8, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ103'), 'SkyBoss', 1600000, 5, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ103'), 'Deluxe', 1050000, 22, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ103'), 'Eco', 750000, 140, 'ECOLOW', 'Manual');

-- VJ104: DAD -> SGN, 16:00 - 17:20, Airbus A320
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ104'), 'Business', 2150000, 9, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ104'), 'SkyBoss', 1580000, 4, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ104'), 'Deluxe', 1020000, 24, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ104'), 'Eco', 720000, 155, 'ECOLOW', 'Manual');

-- VJ105: SGN -> CXR, 17:00 - 18:20, Boeing 787
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ105'), 'Business', 3200000, 20, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ105'), 'SkyBoss', 2500000, 15, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ105'), 'Deluxe', 1600000, 40, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ105'), 'Eco', 1100000, 200, 'ECOLOW', 'Manual');

-- VJ106: CXR -> SGN, 18:00 - 19:20, Boeing 787
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ106'), 'Business', 3100000, 18, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ106'), 'SkyBoss', 2400000, 14, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ106'), 'Deluxe', 1550000, 42, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ106'), 'Eco', 1050000, 210, 'ECOLOW', 'Manual');

-- VJ107: HAN -> DAD, 19:00 - 20:20, Airbus A321
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ107'), 'Business', 2300000, 11, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ107'), 'SkyBoss', 1700000, 7, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ107'), 'Deluxe', 1100000, 30, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ107'), 'Eco', 780000, 150, 'ECOLOW', 'Manual');

-- VJ108: DAD -> HAN, 20:00 - 21:20, Airbus A321
INSERT INTO flight_fares (schedule_id, fare_class_code, price, available_seats, fare_basis_code, source) VALUES
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ108'), 'Business', 2250000, 12, 'BIZLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ108'), 'SkyBoss', 1680000, 6, 'SKYLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ108'), 'Deluxe', 1080000, 32, 'DELLOW', 'Manual'),
((SELECT schedule_id FROM flight_schedules WHERE flight_id='VJ108'), 'Eco', 760000, 155, 'ECOLOW', 'Manual');

-- ============================================================================
-- KIỂM TRA DỮ LIỆU SAU KHI IMPORT
-- ============================================================================

SELECT * FROM v_afternoon_flights;
