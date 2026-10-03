import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { searchCheckIn, getBookingByCodeOrId } from '@/lib/db';

vi.mock('@/lib/neon', () => {
  const queryMock = vi.fn();
  const sqlMock = Object.assign(vi.fn(), {
    query: queryMock,
    begin: vi.fn(),
    transaction: vi.fn(),
  });
  return { sql: sqlMock };
});

import { sql } from '@/lib/neon';

const sqlMock = sql as unknown as Mock;

/** The text the driver would see, with placeholders collapsed. */
function queryText(callIndex = 0): string {
  const [strings] = sqlMock.mock.calls[callIndex] as [TemplateStringsArray];
  return strings.join(' ');
}

describe('booking code lookups (migration 034)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlMock.mockResolvedValue([]);
  });

  it('matches the PNR case-insensitively', async () => {
    // 034 made the code six alphanumeric characters, so it now carries letters
    // as well as digits. Plain `=` meant a customer who typed `jkhbmi` — with
    // caps-lock off, which is the default on a phone — silently 404s on a
    // booking they own.
    sqlMock.mockResolvedValueOnce([
      {
        id: 'b1',
        booking_code: 'JKHBMI',
        status: 'confirmed',
        flight_id: 'f1',
        total_price: 100,
        created_at: '2026-10-01',
        flight_no: 'VJ601',
        from_code: 'DAD',
        to_code: 'HAN',
        depart_time: null,
        arrive_time: null,
      },
    ]);
    sqlMock.mockResolvedValueOnce([]);

    await searchCheckIn('jkhbmi', 'NGUYEN');

    expect(queryText(0)).toContain('UPPER(b.booking_code) = UPPER(');
    expect(queryText(0)).not.toMatch(/b\.booking_code = \$\{/);

    // The booking query and the passenger query are separate statements. If the
    // second kept an exact compare the lookup would find the booking and then
    // return no passengers, which reads to the customer as a failed search.
    expect(queryText(1)).toContain('UPPER(b.booking_code) = UPPER(');
  });

  it('still resolves a booking by its row id', async () => {
    sqlMock.mockResolvedValueOnce([]);

    await searchCheckIn('b1', 'NGUYEN');

    // Customers paste either a PNR or the id from a URL; dropping the id branch
    // would break every deep link to check-in.
    expect(queryText(0)).toContain('b.id::text =');
  });

  it('does not assume a code length or a VJ prefix anywhere', async () => {
    // Legacy rows keep their `VJ644052` codes — 034 replaces the generator, it
    // does not rewrite codes already printed on tickets and quoted in support
    // chats. A length check anywhere would lock those customers out.
    sqlMock.mockResolvedValueOnce([]);

    await searchCheckIn('VJ644052', 'NGUYEN');

    const text = queryText(0);
    expect(text).not.toMatch(/length\s*\(/i);
    expect(text).not.toMatch(/'VJ'/);
    expect(text).not.toMatch(/LIKE\s+'VJ%/);
  });

  it('looks a booking up by PNR without caring about case there either', async () => {
    sqlMock.mockResolvedValueOnce([]);

    await getBookingByCodeOrId('jkhbmi');

    expect(queryText()).toContain('UPPER(b.booking_code) = UPPER(');
  });
});
