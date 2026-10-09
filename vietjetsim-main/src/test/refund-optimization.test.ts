import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  archiveOldRefunds,
  getRefundsByUserId,
  createRefund,
  setRefundVisibility,
  updateRefundDetails,
  isRefundFeatureEnabled,
  setRefundFeatureEnabled,
  getAllRefunds,
} from '@/lib/db';
import { sql } from '@/lib/neon';

// Mock the neon module — handles are hoisted so the tests can reach them typed,
// without casting the client back through `any`.
const { sqlTagMock, sqlQueryMock } = vi.hoisted(() => ({
  sqlTagMock: vi.fn().mockResolvedValue([]),
  sqlQueryMock: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/neon', () => {
  // The real client exposes .query alongside the tagged-template call.
  return { sql: Object.assign(sqlTagMock, { query: sqlQueryMock }) };
});

const sqlMock = sqlTagMock as ReturnType<typeof vi.fn> & { query: ReturnType<typeof vi.fn> };

/** Flatten a tagged-template call into the SQL text it produced. */
function sqlText(call: unknown[]): string {
  return (call[0] as TemplateStringsArray).join('?');
}

describe('Refund ticket visibility (migration 020)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlMock.mockResolvedValue([]);
  });

  it('hides tickets from the customer until an operator reveals them', async () => {
    await getRefundsByUserId('user-1');

    const text = sqlText(sqlMock.mock.calls[0]);
    expect(text).toContain('FROM refund_requests');
    // Ownership AND the reveal flag must both hold, otherwise a customer could
    // read back a ticket that support has not looked at yet.
    expect(text).toContain('user_id = ?');
    expect(text).toContain('visible_to_user = TRUE');
  });

  it('creates tickets hidden and records phone and PNR', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'refund-1' }]);

    await createRefund({
      booking_id: 'booking-1',
      user_id: 'user-1',
      reason: 'Hủy chuyến',
      phone: '0912345678',
      booking_code: 'VJ644052',
      bank_info: { bank_name: 'MB Bank' },
    });

    const text = sqlText(sqlMock.mock.calls[0]);
    expect(text).toContain('phone');
    expect(text).toContain('booking_code');
    expect(text).toContain('visible_to_user');
    // FALSE must be bound, not merely present as a column name.
    const values = sqlMock.mock.calls[0].slice(1);
    expect(values).toContain('0912345678');
    expect(values).toContain('VJ644052');
    // The insert must pin the reveal flag off. It is a literal, not a bound
    // value, so assert on the statement itself.
    expect(text).toMatch(/visible_to_user\s*\)\s*VALUES[\s\S]*FALSE/i);
  });

  // The payout figure rode inside `bank_info` only, so the operator list
  // rendered an empty "Số tiền" for every ticket and the "Đã hoàn tiền" total
  // stayed at 0₫ however many were approved. It belongs on the row.
  it('ghi số tiền vào cột amount riêng, không chỉ nhét trong bank_info', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'refund-2' }]);

    await createRefund({
      booking_id: 'booking-1',
      user_id: 'user-1',
      reason: 'Hủy chuyến',
      amount: 1_975_873,
      phone: '0912345678',
      booking_code: 'VJ644052',
      bank_info: { bank_name: 'MB Bank' },
    });

    const [strings, ...values] = sqlMock.mock.calls[0];
    expect((strings as TemplateStringsArray).join(' ')).toMatch(
      /INSERT INTO refund_requests[\s\S]*amount/
    );
    expect(values).toContain(1_975_873);
  });

  it('cho phép phiếu không khai báo số tiền', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'refund-3' }]);

    await createRefund({
      booking_id: 'booking-1',
      user_id: 'user-1',
      reason: 'Hủy chuyến',
    });

    const values = sqlMock.mock.calls[0].slice(1);
    expect(values).toContain(null);
  });

  it('lets an operator reveal or re-hide a single ticket', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'refund-1' }]);

    await setRefundVisibility('refund-1', true, 'admin-1');

    const call = sqlMock.mock.calls[0];
    expect(sqlText(call)).toContain('visible_to_user = ?');
    expect(call.slice(1)).toContain(true);
    expect(call.slice(1)).toContain('admin-1');
  });

  it('merges bank details instead of replacing them', async () => {
    sqlMock.query.mockReturnValue([]);

    await updateRefundDetails('refund-1', { bank_info: { bank_name: 'Techcombank' } }, 'admin-1');

    const [text] = sqlMock.query.mock.calls[0];
    // `||` on jsonb preserves account_holder/account_number when the operator
    // only corrects the bank name.
    expect(text).toContain('|| $');
    expect(text).toContain('::jsonb');
  });

  it('binds operator fields as parameters instead of interpolating them', async () => {
    sqlMock.query.mockReturnValue([]);

    await updateRefundDetails(
      'refund-1',
      { bank_info: { bank_name: 'Techcombank' }, phone: '0900000000' },
      'admin-1'
    );

    const [text, values] = sqlMock.query.mock.calls[0];
    expect(text).toContain('reviewed_by = $1');
    expect(text).not.toContain('admin-1');
    expect(text).not.toContain('Techcombank');
    expect(values).toContain('admin-1');
  });
});

describe('Refund feature lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlMock.mockResolvedValue([]);
  });

  it('defaults to enabled when the config row is missing', async () => {
    sqlMock.mockResolvedValueOnce([]);
    expect(await isRefundFeatureEnabled()).toBe(true);
  });

  it('reports disabled when the switch is off', async () => {
    sqlMock.mockResolvedValueOnce([{ key: 'refund_feature_enabled', value: 'false' }]);
    expect(await isRefundFeatureEnabled()).toBe(false);
  });

  it('persists the lock through system_config', async () => {
    sqlMock.mockResolvedValueOnce([]); // getConfigValue → row absent
    sqlMock.mockResolvedValueOnce([{ key: 'refund_feature_enabled' }]); // insert

    await setRefundFeatureEnabled(false, 'admin-1');

    const call = sqlMock.mock.calls[1];
    expect(sqlText(call)).toContain('INSERT INTO system_config');
    expect(call.slice(1)).toContain('false');
  });
});

describe('Refund Optimization Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies that archiveOldRefunds uses a single bulk update query', async () => {
    // Mock the response to simulate 5 records being updated
    sqlMock.mockResolvedValueOnce([
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' },
    ]);

    const result = await archiveOldRefunds(90);

    expect(result).toBe(5);

    // Verify only one SQL call was made
    expect(sql).toHaveBeenCalledTimes(1);

    // Verify the query content roughly (it's a template tag mock, so it might be tricky depending on how vitest mocks it)
    // In our case, sql is the mock itself.
    const call = sqlMock.mock.calls[0];
    const queryParts = call[0];
    const queryJoined = queryParts.join('?');

    expect(queryJoined).toContain('UPDATE refund_requests');
    expect(queryJoined).toContain("SET status = 'archived'");
    // `processed` was one half of this predicate and nothing in the app has
    // ever written that status, so no ticket could reach it. `completed` is the
    // other settled state an operator can reach from the console and was never
    // archived at all, which is why approved-and-settled tickets piled up.
    expect(queryJoined).toContain("OR status = 'completed'");
    expect(queryJoined).not.toContain("'processed'");
    expect(call[1]).toBe(90); // The days parameter
  });
});

describe('getAllRefunds trả đủ field cho bảng admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlMock.mockResolvedValue([]);
    sqlQueryMock.mockResolvedValue({ rows: [] });
  });

  it('select có user_name, user_email, flight_no, route, flight_date', async () => {
    await getAllRefunds({ page: 1, limit: 10 });

    // getAllRefunds gọi sql.query(text, params) — chuỗi thuần, không phải template.
    const queryJoined = String(sqlQueryMock.mock.calls[0]?.[0] ?? '');

    // Bảng admin đọc đúng các field này; thiếu bất kỳ field nào thì cột
    // "Khách hàng"/"Chuyến bay" rơi về giá trị rỗng dù dữ liệu có thật.
    expect(queryJoined).toContain('u.full_name as user_name');
    expect(queryJoined).toContain('u.email as user_email');
    expect(queryJoined).toContain('f.flight_no as flight_no');
    expect(queryJoined).toContain('as route');
    expect(queryJoined).toContain('as flight_date');
    // LEFT JOIN để phiếu không bị ẩn khi thiếu chuyến bay.
    expect(queryJoined).toContain('LEFT JOIN flights f');
  });
});
