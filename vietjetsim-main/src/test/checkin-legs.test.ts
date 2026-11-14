import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Quy tắc chặn 24 giờ & kiểm tra chặng của luồng check-in.
 *
 * Hai lỗi đã xảy ra và loại này rất dễ quay lại:
 *   1. Check-in mở sớm hơn 24 giờ trước giờ bay — khách check-in được nhưng
 *      hệ thống chưa cho xuất vé ⇒ hỏng luồng ở quầy.
 *   2. Chặng về check-in được khi chặng đi chưa `confirmed` — khách đi một
 *      chuyến mà vé của chặng kia chưa mua.
 *
 * Test này đọc mã nguồn thay vì render: quy tắc nằm ở tầng server (route
 * handler), và render cả trang `/lam-thu-tuc` để kiểm tra một hằng số là
 * chi phí vô nghĩa.
 */
const CHECKIN_ROUTE = join(process.cwd(), 'src/app/api/checkin/route.ts');

describe('quy tắc cửa sổ check-in 24 giờ', () => {
  const source = readFileSync(CHECKIN_ROUTE, 'utf8');

  it('hằng số cửa sổ là 24 giờ', () => {
    expect(source).toMatch(/const CHECKIN_WINDOW_HOURS = 24;/);
  });

  it('chặn check-in khi còn quá 24 giờ trước giờ bay', () => {
    expect(source).toMatch(/minutes > CHECKIN_WINDOW_HOURS \* 60/);
  });

  it('cửa sổ có thể tắt qua system_config nhưng mặc định là BẬT', () => {
    expect(source).toMatch(/checkin_window_enforced/);
    // Mặc định bật: giá trị 'false' mới tắt.
    expect(source).toMatch(/return value !== 'false';/);
  });

  it('trả lỗi 409 khi cửa sổ chưa mở', () => {
    expect(source).toMatch(/status: 409/);
    expect(source).toMatch(/Check-in chỉ mở từ/);
  });
});

describe('kiểm tra chặng khi check-in khứ hồi', () => {
  const source = readFileSync(CHECKIN_ROUTE, 'utf8');

  it('chặng về chỉ check-in được khi chặng đi đã confirmed', () => {
    expect(source).toMatch(/outbound\.status !== 'confirmed'/);
  });

  it('POST nhận tham số `leg` để chọn chặng', () => {
    expect(source).toMatch(/body\.leg === 'inbound'/);
  });

  it('mỗi lần POST chỉ check-in MỘT chặng', () => {
    // Route tạo check-in theo vòng lặp trên `seatAssignments` — không có
    // vòng lặp trên danh sách chặng.
    expect(source).not.toMatch(/for \(const leg of/);
  });
});

describe('API tra cứu check-in trả về cả hai chặng', () => {
  const source = readFileSync(CHECKIN_ROUTE, 'utf8');

  it('response có `trip.outbound` và `trip.inbound`', () => {
    expect(source).toMatch(/outbound: pickLeg\(legs, 'outbound'\) \?\? null/);
    expect(source).toMatch(/inbound: pickLeg\(legs, 'inbound'\) \?\? null/);
  });

  it('mỗi chặng kèm thông tin cửa sổ check-in', () => {
    expect(source).toMatch(/checkInWindow: describeCheckInWindow\(leg, windowEnforced\)/);
  });
});
