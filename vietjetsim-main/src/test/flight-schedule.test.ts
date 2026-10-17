/**
 * Lịch bay dùng chung của các script seed (`scripts/flight-schedule.cjs`).
 *
 * Đây là chỗ duy nhất kiểm được lịch trước khi ghi hàng chục nghìn dòng vào
 * database: những gì ghim ở đây là những gì database sẽ từ chối nếu sai —
 * bậc giá của migration 030, hình dạng `flight_no` của 036, và khoá duy nhất
 * `(from_code, to_code, depart_time)` mà lệnh INSERT dựa vào.
 *
 * Không cần database và không ghi gì.
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);

type RouteTuple = [string, string, string, string, number, number, number, number];
interface ScheduleRow {
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price: number;
  class: string;
  available: number;
  economy_price: number;
  business_price: number;
}

const { ROUTES, buildSchedule } = require_('../../scripts/flight-schedule.cjs') as {
  ROUTES: RouteTuple[];
  buildSchedule: (range: { from: Date; until: Date }) => ScheduleRow[];
};

const rows = buildSchedule({
  from: new Date('2026-10-19T00:00:00'),
  until: new Date('2026-10-21T00:00:00'),
});

const vnDay = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));

describe('lịch bay seed', () => {
  it('phủ mọi ngày trong khoảng, hai sóng mỗi tuyến', () => {
    const days = new Set(rows.map((r) => vnDay(r.depart_time)));
    expect([...days].sort()).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
    expect(rows).toHaveLength(3 * ROUTES.length * 2);
  });

  it('mọi hàng thoả bậc giá của migration 030 (economy <= business)', () => {
    const inverted = rows.filter((r) => r.economy_price > r.business_price);
    expect(inverted).toEqual([]);
    // Và cả hai cột đều dương — 030 để chúng NOT NULL, không default.
    for (const r of rows) {
      expect(r.economy_price).toBeGreaterThan(0);
      expect(r.business_price).toBeGreaterThan(0);
    }
  });

  it('mọi số hiệu khớp CHECK của migration 036', () => {
    const pattern = /^[A-Z]{2} ?[0-9]{2,4}(-[0-9]{4})?$/;
    expect(rows.filter((r) => !pattern.test(r.flight_no))).toEqual([]);
  });

  it('giờ đến sau giờ đi và giữ offset +07:00', () => {
    for (const r of rows) {
      expect(r.arrive_time.endsWith('+07:00')).toBe(true);
      expect(r.depart_time.endsWith('+07:00')).toBe(true);
      expect(new Date(r.arrive_time).getTime()).toBeGreaterThan(new Date(r.depart_time).getTime());
    }
  });

  it('không tự trùng khoá duy nhất (from, to, depart_time)', () => {
    // Nếu tự trùng thì ON CONFLICT DO NOTHING sẽ âm thầm bỏ hàng, và khoảng phủ
    // hụt mà không ai thấy.
    const keys = rows.map((r) => `${r.from_code}-${r.to_code}-${r.depart_time}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('có mặt bảy sân bay nội địa từng bị bỏ trống', () => {
    const endpoints = new Set(rows.flatMap((r) => [r.from_code, r.to_code]));
    for (const code of ['DIN', 'PXU', 'TBB', 'UIH', 'VCL', 'VDH', 'VDO']) {
      expect(endpoints.has(code), `${code} không có tuyến nào`).toBe(true);
    }
  });

  it('có các chặng trục từng thiếu', () => {
    const pairs = new Set(ROUTES.map(([, from, to]) => `${from}-${to}`));
    for (const pair of ['HAN-PQC', 'SGN-DAD', 'HAN-HUI', 'SGN-CXR', 'HAN-VII', 'SGN-VII']) {
      expect(pairs.has(pair), `${pair} thiếu`).toBe(true);
    }
  });

  it('không dựng tuyến không có thật (Côn Đảo và Rạch Giá không bay từ Hà Nội)', () => {
    const pairs = new Set(ROUTES.map(([, from, to]) => `${from}-${to}`));
    expect(pairs.has('HAN-VCS')).toBe(false);
    expect(pairs.has('HAN-VKG')).toBe(false);
    expect(pairs.has('SGN-VCS')).toBe(true);
    expect(pairs.has('SGN-VKG')).toBe(true);
  });

  it('đúng ngày Tết 2027-02-06 có chuyến để bán', () => {
    const tet = buildSchedule({
      from: new Date('2027-02-06T00:00:00'),
      until: new Date('2027-02-06T00:00:00'),
    });
    expect(tet.length).toBe(ROUTES.length * 2);
    expect(tet.every((r) => vnDay(r.depart_time) === '2027-02-06')).toBe(true);
  });
});
