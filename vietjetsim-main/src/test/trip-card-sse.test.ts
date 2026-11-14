import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Thẻ trip (khứ hồi) và trạng thái chuyến bay thời gian thực.
 *
 * Trước đây `/chuyen-bay-cua-toi` liệt kê từng booking một dòng, nên khách
 * khứ hồi phải tự ghép "chặng đi" với "chặng về" bằng mắt. Nay hai chặng
 * phải nằm trong MỘT thẻ, và trạng thái chuyến bay phải tự cập nhật (SSE)
 * chứ không phải F5 để xem cửa ra máy bay.
 */
const TRIP_CARD = join(process.cwd(), 'src/features/bookings/components/TripCard.tsx');
const PAGE = join(process.cwd(), 'src/app/chuyen-bay-cua-toi/page.tsx');
const SSE_ROUTE = join(process.cwd(), 'src/app/api/sse/trang-thai-chuyen-bay/route.ts');

describe('thẻ trip gộp hai chặng', () => {
  const source = readFileSync(TRIP_CARD, 'utf8');

  it('nhận prop `trip` có danh sách chặng', () => {
    expect(source).toMatch(/legs/);
  });

  it('hiển thị PNR của chặng chính', () => {
    expect(source).toMatch(/primaryLeg\.bookingCode/);
  });

  it('phân biệt chặng đi và chặng về', () => {
    expect(source).toMatch(/outbound/);
    expect(source).toMatch(/inbound/);
  });

  it('hiện giờ bay tới / cửa ra máy bay của từng chặng', () => {
    expect(source).toMatch(/flight\.gate|flight_status/);
  });
});

describe('trạng thái chuyến bay cập nhật qua SSE', () => {
  const card = readFileSync(TRIP_CARD, 'utf8');

  it('mở EventSource cho từng chặng', () => {
    expect(card).toMatch(/new EventSource\(/);
    expect(card).toMatch(/\/api\/sse\/trang-thai-chuyen-bay\?flightNo=/);
  });

  it('đóng EventSource khi unmount (không rò rỉ kết nối)', () => {
    expect(card).toMatch(/\.close\(\)/);
  });

  it('route SSE trả header `text/event-stream`', () => {
    const route = readFileSync(SSE_ROUTE, 'utf8');
    expect(route).toMatch(/text\/event-stream/);
  });
});

describe('trang quản lý đặt chỗ gom booking theo trip', () => {
  const source = readFileSync(PAGE, 'utf8');

  it('gom các booking cùng `trip_id` vào một trip', () => {
    expect(source).toMatch(/trip_id/);
    expect(source).toMatch(/trips/);
  });

  it('render TripCard cho từng trip', () => {
    expect(source).toMatch(/<TripCard/);
  });
});
