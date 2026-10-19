-- SkyJoy auth enhancements: Danh xưng (salutation), tách Họ / Tên đệm & Tên,
-- mã hội viên SkyJoy (SkyID), mã giới thiệu, và hạ tầng OTP SMS.
--
-- Không có `DROP` nào ở đây: file này chỉ thêm cột/bảng, và mọi cột đều dùng
-- `ADD COLUMN IF NOT EXISTS` với ràng buộc đặt riêng (xem ghi chú dưới).

-- ─── Cột mới trên user_profiles ──────────────────────────────────────────────
--
-- Ràng buộc KHÔNG được viết inline trong `ADD COLUMN IF NOT EXISTS`: lần chạy
-- thứ hai làm cả câu lệnh thành no-op, và phần CHECK bị Postgres bỏ luôn —
-- không lỗi, không cảnh báo, chỉ là ràng buộc không bao giờ tồn tại. Vì vậy
-- cột thêm riêng, ràng buộc thêm riêng và có guard.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS salutation VARCHAR(10),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS skyjoy_member_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20);

-- ─── CHECK cho salutation ────────────────────────────────────────────────────
--
-- `ADD CONSTRAINT ... CHECK` kiểm tra mọi hàng đang có ngay lập tức, nên hàng
-- dữ liệu bẩn (giá trị lạ do lần chạy trước/INSERT tay) sẽ làm cả file abort.
-- Chuẩn hoá về NULL trước, rồi mới thêm ràng buộc. Guard theo cả `conname` và
-- `conrelid`: tên ràng buộc là duy nhất theo *schema*, không theo bảng.
DO $salutation$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_salutation_check'
      AND conrelid = 'user_profiles'::regclass
  ) THEN
    UPDATE user_profiles
    SET salutation = NULL
    WHERE salutation IS NOT NULL
      AND salutation NOT IN ('ong', 'ba', 'co', 'anh');

    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_salutation_check
      CHECK (salutation IS NULL OR salutation IN ('ong', 'ba', 'co', 'anh'));
  END IF;
END $salutation$;

-- ─── UNIQUE cho skyjoy_member_id ─────────────────────────────────────────────
--
-- `UNIQUE` không có dạng `NOT VALID`, nên đây là nhánh "phát hiện rồi hoãn"
-- của quy tắc 007/016: đếm trùng trước, chỉ thêm khi không còn trùng. Cột mới
-- nên lần chạy đầu luôn sạch; guard chỉ để file chạy lại an toàn.
DO $memberid$
DECLARE
  dup integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_skyjoy_member_id_key'
      AND conrelid = 'user_profiles'::regclass
  ) THEN
    SELECT count(*) INTO dup FROM (
      SELECT skyjoy_member_id FROM user_profiles
      WHERE skyjoy_member_id IS NOT NULL
      GROUP BY skyjoy_member_id
      HAVING count(*) > 1
    ) d;

    IF dup = 0 THEN
      ALTER TABLE user_profiles
        ADD CONSTRAINT user_profiles_skyjoy_member_id_key UNIQUE (skyjoy_member_id);
    ELSE
      RAISE NOTICE '% SkyJoy member id(s) are shared; skipping the UNIQUE constraint until an operator resolves them', dup;
    END IF;
  END IF;
END $memberid$;

-- Tra cứu mã giới thiệu khi đăng ký (ai đã giới thiệu ai).
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by_code
  ON user_profiles (referred_by_code);

-- ─── Cấp mã hội viên cho tài khoản đang có ───────────────────────────────────
--
-- Số sinh tuần tự từ dải nền 20xxxxxx. **Đếm theo toàn bộ bảng, không phải tập
-- NULL**: harness replay chèn khách canary *sau* pass 1, nên tới pass 2 nó là
-- hàng NULL duy nhất; `row_number()` trên tập NULL quay lại từ 1 và cấp trùng
-- `SJ20000001` (đã cấp cho tài khoản seed ở pass 1) → vi phạm UNIQUE và abort cả
-- file. Đếm theo toàn bảng thì hàng mới nhận một vị trí chưa dùng, còn lần chạy
-- sau (không còn hàng NULL) là no-op. Guard `NOT EXISTS` chỉ để một mã do ứng
-- dụng sinh tình cờ trùng số trong dải: hàng đó bị bỏ qua chứ file không abort.
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM user_profiles
),
candidates AS (
  SELECT id, 'SJ' || LPAD((20000000 + n)::text, 8, '0') AS member_id
  FROM numbered
)
UPDATE user_profiles u
SET skyjoy_member_id = c.member_id
FROM candidates c
WHERE u.id = c.id
  AND u.skyjoy_member_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles x
    WHERE x.skyjoy_member_id = c.member_id
  );

-- ─── OTP SMS ─────────────────────────────────────────────────────────────────
--
-- Mã OTP chỉ lưu dạng SHA-256 (giống refresh token và backup code); bản rõ
-- được trả về đúng một lần cho caller để gửi qua SMS. `attempts` chặn dò mã,
-- `consumed_at` làm tiêu thụ một lần (UPDATE có điều kiện, an toàn khi chạy
-- song song). `purpose` giới hạn phạm vi: OTP đăng ký không dùng được để đăng nhập.
CREATE TABLE IF NOT EXISTS phone_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'login')),
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ràng buộc viết lại lần hai, có guard, vì `CREATE TABLE IF NOT EXISTS` không
-- nâng cấp bảng đã tồn tại — bảng do một bản nháp trước của file này tạo sẽ giữ
-- nguyên mà không có CHECK. Guard theo cả `conname` và `conrelid`.
DO $phoneotp$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'phone_otp_purpose_check'
      AND conrelid = 'phone_otp'::regclass
  ) THEN
    ALTER TABLE phone_otp
      ADD CONSTRAINT phone_otp_purpose_check
      CHECK (purpose IN ('register', 'login'));
  END IF;
END $phoneotp$;

CREATE INDEX IF NOT EXISTS idx_phone_otp_lookup
  ON phone_otp (phone, purpose, created_at DESC);

-- ─── Mã giới thiệu: ai thưởng cho ai ─────────────────────────────────────────
--
-- Mỗi người được giới thiệu đúng một lần (`referee_user_id` UNIQUE), nên một
-- replay hay một lần gọi lại không thể thưởng điểm hai lần. `referrer_user_id`
-- NULL khi mã giới thiệu không khớp tài khoản nào (vẫn ghi nhận để đối soát).
CREATE TABLE IF NOT EXISTS referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  referrer_user_id TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  referral_code VARCHAR(20) NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nhánh "phát hiện rồi hoãn" của quy tắc 007/016: UNIQUE không có `NOT VALID`.
-- Bảng mới nên lần chạy đầu luôn sạch, nhưng guard vẫn cần để một bản nháp trước
-- của file này không thể để lại bảng thiếu khoá.
DO $referee$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'referral_events_referee_user_id_key'
      AND conrelid = 'referral_events'::regclass
  ) THEN
    ALTER TABLE referral_events
      ADD CONSTRAINT referral_events_referee_user_id_key UNIQUE (referee_user_id);
  END IF;
END $referee$;

CREATE INDEX IF NOT EXISTS idx_referral_events_code
  ON referral_events (referral_code);
