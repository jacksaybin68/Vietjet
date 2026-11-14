-- Migration 046: ghế theo hành khách, dịch vụ mua thêm sau đặt vé, nhật ký email
--
-- Bốn phần, tất cả đều re-applyable (AGENTS.md):
--   1. `passengers.seat_number` — ghế của TỪNG hành khách. Trước đó ghế chỉ
--      thuộc về `seats` (gắn booking), nên không ánh xạ được hành khách → ghế ⇒
--      không sinh được boarding pass theo từng người, và cũng không có chỗ ghi
--      khi khách đổi ghế sau khi đặt vé.
--      Cột được thêm BARE (không kèm CHECK inline): `ADD COLUMN IF NOT EXISTS`
--      là no-op khi cột đã có, và phần định nghĩa còn lại — kể cả ràng buộc —
--      bị Postgres loại bỏ; ràng buộc phải được cài riêng.
--   2. `booking_baggage` — hành lý mua thêm sau khi đã đặt vé, tính theo gói kg.
--      `booking_ancillaries` có `UNIQUE (booking_id, option_id)` và `option_id`
--      chỉ nhận 3 giá trị cố định (`baggage|meal|insurance`) ⇒ không vừa shape
--      gói theo kg ⇒ bảng mới, giữ nguyên lịch sử bảng cũ.
--   3. `booking_seat_changes` — nhật ký đổi ghế (audit + tính lại giá).
--   4. `email_log` — chống gửi email hoá đơn trùng khi nhiều trigger cùng
--      kích hoạt (webhook VietQR + `/api/thanh-toan` + admin xác nhận).

-- ─── 1) Ghế của từng hành khách ────────────────────────────────────────────────
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS seat_number VARCHAR(10);

-- Index phục vụ tra cứu ghế theo booking (dùng khi sinh boarding pass từng
-- hành khách và khi đổi ghế).
CREATE INDEX IF NOT EXISTS idx_passengers_booking_seat
  ON passengers (booking_id, seat_number);

-- ─── 2) Hành lý mua thêm sau khi đặt vé ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_baggage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  package_id VARCHAR(20) NOT NULL,
  weight_kg INTEGER NOT NULL,
  -- Giá do SERVER tự tính từ `pricing.ts`; client chỉ gửi `package_id`.
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_baggage_booking
  ON booking_baggage (booking_id);

-- Ràng buộc được cài RIÊNG (không đặt trong `CREATE TABLE IF NOT EXISTS`):
-- một constraint khai báo trong `CREATE` chỉ áp dụng cho database mới, không
-- áp dụng cho database đã có bảng.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_baggage_status_check'
      AND conrelid = 'booking_baggage'::regclass
  ) THEN
    ALTER TABLE booking_baggage
      ADD CONSTRAINT booking_baggage_status_check
      CHECK (status IN ('pending', 'paid', 'cancelled'));
  END IF;
END $$;

-- `UNIQUE` không có dạng `NOT VALID`; bảng mới nên không có dữ liệu vi phạm.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_baggage_booking_package_key'
      AND conrelid = 'booking_baggage'::regclass
  ) THEN
    ALTER TABLE booking_baggage
      ADD CONSTRAINT booking_baggage_booking_package_key
      UNIQUE (booking_id, package_id);
  END IF;
END $$;

-- ─── 3) Nhật ký đổi ghế ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_seat_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
  old_seat VARCHAR(10),
  new_seat VARCHAR(10) NOT NULL,
  -- Chênh lệch giá do SERVER tính (getSeatCharge(new) − getSeatCharge(old)).
  price_delta NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_seat_changes_booking
  ON booking_seat_changes (booking_id, created_at DESC);

-- ─── 4) Nhật ký email (chống gửi trùng) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  template VARCHAR(60) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_booking_payment
  ON email_log (booking_id, payment_id, template);

-- Khoá idempotent: một (booking, payment, template) chỉ gửi một lần.
--
-- `NULLS NOT DISTINCT` (Postgres 15+) là bắt buộc ở đây: trong một unique index
-- thuần, NULL được coi là khác nhau, nên `(booking_id, NULL, template)` — tức
-- gửi hoá đơn khi giao dịch chưa có `payment_id` — có thể lặp lại vô hạn và
-- khoá trùng trở nên vô dụng. CI chạy Postgres 16 và production chạy 17, nên
-- cả hai đều hỗ trợ.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_log_unique_send
  ON email_log (booking_id, payment_id, template) NULLS NOT DISTINCT;

-- ─── Bảng mới phải được đo trong harness migration ────────────────────────────
-- `scripts/test-migrations.cjs` chỉ đếm `flights` và một vài bảng khác. Một bảng
-- mang dữ liệu khách hàng mà không được đo là một bảng không được canary — đúng
-- bài học `check_in` / `announcements` / `chat_conversations`.
