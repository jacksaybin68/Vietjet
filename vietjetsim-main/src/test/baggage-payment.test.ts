import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Thanh toán phần hành lý mua thêm sau khi đặt vé.
 *
 * Đường ghi tiền mới ⇒ mọi quy tắc của đường ghi tiền cũ áp dụng:
 *   - Số tiền do SERVER tính (`getPendingBaggageAmount`), client không gửi.
 *   - Đánh dấu `paid` phải idempotent, nếu không một lần bấm có thể cộng
 *     tiền hai lần.
 *   - Không đủ số dư ví ⇒ 402, không phải 500.
 */
const ROUTE = join(process.cwd(), 'src/app/api/dat-ve/[id]/dich-vu/thanh-toan/route.ts');
const DB = readFileSync(join(process.cwd(), 'src/lib/db.ts'), 'utf8');

describe('endpoint thanh toán hành lý bổ sung', () => {
  const source = readFileSync(ROUTE, 'utf8');

  it('số tiền lấy từ server, không đọc amount từ request', () => {
    expect(source).toMatch(/getPendingBaggageAmount\(booking\.id\)/);
    expect(source).not.toMatch(/body\.amount/);
  });

  it('trừ ví qua `spendWalletBalance` (tiền thật, không phải cờ "đã thanh toán")', () => {
    expect(source).toMatch(/spendWalletBalance\(/);
  });

  it('không đủ số dư ⇒ 402', () => {
    expect(source).toMatch(/status: insufficient \? 402 : 400/);
  });

  it('chỉ thanh toán được cho vé đã mua', () => {
    expect(source).toMatch(/booking\.status !== 'confirmed' && booking\.status !== 'completed'/);
  });

  it('kiểm tra quyền sở hữu trước khi thu tiền', () => {
    expect(source).toMatch(/isGuestBookingOwner\(request, booking\.id\)/);
    expect(source).toMatch(/isAdminRole\(user\.role\) \|\| booking\.user_id === user\.userId/);
  });

  it('ghi giao dịch và đánh dấu hành lý đã trả', () => {
    expect(source).toMatch(/createPayment\(\{/);
    expect(source).toMatch(/markBookingBaggagePaid\(booking\.id, payment\.id\)/);
  });

  it('cộng phí vào tổng tiền booking', () => {
    expect(source).toMatch(/addBookingExtraCharge\(booking\.id, amount\)/);
  });

  it('chỉ cộng tiền khi thực sự có gói hành lý chuyển sang `paid`', () => {
    // `markBookingBaggagePaid` idempotent: lần gọi thứ hai trả 0 ⇒ không cộng
    // tiền lần nữa.
    expect(source).toMatch(/if \(markedCount > 0\) \{/);
  });
});

describe('helper DB cho phí dịch vụ bổ sung', () => {
  it('`addBookingExtraCharge` cộng vào `total_price`', () => {
    expect(DB).toMatch(/export async function addBookingExtraCharge\(/);
    expect(DB).toMatch(/SET total_price = COALESCE\(total_price, 0\) \+ \$\{delta\}/);
  });

  it('`markBookingBaggagePaid` chỉ đụng dòng `pending` (idempotent)', () => {
    expect(DB).toMatch(/WHERE booking_id = \$\{bookingId\} AND status = 'pending'/);
  });

  it('ghi `payment_id` vào gói hành lý để đối soát được', () => {
    expect(DB).toMatch(/SET status = 'paid', payment_id = \$\{paymentId \?\? null\}/);
  });
});

describe('migration 047 bổ sung cột thanh toán còn thiếu', () => {
  const migration = readFileSync(
    join(process.cwd(), 'migrations/047_payment_receipt_columns.sql'),
    'utf8'
  );

  it('tạo đủ 4 cột mà mã nguồn đã dùng', () => {
    expect(migration).toMatch(/ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_image TEXT;/);
    expect(migration).toMatch(
      /ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_note VARCHAR\(50\);/
    );
    expect(migration).toMatch(/ALTER TABLE bookings ADD COLUMN IF NOT EXISTS receipt_image TEXT;/);
    expect(migration).toMatch(
      /ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transfer_note VARCHAR\(50\);/
    );
  });

  it('idempotent (`IF NOT EXISTS` ở mọi câu ALTER)', () => {
    const alters = migration.match(/ALTER TABLE [^;]+;/g) ?? [];
    expect(alters.length).toBeGreaterThan(0);
    for (const stmt of alters) {
      expect(stmt).toMatch(/IF NOT EXISTS/);
    }
  });

  it('thêm `booking_baggage.payment_id` (FK tới payments)', () => {
    expect(migration).toMatch(
      /ALTER TABLE booking_baggage\s*\n\s*ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments\(id\)/
    );
  });
});
