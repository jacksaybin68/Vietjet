/**
 * Thu thập dữ liệu từ vietjetair.com cho OpenClaw.
 *
 * Kiểm trên dữ liệu GHI LẠI thật từ mạng (2026-10-18): /api/v1/citypair của
 * CMS trả shape như fixture dưới; gateway /booking thì WAF 403 (HTML) —
 * module phải thất bại rõ nguyên nhân, không bao giờ rả chuyến/giá bịa.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildNetworkReply,
  buildScheduleReply,
  clearAllPendingImports,
  collectVietjetNetwork,
  collectVietjetSchedule,
  importWebFlights,
  parseCollectCommand,
  setPendingImport,
  takePendingImport,
  type Fetcher,
  type Json,
} from '@/lib/openclaw/web-collection';
import { clearPendingCommands } from '@/lib/openclaw/flight-command';
import { parseCollectCommand as parseCollectAlias } from '@/lib/openclaw/web-collection';

vi.mock('@/lib/neon', async () => {
  const insertRows: unknown[][] = [];
  const tagged = Object.assign(
    vi.fn().mockImplementation(async () => {
      // mỗi lệnh INSERT trả 1 row — mô phỏng ON CONFLICT DO NOTHING RETURNING
      const rows = insertRows.length ? insertRows.pop() : [{ id: 'inserted' }];
      return rows;
    }),
    { query: vi.fn().mockResolvedValue([]), transaction: vi.fn() }
  );
  return { sql: tagged };
});

const TODAY = '2026-10-18';
const TOMORROW = '2026-10-19';

/** Fetcher trả đúng một JSON thật với status cho trước. */
function jsonFetcher(payload: Json | string, status = 200): Fetcher {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  }));
}

//外形 thật thu được từ vietjetcms-api.vietjetair.com/api/v1/citypair 2026-10-18.
const REAL_CITYPAIR_SHAPE: Json = {
  status: true,
  citypairs: [
    {
      departureName: 'HAN',
      airportDepartureName: [
        {
          id: 'r1',
          departureCode: 'HAN',
          arrivalCode: 'SGN',
          identifier: 'HAN-SGN',
          airportDepartureName: {
            id: 'a1',
            code: 'HAN',
            name: 'Sân bay quốc tế Nội Bài',
            engName: 'Noi Bai International Airport',
            province: { id: 'p1', provinceName: 'Hà Nội' },
          },
          airportArrivalName: {
            id: 'a2',
            code: 'SGN',
            name: 'Sân bay quốc tế Tân Sơn Nhất',
            engName: 'Tan Son Nhat International Airport',
            province: { id: 'p2', provinceName: 'TP. Hồ Chí Minh' },
          },
        },
      ],
    },
    {
      departureName: 'HAN',
      airportDepartureName: [
        {
          id: 'r2',
          departureCode: 'HAN',
          arrivalCode: 'DAD',
          identifier: 'HAN-DAD',
          airportDepartureName: {
            id: 'a1',
            code: 'HAN',
            name: 'Sân bay quốc tế Nội Bài',
            engName: 'Noi Bai International Airport',
            province: { id: 'p1', provinceName: 'Hà Nội' },
          },
          airportArrivalName: {
            id: 'a3',
            code: 'DAD',
            name: 'Sân bay quốc tế Đà Nẵng',
            engName: 'Da Nang International Airport',
            province: { id: 'p3', provinceName: 'Đà Nẵng' },
          },
        },
      ],
    },
  ],
};

describe('nhận dạng lệnh thu thập', () => {
  it('sân bay/tuyến bay đi vào collect-network', () => {
    expect(parseCollectCommand('thu thập sân bay và tuyến bay từ vietjetair.com', TODAY)).toEqual({
      kind: 'collect-network',
    });
    expect(parseCollectAlias('thu thap tuyen bay', TODAY)?.kind).toBe('collect-network');
    expect(parseCollectAlias('crawl airports', TODAY)?.kind).toBe('collect-network');
  });

  it('chặng + ngày cho collect-schedule; ngày mai/tương đối được đọc', () => {
    expect(parseCollectCommand('thu thập chuyến bay SGN-HAN ngày mai', TODAY)).toMatchObject({
      kind: 'collect-schedule',
      from: 'SGN',
      to: 'HAN',
      date: TOMORROW,
    });
    expect(
      parseCollectCommand('lấy dữ liệu chuyến bay từ HAN đến SGN ngày 20/10', TODAY)
    ).toMatchObject({
      kind: 'collect-schedule',
      from: 'HAN',
      to: 'SGN',
      date: '2026-10-20',
    });
    // Không có ngày → hôm nay.
    expect(parseCollectCommand('thu thập giá vé SGN đi HAN', TODAY)).toMatchObject({ date: TODAY });
  });

  it('cùng mã hai bên bị bóc lỗi', () => {
    expect(parseCollectCommand('thu thập chuyến bay SGN-SGN ngày mai', TODAY)?.kind).toBe(
      'collect-invalid'
    );
  });

  it('động từ thu thập nhưng thiếu mục tiêu → gợi ý đúng dạng', () => {
    const command = parseCollectCommand('thu thập dữ liệu', TODAY);
    expect(command?.kind).toBe('collect-invalid');
    if (command?.kind !== 'collect-invalid') return;
    expect(command.reasons.join(' ')).toContain('SGN-HAN');
  });

  it('câu thường không phải lệnh thu thập → null, không cản đường lệnh giá', () => {
    expect(
      parseCollectCommand('cập nhật giá vé VJ 3017 ngày mai phổ thông thành 950k', TODAY)
    ).toBeNull();
    expect(parseCollectCommand('lên lịch bay bao lâu', TODAY)).toBeNull();
  });
});

describe('thu thập mạng lưới (dữ liệu thật ghi lại)', () => {
  it('rót citypair thật → sân bay duy nhất theo code + tuyến riêng', async () => {
    const fetcher = jsonFetcher(REAL_CITYPAIR_SHAPE);
    const net = await collectVietjetNetwork(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(net.airports.map((a) => a.code)).toEqual(['HAN', 'SGN', 'DAD']); // HAN chỉ một bản dù gặp 2 lần
    const han = net.airports[0];
    expect(han.name).toContain('Nội Bài');
    expect(han.city).toBe('Hà Nội');
    expect(net.routes).toEqual(['HAN-SGN', 'HAN-DAD']);
  });

  it('WAF trả HTML (403) → lỗi rõ nguyên nhân, không bịa dữ liệu', async () => {
    const fetcher = jsonFetcher(
      '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><TITLE>403 ERROR</TITLE>',
      403
    );
    await expect(collectVietjetNetwork(fetcher)).rejects.toThrow(/HTTP 403/);
  });

  it('JSON rỗng/thiếu citypairs → lỗi, không trả mạng rỗng như thật', async () => {
    await expect(collectVietjetNetwork(jsonFetcher({ status: true }))).rejects.toThrow(/rỗng/);
  });

  it('lời trả lời nêu đếm đúng + gợi ý lệnh lịch', () => {
    const net = {
      airports: [{ code: 'HAN', name: 'Nội Bài', city: 'Hà Nội' }],
      routes: ['HAN-SGN'],
      source: 'test',
    };
    const reply = buildNetworkReply(net);
    expect(reply).toContain('1 sân bay');
    expect(reply).toContain('1 cặp tuyến');
    expect(reply).toContain('xác nhận');
  });
});

describe('thu thập lịch bay/giá (gateway /booking)', () => {
  it('403 từ WAF → reachable:false với lý do chỉ dẫn cookie, không chuyến nào bịa', async () => {
    const fetcher = jsonFetcher('<H1>ERROR: The request could not be satisfied</H1>', 403);
    const result = await collectVietjetSchedule('SGN', 'HAN', TOMORROW, fetcher);
    expect(result.reachable).toBe(false);
    if (result.reachable) return;
    expect(result.reason).toContain('403');
    expect(result.reason).toContain('aws-waf-token');
  });

  it('response thật có chuyến → parser nhận số hiệu, giờ vnd hai dạng', async () => {
    // Shape "đã cho sẵn" của search-flight: giờ dạng giờ:phút và fares mảng.
    const fetcher = jsonFetcher({
      status: true,
      flights: [
        {
          flightNumber: 'VJ 310',
          departureDateTime: '2026-10-19T00:00:00+07:00',
          arrivalDateTime: '2026-10-19T02:10:00+07:00',
          fareAmount: '1.150.000',
          fares: [{ cabin: 'SkyBOSS', amount: '2490000' }],
        },
        {
          flightNumber: 'VJ322',
          departureDateTime: '07:30',
          arrivalDateTime: '09:45',
          fareAmount: '899000',
          fares: [],
        },
      ],
    });
    const result = await collectVietjetSchedule('SGN', 'HAN', TOMORROW, fetcher);
    expect(result.reachable).toBe(true);
    if (!result.reachable) return;
    expect(result.flights).toHaveLength(2);
    expect(result.flights[0]).toMatchObject({
      flightNo: 'VJ 310',
      departTime: '00:00',
      arriveTime: '02:10',
      price: 1150000,
    });
    expect(result.flights[0].fares[0]).toMatchObject({ cabin: 'SkyBOSS', amount: 2490000 });
    // số hiệu thiếu khoảng trắng được chuẩn hóa đúng như bảng DB lưu
    expect(result.flights[1].flightNo).toBe('VJ322');
    expect(result.flights[1].price).toBe(899000);
  });

  it('lượt bịa thiếu số hiệu/giờ bị removed khỏi danh sách, không dừng cả lô', async () => {
    const fetcher = jsonFetcher({
      flights: [
        { departureDateTime: '07:30', arrivalDateTime: '09:45', fareAmount: '500000' }, // thiếu flightNumber
        {
          flightNumber: 'VJ 300',
          departureDateTime: '05:55',
          arrivalDateTime: '08:05',
          fareAmount: '700000',
        },
      ],
    });
    const result = await collectVietjetSchedule('SGN', 'HAN', TOMORROW, fetcher);
    expect(result.reachable).toBe(true);
    if (!result.reachable) return;
    expect(result.flights.map((f) => f.flightNo)).toEqual(['VJ 300']);
  });

  it('lời trả 403 nêu cách sơ cứu bằng cookie WAF', () => {
    const reply = buildScheduleReply({
      reachable: false,
      reason: 'CloudFront/WAF chặn HTTP 403.',
    });
    expect(reply).toContain('VIETJET_WAF_COOKIE');
    expect(reply).toContain('Không lấy được');
  });
});

describe('nhập lượt thu được (sau "xác nhận")', () => {
  beforeEach(() => {
    clearPendingCommands();
    clearAllPendingImports();
  });
  afterEach(() => {
    clearAllPendingImports();
  });

  it('lượt nặng gần như thật → INSERT với giá economy = giá rẻ nhất, Thương gia 2.77×', async () => {
    const { sql } = await import('@/lib/neon');
    const result = await importWebFlights({ from: 'SGN', to: 'HAN' }, TOMORROW, [
      {
        flightNo: 'VJ 310',
        from: 'SGN',
        to: 'HAN',
        departTime: '06:00',
        arriveTime: '08:10',
        price: 1150000,
        fares: [],
      },
      // Bay trá đêm: 22:30 → 00:45 (+1 ngày)
      {
        flightNo: 'VJ 320',
        from: 'SGN',
        to: 'HAN',
        departTime: '22:30',
        arriveTime: '00:45',
        price: 700000,
        fares: [],
      },
    ]);
    expect(result.imported).toEqual(['VJ 310 06:00', 'VJ 320 22:30']);
    expect(result.skipped).toEqual([]);
    const sqlMock = sql as unknown as { mock: { calls: Array<Array<unknown>> } };
    // Tagged template: call = [chuỗi khung SQL, ...tham số $1..]
    const [firstStrings, ...firstArgs] = sqlMock.mock.calls[0];
    const firstText = String(firstStrings);
    expect(firstText).toContain('ON CONFLICT (from_code, to_code, depart_time) DO NOTHING');
    expect(firstText).toContain('depart_time');
    expect(firstText).toContain("'economy'");

    expect(firstArgs).toContain('VJ 310');
    expect(firstArgs).toContain(1150000);
    // Thương gia nội suy theo hệ số 030: 1.150.000 → 3.185.500
    expect(firstArgs).toContain(1150000 * 2.77);
    // Lượt trá đêm: đến sau nửa đêm (+1 ngày lịch) — 22:30 đi, 00:45 đến
    expect(sqlMock.mock.calls[1].slice(1)).toEqual(expect.arrayContaining(['VJ 320']));
    expect(sqlMock.mock.calls[1].slice(1)).toEqual(
      expect.arrayContaining(['2026-10-19T22:30:00+07:00', '2026-10-20T00:45:00+07:00'])
    );
  });

  it('một lô lẫn lượt dở: bỏ lượt đúng nguyên nhân, không ném 500', async () => {
    const result = await importWebFlights({ from: 'SGN', to: 'HAN' }, TOMORROW, [
      {
        flightNo: 'VJ 350X',
        from: 'SGN',
        to: 'HAN',
        departTime: '05:00',
        arriveTime: '07:00',
        price: 900000,
        fares: [],
      }, // số hiệu có chữ
      {
        flightNo: 'VJ 351',
        from: 'SGN',
        to: 'HAN',
        departTime: '06:00',
        arriveTime: '08:00',
        price: 0,
        fares: [],
      }, // giá không đọc được
      {
        flightNo: 'VJ 352',
        from: 'SGN',
        to: 'HAN',
        departTime: '07:00',
        arriveTime: '09:00',
        price: 800000,
        fares: [],
      },
    ]);
    expect(result.imported).toEqual(['VJ 352 07:00']);
    expect(result.skipped[0]).toContain('số hiệu');
    expect(result.skipped[1]).toContain('không đọc được giá');
  });
});

describe('bộ chờ nhập web-flight', () => {
  beforeEach(() => clearAllPendingImports());

  it('đặt → lấy → hết hạn sau 5 phút', () => {
    setPendingImport('admin-1', {
      kind: 'import-web-flights',
      from: 'SGN',
      to: 'HAN',
      date: TOMORROW,
      flights: [],
      createdAt: 0,
    });
    expect(takePendingImport('admin-2')).toBeNull();
    expect(takePendingImport('admin-1', Date.now() + 4 * 60_000)).not.toBeNull();
    setPendingImport('admin-1', {
      kind: 'import-web-flights',
      from: 'SGN',
      to: 'HAN',
      date: TOMORROW,
      flights: [],
      createdAt: 0,
    });
    expect(takePendingImport('admin-1', Date.now() + 6 * 60_000)).toBeNull();
  });
});
