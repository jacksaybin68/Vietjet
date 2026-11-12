-- 042_transfer_note_six_chars.sql
--
-- Nội dung chuyển khoản = mã đặt chỗ 6 ký tự + hậu tố I98O, viết liền.
-- Ví dụ mã đặt chỗ GKJU6T -> nội dung GKJU6TI98O.
--
-- Các mặc định cũ đã từng dùng: 'VJ {code} 198O' (bản gốc), 'VJ {code}',
-- '{code}198O' và NULL ở tài khoản seed sẵn. Sau migration 034 mã đặt chỗ là 6
-- ký tự alfanum (A-Z0-9), nên nội dung chuẩn có 10 ký tự: 6 ký tự mã + 4 ký
-- tự hậu tố, viết liền không có khoảng trắng.
--
-- Chỉ tài khoản nào đang dùng đúng một trong các mặc định cũ bị đổi; template
-- do admin tự đặt giữ nguyên. Chạy lại nhiều lần không sinh thay đổi mới.

UPDATE bank_accounts
SET transfer_note_template = '{code}I98O',
    updated_at = NOW()
WHERE transfer_note_template IS NULL
   OR btrim(transfer_note_template) IN (
        '{code}198O',
        '{code}',
        'VJ {code}',
        'VJ {code} 198O'
      );
