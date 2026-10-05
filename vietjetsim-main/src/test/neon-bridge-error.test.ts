/**
 * Why this test exists.
 *
 * `scripts/neon-http-bridge.cjs` is what lets the app talk to a local Postgres:
 * it forwards a database failure to the Neon driver as a 400 JSON body, and the
 * driver copies a fixed set of named fields off that body onto a `NeonDbError`.
 * `constraint` — the unique index name — is what turns a duplicate departure
 * into a 409 instead of a bare 500, and the bridge used to drop it.
 *
 * The bridge used to send five fields. Every 409 became a 500 in local
 * development with the application code provably correct, and the existing
 * test in `api-security.test.ts` could not have caught it: it hand-builds an
 * error object that already has `constraint` on it, so it only proves a correct
 * driver response produces a 409 — never that the bridge produces that response.
 *
 * All DB-free, so they run in CI's unit-test job (which has no Docker):
 *
 * 1. `errorBody` carries every field the driver reads. The list is read off
 *    `NeonDbError` itself rather than copied, so it cannot drift.
 * 2. A 400 built by `errorBody` reconstructs into a `NeonDbError` that still
 *    satisfies the route's 409 predicate, through the real driver.
 *
 * Verified to fail on the old code: reverting `errorBody` to its five-field
 * form turns three of these red and names all eleven missing fields.
 */

import { describe, it, expect } from 'vitest';
import { neon, neonConfig, NeonDbError } from '@neondatabase/serverless';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { errorBody } = require('../../scripts/neon-http-bridge.cjs') as {
  errorBody: (error: unknown) => Record<string, unknown>;
};

/**
 * The fields the driver copies off a 400 body, read from the driver itself: it
 * declares them on `NeonDbError` in `node_modules/@neondatabase/serverless`
 * and assigns them in the order of a matching list. `name` and `sourceError`
 * are set by the driver itself and never arrive from the wire.
 */
const DRIVER_FIELDS = Object.keys(new NeonDbError('probe')).filter(
  (key) => key !== 'name' && key !== 'sourceError'
);

/** The index `flights` carries for `(from_code, to_code, depart_time)`. */
const FLIGHT_SLOT_INDEX = 'idx_flights_route_depart_time';

/**
 * A `pg` error as it arrives after a real `23505` from that unique index. Only
 * the keys `pg` actually sets are listed — the rest are absent, which is the
 * case the bridge has to handle without inventing values.
 */
const PG_DUPLICATE_ERROR = {
  message: `duplicate key value violates unique constraint "${FLIGHT_SLOT_INDEX}"`,
  severity: 'ERROR',
  code: '23505',
  detail:
    'Key (from_code, to_code, depart_time)=(HAN, SGN, 2026-10-10 10:00:00+00) already exists.',
  schema: 'public',
  table: 'flights',
  constraint: FLIGHT_SLOT_INDEX,
  file: 'nbtinsert.c',
  line: '666',
  // Measured on Postgres 16: for a unique *index* violation the index name
  // arrives in `constraint`, and `routine` is the C function that raised it.
  routine: '_bt_check_unique',
};

describe('neon-http-bridge error forwarding', () => {
  it('reads the field list off the driver, not a hand-copied one', () => {
    // If this fails, the driver changed shape and the assertions below are
    // checking against a list that no longer describes it.
    expect(DRIVER_FIELDS).toContain('constraint');
    expect(DRIVER_FIELDS).toContain('routine');
    expect(DRIVER_FIELDS.length).toBeGreaterThan(5);
  });

  it('carries every field the driver reads, even when `pg` did not set it', () => {
    const body = errorBody({ message: 'boom', code: 'XX000' });

    const missing = DRIVER_FIELDS.filter((field) => !(field in body));
    expect(missing).toEqual([]);
  });

  it('preserves the fields that decide a 409', () => {
    const body = errorBody(PG_DUPLICATE_ERROR);

    // A 5-digit SQLSTATE is what makes the bridge answer 400 rather than 500,
    // and the driver only rebuilds an error from a 400 body — so losing the
    // code would lose every field at once, and losing `constraint` costs the
    // 409.
    expect(body.code).toBe('23505');
    expect(String(body.code)).toMatch(/^\d{5}$/);
    expect(body.constraint).toBe(FLIGHT_SLOT_INDEX);
    expect(body.routine).toBe('_bt_check_unique');
  });

  it('reconstructs into a driver error the route still recognises', async () => {
    const previousFetch = neonConfig.fetchFunction;
    neonConfig.fetchFunction = async () =>
      new Response(JSON.stringify(errorBody(PG_DUPLICATE_ERROR)), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const sql = neon('postgresql://app:pw@localhost:5432/app');
      const error = await sql.query('SELECT 1', []).then(
        () => {
          throw new Error('a 400 response must reject, not resolve');
        },
        (thrown: unknown) => thrown
      );

      expect(error).toBeInstanceOf(NeonDbError);
      expect(error).toMatchObject({
        code: '23505',
        constraint: FLIGHT_SLOT_INDEX,
        table: 'flights',
      });

      // The predicate the admin route actually calls, on the driver's real error.
      const { isDuplicateFlightSchedule } = await import('@/app/api/quan-tri/chuyen-bay/route');
      expect(isDuplicateFlightSchedule(error)).toBe(true);
    } finally {
      neonConfig.fetchFunction = previousFetch;
    }
  });
});
