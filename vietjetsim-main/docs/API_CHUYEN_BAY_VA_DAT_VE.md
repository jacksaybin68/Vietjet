# 📖 Tài liệu API — Bước 1: Tìm kiếm & Chọn Chuyến bay (Vietjet Air Simulator)

Tài liệu này cung cấp đặc tả kỹ thuật chi tiết cho **Bước 1 (Tìm kiếm và chọn chuyến bay)** và **Quy tắc cấu trúc giá vé** của hệ thống Vietjet Air Simulator.

---

## 1. Lấy Danh sách Sân bay (Điểm đi / Điểm đến)

Dùng để nạp danh sách các sân bay quốc nội và quốc tế cho bộ chọn điểm khởi hành và điểm đến.

- **Endpoint:** `GET /api/san-bay`
- **Quyền truy cập:** Công khai (`public`)
- **Headers:** `Accept: application/json`

### Dữ liệu trả về (JSON Response)
```json
{
  "airports": [
    {
      "code": "HAN",
      "city": "Hà Nội",
      "airport": "Sân bay Quốc tế Nội Bài",
      "country": "Việt Nam"
    },
    {
      "code": "SGN",
      "city": "Hồ Chí Minh",
      "airport": "Sân bay Quốc tế Tân Sơn Nhất",
      "country": "Việt Nam"
    },
    {
      "code": "DAD",
      "city": "Đà Nẵng",
      "airport": "Sân bay Quốc tế Đà Nẵng",
      "country": "Việt Nam"
    },
    {
      "code": "CXR",
      "city": "Nha Trang",
      "airport": "Sân bay Quốc tế Cam Ranh",
      "country": "Việt Nam"
    },
    {
      "code": "PQC",
      "city": "Phú Quốc",
      "airport": "Sân bay Quốc tế Phú Quốc",
      "country": "Việt Nam"
    }
  ]
}
```

---

## 2. Tìm kiếm Chuyến bay theo Chặng & Ngày

Truy vấn danh sách chuyến bay thỏa mãn điều kiện chặng bay, ngày khởi hành và hạng vé.

- **Endpoint:** `GET /api/chuyen-bay`
- **Query Parameters:**
  - `from` *(bắt buộc)*: Mã IATA sân bay đi (VD: `HAN`, `SGN`).
  - `to` *(bắt buộc)*: Mã IATA sân bay đến (VD: `SGN`, `DAD`).
  - `date` *(tùy chọn)*: Ngày bay định dạng `YYYY-MM-DD` theo giờ địa phương Việt Nam (+07:00).
  - `class` *(tùy chọn)*: Khoang bay (`economy` hoặc `business`).

### Ví dụ Request:
```bash
curl "http://localhost:4028/api/chuyen-bay?from=HAN&to=SGN&date=2026-11-20"
```

### Dữ liệu trả về (JSON Response):
Hệ thống trả về danh sách các chuyến bay kèm **đầy đủ 4 mức giá tương ứng 4 hạng vé**:
```json
{
  "flights": [
    {
      "id": "VJ101",
      "flight_no": "VJ101",
      "flightNo": "VJ101",
      "from_code": "HAN",
      "from": "HAN",
      "to_code": "SGN",
      "to": "SGN",
      "depart_time": "2026-11-20T06:00:00+07:00",
      "departTime": "2026-11-20T06:00:00+07:00",
      "arrive_time": "2026-11-20T08:10:00+07:00",
      "arriveTime": "2026-11-20T08:10:00+07:00",
      "aircraft": "Airbus A321",
      "available": 150,
      "status": "scheduled",
      "gate": "12",
      "terminal": "T1",

      "price": 850000,
      "economy_price": 900000,
      "business_price": 2700000,

      "economyPrice": 900000,
      "ecoPrice": 900000,
      "deluxePrice": 1500000,
      "skybossPrice": 2100000,
      "businessPrice": 2700000,

      "fares": {
        "eco": 900000,
        "deluxe": 1500000,
        "skyboss": 2100000,
        "business": 2700000
      }
    }
  ]
}
```

*Trường hợp ngày yêu cầu không có chuyến bay, API sẽ trả về danh sách các ngày lân cận có chuyến (`availableDates`):*
```json
{
  "flights": [],
  "availableDates": ["2026-11-21", "2026-11-22", "2026-11-25"]
}
```

---

## 3. Quy chuẩn Tính Giá vé (Pricing Rules)

Module tính giá trung tâm (`src/features/bookings/pricing.ts`) áp dụng các quy chuẩn thống nhất:

### 3.1 Bậc thang 4 hạng vé (`getFareForClass`)
Bảng `flights` lưu 2 mốc giá: `economy_price` và `business_price`. Khoảng cách được chia làm 3 bậc:
$$\text{step} = \frac{\text{businessPrice} - \text{economyPrice}}{3}$$

- **Eco:** `= economyPrice`
- **Deluxe:** `= economyPrice + step`
- **SkyBoss:** `= economyPrice + (step \times 2)`
- **Business:** `= businessPrice`

### 3.2 Tỷ lệ theo đối tượng hành khách
- **Người lớn (Adult):** 100% giá vé hạng chọn.
- **Trẻ em (Child, 2 – 11 tuổi):** 75% giá vé người lớn.
- **Em bé (Infant, dưới 2 tuổi):** 0₫ (Miễn phí vé và miễn thuế sân bay).

### 3.3 Thuế và phí sân bay
- **Tỷ lệ:** 15% (`TAX_AND_FEE_RATE = 0.15`).
- Tính trên tổng tiền vé của hành khách có ghế (Người lớn + Trẻ em).

### 3.4 Phí chọn ghế ngồi (`getSeatCharge`)
- **Hàng 1 – 3 (Business):** 350.000₫
- **Hàng 4 – 10 (Ghế nóng / Phía trước):** 70.000₫
- **Hàng 11 – 20 (Ghế tiêu chuẩn):** 55.000₫
- **Hàng 21 trở đi:** 45.000₫

### 3.5 Dịch vụ bổ trợ (Ancillaries)
- **Hành lý ký gửi:** Gói chuẩn 150.000₫ (hoặc các gói 200.000₫ – 750.000₫ từ 20kg đến 70kg).
- **Suất ăn nóng:** 100.000₫ / suất.
- **Bảo hiểm chuyến bay (Travel Safe):** 60.000₫ – 72.000₫.

---

## 4. Ví dụ Code Tích hợp (JavaScript / TypeScript)

```typescript
// 1. Lấy danh sách chuyến bay HAN -> SGN
async function searchFlights(from: string, to: string, date: string) {
  const url = `/api/chuyen-bay?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.flights;
}

// 2. Lấy giá vé theo từng hạng
function displayFlightFares(flight: any) {
  console.log(`Chuyến bay: ${flight.flightNo} (${flight.from} -> ${flight.to})`);
  console.log(`- Giá Eco:      ${flight.fares.eco.toLocaleString('vi-VN')}₫`);
  console.log(`- Giá Deluxe:   ${flight.fares.deluxe.toLocaleString('vi-VN')}₫`);
  console.log(`- Giá SkyBoss:  ${flight.fares.skyboss.toLocaleString('vi-VN')}₫`);
  console.log(`- Giá Business: ${flight.fares.business.toLocaleString('vi-VN')}₫`);
}
```

