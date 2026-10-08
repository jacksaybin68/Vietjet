/**
 * One definition of what a flight number may look like.
 *
 * The shape is enforced in three places that previously disagreed: the PATCH
 * handler and the admin form both ran `/^[A-Z]{2}\s?\d{2,4}$/i`, while
 * `createFlight` and the POST handler validated nothing at all. Migration 036
 * added the same rule as a CHECK on `flights.flight_no`, so a mismatch here is
 * no longer a cosmetic difference — it decides whether an admin edit persists
 * or the handler answers a bare 500 from Postgres.
 *
 * Kept beside `db.ts` rather than in `shared/constants` because that file
 * holds endpoints and display constants, not validation.
 *
 * ## Why the suffix-free form
 *
 * The live data once carried 593 flights numbered `VJ341B` — a trailing `B`
 * meaning business, since `class` did not exist when those were seeded. The
 * pattern rejects it on purpose: `flights.class` carries the cabin on every
 * row, the suffix duplicated it, and a number with a letter in it cannot be
 * parsed by the admin console at all. Migration 035 moved all of them into the
 * numeric 3xxx block. The one shape still worth accepting is `VJ101-1000`:
 * `<route>-<block>` from the original seed, which two live bookings reference and
 * which no re-numbering could touch.
 */

/**
 * Uppercase two-letter carrier, an optional single space, 2–4 digits, and an
 * optional `-NNNN` block suffix (`VJ 101`, `VJ 3001`, `VJ101-1000`).
 *
 * Case-sensitive on purpose. Every writer uppercases first — the PATCH handler
 * at `app/api/quan-tri/chuyen-bay/[id]/route.ts:251` and
 * `createFlight`'s callers all normalise — so a lowercase value is a caller that
 * skipped normalisation, and the CHECK should reject it rather than store a
 * number no lookup can match: `getFlightStatusByNo` compares with
 * `UPPER(flight_no)`, but the booking-PNR join compares the raw column.
 */
export const FLIGHT_NO_PATTERN = /^[A-Z]{2}[ ]?[0-9]{2,4}(-[0-9]{4})?$/;

/**
 * Collapse whitespace and uppercase, the normalisation every writer must apply
 * before the pattern or the CHECK.
 *
 * A single space is enforced rather than any amount of whitespace: `VJ  101`
 * would pass `\s?` on the way in and still fail the CHECK, which is exactly the
 * bare-500 failure this module exists to prevent.
 *
 * Lockstep by necessity — the PATCH handler had two different calls for the
 * same job, `.replace(/\s+/, ' ')` without the `g` flag on line 251 and with
 * it on line 281, so `VJ  101` was accepted on one path and rejected on the
 * other. Use this before testing the pattern, never `String(x).trim()` alone.
 */
export function normalizeFlightNo(value: unknown): string {
  return String(value).trim().replace(/\s+/g, ' ').toUpperCase();
}
