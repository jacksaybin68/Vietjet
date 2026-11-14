-- Migration 045: Liên kết 2 chặng khứ hồi bằng `trip_id` + vai trò chặng (`leg_role`)
--
-- Mô hình mới:
--   - Một "trip" khứ hồi = 2 dòng `bookings` (chặng đi + chặng về) cùng chia sẻ
--     một `trip_id` (UUID).
--   - `leg_role` cho biết dòng đó là chặng đi ('outbound') hay chặng về ('inbound').
--   - Đặt vé 1 chặng = 1 trip có 1 chặng, `trip_id` riêng.
--
-- Quy tắc bất di bất dịch (AGENTS.md):
--   - Migration phải re-applyable: ADD COLUMN IF NOT EXISTS, UPDATE idempotent,
--     KHÔNG DROP bảng/cột để "idempotent".
--   - `ADD CONSTRAINT ... CHECK` kiểm tra ngay các dòng đang có ⇒ dùng
--     `NOT VALID` → sửa dữ liệu → `VALIDATE`.
--   - `bookings` mang dữ liệu khách hàng ⇒ thêm vào `OPERATING_TABLES_SQL` trong
--     `scripts/test-migrations.cjs` (nếu không, bảng này là "bảng không được đo").

-- 1) Thêm 2 cột.
--    `ADD COLUMN ... DEFAULT` gán giá trị mặc định cho cả các dòng đã tồn tại
--    (Postgres >= 11), nên `leg_role` của dữ liệu cũ là 'outbound' ngay.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS leg_role VARCHAR(10) DEFAULT 'outbound';

-- 2) Backfill dữ liệu cũ: booking nào chưa có `trip_id` thì tự thành một trip
--    1 chặng riêng. Idempotent: chạy lại thì `WHERE trip_id IS NULL` không còn
--    dòng nào khớp.
UPDATE bookings
   SET trip_id = gen_random_uuid(),
       leg_role = 'outbound'
 WHERE trip_id IS NULL;

-- 3) `leg_role` của dòng cũ có thể NULL nếu cột được thêm tay ngoài bộ
--    migration ⇒ chuẩn hoá về 'outbound' trước khi siết ràng buộc.
UPDATE bookings SET leg_role = 'outbound' WHERE leg_role IS NULL;

-- 4) Giá trị mặc định + NOT NULL cho `trip_id`: mọi đặt vé mới đều tự có trip.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE trip_id IS NULL) THEN
    ALTER TABLE bookings ALTER COLUMN trip_id SET DEFAULT gen_random_uuid();
    ALTER TABLE bookings ALTER COLUMN trip_id SET NOT NULL;
  END IF;
END $$;

-- 5) `leg_role` NOT NULL: 'outbound' | 'inbound'.
ALTER TABLE bookings ALTER COLUMN leg_role SET DEFAULT 'outbound';
ALTER TABLE bookings ALTER COLUMN leg_role SET NOT NULL;

-- 6) Ràng buộc CHECK: cài `NOT VALID` (không kiểm tra dòng cũ), sửa dữ liệu
--    rồi `VALIDATE` — đúng nhánh "NOT VALID → repair → VALIDATE" của AGENTS.md.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_leg_role_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_leg_role_check
  CHECK (leg_role IN ('outbound', 'inbound')) NOT VALID;

ALTER TABLE bookings VALIDATE CONSTRAINT bookings_leg_role_check;

-- 7) Index tra cứu trip: 1 PNR → ra cả 2 chặng.
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);

-- 8) Index phục vụ đếm/gom theo chặng trong 1 trip.
CREATE INDEX IF NOT EXISTS idx_bookings_trip_leg ON bookings(trip_id, leg_role);
