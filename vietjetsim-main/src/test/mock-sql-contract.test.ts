/**
 * Regression tests for the in-memory SQL mock in `src/lib/neon.ts`.
 *
 * The mock is what every dev/test run uses when `DATABASE_URL` is empty, so a
 * call shape that the mock accepts but the real Neon client rejects will pass
 * locally and only fail in production. The mock now mirrors the real client's
 * tagged-template check, and these tests pin that contract.
 */

import { describe, it, expect } from 'vitest';

import { sql } from '@/lib/neon';

describe('mock SQL client contract', () => {
  it('accepts a tagged-template call', async () => {
    await expect(sql`SELECT * FROM airports ORDER BY city`).resolves.toBeDefined();
  });

  it('rejects a plain-string call the way the real Neon client does', async () => {
    // `sql` is declared as `any` in this module (typing it fully requires
    // updating every call site), so the call needs a cast to compile.
    const call = sql as unknown as (text: string, ...values: unknown[]) => Promise<unknown>;

    await expect(call('SELECT * FROM airports', [])).rejects.toThrow(
      /can now be called only as a tagged-template function/
    );
  });

  it('still serves parameterized queries through sql.query()', async () => {
    await expect(
      sql.query('SELECT * FROM airports WHERE code = $1', ['SGN'])
    ).resolves.toBeDefined();
  });
});
