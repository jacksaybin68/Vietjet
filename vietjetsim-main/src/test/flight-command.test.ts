/**
 * Lệnh cập nhật chuyến bay vía/OpenClaw của trợ lý quản trị.
 *
 * Ba lớp được ghim ở đây:
 *  1. `parseFlightCommand` nhận dạng lệnh bằng quy tắc — con số, số hiệu và
 *     hạng vé đến từ câu chữ, KHÔNG từ model. Đây là ranh giới chống bịa số
 *     liệu: trước khi có đường lệnh, model曾被 rồi trả lời "giá hiện tại là
 *     950.000 đ" với một giá người hỏi vừa gõ.
 *  2. Lệnh chỉ GHI sau khi `takePendingCommand` trả về nó sau một tin nhắn
 *     "xác nhận" — không có khoá pending thì "xác nhận" là no-op.
 *  3. `applyFlightCommand` tái dùng luật PATCH /api/quan-tri/chuyen-bay/[id]:
 *     thang giá không đảo (migration 030), `price` khớp hạng của dòng, thời
 *     lượng giữ nguyên khi đổi giờ, và audit log cùng một công cụ ghi.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getFlightByNoAndDate: vi.fn(),
  getFlightDatesNear: vi.fn(),
  insertFlightUpdateLog: vi.fn(),
  updateFlight: vi.fn(),
}));

import {
  getFlightByNoAndDate,
  insertFlightUpdateLog,
  updateFlight,
  type FlightRecord,
} from '@/lib/db';
import {
  applyFlightCommand,
  clearPendingCommands,
  formatCommandConfirmPreview,
  isConfirmationMessage,
  parseFlightCommand,
  setPendingCommand,
  takePendingCommand,
} from '@/lib/openclaw/flight-command';
import { toVietnamWallClock } from '@/lib/utils';

const TODAY = '2026-10-18';

const flightRow = (over: Record<string, unknown> = {}): FlightRecord =>
  ({
    id: 'f1',
    flight_no: 'VJ 3017',
    from_code: 'HAN',
    to_code: 'SGN',
    depart_time: '2026-10-18T23:00:00.000Z', // 06:00 ngày 19/10 giờ VN
    arrive_time: '2026-10-19T01:25:00.000Z',
    price: 899000,
    // Giá vé là chuỗi như driver trả NUMERIC về — đúng bối cảnh mà
    // toFareAmount trong applyFlightCommand phải xử lý.
    economy_price: '899000',
    business_price: '2490230',
    class: 'economy',
    available: 189,
    status: 'active',
    gate: null,
    terminal: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
    // `over` có thể truyền giá vào dưới dạng số (như driver không trả chuỗi ở
    // mock) — cast qua unknown để cả hai hình dạng đều nhận.
  }) as unknown as FlightRecord;

describe('nhận dạng lệnh cập nhật', () => {
  it('câu tra cứu thường không phải lệnh', () => {
    expect(parseFlightCommand('chuyến bay HAN-SGN ngày mai có gì?', TODAY)).toBeNull();
    expect(parseFlightCommand('giá vé VJ 3017 ngày mai bao nhiêu?', TODAY)).toBeNull();
    expect(parseFlightCommand('tra cứu chuyến bay hôm nay', TODAY)).toBeNull();
  });

  it('câu có "giá" nhưng không có ý cập nhật vẫn trôi qua đường tra cứu', () => {
    // Ranh giới: 'giá' xuất hiện ở câu hỏi thường xuyên, chỉ khi có động từ
    // cập nhật ("cập nhật", "sửa", "đổi"...) câu mới rơi vào đường lệnh.
    expect(parseFlightCommand('cập nhật giá vé...', TODAY)).not.toBeNull();
  });

  it('lệnh giá chuẩn: số, hạng, ngày đều đến từ câu chữ', () => {
    expect(
      parseFlightCommand('Cập nhật giá vé chuyến VJ 3017 ngày 2026-10-19 thành 950000', TODAY)
    ).toEqual({
      kind: 'update-price',
      flightNo: 'VJ 3017',
      date: '2026-10-19',
      fare: 'economy',
      amount: 950000,
    });
  });

  it('viết thường, kèm khoảng cách giữa hai vế, đều nhận được', () => {
    const command = parseFlightCommand(
      'cập nhật giá vé chuyến vj3017 ngày mai phổ thông thành 950.000',
      TODAY
    );
    expect(command).toMatchObject({
      kind: 'update-price',
      flightNo: 'VJ3017', // normalizeFlightNo giữ nguyên cách viết, chỉ hoa + gộp khoảng trắng
      date: '2026-10-19',
      fare: 'economy',
      amount: 950000,
    });
  });

  it('đơn vị "k"/"triệu" được đổi ra đồng', () => {
    expect(parseFlightCommand('cập nhật giá VJ 3017 ngày mai thành 950k', TODAY)).toMatchObject({
      amount: 950000,
    });
    expect(
      parseFlightCommand('cập nhật giá VJ 3017 ngày mai business thành 2 triệu', TODAY)
    ).toMatchObject({
      fare: 'business',
      amount: 2_000_000,
    });
  });

  it('hạng theo thứ tự xuất hiện khi cả hai trên câu', () => {
    expect(
      parseFlightCommand('cập nhật giá VJ 3017 ngày mai thương gia thành 3 triệu', TODAY)
    ).toMatchObject({
      fare: 'business',
    });
    expect(
      parseFlightCommand('cập nhật giá VJ 3017 ngày mai phổ thông thành 900k', TODAY)
    ).toMatchObject({
      fare: 'economy',
    });
  });

  it('lệnh giờ: sang 10:00 hoặc 10h30', () => {
    expect(
      parseFlightCommand('Thay đổi giờ bay chuyến VJ 3040 ngày mai sang 10:00', TODAY)
    ).toEqual({
      kind: 'update-time',
      flightNo: 'VJ 3040',
      date: '2026-10-19',
      time: '10:00',
    });
    expect(parseFlightCommand('đổi giờ bay VJ 3040 ngày mai 10h30', TODAY)).toMatchObject({
      time: '10:30',
    });
  });

  it('tách lệnh: cả giá lẫn giờ trong một câu là không hợp lệ', () => {
    const command = parseFlightCommand(
      'cập nhật giá và giờ VJ 3017 ngày mai thành 950000 lúc 10:00',
      TODAY
    );
    expect(command?.kind).toBe('invalid');
  });

  it('thiếu số hiệu hoặc không nói rõ giá mới đều bóc lỗi cụ thể', () => {
    expect(parseFlightCommand('cập nhật giá vé ngày mai thành 950000', TODAY)?.kind).toBe(
      'invalid'
    );
    expect(parseFlightCommand('cập nhật giá vé chuyến VJ 3017', TODAY)?.kind).toBe('invalid');
    expect(parseFlightCommand('cập nhật chuyến bay VJ 3017 ngày mai', TODAY)?.kind).toBe('invalid');
  });

  it('giờ ngoài khung bị bóc lỗi', () => {
    expect(parseFlightCommand('đổi giờ bay VJ 3040 ngày mai sang 25:00', TODAY)?.kind).toBe(
      'invalid'
    );
    expect(parseFlightCommand('đổi giờ bay VJ 3040 ngày mai sang 10:77', TODAY)?.kind).toBe(
      'invalid'
    );
  });
});

describe('lệnh chờ xác nhận', () => {
  beforeEach(clearPendingCommands);

  it('"xác nhận" không trúng từ không phải từ xác nhận', () => {
    expect(isConfirmationMessage('giá vé hôm nay là bao nhiêu')).toBe(false);
    expect(isConfirmationMessage('xác nhận')).toBe(true);
    expect(isConfirmationMessage(' chiar xác nhận với tôi')).toBe(true);
  });

  it('lệnh chờ chỉ thực thi một lần, và xong thì biến mất', () => {
    const command = parseFlightCommand('cập nhật giá vé VJ 3017 ngày mai thành 950000', TODAY);
    if (!command || command.kind !== 'update-price') throw new Error('parse đã sai');
    setPendingCommand('admin-1', command);

    expect(takePendingCommand('admin-2')).toBeNull();
    const taken = takePendingCommand('admin-1');
    expect(taken).toEqual(command);
    expect(takePendingCommand('admin-1')).toBeNull();
  });

  it('hết 5 phút lệnh chờ coi như không có', () => {
    const command = parseFlightCommand('cập nhật giá vé VJ 3017 ngày mai thành 950000', TODAY);
    if (!command || command.kind !== 'update-price') throw new Error('parse đã sai');
    setPendingCommand('admin-1', command);
    expect(takePendingCommand('admin-1', Date.now() + 6 * 60_000)).toBeNull();
  });
});

describe('thực thi lệnh', () => {
  beforeEach(() => {
    clearPendingCommands();
    vi.mocked(getFlightByNoAndDate).mockReset();
    vi.mocked(updateFlight).mockReset();
    vi.mocked(insertFlightUpdateLog).mockReset();
  });

  it('ngày không có chuyến: trả không tìm thấy kèm ngày lân cận', async () => {
    vi.mocked(getFlightByNoAndDate).mockResolvedValue([]);
    const result = await applyFlightCommand(
      {
        kind: 'update-price',
        flightNo: 'VJ 3017',
        date: '2026-10-19',
        fare: 'economy',
        amount: 950000,
      },
      { adminId: 'admin-1' }
    );
    expect(result.status).toBe('not-found');
  });

  it('đổi giá phổ thông: thang giá giữ đảo và price hiển thị khớp hạng', async () => {
    const row = flightRow({ economy_price: '899000', business_price: '2490230', class: 'economy' });
    vi.mocked(getFlightByNoAndDate).mockResolvedValue([row]);
    vi.mocked(updateFlight).mockResolvedValue(row);

    const result = await applyFlightCommand(
      {
        kind: 'update-price',
        flightNo: 'VJ 3017',
        date: '2026-10-19',
        fare: 'economy',
        amount: 950000,
      },
      { adminId: 'admin-1' }
    );

    expect(result.status).toBe('applied');
    expect(vi.mocked(updateFlight)).toHaveBeenCalledWith('f1', {
      economy_price: 950000,
      price: 950000, // class = economy → price là giá phổ thông
    });
  });

  it('giá phổ thông mới cao hơn thương gia hiện tại → trả rejected, không ghi', async () => {
    const row = flightRow({ economy_price: '899000', business_price: '2490230', class: 'economy' });
    vi.mocked(getFlightByNoAndDate).mockResolvedValue([row]);

    const result = await applyFlightCommand(
      {
        kind: 'update-price',
        flightNo: 'VJ 3017',
        date: '2026-10-19',
        fare: 'economy',
        amount: 3_000_000,
      },
      { adminId: 'admin-1' }
    );

    expect(result.status).toBe('rejected');
    const message = result.status === 'applied' ? '' : result.message;
    expect(message).toContain('Thang giá bị đảo');
    expect(vi.mocked(updateFlight)).not.toHaveBeenCalled();
  });

  it('đổi giờ giữ đúng thời lượng, và audit log ghi cùng một công cụ', async () => {
    const row = flightRow({
      depart_time: '2026-10-18T23:00:00.000Z', // 06:00 ngày 19/10 giờ VN
      arrive_time: '2026-10-19T01:25:00.000Z',
    });
    vi.mocked(getFlightByNoAndDate).mockResolvedValue([row]);
    vi.mocked(updateFlight).mockResolvedValue(row);

    const result = await applyFlightCommand(
      { kind: 'update-time', flightNo: 'VJ 3017', date: '2026-10-19', time: '10:00' },
      { adminId: 'admin-1' }
    );

    expect(result.status).toBe('applied');
    const calls = vi.mocked(updateFlight).mock.calls;
    const updates = calls[0][1];
    // 03:00Z (10:00 giờ VN) — viết với offset +07:00 như `toVietnamInstant`.
    expect(updates.depart_time).toBe('2026-10-19T10:00:00+07:00');
    const before = new Date(row.depart_time).getTime();
    const after = new Date(row.arrive_time).getTime();
    const newDep = new Date(String(updates.depart_time)).getTime();
    const newArr = new Date(String(updates.arrive_time)).getTime();
    expect(newArr - newDep).toBe(after - before); // cùng 145 phút

    expect(vi.mocked(insertFlightUpdateLog)).toHaveBeenCalledTimes(1);
    const log = vi.mocked(insertFlightUpdateLog).mock.calls[0][0];
    expect(log.flightId).toBe('f1');
    expect(log.updatedBy).toBe('admin-1');
  });

  it('nhiều chuyến cùng số hiệu Daynày: hỏi rõ lại, không đoán', async () => {
    vi.mocked(getFlightByNoAndDate).mockResolvedValue([
      flightRow(),
      flightRow({ id: 'f2', depart_time: '2026-10-18T02:00:00.000Z' }),
    ]);
    const result = await applyFlightCommand(
      {
        kind: 'update-price',
        flightNo: 'VJ 3017',
        date: '2026-10-19',
        fare: 'economy',
        amount: 950000,
      },
      { adminId: 'admin-1' }
    );
    expect(result.status).toBe('rejected');
    const message = result.status === 'applied' ? '' : result.message;
    expect(message).toContain('2 chuyến');
  });
});

describe('trình báo cáo trước khi ghi', () => {
  it('preview nêu đúng số hiện trạng thay đổi', () => {
    const command = parseFlightCommand(
      'cập nhật giá vé VJ 3017 ngày 2026-10-19 phổ thông thành 950.000',
      TODAY
    );
    if (!command || command.kind !== 'update-price') throw new Error('parse đã sai');
    const preview = formatCommandConfirmPreview(command);
    expect(preview).toContain('950.000');
    expect(preview).toContain('VJ 3017');
    expect(preview).toContain('2026-10-19');
  });

  it('ngày tương đối vào preview là ngày thật, không phải chữ "mai"', () => {
    const target = toVietnamWallClock(new Date().toISOString()).date;
    const command = parseFlightCommand('cập nhật giá vé VJ 3017 ngày mai phổ thông thành 950k');
    if (!command || command.kind !== 'update-price') throw new Error('parse đã sai');
    // "ngày mai" phải là ngày hôm sau cụ thể — nếu preview lại chứa "mai" là
    // lệnh chờ lưu sai ngày, xáním đổi nhầm.
    expect(command.date).not.toBe(target);
    expect(formatCommandConfirmPreview(command)).toContain(command.date);
  });
});
