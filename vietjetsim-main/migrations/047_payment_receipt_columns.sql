-- 047_payment_receipt_columns.sql
--
-- Bổ sung các cột mà mã nguồn đã dùng nhưng chưa migration nào tạo.
--
-- Vấn đề:
--   `createPayment` và `createPaymentAndConfirmBooking` (src/lib/db.ts) INSERT
--   vào `payments.receipt_image`, `payments.transfer_note` và UPDATE
--   `bookings.receipt_image`, `bookings.transfer_note`. Nhưng trong toàn bộ
--   `migrations/` KHÔNG có câu lệnh nào tạo ra bốn cột đó — chúng chỉ tồn tại
--   trên DB production vì đã được thêm tay.
--
--   Hệ quả: một DB dựng lại từ đầu bằng `migrations/` (đúng những gì
--   `npm run test:migrations` và CI làm) sẽ ném lỗi `column "receipt_image"
--   does not exist` ngay ở lần thanh toán đầu tiên ⇒ toàn bộ luồng đặt vé và
--   thanh toán chết, chỉ lộ ra khi deploy lên DB mới.
--
--   Harness `scripts/test-migrations.cjs` không bắt được lỗi này vì nó chỉ
--   đếm dòng, không INSERT vào `payments` — đúng bài học "bảng không được đo
--   là bảng không được canary".
--
-- `ADD COLUMN IF NOT EXISTS` ⇒ chạy lại nhiều lần vẫn an toàn, và trên DB
-- production (đã có sẵn cột) câu lệnh là no-op.

-- ─── payments ────────────────────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_image TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_note VARCHAR(50);

-- ─── bookings ────────────────────────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS receipt_image TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transfer_note VARCHAR(50);

-- ─── booking_baggage: liên kết gói hành lý với giao dịch đã thu tiền ───────
-- `markBookingBaggagePaid(bookingId, paymentId)` cần lưu `payment_id` để biết
-- gói hành lý nào được mua bằng giao dịch nào — không có cột này thì không
-- đối soát được khi khách khiếu nại.
ALTER TABLE booking_baggage
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

-- Index phục vụ đối soát
-- Admin đối chiếu biên lai theo mã đặt chỗ; index theo `booking_id` giúp
-- truy vấn đó không quét toàn bảng.
CREATE INDEX IF NOT EXISTS idx_payments_booking_transfer_note
  ON payments (booking_id, transfer_note);

CREATE INDEX IF NOT EXISTS idx_booking_baggage_payment
  ON booking_baggage (payment_id);
