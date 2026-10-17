/**
 * Tra cứu chuyến bay cho OpenClaw Coordinator.
 *
 * Hai nhóm:
 *  - hàm thuần: tách chặng/ngày từ câu hỏi, dựng ngữ cảnh cho model;
 *  - `researchVietjetFlights`: đọc bảng `flights` và ép giá `NUMERIC` (về từ
 *    driver dưới dạng chuỗi) về số, để không nối chuỗi khi định dạng.
 *
 * Điều được ghim ở đây là **tính trung thực**: khi không có chuyến thì ngữ cảnh
 * phải nói là không có. Bản cũ trả `flights: []` kèm `isRealTime: true` và bảo
 * model "Đã tìm thấy lộ trình thực tế", nên model tự bịa số hiệu và giá.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  searchFlights: vi.fn(),
  getAvailableDepartDates: vi.fn(),
}));

import { getAvailableDepartDates, searchFlights, type FlightRecord } from '@/lib/db';
import {
  buildCoordinatorContext,
  collectAirportCodes,
  parseFlightDate,
  parseFlightQuery,
  researchVietjetFlights,
  todayInVietnam,
  type FlightResearchResult,
} from '@/lib/openclaw/flight-researcher';

const TODAY = '2026-10-18';

const flightRow = (over: Partial<FlightRecord> = {}): FlightRecord =>
  ({
    id: 'f1',
    flight_no: 'VJ301',
    from_code: 'HAN',
    to_code: 'SGN',
    depart_time: '2026-10-25T23:00:00.000Z', // 06:00 ngày 26/10 giờ VN
    arrive_time: '2026-10-26T01:25:00.000Z',
    price: 899000,
    economy_price: '899000', // NUMERIC → chuỗi, như driver trả về
    business_price: '2490000',
    class: 'economy',
    available: 189,
    status: 'active',
    gate: null,
    terminal: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  }) as FlightRecord;

describe('tách chặng và ngày từ câu hỏi', () => {
  it('hai mã sân bay: mã đầu là đi, mã thứ hai là đến', () => {
    expect(parseFlightQuery('cập nhật chuyến bay HAN-SGN hôm nay', TODAY)).toMatchObject({
      origin: 'HAN',
      destination: 'SGN',
      date: TODAY,
    });
    // Đảo chiều phải cho chặng đảo chiều, không luôn là HAN-SGN.
    expect(parseFlightQuery('chuyến bay SGN đi DAD', TODAY)).toMatchObject({
      origin: 'SGN',
      destination: 'DAD',
    });
  });

  it('tên thành phố tiếng Việt cũng nhận, không cần mã IATA', () => {
    expect(parseFlightQuery('chuyến bay Hà Nội đi Phú Quốc', TODAY)).toMatchObject({
      origin: 'HAN',
      destination: 'PQC',
    });
  });

  it('một mã thì ghép với đầu còn lại của cặp mặc định', () => {
    expect(parseFlightQuery('vé máy bay đi Đà Nẵng', TODAY)).toMatchObject({ destination: 'DAD' });
    expect(parseFlightQuery('vé máy bay từ SGN', TODAY)).toMatchObject({
      origin: 'SGN',
      destination: 'HAN',
    });
  });

  it('không có mã nào thì hỏi cặp mặc định HAN-SGN', () => {
    expect(parseFlightQuery('cập nhật chuyến bay hôm nay', TODAY)).toMatchObject({
      origin: 'HAN',
      destination: 'SGN',
    });
  });

  it('ngày ISO trong câu được dùng nguyên', () => {
    expect(parseFlightDate('chuyến bay ngày 2026-12-20', TODAY)).toBe('2026-12-20');
  });

  it('ngày ngắn không ghi năm mà đã qua thì hiểu là năm sau (Tết)', () => {
    // Hôm nay 18/10/2026 mà hỏi "6/2" — đó là Tết 2027, không phải 6/2/2026.
    expect(parseFlightDate('chuyến bay ngày 6/2', TODAY)).toBe('2027-02-06');
    // Còn một ngày chưa tới trong năm nay thì giữ nguyên năm.
    expect(parseFlightDate('chuyến bay 25/12', TODAY)).toBe('2026-12-25');
  });

  it('mã trùng lặp chỉ tính một lần và theo thứ tự xuất hiện', () => {
    expect(collectAirportCodes('HAN-SGN, rồi HAN-DAD')).toEqual(['HAN', 'SGN', 'DAD']);
  });

  it('không cắt nhầm mã nằm trong từ khác', () => {
    // "han" trong "hành lý" không phải mã HAN.
    expect(collectAirportCodes('hỏi về hành lý ký gửi')).toEqual([]);
  });
});

describe('ngữ cảnh điều phối cho model', () => {
  it('có chuyến: nêu đúng số hiệu, giờ, giá và số chỗ', () => {
    const result: FlightResearchResult = {
      origin: 'HAN',
      destination: 'SGN',
      date: '2026-10-26',
      flights: [
        {
          flightNo: 'VJ301',
          from: 'HAN',
          to: 'SGN',
          departTime: '06:00',
          arriveTime: '08:25',
          economyPrice: 899000,
          businessPrice: 2490000,
          available: 189,
        },
      ],
      availableDates: [],
      bookingUrl:
        'https://www.vietjetair.com/vi/dat-ve/search?origin=HAN&destination=SGN&departureDate=2026-10-26&adults=1&currency=VND',
      source: 'database',
    };

    const text = buildCoordinatorContext(result);
    expect(text).toContain('TRẠNG THÁI HIỆN TẠI');
    expect(text).toContain('(2026-10-26)');
    expect(text).toContain('VJ301 06:00→08:25');
    expect(text).toContain('899');
    expect(text).toContain('2.490.000'); // định dạng tiền vi-VN
    expect(text).toContain('189 chỗ');
    expect(text).toContain('departureDate=2026-10-26');
    expect(text).toContain('không bịa');
  });

  it('không có chuyến: nói thẳng là không có, kèm ngày gần nhất', () => {
    const result: FlightResearchResult = {
      origin: 'HAN',
      destination: 'SGN',
      date: '2027-02-06',
      flights: [],
      availableDates: ['2026-10-20', '2026-10-21'],
      bookingUrl:
        'https://www.vietjetair.com/vi/dat-ve/search?origin=HAN&destination=SGN&departureDate=2027-02-06&adults=1&currency=VND',
      source: 'database',
    };

    const text = buildCoordinatorContext(result);
    expect(text).toContain('KHÔNG có chuyến nào cho ngày 2027-02-06');
    expect(text).toContain('2026-10-20');
    expect(text).toContain('không bịa');
    // Bản cũ tuyên bố sai rằng đã tìm thấy lộ trình thực tế.
    expect(text).not.toContain('Đã tìm thấy lộ trình thực tế');
  });
});

describe('researchVietjetFlights', () => {
  beforeEach(() => {
    vi.mocked(searchFlights).mockReset();
    vi.mocked(getAvailableDepartDates).mockReset();
  });

  it('đọc bảng flights và ép giá NUMERIC (chuỗi) về số', async () => {
    vi.mocked(searchFlights).mockResolvedValue([flightRow()]);

    const result = await researchVietjetFlights('HAN', 'SGN', '2026-10-26');

    expect(vi.mocked(searchFlights)).toHaveBeenCalledWith({
      from_code: 'HAN',
      to_code: 'SGN',
      depart_date: '2026-10-26',
    });
    expect(result.source).toBe('database');
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].economyPrice).toBe(899000);
    expect(result.flights[0].businessPrice).toBe(2490000);
    // Giờ đọc theo Việt Nam, không phải UTC.
    expect(result.flights[0].departTime).toBe('06:00');
    // Ngày có chuyến thì không cần gợi ý ngày khác.
    expect(vi.mocked(getAvailableDepartDates)).not.toHaveBeenCalled();
  });

  it('ngày trống: trả danh sách ngày gần nhất còn chuyến', async () => {
    vi.mocked(searchFlights).mockResolvedValue([]);
    vi.mocked(getAvailableDepartDates).mockResolvedValue(['2026-10-20']);

    const result = await researchVietjetFlights('HAN', 'SGN', '2027-02-06');

    expect(result.flights).toEqual([]);
    expect(result.availableDates).toEqual(['2026-10-20']);
    expect(result.bookingUrl).toContain('departureDate=2027-02-06');
  });

  it('lỗi khi tra ngày gần nhất không làm hỏng kết quả rỗng', async () => {
    vi.mocked(searchFlights).mockResolvedValue([]);
    vi.mocked(getAvailableDepartDates).mockRejectedValue(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await researchVietjetFlights('HAN', 'SGN', '2027-02-06');

    expect(result.flights).toEqual([]);
    expect(result.availableDates).toEqual([]);
    spy.mockRestore();
  });
});

describe('todayInVietnam', () => {
  it('trả ngày dạng YYYY-MM-DD', () => {
    expect(todayInVietnam()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
