import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Dịch vụ sau khi đặt vé: mua thêm hành lý & đổi ghế.
 *
 * Điều kiện bất di bất dịch ở đây là TIỀN: giá luôn do SERVER tính lại từ
 * `pricing.ts`. Nếu client gửi giá lên, một request đã sửa giá sẽ bán hành lý
 * 20kg với giá 1₫ — hoặc tệ hơn, đổi ghế với phí chênh lệch âm (khách được
 * hoàn tiền oan).
 */
const BAGGAGE_ROUTE = join(process.cwd(), 'src/app/api/dat-ve/[id]/dich-vu/route.ts');
const SEAT_ROUTE = join(process.cwd(), 'src/app/api/dat-ve/[id]/ghe/route.ts');

/**
 * Bỏ comment trước khi kiểm tra.
 *
 * Người viết test thường ghi lại lý do trong comment ("trước đây gọi
 * `/api/checkin/status/<id>`..."), và comment đó chứa đúng chuỗi mà test cấm.
 * Nếu không bỏ comment, test sẽ báo đỏ vì chính lời giải thích của nó.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('API mua thêm hành lý', () => {
  const source = readFileSync(BAGGAGE_ROUTE, 'utf8');

  it('giá lấy từ catalogue giá, không đọc giá từ request', () => {
    expect(source).toMatch(/BAGGAGE_CATALOG\.find/);
    expect(source).toMatch(/const unitPrice = pkg\.price;/);
    // Không được có chỗ nào đọc `body.price` / `body.unit_price`.
    expect(source).not.toMatch(/body\.(price|unit_price|total)/);
  });

  it('chỉ mua thêm được cho đặt chỗ đã thanh toán', () => {
    expect(source).toMatch(/booking\.status !== 'confirmed' && booking\.status !== 'completed'/);
    expect(source).toMatch(/status: 409/);
  });

  it('ghi vào `booking_baggage` với trạng thái `pending`', () => {
    expect(source).toMatch(/status: 'pending'/);
  });

  it('có API GET trả về dịch vụ đã mua và số tiền còn nợ', () => {
    expect(source).toMatch(/getBookingBaggage/);
    expect(source).toMatch(/getPendingBaggageAmount/);
  });
});

describe('API đổi ghế', () => {
  const source = readFileSync(SEAT_ROUTE, 'utf8');

  it('phí chênh lệch do server tính', () => {
    expect(source).toMatch(
      /getSeatCharge\(newSeat\) - \(oldSeat \? getSeatCharge\(oldSeat\) : 0\)/
    );
    expect(source).not.toMatch(/body\.price/);
  });

  it('trả 409 khi ghế vừa có người chọn (23505)', () => {
    expect(source).toMatch(/23505/);
    expect(source).toMatch(/status: 409/);
  });

  it('không cho đổi ghế của đặt chỗ chưa thanh toán', () => {
    expect(source).toMatch(/booking\.status !== 'confirmed' && booking\.status !== 'completed'/);
  });

  it('ghi nhật ký đổi ghế qua `changeBookingSeat`', () => {
    expect(source).toMatch(/changeBookingSeat\(\{/);
  });
});

describe('trang quản lý đặt chỗ có nút mua thêm hành lý & đổi ghế', () => {
  const tripCard = readFileSync(
    join(process.cwd(), 'src/features/bookings/components/TripCard.tsx'),
    'utf8'
  );

  it('có nút "Mua thêm hành lý"', () => {
    expect(tripCard).toMatch(/Mua thêm hành lý/);
  });

  it('có nút "Đổi ghế"', () => {
    expect(tripCard).toMatch(/Đổi ghế/);
  });

  it('chỉ hiện nút dịch vụ khi vé đã thanh toán', () => {
    expect(tripCard).toMatch(/leg\.status === 'confirmed' \|\| leg\.status === 'completed'/);
  });
});

describe('trang quản lý đặt chỗ không còn N+1 request check-in', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/chuyen-bay-cua-toi/page.tsx'), 'utf8');

  it('không gọi `/api/checkin/status/<id>` cho từng booking', () => {
    const code = stripComments(page);
    expect(code).not.toMatch(/fetch\([^)]*checkin\/status/);
    expect(code).not.toMatch(/['"`]\/api\/checkin\/status/);
  });

  it('check-in lấy từ query danh sách', () => {
    const db = readFileSync(join(process.cwd(), 'src/lib/db.ts'), 'utf8');
    expect(db).toMatch(/LEFT JOIN check_in ci ON b\.id = ci\.booking_id/);
  });
});

describe('trang quản lý đặt chỗ in PNR thật, không in UUID', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/chuyen-bay-cua-toi/page.tsx'), 'utf8');

  it('không còn mẫu `Đặt chỗ: {b.id}` (UUID)', () => {
    expect(page).not.toMatch(/Đặt chỗ:\s*\{b\.id\}/);
  });

  it('TripCard in PNR của chặng', () => {
    const tripCard = readFileSync(
      join(process.cwd(), 'src/features/bookings/components/TripCard.tsx'),
      'utf8'
    );
    expect(tripCard).toMatch(/primaryLeg\.bookingCode/);
  });
});
