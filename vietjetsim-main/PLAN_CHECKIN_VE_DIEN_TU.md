# PHƯƠNG ÁN NÂNG CẤP — CHECK-IN ONLINE & QUẢN LÝ ĐẶT CHỖ

**Ngày soạn:** 14/11/2026
**Phạm vi:** `/lam-thu-tuc` (check-in online) · `/chuyen-bay-cua-toi` (quản lý đặt chỗ) · gửi email hoá đơn + vé điện tử PDF
**Dự án:** `vietjetsim-main` (Next.js 16 / React 19 / TypeScript / Tailwind / Neon Postgres)
**Ngôn ngữ tài liệu:** Tiếng Việt

---

## 0. TÓM TẮT ĐIỀU HÀNH (Executive summary)

Bốn năng lực được yêu cầu, mức độ khả thi và vị trí thực hiện:

| # | Năng lực | Trạng thái hiện tại | Mức độ | Mốc |
|---|----------|--------------------|--------|------|
| A | Check-in online: tìm mã đặt chỗ khứ hồi, check-in từng chặng / cả 2 chặng | Chặng về là `bookings` row **không liên kết** với chặng đi trong DB | Cao | M2 |
| B | Thẻ lên máy bay điện tử (E-Boarding Pass) có QR/Barcode sắc nét, tải về điện thoại | Thẻ thật **đã có** (`EBoardingPass.tsx` + `e-ticket.ts`), nhưng `/lam-thu-tuc` chỉ vẽ **icon giả**; chưa có PDF; chưa gắn ghế theo hành khách | Cao | M3 |
| C | `/chuyen-bay-cua-toi`: hiện cả 2 chặng + lịch trình thời gian thực | SSE trạng thái chuyến bay **đã có**; thiếu mối liên kết 2 chặng; thiếu hành động mua thêm hành lý / đổi ghế | Trung bình | M4 |
| D | Tự động gửi email hoá đơn + vé điện tử **kèm file PDF** sau thanh toán | Email đã tự gửi (`payment-invoice.ts`) nhưng **chỉ HTML, không kèm file**; `sendMail` không hỗ trợ `attachments`; chưa có thư viện sinh PDF | Trung bình | M5 |

**Ước tính tổng: 24,75–28,75 ngày công** (M1 đến M6), không tính thời gian chờ review.

**Quyết định đã chốt (14/11/2026):**
- Cửa sổ check-in **bắt buộc**: mở từ **24h trước giờ bay**, đóng **60 phút trước giờ bay**; **mỗi chặng tính riêng** theo giờ bay của chặng đó. Không có cờ bypass.
- Mua thêm hành lý sau khi đặt vé: **thanh toán ngay** qua ví/thẻ.
- Được phép **commit file font KoHo (`.ttf`)** vào `public/fonts/` để nhúng vào PDF.
- PDF vé điện tử: **một file** gồm cả 2 chặng (mỗi chặng 1 trang A4).
- Chặng về giữ **PNR riêng**, tra cứu theo `trip_id` (một PNR tra ra cả trip).

**Ba phụ thuộc bên ngoài phải xử lý trước M3/M5 (nếu không, cả hai mốc đều chặn):**

1. **Font KoHo chưa có file cục bộ.** `public/fonts/` chỉ có 3 file Jambono. KoHo đang được nạp bằng `<link>` Google Fonts trong `src/app/layout.tsx` ⇒ **không nhúng được vào PDF** (PDF cần TTF nhúng). Phải commit file `.ttf` KoHo vào `public/fonts/`.
2. **Chưa có thư viện sinh PDF.** `puppeteer-core` cần Chrome — image Docker (`node:20-alpine`) không có Chrome ⇒ không dùng được cho server-side PDF. Phải thêm `pdfkit` (+ `@types/pdfkit`).
3. **Quan hệ 2 chặng khứ hồi phải được đặt trong DB**, không chỉ trong `sessionStorage`. Đây là thay đổi schema ⇒ cần migration mới (chạy được trên DB đang vận hành, không phá dữ liệu cũ).

---

## 1. HIỆN TRẠNG — ĐO ĐẠC CHÍNH XÁC

### 1.1 `/lam-thu-tuc` (online check-in)

| Mục | Thực tế trong code |
|-----|-------------------|
| Tìm kiếm | `GET /api/checkin?bookingCode=&lastName=&firstName=` → `searchCheckIn()` (`src/lib/db.ts:3695`). Yêu cầu **bắt buộc Họ**; so khớp tên không phân biệt dấu/hoa thường |
| Xác nhận | `POST /api/checkin` (`src/app/api/checkin/route.ts`) — cần **session đăng nhập** + CSRF + kiểm tra sở hữu booking + `booking.status === 'confirmed'` + flight chưa `departed/completed/cancelled` |
| Chọn ghế | `CheckInSeatModal.tsx` → `SeatMap` + SSE `/api/sse/ghe-ngoi` + khoá ghế `/api/ghe/khoa` (10 phút). **Chỉ cập nhật state client, chưa ghi vào `seats` của booking** |
| Thẻ lên máy bay | `<MdQrCode2 className="text-8xl" />` — **icon, không phải mã QR thật** (`src/app/lam-thu-tuc/page.tsx:801`) |
| Mã vạch | **Không có** trên trang này |
| Download về điện thoại | Chỉ có `window.print()` — không sinh file |

**Khoảng trống A (khứ hồi):** `searchCheckIn` trả về **một** booking. Chặng về nằm ở `bookings` row khác, do `POST /api/dat-ve` tạo thêm (`src/app/api/dat-ve/route.ts:377-389`) với `total_price = 0`, và liên kết chỉ tồn tại ở response (`return_booking_id`) + `sessionStorage` (`FlightBookingClient.tsx:444`). Không có cột nào trong `bookings` nối hai chặng ⇒ không thể "check-in riêng cho từng chặng".

**Khoảng trống B (boarding pass):** `check_in` có `boarding_pass_number`, nhưng payload QR/BCBP chưa tồn tại. Thẻ thật đã nằm ở `src/features/payments/e-ticket.ts` (`buildBoardingQrContent`, `code39Svg`) và `src/features/payments/components/EBoardingPass.tsx` — chỉ chưa được dùng lại ở trang check-in.

### 1.2 `/chuyen-bay-cua-toi` (quản lý đặt chỗ)

- Danh sách: `listBookings({limit:100})` → `GET /api/dat-ve` → `getBookingsByUserId` (`src/lib/db.ts:859`).
- Mỗi thẻ hiển thị **một chặng** (`getFlight(b)` lấy `b.flight` / `b.flights[0]`).
- Check-in status được gọi **N+1**: mỗi booking một request `/api/checkin/status/[bookingId]`.
- **Sai lệch hiển thị PNR:** dòng `Đặt chỗ: {b.id}` in **UUID** thay vì `booking_code` (`src/app/chuyen-bay-cua-toi/page.tsx:817`). Điều này vi phạm quy ước ghi trong `AGENTS.md` ("Never print a row id where a customer is shown a reference").
- **Chưa có** hành động mua thêm hành lý ký gửi / chọn lại ghế sau khi đặt vé.
- **Chưa có** SSE trạng thái chuyến bay (hook `useFlightStatusSSE` đã có nhưng chỉ dùng ở `/tim-ve`).
- Tab "Vé điện tử (VDT)" **sinh mã giả** (`VDT-` + hash của UUID) chứ không phải vé thật.

### 1.3 Email hoá đơn & vé điện tử

- `src/lib/payment-invoice.ts` → `sendAutomaticPaymentInvoiceEmail(bookingId)`:
  - Cờ bật/tắt: `system_config.auto_send_payment_invoice_email` + `email_notifications` (mặc định **bật**).
  - Gửi qua `sendBookingConfirmationEmail` → `sendPaymentSuccessEmail` → `sendMail` → nodemailer.
  - **Chỉ HTML, không kèm file.** `sendMail` không có trường `attachments` (`src/lib/mail.ts:86-112`).
- Điểm gọi hiện có: `POST /api/thanh-toan` (`src/app/api/thanh-toan/route.ts:501`), webhook VietQR (`.../webhook/vietqr/route.ts:149`), admin xác nhận (`/api/quan-tri/dat-ve/hoa-don`, `/api/quan-tri/dat-ve`, `/api/quan-tri/giao-dich`).
- **Chỉ chặng đi được gửi** — chặng về không có hoá đơn riêng và không được nhắc trong email.

### 1.4 Hai lỗi tiền ẩn phát hiện khi rà soát (sẽ sửa trong phạm vi việc này)

| Lỗi | Vị trí | Hậu quả |
|-----|--------|----------|
| `SELECT ... seat_code FROM passengers` — cột **không tồn tại** | `src/lib/payment-invoice.ts:102`, `src/app/api/quan-tri/dat-ve/gui-mail/route.ts:68` | Trong `payment-invoice.ts` lỗi bị nuốt bởi `try/catch` ⇒ `passengersList = []` ⇒ **email hoá đơn không có tên hành khách**. Trong `gui-mail/route.ts` không có `try/catch` ⇒ **500** |
| `passengers` không lưu ghế | schema `000_core_schema.sql:49-57` | Không ánh xạ được hành khách → ghế ⇒ boarding pass theo từng khách không sinh được; đổi ghế sau khi đặt cũng không có chỗ ghi |

---

## 2. KIẾN TRÚC ĐÍCH

```
                    ┌──────────────────────────────┐
   Khách           │  /lam-thu-tuc                │   /chuyen-bay-cua-toi
                    │  • tìm PNR khứ hồi          │   • Trip card 2 chặng
                    │  • chọn chặng để check-in     │   • timeline + SSE thời gian thực
                    │  • boarding pass QR/BC       │   • mua thêm hành lý / đổi ghế
                    └───────┬──────────────┬───────┘   └──────────┬──────────────┘
                            │              │                      │
              ┌─────────────▼──────┐  ┌────▼───────────────┐  ┌───▼────────────────────┐
              │ /api/checkin       │  │ /api/dat-ve/[id]   │  │ /api/dat-ve/[id]/…    │
              │  GET (tra cứu trip) │  │  GET (trip + dịch  │  │  /dich-vu  (mua thêm) │
              │  POST (check-in)    │  │       vụ)           │  │  /ghe      (đổi ghế)  │
              └─────────┬──────────┘  └────┬───────────────┘  └───┬────────────────────┘
                        │                  │                      │
                        └─────────┬────────┴──────────────────────┘
                                  │
                    ┌─────────────▼──────────────────────────────┐
                    │  src/lib/db.ts  (nguồn sự thật duy nhất)    │
                    │  src/features/bookings/pricing.ts (giá)     │
                    │  src/features/payments/e-ticket.ts (QR/BC)  │
                    └─────────────┬──────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────────────────────┐
                    │  src/lib/boarding-pass-pdf.ts  (PDF)       │
                    │  src/lib/mail.ts  (attachments)             │
                    │  src/lib/payment-invoice.ts (gửi kèm PDF)   │
                    └────────────────────────────────────────────┘
```

**Nguyên tắc bất di bất dịch (theo `AGENTS.md`):**

- **Server sở hữu mọi con số.** Giá hành lý, giá ghế, tổng tiền đều tính lại ở server từ `pricing.ts`; client chỉ gửi *danh sách id* (option/package/seat).
- **Mọi route booking-scoped phải kiểm tra sở hữu** (`booking.user_id === user.userId` hoặc admin), không chỉ kiểm tra đã đăng nhập.
- **Client gọi API qua `apiRequest`** (`@/shared/services`) để kèm CSRF; dùng `getApiErrorMessage(error, fallback)` cho toast.
- **PNR so sánh không phân biệt hoa thường** (`UPPER()` cả hai vế) — PNR 6 ký tự alphanumeric.
- **Mọi mốc thời gian đọc/ghi theo lịch Việt Nam** (`toVietnamWallClock`), không dựa vào `new Date()`.
- **Migration phải re-applyable**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guard `information_schema` có `table_schema = current_schema()`, **không** `DROP TABLE` để "idempotent".

---

## 3. MÔ HÌNH DỮ LIỆU MỚI

### 3.1 Migration `045_trip_legs_and_passenger_seats.sql`

```sql
-- 1) Gộp 2 chặng khứ hồi thành một "trip"
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS trip_id UUID,
  ADD COLUMN IF NOT EXISTS leg_role VARCHAR(10);   -- 'outbound' | 'inbound'

-- Backfill: mỗi booking đơn lẻ tự thành một trip 1 chặng.
UPDATE bookings
   SET trip_id = id, leg_role = 'outbound'
 WHERE trip_id IS NULL;

-- trip_id NOT NULL + FK tới bookings(id) (chính nó là chặng đi)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                  WHERE constraint_name = 'bookings_trip_id_fkey'
                    AND conrelid = 'bookings'::regclass) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_trip_id_fkey
      FOREIGN KEY (trip_id) REFERENCES bookings(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE bookings
  ALTER COLUMN trip_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN leg_role SET DEFAULT 'outbound';

-- CHECK constraint: giá trị hợp lệ
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_leg_role_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_leg_role_check
  CHECK (leg_role IS NULL OR leg_role IN ('outbound','inbound'));
```

> **Lưu ý bắt buộc (theo `AGENTS.md`):** `NOT VALID` → sửa dữ liệu → `VALIDATE`. Và **bổ sung `bookings` vào `OPERATING_TABLES_SQL`** trong `scripts/test-migrations.cjs` — nếu không, bảng mang dữ liệu khách hàng vẫn là **bảng không được đo**, đúng như bài học `check_in`/`announcements`/`chat_conversations` đã ghi.

### 3.2 Migration `046_passenger_seats_and_services.sql`

```sql
-- 1) Ghế của từng hành khách (hiện `seats` chỉ gắn booking, không gắn người)
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS seat_number VARCHAR(10);

-- 2) Bảng dịch vụ mua thêm sau khi đặt vé (hành lý theo gói, theo chặng)
CREATE TABLE IF NOT EXISTS booking_baggage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  package_id VARCHAR(20) NOT NULL,       -- 'bg-20' | 'bg-30' | ... | 'hlqk-30'
  weight_kg INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,      -- giá server tự tính, KHÔNG tin client
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, package_id)
);

-- 3) Nhật ký đổi ghế (audit + tính lại giá)
CREATE TABLE IF NOT EXISTS booking_seat_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
  old_seat VARCHAR(10),
  new_seat VARCHAR(10) NOT NULL,
  price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Bỏ UNIQUE cũ trên booking_ancillaries? KHÔNG — giữ nguyên (mốc cũ).
--    Dịch vụ mua thêm đi qua booking_baggage, giá rõ ràng theo gói kg.
```

> `booking_ancillaries` có `UNIQUE (booking_id, option_id)` và `option_id` chỉ nhận 3 giá trị cố định (`baggage|meal|insurance`). Gói hành lý theo kg (`bg-20`…`hlqk-30`) không vừa shape đó ⇒ **bảng mới**, không sửa bảng cũ (giữ nguyên lịch sử).

### 3.3 Ràng buộc nghiệp vụ

| Quy tắc | Nơi thực thi |
|---------|--------------|
| Chặng về không được check-in trước chặng đi | `POST /api/checkin` kiểm tra trạng thái chặng đi (đã `confirmed`) |
| **Cửa sổ check-in: mở 24h trước giờ bay, đóng 60 phút trước giờ bay — BẮT BUỘC** | `POST /api/checkin` — mốc thời gian lấy theo **giờ bay của từng chặng** (chặng về có cửa sổ 24h riêng theo giờ bay chặng về). Vượt trước → `422` + thông điệp "Check-in mở từ {mốc}"; quá muộn → `422` + "Đã đóng check-in từ {mốc}" |
| Cửa sổ tính theo **giờ bay thực tế của chặng**, theo lịch Việt Nam | `toVietnamWallClock` + so sánh với `scheduled_departure` (không dùng `new Date()`) |
| 1 hành khách = 1 dòng `check_in` | Unique index `(booking_id, passenger_id) WHERE passenger_id IS NOT NULL` |
| Không check-in lại 2 lần | `POST /api/checkin` trả 409 + `checkInNumber` sẵn có (hiện trả 400 — đổi sang 409 để client phân biệt "đã check-in" với "lỗi") |

---

## 4. KẾ HOẠCH THỰC HIỆN (WBS)

> Ước tính theo "ngày công" (1 ngày ≈ 6–8 giờ focus). Không tính thời gian chờ review/CI.

### Mốc 1 — Nền tảng dữ liệu & giá (2,5 ngày)

| ID | Công việc | File | Ước tính |
|----|-----------|------|----------|
| M1.1 | Migration `045_trip_legs_and_passenger_seats.sql` (trip_id, leg_role, backfill, FK `NOT VALID` → `VALIDATE`) | `migrations/045_*.sql` | 0,5 ngày |
| M1.2 | Migration `046_passenger_seats_and_services.sql` (`passengers.seat_number`, `booking_baggage`, `booking_seat_changes`) | `migrations/046_*.sql` | 0,5 ngày |
| M1.3 | Nối 2 chặng khi đặt vé: `POST /api/dat-ve` gán `trip_id` chung + `leg_role` cho chặng về; `createBooking` nhận `trip_id`/`leg_role` | `src/app/api/dat-ve/route.ts`, `src/lib/db.ts` | 0,5 ngày |
| M1.4 | Backfill `trip_id`/`leg_role` cho dữ liệu cũ (trong migration, idempotent) + index `idx_bookings_trip` | `migrations/045_*.sql` | 0,25 ngày |
| M1.5 | Sửa 2 lỗi `seat_code` → cột `seat_number` thật; bỏ `try/catch` nuốt lỗi, thay bằng log cảnh báo | `src/lib/payment-invoice.ts`, `src/app/api/quan-tri/dat-ve/gui-mail/route.ts` | 0,25 ngày |
| M1.6 | Bổ sung `bookings`, `booking_baggage`, `booking_seat_changes` vào `OPERATING_TABLES_SQL` + canary trong `scripts/test-migrations.cjs` | `scripts/test-migrations.cjs` | 0,5 ngày |

**Điều kiện nghiệm thu:** `npm run test:migrations` xanh 4 pass; mọi booking cũ có `trip_id` khác NULL; `bookings.leg_role` chỉ nhận 2 giá trị.

### Mốc 2 — Check-in online: khứ hồi & check-in theo chặng (4,5 ngày)

| ID | Công việc | File | Ước tính |
|----|-----------|------|----------|
| M2.1 | `db.ts`: `getTripByCodeOrId()` — tra **cả 2 chặng** theo PNR (không phân biệt chặng nào khách nhớ) | `src/lib/db.ts` | 0,5 ngày |
| M2.2 | `GET /api/checkin` trả về `trip: { outbound, inbound }` + `hasCheckIn` **riêng từng chặng** + thông tin chuyến bay (số hiệu, giờ, cổng, nhà ga) | `src/app/api/checkin/route.ts`, `src/lib/db.ts` | 0,75 ngày |
| M2.3 | `POST /api/checkin`: nhận `leg: 'outbound' | 'inbound' | 'both'` + `passengers[]`; check-in **từng hành khách** (1 dòng `check_in` / người), giữ `bookingId` = UUID nội bộ | `src/app/api/checkin/route.ts`, `src/lib/db.ts` | 1 ngày |
| M2.4 | Chặn check-in chặng về khi chặng đi chưa `confirmed`; trả 409 kèm mã chặng đi để UI hướng dẫn | `src/app/api/checkin/route.ts` | 0,25 ngày |
| M2.5 | Sửa lỗi chặng ghế **chưa ghi vào DB**: `POST /api/checkin` nhận `seatNumber` theo từng hành khách và cập nhật `seats` + `passengers.seat_number` (giữ `idx_seats_flight_seat_unique` — bắt 409 khi ghế vừa có người chọn) | `src/app/api/checkin/route.ts`, `src/lib/db.ts` | 0,75 ngày |
| M2.5b | **Cửa sổ check-in bắt buộc**: chặn `POST /api/checkin` nếu ngoài `[giờ bay − 24h, giờ bay − 60p]`; tính riêng theo giờ bay của **từng chặng** (chặng về có cửa sổ 24h riêng theo giờ bay chặng về), theo lịch Việt Nam; trả `422` kèm mốc mở/đóng cửa sổ để UI hiển thị đúng | `src/app/api/checkin/route.ts`, `src/lib/db.ts`, `src/lib/checkin-window.ts` (mới) | 0,5 ngày |
| M2.5c | Chỉnh dữ liệu seed/demo: đảm bảo chuyến bay mẫu nằm trong cửa sổ 24h (không có cờ bypass) | `scripts/seed*.cjs`, `migrations/*seed*.sql` | 0,25 ngày |
| M2.6 | UI: bước "tra cứu" hiển thị **2 thẻ chặng** (đi / về) + radio "Chỉ chặng đi · Chỉ chặng về · Cả 2 chặng"; hiện lịch trình realtime qua `useFlightStatusSSE` | `src/app/lam-thu-tuc/page.tsx` | 0,5 ngày |
| M2.7 | UI: `CheckInSeatModal` nhận danh sách hành khách, hiển thị ghế đã chọn của từng người, disable ghế đã bị chiếm bởi chính booking này | `src/app/lam-thu-tuc/CheckInSeatModal.tsx` | 0,25 ngày |

**Điều kiện nghiệm thu:** PNR của chặng về tra ra **cả 2 chặng**; check-in "cả 2 chặng" sinh 2 bộ boarding pass; check-in chặng về khi chặng đi chưa thanh toán bị từ chối có thông điệp rõ ràng.

### Mốc 3 — Thẻ lên máy bay điện tử: QR/Barcode sắc nét + tải về điện thoại (4 ngày)

| ID | Công việc | File | Ước tính |
|----|-----------|------|----------|
| M3.1 | Commit file `.ttf` KoHo vào `public/fonts/` + khai báo `@font-face` nếu chưa có | `public/fonts/`, `src/styles/tailwind.css` | 0,25 ngày |
| M3.2 | `src/lib/pdf/boarding-pass.ts` (mới): dựng PDF vé điện tử bằng `pdfkit` — khung vé đỏ thương hiệu, thông tin chuyến, **QR PNG** nhúng (`qrcode.toBuffer`), **Code 39 vẽ bằng vector** (không cần ảnh), font KoHo nhúng | `src/lib/pdf/boarding-pass.ts` | 1,25 ngày |
| M3.3 | `npm i pdfkit @types/pdfkit`; thêm `pdfkit` vào `dependencies`; verify build Docker (`node:20-alpine` — thư viện thuần JS, không cần binary) | `package.json` | 0,25 ngày |
| M3.4 | Payload QR chuẩn hóa (BCBP-lite) mở rộng `buildBoardingQrContent`: thêm `leg_role`, `boarding_pass_number`, `seat`, `gate`, `terminal`; giữ ASCII-fold tiếng Việt | `src/features/payments/e-ticket.ts` | 0,5 ngày |
| M3.5 | API tải vé: `GET /api/dat-ve/[id]/ve-dien-tu?leg=` → `application/pdf` + `Content-Disposition: attachment`; kiểm tra sở hữu booking (session **hoặc** PNR + họ) | `src/app/api/dat-ve/[id]/ve-dien-tu/route.ts` | 0,75 ngày |
| M3.6 | Thay **icon giả** `<MdQrCode2>` bằng `EBoardingPass` thật trên `/lam-thu-tuc` (QR SVG `qrcode`, mã vạch Code 39, errorCorrectionLevel `M`, width ≥ 240px cho màn hình điện thoại) | `src/app/lam-thu-tuc/page.tsx` | 0,5 ngày |
| M3.7 | Nút "Tải về điện thoại": 3 lựa chọn — (a) tải PDF, (b) tải ảnh PNG thẻ (render sang `<canvas>` → `toBlob` → download), (c) Web Share API (`navigator.share` + file) nếu trình duyệt hỗ trợ | `src/app/lam-thu-tuc/page.tsx`, `src/features/bookings/components/EBoardingPass.tsx` | 0,5 ngày |

**Điều kiện nghiệm thu:** QR trên trang là mã **thật** (quét bằng điện thoại ra đúng PNR/chặng/ghế); mã vạch Code 39 quét được; PDF mở được trên iOS/Android, chứa QR nhúng sắc nét (≥ 300 DPI khi in).

### Mốc 4 — `/chuyen-bay-cua-toi`: trip card, realtime, mua thêm hành lý & đổi ghế (5,25 ngày)

| ID | Công việc | File | Ước tính |
|----|-----------|------|----------|
| M4.1 | API `GET /api/dat-ve` bổ sung `trip`: gom các booking cùng `trip_id` thành 1 nhóm, trả `outbound` + `inbound` | `src/lib/db.ts`, `src/app/api/dat-ve/route.ts` | 0,5 ngày |
| M4.2 | Bỏ N+1 `/api/checkin/status/[bookingId]`: `GET /api/dat-ve` join `check_in` theo batch | `src/lib/db.ts` | 0,5 ngày |
| M4.3 | `TripCard` (mới): hiển thị 2 chặng (đi/về) trên 1 thẻ, timeline, trạng thái realtime qua `useFlightStatusSSE` (delay/cancelled/completed), cổng & nhà ga | `src/features/bookings/components/TripCard.tsx` | 1 ngày |
| M4.4 | Sửa hiển thị PNR: `Đặt chỗ: {b.id}` → `{b.booking_code}` (khớp `AGENTS.md`) | `src/app/chuyen-bay-cua-toi/page.tsx` | 0,25 ngày |
| M4.5 | API `POST /api/dat-ve/[id]/dich-vu` — mua thêm hành lý: nhận `package_id` + `leg`, **server tự tính giá** từ `BAGGAGE_PACKAGES`/`OVERSIZED_BAGGAGE`, ghi `booking_baggage` (status `paid`), cập nhật `bookings.total_price`, và **tạo + thu giao dịch thanh toán ngay** (tái dùng luồng ví/thẻ hiện có) — trả `402` nếu chưa đủ số dư/thẻ lỗi | `src/app/api/dat-ve/[id]/dich-vu/route.ts`, `src/lib/db.ts`, `src/lib/payments/*` | 1,25 ngày |
| M4.6 | API `PATCH /api/dat-ve/[id]/ghe` — đổi ghế sau khi đặt: kiểm tra ghế còn trống (`idx_seats_flight_seat_unique` → 409), tính `price_delta = getSeatCharge(new) − getSeatCharge(old)` (server), cập nhật `seats` + `passengers.seat_number`, ghi `booking_seat_changes`, cập nhật tổng tiền | `src/app/api/dat-ve/[id]/ghe/route.ts`, `src/lib/db.ts` | 1 ngày |
| M4.7 | UI: nút "Mua thêm hành lý" (mở `BaggageSelectionDrawer` với giá hiện tại) + "Đổi ghế" (mở `CheckInSeatModal`) trên từng chặng của `TripCard` | `src/app/chuyen-bay-cua-toi/page.tsx` | 0,5 ngày |
| M4.8 | Tab "Vé điện tử (VDT)": bỏ mã `VDT-` giả, dùng vé thật + nút tải PDF từ M3.5 | `src/app/chuyen-bay-cua-toi/page.tsx` | 0,25 ngày |

**Điều kiện nghiệm thu:** 1 booking khứ hồi hiển thị 1 thẻ trip có 2 chặng; trạng thái chuyến bay đổi realtime không cần reload; mua thêm hành lý sinh phí **khớp giá server** và tổng tiền booking cập nhật; đổi ghế bị chặn 409 nếu ghế vừa bị người khác chọn.

### Mốc 5 — Email hoá đơn + vé điện tử kèm PDF (3 ngày)

| ID | Công việc | File | Ước tính |
|----|-----------|------|----------|
| M5.1 | `sendMail` hỗ trợ `attachments: { filename, content, contentType }[]`; `MailPayload` mở rộng; `buildPaymentSuccessHtml` nhận thêm `attachmentNames` để liệt kê tệp kèm theo | `src/lib/mail.ts` | 0,5 ngày |
| M5.2 | `sendBookingConfirmationEmail` / `sendPaymentSuccessEmail` nhận `attachments` | `src/lib/mail.ts` | 0,25 ngày |
| M5.3 | `src/lib/boarding-pass-pdf.ts` (mới): gom PDF vé điện tử **cả 2 chặng** + hoá đơn (dùng `renderInvoiceHtml` của `features/admin/invoice.ts` đã có) thành 1 file PDF | `src/lib/boarding-pass-pdf.ts` | 1 ngày |
| M5.4 | `sendAutomaticPaymentInvoiceEmail`: sinh PDF, kèm vào email; **phủ cả chặng về** (hiện chỉ gửi chặng đi) — gửi 1 email gồm PDF của cả trip, hoặc 2 email nếu PNR khác nhau | `src/lib/payment-invoice.ts` | 0,75 ngày |
| M5.5 | Idempotency: tránh gửi trùng khi webhook VietQR + `/api/thanh-toan` cùng kích hoạt — khoá theo `booking_id + payment_id` (bảng `email_log` hoặc `system_config`-based) | `src/lib/payment-invoice.ts`, `migrations/047_email_log.sql` | 0,25 ngày |
| M5.6 | Khách không có email (đặt bằng SĐT) → hiện bị bỏ qua (`reason: 'Không tìm thấy địa chỉ email'`); bổ sung fallback gửi link tải vé qua **thông báo trong app** (`/tai-khoan`) + cho phép khai báo email sau khi đặt | `src/lib/payment-invoice.ts`, `src/app/tai-khoan/*` | 0,25 ngày |

**Điều kiện nghiệm thu:** sau khi thanh toán thành công, khách nhận email có **file PDF** kèm theo chứa vé điện tử có QR + mã vạch của cả 2 chặng; gửi lại (double-trigger) không tạo 2 email.

### Mốc 6 — Kiểm thử, responsive, nghiệm thu (2,5 ngày)

| ID | Công việc | Ước tính |
|----|-----------|----------|
| M6.1 | Unit test vitest: `trip-legs.test.ts` (tra cứu PNR 2 chặng), `checkin-legs.test.ts` (check-in từng chặng + chặn sai thứ tự), `passenger-seat-persist.test.ts`, `baggage-addon-price.test.ts` (giá server), `seat-change-price.test.ts` (409 khi ghế bận), `mail-pdf-attachment.test.ts` | 1 ngày |
| M6.2 | Test migration: mở rộng canary trong `scripts/test-migrations.cjs` (booking 2 chặng + check-in + hành lý) — đo pass-to-pass | 0,5 ngày |
| M6.3 | `npm run type-check` + `npm run lint` + `npm run lint:tailwind-classes` (3 class Tailwind không tồn tại sẽ **âm thầm** không sinh CSS) | 0,25 ngày |
| M6.4 | `npm run build` + `npm run test:smoke` + `npm run test:ui` (35 màn hình × 3 viewport) — chạy trên **production build** (`DIST_DIR=.next-uicheck`), không chạy `next dev` | 0,5 ngày |
| M6.5 | Kiểm tra responsive 375 / 768 / 1440 cho `/lam-thu-tuc` (2 chặng) và `/chuyen-bay-cua-toi` (trip card); không tràn ngang | 0,25 ngày |

---

## 5. BẢNG ƯỚC TÍNH TỔNG

| Mốc | Nội dung | Ngày |
|-----|-----------|-------|
| M1 | Nền tảng dữ liệu & giá | 2,5 |
| M2 | Check-in khứ hồi & theo chặng (gồm cửa sổ 24h/60p bắt buộc) | 4,5 |
| M3 | E-Boarding Pass QR/Barcode + tải về điện thoại | 4,0 |
| M4 | `/chuyen-bay-cua-toi`: trip, realtime, mua thêm dịch vụ | 5,25 |
| M5 | Email hoá đơn + PDF | 3,0 |
| M6 | Kiểm thử & nghiệm thu | 2,5 |
| — | **Buffer (rủi ro tích hợp, review)** | **3,0–5,0** |
| | **Tổng** | **24,75–28,75** |

> Nếu cần rút gọn: bỏ M5.6 (fallback email) và chia M4.5/M4.6 sang sprint sau → **21–24 ngày**.
>
> **Ghi chú thay đổi sau khi chốt yêu cầu:** cửa sổ check-in 24h/60p là quy tắc **bắt buộc** (không có cờ bypass) ⇒ M2 tăng 0,5 ngày; thanh toán ngay cho hành lý mua thêm ⇒ M4 tăng 0,25 ngày; font KoHo được phép commit ⇒ R2 được giải quyết, M3 giữ nguyên.

---

## 6. RỦI RO & GIẢI PHÁP

| # | Rủi ro | Mức độ | Giải pháp |
|---|--------|--------|-----------|
| R1 | **`pdfkit` chưa có trong `node_modules`** — build CI/Docker có thể hỏng nếu quên `npm i` | Cao | Commit `package.json` + `package-lock.json` **cùng commit** đầu tiên của M3.3; CI chạy `npm ci` nên lockfile phải khớp |
| R2 | **Font KoHo chưa có file cục bộ** ⇒ PDF không nhúng được tiếng Việt có dấu | Cao | **ĐÃ CHỐT: được phép commit file `.ttf` KoHo** vào `public/fonts/`. M3.1 là điều kiện tiên quyết của M3.2 |
| R3 | **Migration `045` đụng `bookings`** — bảng mang dữ liệu khách hàng; CI replay toàn bộ bộ migration | Cao | `ADD COLUMN IF NOT EXISTS` + backfill idempotent + FK `NOT VALID` → `VALIDATE`; bắt buộc chạy `npm run test:migrations` 4 pass; thêm `bookings` vào `OPERATING_TABLES_SQL` |
| R4 | **Đổi ghế / mua hành lý là đường ghi tiền mới** — dễ sinh lỗi tính tiền hoặc bán quá số ghế | Cao | Giá **luôn** tính ở server từ `pricing.ts`; tôn trọng `idx_seats_flight_seat_unique` (409 khi tranh chấp); `seats.available` cập nhật bằng `UPDATE … WHERE available >= n` (kiểu EPQ đã dùng ở `moveWalletBalance`) |
| R5 | **Check-in nhiều hành khách** làm `check_in` nhiều dòng — các truy vấn cũ dùng `LIMIT 1` | Trung bình | Rà toàn bộ chỗ đọc `check_in` (`getCheckInStatusByBookingId`, `searchCheckIn`) và chuyển sang trả **mảng** theo hành khách |
| R6 | **Email trùng** khi nhiều trigger cùng kích hoạt (`/api/thanh-toan` + webhook + admin) | Trung bình | M5.5 khoá idempotent theo `booking_id + payment_id` |
| R7 | **`/lam-thu-tuc` là trang public** — endpoint mới (tải PDF, check-in theo chặng) phải không rò rỉ PII | Cao | M3.5 yêu cầu session **hoặc** PNR + họ (đúng như `GET /api/dat-ve/[id]` đang làm); **không** thêm endpoint mới vào `PUBLIC_API_ROUTES` trong `src/lib/route-access.ts` nếu nó cần session |
| R8 | **`test:ui` chạy 35 màn hình × 3 viewport** — thay đổi layout làm vỡ phép đo | Trung bình | Chạy `test:ui` trên **production build** (`DIST_DIR=.next-uicheck npm run build`), không dùng `next dev` |
| R9 | **SSE tốn resource** — mở 1 stream cho mỗi chặng × mỗi card | Thấp | Chỉ mở SSE cho chặng đang hiển thị / sắp bay; tái dùng hook `useFlightStatusSSE` |
| R10 | **`class` Tailwind không tồn tại → CSS không sinh, không cảnh báo** | Trung bình | Chạy `npm run lint:tailwind-classes` (bắt cả class "dính" như `bg-whiterounded-vj`) |

---

## 7. ĐỊNH NGHĨA HOÀN THÀNH (Definition of Done)

**Check-in online (`/lam-thu-tuc`)**
- [ ] Tra cứu được PNR của **cả 2 chặng** khứ hồi bằng một mã (không phải biết chặng nào trước)
- [ ] Chọn được: chỉ chặng đi / chỉ chặng về / cả 2 chặng; check-in **riêng lẻ** hoạt động độc lập
- [ ] Check-in chặng về bị từ chối có thông điệp rõ ràng khi chặng đi chưa hoàn tất
- [ ] **Cửa sổ check-in bắt buộc**: chặn check-in sớm hơn 24h hoặc quá muộn hơn 60 phút trước giờ bay; **mỗi chặng tính riêng** theo giờ bay của chặng đó; thông báo lỗi nêu rõ mốc mở/đóng cửa sổ
- [ ] Ghế được **ghi vào DB** (`seats` + `passengers.seat_number`), không chỉ state client
- [ ] Thẻ lên máy bay hiển thị **QR thật** (quét ra đúng PNR/chặng/ghế) + **mã vạch Code 39**
- [ ] Tải được vé về điện thoại: PDF **hoặc** ảnh PNG **hoặc** chia sẻ (Web Share)
- [ ] Trạng thái chuyến bay (đi/hủn/chậm) cập nhật realtime không cần reload

**Quản lý đặt chỗ (`/chuyen-bay-cua-toi`)**
- [ ] 1 booking khứ hồi → 1 thẻ trip hiển thị **đầy đủ chặng đi và chặng về** + timeline
- [ ] Lịch trình realtime cho từng chặng (dùng SSE sẵn có)
- [ ] Mua thêm hành lý ký gửi **sau khi đặt vé**: giá khớp server, thanh toán **ngay** qua ví/thẻ, tổng tiền booking cập nhật sau giao dịch thành công
- [ ] Chọn lại ghế **sau khi đặt vé**: 409 khi ghế vừa bị chiếm, `price_delta` tính ở server
- [ ] PNR hiển thị là `booking_code`, **không** phải UUID
- [ ] Tab "Vé điện tử" dùng vé thật, tải được PDF
- [ ] Không còn N+1 request check-in

**Email**
- [ ] Sau khi thanh toán, khách nhận email **kèm file PDF** (vé điện tử có QR + mã vạch, cả 2 chặng nếu khứ hồi)
- [ ] PDF mở được, in được (A4), QR nhúng sắc nét, chữ tiếng Việt có dấu
- [ ] Không gửi trùng khi nhiều trigger cùng kích hoạt
- [ ] Khách không có email vẫn có đường lấy vé (trong app) và khai báo email sau

**Chung**
- [ ] `npm run type-check` — 0 lỗi
- [ ] `npm run lint` — 0 lỗi
- [ ] `npm run lint:tailwind-classes` — 0 lỗi
- [ ] `npm test` — 0 lỗi (bổ sung 6 file test mới)
- [ ] `npm run test:migrations` — 4 pass xanh
- [ ] `npm run build` + `npm run test:smoke` + `npm run test:ui` — xanh
- [ ] Responsive 375 / 768 / 1440 không tràn ngang, không overlap
- [ ] `AGENTS.md` được cập nhật (mô hình trip/leg, cột `passengers.seat_number`, quy tắc boarding pass)

---

## 8. CÂU HỎI CẦN CHỐT TRƯỚC KHI BẮT TAY (Open questions)

| # | Câu hỏi | Ảnh hưởng | Gợi ý mặc định |
|---|---------|-----------|----------------|
| Q1 | ~~Chặng về có **PNR riêng** hay nên dùng chung PNR?~~ **ĐÃ CHỐT** | — | **Giữ PNR riêng**, tra cứu theo `trip_id` ⇒ tra một PNR ra được cả 2 chặng |
| Q2 | ~~Check-in mở cửa **24h trước / đóng 60 phút trước** có bắt buộc không?~~ **ĐÃ CHỐT** | — | **BẮT BUỘC**: mở từ **24h trước giờ bay**, đóng **60 phút trước giờ bay**; **mỗi chặng có cửa sổ riêng** theo giờ bay của chặng đó. Không cờ bypass — dữ liệu seed/demo phải chỉnh để chuyến nằm trong cửa sổ |
| Q3 | PDF vé điện tử: **một file** gồm cả 2 chặng, hay **hai file** (đi/về)? | Ảnh hưởng cách đính kèm email | **Một file** (mỗi chặng một trang A4) |
| Q4 | ~~Khách mua thêm hành lý sau khi đặt: **thanh toán ngay** qua ví/thẻ, hay **ghi nợ** vào booking để thanh toán chung?~~ **ĐÃ CHỐT** | — | **Thanh toán NGAY** qua ví/thẻ ngay trong màn mua thêm hành lý (tái dùng luồng thanh toán hiện có); **không** ghi nợ vào booking |
| Q5 | ~~Có được dùng file font KoHo trong `public/fonts/` cho PDF không?~~ **ĐÃ CHỐT** | — | **CÓ** — commit file `.ttf` KoHo vào `public/fonts/` để nhúng vào PDF |

---

## 9. PHỤ LỤC — Bản đồ file liên quan

| Vai trò | File |
|--------|------|
| Trang check-in (client) | `src/app/lam-thu-tuc/page.tsx`, `src/app/lam-thu-tuc/CheckInSeatModal.tsx` |
| Trang quản lý (client) | `src/app/chuyen-bay-cua-toi/page.tsx` |
| API check-in | `src/app/api/checkin/route.ts`, `src/app/api/checkin/status/[bookingId]/route.ts` |
| API booking | `src/app/api/dat-ve/route.ts`, `src/app/api/dat-ve/[id]/route.ts` |
| API thanh toán | `src/app/api/thanh-toan/route.ts`, `src/app/api/thanh-toan/webhook/vietqr/route.ts` |
| Truy vấn DB | `src/lib/db.ts` (`searchCheckIn` 3695, `getCheckInStatusByBookingId` 3805, `createCheckIn` 3844, `getBookingsByUserId` 859, `getBookingById` 963) |
| Giá | `src/features/bookings/pricing.ts` (`getSeatCharge`, `BAGGAGE_PACKAGES`, `ANCILLARY_OPTIONS`) |
| Vé điện tử / QR | `src/features/payments/e-ticket.ts`, `src/features/payments/components/EBoardingPass.tsx` |
| Email | `src/lib/mail.ts` (`sendMail` 95, `sendPaymentSuccessEmail` 845, `sendBookingConfirmationEmail` 890) |
| Hoá đơn tự động | `src/lib/payment-invoice.ts` |
| Hoá đơn HTML | `src/features/admin/invoice.ts` (`renderInvoiceHtml`) |
| Realtime | `src/hooks/useFlightStatusSSE.ts`, `src/hooks/useSeatMapSSE.ts`, `src/app/api/sse/trang-thai-chuyen-bay/route.ts`, `src/app/api/sse/ghe-ngoi/route.ts` |
| Hạ tầng mail | `scripts/test-mail.cjs`, `.env.local.example` (SMTP_*, MAIL_SITE_URL) |
| Kiểm thử migration | `scripts/test-migrations.cjs` (`OPERATING_TABLES_SQL` 256) |
| Quy ước dự án | `AGENTS.md`, `PLAN_DAT_VE.md` (mẫu kế hoạch đã dùng) |
