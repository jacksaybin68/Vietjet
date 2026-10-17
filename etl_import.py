#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL Import Dữ Liệu Chuyến Bay Vietjet vào Cơ Sở Dữ Liệu

Hỗ trợ:
- PostgreSQL (psycopg2)
- MySQL (pymysql)
- Định dạng đầu vào: CSV hoặc JSON

Cách sử dụng:
    python etl_import.py --file data.csv --db postgresql --host localhost \
        --user postgres --password matkhau --dbname vietjet_flights

    python etl_import.py --file data.json --db mysql --host localhost \
        --user root --password matkhau --dbname vietjet_flights
"""

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Kết nối Database
# ---------------------------------------------------------------------------

def get_connection(db_type, host, port, user, password, dbname):
    if db_type == "postgresql":
        try:
            import psycopg2
        except ImportError:
            print("Lỗi: Cần cài đặt psycopg2-binary: pip install psycopg2-binary")
            sys.exit(1)
        return psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
        )
    elif db_type == "mysql":
        try:
            import pymysql
        except ImportError:
            print("Lỗi: Cần cài đặt pymysql: pip install pymysql")
            sys.exit(1)
        return pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=dbname,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
    else:
        print(f"Lỗi: Loại DB không hỗ trợ: {db_type}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Đọc dữ liệu từ file
# ---------------------------------------------------------------------------

def read_csv(filepath):
    rows = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def read_json(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "flights" in data:
        return data["flights"]
    if isinstance(data, list):
        return data
    raise ValueError("File JSON phải là danh sách hoặc có key 'flights'")


def read_file(filepath):
    ext = Path(filepath).suffix.lower()
    if ext == ".csv":
        return read_csv(filepath)
    elif ext == ".json":
        return read_json(filepath)
    else:
        print(f"Lỗi: Định dạng file không hỗ trợ: {ext}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Chuẩn hóa dữ liệu trước khi nhập
# ---------------------------------------------------------------------------

def normalize_row(row):
    """
    Chuẩn hóa một hàng dữ liệu từ CSV/JSON thành dict đã xử lý.
    Các trường mong đợi (theo yêu cầu người dùng):
      - flight_code: Mã chuyến bay (bắt buộc)
      - departure_time: Giờ khởi hành (HH:MM)
      - arrival_time: Giờ đến (HH:MM)
      - aircraft: Máy bay
      - fare_business: Giá Business
      - fare_skyboss: Giá SkyBoss
      - fare_deluxe: Giá Deluxe
      - fare_eco: Giá Eco
      - flight_date: Ngày bay (YYYY-MM-DD), tùy chọn
      - route: Tuyến bay (SGN-HAN), tùy chọn
    """
    def to_float(val):
        if val is None or str(val).strip() == "":
            return None
        try:
            return float(str(val).replace(".", "").replace(",", ".").strip())
        except ValueError:
            return None

    def to_int(val):
        f = to_float(val)
        return int(f) if f is not None else None

    return {
        "flight_code": str(row.get("flight_code", row.get("Mã chuyến bay", ""))).strip(),
        "departure_time": str(row.get("departure_time", row.get("Giờ khởi hành", ""))).strip(),
        "arrival_time": str(row.get("arrival_time", row.get("Giờ đến", ""))).strip(),
        "aircraft": str(row.get("aircraft", row.get("Máy bay", ""))).strip(),
        "fare_business": to_float(row.get("fare_business", row.get("Business", row.get("Giá Business", "")))),
        "fare_skyboss": to_float(row.get("fare_skyboss", row.get("SkyBoss", row.get("Giá SkyBoss", "")))),
        "fare_deluxe": to_float(row.get("fare_deluxe", row.get("Deluxe", row.get("Giá Deluxe", "")))),
        "fare_eco": to_float(row.get("fare_eco", row.get("Eco", row.get("Giá Eco", "")))),
        "flight_date": str(row.get("flight_date", row.get("Ngày bay", "2026-10-20"))).strip(),
        "route": str(row.get("route", row.get("Tuyến bay", ""))).strip(),
    }


# ---------------------------------------------------------------------------
# Import vào Database
# ---------------------------------------------------------------------------

def import_to_postgresql(conn, rows):
    cur = conn.cursor()
    inserted = 0
    errors = []

    for idx, row in enumerate(rows, start=1):
        try:
            # 1. Đảm bảo hãng hàng không tồn tại
            cur.execute("""
                INSERT INTO airlines (airline_code, airline_name, iata_code, country)
                VALUES ('VJ', 'Vietjet Air', 'VJ', 'Vietnam')
                ON CONFLICT (airline_code) DO NOTHING
            """)

            # 2. Xác định sân bay đi / đến từ route (SGN-HAN)
            dep_code = arr_code = None
            if row["route"] and "-" in row["route"]:
                parts = row["route"].split("-")
                dep_code = parts[0].strip().upper()
                arr_code = parts[1].strip().upper()
            else:
                # Mặc định nếu không có route
                dep_code = "SGN"
                arr_code = "HAN"

            # Đảm bảo sân bay tồn tại
            for code, name, city in [(dep_code, dep_code, dep_code), (arr_code, arr_code, arr_code)]:
                cur.execute("""
                    INSERT INTO airports (airport_code, airport_name, city, country, timezone, iata_code)
                    VALUES (%s, %s, %s, 'Vietnam', 'Asia/Ho_Chi_Minh', %s, NULL)
                    ON CONFLICT (airport_code) DO NOTHING
                """, (code, name, city, code))

            # 3. Đảm bảo loại máy bay tồn tại
            cur.execute("""
                INSERT INTO aircraft_types (aircraft_code, aircraft_name, manufacturer)
                VALUES (%s, %s, 'Unknown')
                ON CONFLICT (aircraft_code) DO NOTHING
            """, (row["aircraft"] or "A321", row["aircraft"] or "Airbus A321"))

            # 4. Đảm bảo hạng vé tồn tại
            for code, name, cabin in [
                ("Business", "Business", "Business"),
                ("SkyBoss", "SkyBoss", "Business"),
                ("Deluxe", "Deluxe", "Economy"),
                ("Eco", "Eco", "Economy"),
            ]:
                cur.execute("""
                    INSERT INTO fare_classes (fare_class_code, fare_class_name, cabin_type)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (fare_class_code) DO NOTHING
                """, (code, name, cabin))

            # 5. Chèn / cập nhật chuyến bay (lịch trình cố định)
            flight_id = row["flight_code"]
            cur.execute("""
                INSERT INTO flights (
                    flight_id, airline_code, flight_number,
                    departure_airport, arrival_airport,
                    departure_time, arrival_time, aircraft_code,
                    flight_type, is_active
                ) VALUES (
                    %s, 'VJ', %s, %s, %s, %s, %s, %s, 'chiều', TRUE
                )
                ON CONFLICT (flight_id) DO UPDATE SET
                    departure_airport = EXCLUDED.departure_airport,
                    arrival_airport = EXCLUDED.arrival_airport,
                    departure_time = EXCLUDED.departure_time,
                    arrival_time = EXCLUDED.arrival_time,
                    aircraft_code = EXCLUDED.aircraft_code,
                    updated_at = NOW()
            """, (
                flight_id,
                row["flight_code"],
                dep_code,
                arr_code,
                row["departure_time"],
                row["arrival_time"],
                row["aircraft"] or "A321",
            ))

            # 6. Chèn lịch trình theo ngày
            flight_date = row["flight_date"]
            cur.execute("""
                INSERT INTO flight_schedules (flight_id, flight_date, status)
                VALUES (%s, %s, 'scheduled')
                ON CONFLICT (flight_id, flight_date) DO UPDATE SET
                    status = EXCLUDED.status,
                    updated_at = NOW()
                RETURNING schedule_id
            """, (flight_id, flight_date))
            schedule_id = cur.fetchone()[0]

            # 7. Chèn giá vé cho từng hạng
            fare_map = {
                "Business": row["fare_business"],
                "SkyBoss": row["fare_skyboss"],
                "Deluxe": row["fare_deluxe"],
                "Eco": row["fare_eco"],
            }

            for fare_class_code, price in fare_map.items():
                if price is None:
                    continue
                cur.execute("""
                    SELECT fc.fare_class_code
                    FROM fare_classes fc
                    WHERE fc.fare_class_code = %s
                """, (fare_class_code,))
                if cur.fetchone() is None:
                    continue

                cur.execute("""
                    INSERT INTO flight_fares (
                        schedule_id, fare_class_code, price,
                        currency, available_seats, source, last_updated
                    ) VALUES (%s, %s, %s, 'VND', 0, 'CSV Import', NOW())
                    ON CONFLICT (schedule_id, fare_class_code) DO UPDATE SET
                        price = EXCLUDED.price,
                        source = EXCLUDED.source,
                        last_updated = EXCLUDED.last_updated
                """, (schedule_id, fare_class_code, price))

            inserted += 1

        except Exception as e:
            errors.append(f"Hàng {idx} ({row.get('flight_code','?')}): {e}")
            conn.rollback()
            continue

    conn.commit()
    cur.close()
    return inserted, errors


def import_to_mysql(conn, rows):
    cur = conn.cursor()
    inserted = 0
    errors = []

    for idx, row in enumerate(rows, start=1):
        try:
            # 1. Hãng hàng không
            cur.execute("""
                INSERT INTO airlines (airline_code, airline_name, iata_code, country)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE airline_code=airline_code
            """, ("VJ", "Vietjet Air", "VJ", "Vietnam"))

            # 2. Sân bay
            dep_code = arr_code = None
            if row["route"] and "-" in row["route"]:
                parts = row["route"].split("-")
                dep_code = parts[0].strip().upper()
                arr_code = parts[1].strip().upper()
            else:
                dep_code = "SGN"
                arr_code = "HAN"

            for code, name, city in [(dep_code, dep_code, dep_code), (arr_code, arr_code, arr_code)]:
                cur.execute("""
                    INSERT INTO airports (airport_code, airport_name, city, country, timezone, iata_code)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE airport_code=airport_code
                """, (code, name, city, "Vietnam", "Asia/Ho_Chi_Minh", code))

            # 3. Loại máy bay
            cur.execute("""
                INSERT INTO aircraft_types (aircraft_code, aircraft_name, manufacturer)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE aircraft_code=aircraft_code
            """, (row["aircraft"] or "A321", row["aircraft"] or "Airbus A321", "Unknown"))

            # 4. Hạng vé
            for code, name, cabin in [
                ("Business", "Business", "Business"),
                ("SkyBoss", "SkyBoss", "Business"),
                ("Deluxe", "Deluxe", "Economy"),
                ("Eco", "Eco", "Economy"),
            ]:
                cur.execute("""
                    INSERT INTO fare_classes (fare_class_code, fare_class_name, cabin_type)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE fare_class_code=fare_class_code
                """, (code, name, cabin))

            # 5. Chuyến bay
            flight_id = row["flight_code"]
            cur.execute("""
                INSERT INTO flights (
                    flight_id, airline_code, flight_number,
                    departure_airport, arrival_airport,
                    departure_time, arrival_time, aircraft_code,
                    flight_type, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    departure_airport=VALUES(departure_airport),
                    arrival_airport=VALUES(arrival_airport),
                    departure_time=VALUES(departure_time),
                    arrival_time=VALUES(arrival_time),
                    aircraft_code=VALUES(aircraft_code),
                    updated_at=NOW()
            """, (
                flight_id, "VJ", row["flight_code"],
                dep_code, arr_code,
                row["departure_time"], row["arrival_time"],
                row["aircraft"] or "A321", "chiều", True,
            ))

            # 6. Lịch trình theo ngày
            flight_date = row["flight_date"]
            cur.execute("""
                INSERT INTO flight_schedules (flight_id, flight_date, status)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE status=VALUES(status), updated_at=NOW()
            """, (flight_id, flight_date, "scheduled"))

            # Lấy schedule_id (MySQL: LAST_INSERT_ID không reliable sau upsert, nên query lại)
            cur.execute("""
                SELECT schedule_id FROM flight_schedules
                WHERE flight_id=%s AND flight_date=%s
            """, (flight_id, flight_date))
            schedule_id = cur.fetchone()["schedule_id"]

            # 7. Giá vé
            fare_map = {
                "Business": row["fare_business"],
                "SkyBoss": row["fare_skyboss"],
                "Deluxe": row["fare_deluxe"],
                "Eco": row["fare_eco"],
            }
            for fare_class_code, price in fare_map.items():
                if price is None:
                    continue
                cur.execute("""
                    INSERT INTO flight_fares (
                        schedule_id, fare_class_code, price,
                        currency, available_seats, source, last_updated
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        price=VALUES(price),
                        source=VALUES(source),
                        last_updated=VALUES(last_updated)
                """, (
                    schedule_id, fare_class_code, price,
                    "VND", 0, "CSV Import", datetime.now(),
                ))

            inserted += 1

        except Exception as e:
            errors.append(f"Hàng {idx} ({row.get('flight_code','?')}): {e}")
            conn.rollback()
            continue

    conn.commit()
    cur.close()
    return inserted, errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Import dữ liệu chuyến bay Vietjet vào DB")
    parser.add_argument("--file", required=True, help="Đường dẫn file CSV/JSON")
    parser.add_argument("--db", required=True, choices=["postgresql", "mysql"], help="Loại CSDL")
    parser.add_argument("--host", default="localhost", help="Host database")
    parser.add_argument("--port", type=int, default=5432, help="Port database")
    parser.add_argument("--user", required=True, help="User database")
    parser.add_argument("--password", required=True, help="Password database")
    parser.add_argument("--dbname", required=True, help="Tên database")
    args = parser.parse_args()

    # Đọc file
    print(f"[INFO] Đọc file: {args.file}")
    raw_rows = read_file(args.file)
    print(f"[INFO] Tìm thấy {len(raw_rows)} bản ghi")

    # Chuẩn hóa
    rows = [normalize_row(r) for r in raw_rows]

    # Kết nối
    print(f"[INFO] Kết nối {args.db} tại {args.host}:{args.port} ...")
    conn = get_connection(args.db, args.host, args.port, args.user, args.password, args.dbname)

    # Import
    print(f"[INFO] Bắt đầu import vào {args.db}...")
    if args.db == "postgresql":
        inserted, errors = import_to_postgresql(conn, rows)
    else:
        inserted, errors = import_to_mysql(conn, rows)

    conn.close()

    # Báo cáo
    print(f"\n[KẾT QUẢ] Đã import thành công: {inserted} / {len(rows)} bản ghi")
    if errors:
        print(f"[LỖI] Có {len(errors)} bản ghi bị lỗi:")
        for err in errors:
            print(f"  - {err}")
    else:
        print("[LỖI] Không có lỗi nào.")


if __name__ == "__main__":
    main()
