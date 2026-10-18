import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/neon', () => {
  const sqlMock = Object.assign(vi.fn(), { query: vi.fn(), begin: vi.fn() });
  return { sql: sqlMock };
});

import { sql } from '@/lib/neon';
import { getActiveAnnouncements } from '@/lib/db';

/**
 * Rebuilds the SQL text of a recorded `sql` call with `$1`, `$2`, … put back —
 * the same reconstruction `wallet.test.ts` uses. Without it the literal chunks
 * are read back separated and two fragments read as welded together.
 */
function sqlText(call: unknown): string {
  if (!Array.isArray(call)) return '';
  const [strings] = call;
  if (!Array.isArray(strings) || typeof strings !== 'object' || strings === null) return '';
  return strings.reduce(
    (acc: string, chunk: unknown, i: number) => acc + (i > 0 ? `$${i}` : '') + String(chunk),
    ''
  );
}

function sqlStatements(): string[] {
  const mocked = sql as unknown as { mock?: { calls?: unknown[] } };
  const calls = mocked.mock?.calls;
  return Array.isArray(calls) ? calls.map(sqlText) : [];
}

describe('getActiveAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the rows the query selected', async () => {
    const rows = [
      { id: 'a1', title: 'Bảo trì hệ thống', content: 'Tạm ngưng 22h–23h', type: 'system' },
    ];
    (sql as any).mockResolvedValueOnce(rows);

    await expect(getActiveAnnouncements()).resolves.toEqual(rows);
  });

  // The bar renders before anyone is identified, so `target_role = 'all'` is
  // what keeps a notice written for signed-in users or admins out of the
  // anonymous page — and the date bounds are what keeps a stale notice off it.
  // Without this test, dropping either filter is a silent one-line edit.
  it('lọc theo hiệu lực và đối tượng, và không trả danh tính người phát hành', async () => {
    (sql as any).mockResolvedValueOnce([]);

    await getActiveAnnouncements();

    const statement = sqlStatements()[0];
    expect(statement).toContain('is_active = true');
    expect(statement).toContain("target_role = 'all'");
    expect(statement).toContain('(start_date IS NULL OR start_date <= now())');
    expect(statement).toContain('(end_date IS NULL OR end_date >= now())');
    expect(statement).toContain('SELECT id, title, content, type');
    expect(statement).not.toContain('created_by');
  });
});
