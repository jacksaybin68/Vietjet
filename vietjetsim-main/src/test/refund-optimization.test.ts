import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  archiveOldRefunds,
  getRefundsByUserId,
  createRefund,
  setRefundVisibility,
  updateRefundDetails,
  isRefundFeatureEnabled,
  setRefundFeatureEnabled,
} from '@/lib/db';
import { sql } from '@/lib/neon';

// Mock the neon module
vi.mock('@/lib/neon', () => {
  const queryMock = vi.fn().mockReturnValue([]);
  // The real client exposes .query alongside the tagged-template call.
  const sqlMock = Object.assign(vi.fn().mockResolvedValue([]), { query: queryMock });
  return { sql: sqlMock };
});

/** Flatten a tagged-template call into the SQL text it produced. */
function sqlText(call: unknown[]): string {
  return (call[0] as TemplateStringsArray).join('?');
}

describe('Refund ticket visibility (migration 020)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sql as any).mockResolvedValue([]);
  });

  it('hides tickets from the customer until an operator reveals them', async () => {
    await getRefundsByUserId('user-1');

    const text = sqlText((sql as any).mock.calls[0]);
    expect(text).toContain('FROM refund_requests');
    // Ownership AND the reveal flag must both hold, otherwise a customer could
    // read back a ticket that support has not looked at yet.
    expect(text).toContain('user_id = ?');
    expect(text).toContain('visible_to_user = TRUE');
  });

  it('creates tickets hidden and records phone and PNR', async () => {
    (sql as any).mockResolvedValueOnce([{ id: 'refund-1' }]);

    await createRefund({
      booking_id: 'booking-1',
      user_id: 'user-1',
      reason: 'Hủy chuyến',
      phone: '0912345678',
      booking_code: 'VJ644052',
      bank_info: { bank_name: 'MB Bank' },
    });

    const text = sqlText((sql as any).mock.calls[0]);
    expect(text).toContain('phone');
    expect(text).toContain('booking_code');
    expect(text).toContain('visible_to_user');
    // FALSE must be bound, not merely present as a column name.
    const values = (sql as any).mock.calls[0].slice(1);
    expect(values).toContain('0912345678');
    expect(values).toContain('VJ644052');
    // The insert must pin the reveal flag off. It is a literal, not a bound
    // value, so assert on the statement itself.
    expect(text).toMatch(/visible_to_user\s*\)\s*VALUES[\s\S]*FALSE/i);
  });

  it('lets an operator reveal or re-hide a single ticket', async () => {
    (sql as any).mockResolvedValueOnce([{ id: 'refund-1' }]);

    await setRefundVisibility('refund-1', true, 'admin-1');

    const call = (sql as any).mock.calls[0];
    expect(sqlText(call)).toContain('visible_to_user = ?');
    expect(call.slice(1)).toContain(true);
    expect(call.slice(1)).toContain('admin-1');
  });

  it('merges bank details instead of replacing them', async () => {
    (sql.query as any).mockReturnValue([]);

    await updateRefundDetails('refund-1', { bank_info: { bank_name: 'Techcombank' } }, 'admin-1');

    const [text] = (sql.query as any).mock.calls[0];
    // `||` on jsonb preserves account_holder/account_number when the operator
    // only corrects the bank name.
    expect(text).toContain('|| $');
    expect(text).toContain('::jsonb');
  });

  it('binds operator fields as parameters instead of interpolating them', async () => {
    (sql.query as any).mockReturnValue([]);

    await updateRefundDetails(
      'refund-1',
      { bank_info: { bank_name: 'Techcombank' }, phone: '0900000000' },
      'admin-1'
    );

    const [text, values] = (sql.query as any).mock.calls[0];
    expect(text).toContain('reviewed_by = $1');
    expect(text).not.toContain('admin-1');
    expect(text).not.toContain('Techcombank');
    expect(values).toContain('admin-1');
  });
});

describe('Refund feature lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sql as any).mockResolvedValue([]);
  });

  it('defaults to enabled when the config row is missing', async () => {
    (sql as any).mockResolvedValueOnce([]);
    expect(await isRefundFeatureEnabled()).toBe(true);
  });

  it('reports disabled when the switch is off', async () => {
    (sql as any).mockResolvedValueOnce([{ key: 'refund_feature_enabled', value: 'false' }]);
    expect(await isRefundFeatureEnabled()).toBe(false);
  });

  it('persists the lock through system_config', async () => {
    (sql as any).mockResolvedValueOnce([]); // getConfigValue → row absent
    (sql as any).mockResolvedValueOnce([{ key: 'refund_feature_enabled' }]); // insert

    await setRefundFeatureEnabled(false, 'admin-1');

    const call = (sql as any).mock.calls[1];
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
    (sql as any).mockResolvedValueOnce([
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
    const call = (sql as any).mock.calls[0];
    const queryParts = call[0];
    const queryJoined = queryParts.join('?');

    expect(queryJoined).toContain('UPDATE refund_requests');
    expect(queryJoined).toContain("SET status = 'archived'");
    expect(queryJoined).toContain("OR status = 'approved'");
    expect(call[1]).toBe(90); // The days parameter
  });
});
