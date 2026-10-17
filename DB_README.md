# HƯỚNG DẪN THIẾT LẬP CƠ SỞ DỮ LIỆU CHUYẾN BAY VIETJET

## 1. Mục đích
Lưu trữ dữ liệu "Các chuyến bay chiều đi" với các trường:
- Mã chuyến bay
- Giờ khởi hành – đến
- Máy bay
- Giá vé Business
- Giá vé SkyBoss
- Giá vé Deluxe
- Giá vé Eco

## 2. Danh sách file
| File | Mô tả |
|------|-------|
| `database_schema.sql` | Tạo bảng cơ sở dữ liệu (PostgreSQL/MySQL) |
| `seed_data.sql` | Dữ liệu mẫu chèn vào bảng |
| `etl_import.py` | Script Python import dữ liệu từ CSV/JSON vào DB |
| `sample_flights.csv` | File dữ liệu mẫu định dạng CSV |

## 3. Yêu cầu hệ thống
- PostgreSQL 14+ hoặc MySQL 8.0+
- Python 3.8+
- Thư viện Python: `psycopg2-binary` (PostgreSQL) hoặc `pymysql` (MySQL), `pandas`

## 4. Cách thực thi

### Bước 1: Tạo database và bảng
```bash
# PostgreSQL
psql -U postgres -f database_schema.sql

# MySQL
mysql -u root -p < database_schema.sql
```

### Bước 2: Chèn dữ liệu mẫu
```bash
psql -U postgres -d vietjet_flights -f seed_data.sql
```

### Bước 3: Chạy script import (nếu có file CSV riêng)
```bash
pip install psycopg2-binary pandas
python etl_import.py --file sample_flights.csv --db postgresql --host localhost --user postgres --password your_password --dbname vietjet_flights
```

## 5. Truy vấn dữ liệu mẫu
```sql
-- Xem tất cả chuyến bay chiều đi
SELECT flight_code, departure_time, arrival_time, aircraft,
       fare_business, fare_skyboss, fare_deluxe, fare_eco
FROM flight_schedules
WHERE flight_type = 'chiều'
ORDER BY departure_time;

-- Xem chuyến bay có giá Eco thấp nhất
SELECT * FROM flight_schedules
WHERE fare_eco IS NOT NULL
ORDER BY fare_eco ASC
LIMIT 5;
```

## 6. Lưu ý
- Dữ liệu trong `seed_data.sql` là dữ liệu MẪU (demo) để kiểm thử.
- Dữ liệu thực tế cần được thu thập từ nguồn hợp pháp (API đối tác, GDS, hoặc nhập thủ công từ trang web) rồi import qua `etl_import.py`.
- Không khuyến khích scrape trực tiếp trang vietjetair.com do có WAF/reCAPTCHA và vi phạm ToS.
