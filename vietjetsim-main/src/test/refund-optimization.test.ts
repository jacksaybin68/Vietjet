import { describe, it, expect, vi, beforeEach } from 'vitest';
import { archiveOldRefunds } from '@/lib/db';
import { sql } from '@/lib/neon';

// Mock the neon module
vi.mock('@/lib/neon', () => {
  const sqlMock = vi.fn().mockResolvedValue([]);
  return { sql: sqlMock };
});

describe('Refund Optimization Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies that archiveOldRefunds uses a single bulk update query', async () => {
    // Mock the response to simulate 5 records being updated
    (sql as any).mockResolvedValueOnce([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }]);

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
    expect(queryJoined).toContain('OR status = \'approved\'');
    expect(call[1]).toBe(90); // The days parameter
  });
});
