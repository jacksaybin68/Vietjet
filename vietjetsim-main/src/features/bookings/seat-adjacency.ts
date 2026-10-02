// Seat-adjacency rules for the seat picker.
//
// The roster is built adults-first (`buildPassengerRoster` walks adult → child
// → infant), so the picked seats follow the same order: index 0 is always the
// first adult, and a child sits at the index right after the adults. That makes
// the rule expressible without tracking who picked which seat.
//
// An infant is not in this module at all: it rides on an adult's lap, so it is
// never seated and never needs an adjacent seat. `isSeated()` already drops it
// from the picker before these rules run.

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
type SeatCol = (typeof COLS)[number];

/** Column that separates the cabin halves, so C and D are NOT neighbours. */
const AISLE_AFTER = 2;

/** Split `"12A"` into its numeric row and letter column. */
function parseSeat(seatId: string): { row: number; col: number } | null {
  const match = /^(\d+)([A-F])$/.exec(seatId);
  if (!match) return null;
  return { row: Number(match[1]), col: COLS.indexOf(match[2] as SeatCol) };
}

/**
 * Seats sharing a side wall with `seatId`, so a child is seated together.
 *
 * The aisle test compares which half of the cabin the two seats are in, rather
 * than special-casing a column index. The previous form tested the *origin*
 * column on the way left — `col === AISLE_AFTER` — which dropped C's left-hand
 * neighbour along with its right, so `adjacentSeats('12C')` returned only
 * `['12D']` and a child sitting beside an adult in 12B was refused outright.
 * C–D is the aisle; C–B is a shared armrest.
 */
export function adjacentSeats(seatId: string): string[] {
  const parsed = parseSeat(seatId);
  if (!parsed) return [];
  const { row, col } = parsed;
  // Left half is A–C, right half is D–F. `AISLE_AFTER` is the last left column.
  const half = (index: number) => (index <= AISLE_AFTER ? 0 : 1);
  const neighbours: string[] = [];
  for (const delta of [-1, 1]) {
    const next = col + delta;
    if (next < 0 || next >= COLS.length) continue;
    if (half(next) !== half(col)) continue;
    neighbours.push(`${row}${COLS[next]}`);
  }
  return neighbours;
}

/**
 * Whether `seatId` may be added to a party of `paxCounts` whose seats are
 * already `selected`.
 *
 * Adults may take any free seat. A child may only take a seat beside one the
 * adults already hold, and never one that is already in `selected`. Seats
 * beyond the number of seated passengers are rejected, so the array cannot grow
 * past the party size.
 */
export function canSelectSeat({
  seatId,
  selected,
  paxCounts,
}: {
  seatId: string;
  selected: readonly string[];
  paxCounts: { adult: number; child: number };
}): boolean {
  const seatedCount = paxCounts.adult + paxCounts.child;
  if (selected.includes(seatId)) return false;
  if (selected.length >= seatedCount) return false;

  const { adult } = paxCounts;
  // While the adults are still choosing, every seat is open to them.
  if (selected.length < adult) return true;
  // Past that point the remaining picks are children's, and they must sit
  // beside a seat the adults hold.
  const adultSeats = selected.slice(0, adult);
  return adjacentSeats(seatId).some((neighbour) => adultSeats.includes(neighbour));
}

/**
 * A child must not be left without a neighbouring adult once the party is
 * seated, so the picker also refuses to drop an adult seat while a child seat
 * depends on it.
 */
export function canDeselectSeat({
  seatId,
  selected,
  paxCounts,
}: {
  seatId: string;
  selected: readonly string[];
  paxCounts: { adult: number; child: number };
}): boolean {
  if (paxCounts.child === 0) return true;
  const { adult } = paxCounts;
  const adultSeats = selected.slice(0, adult);
  const childSeats = selected.slice(adult);
  // The seat being released is an adult's, and some child relies on it.
  if (adultSeats.includes(seatId)) {
    return !childSeats.some((childSeat) => adjacentSeats(childSeat).includes(seatId));
  }
  return true;
}
