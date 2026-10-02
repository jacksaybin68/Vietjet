import { describe, it, expect } from 'vitest';
import { adjacentSeats, canDeselectSeat, canSelectSeat } from '@/features/bookings/seat-adjacency';

/**
 * The cabin is 3+3 with a centre aisle: A B C | D E F.
 *
 * The regression this pins is a real dead end for a customer. The aisle test
 * used to look at the *origin* column, so `adjacentSeats('12C')` returned only
 * `['12D']` — it treated C's left-hand neighbour as across the aisle too. A
 * party of two adults and a child took 12A and 12B, and then no seat at all
 * would take the third pick: the picker showed "1 chỗ ngồi còn lại" forever.
 */
const TWO_ADULTS_ONE_CHILD = { adult: 2, child: 1 };
const ONE_ADULT_ONE_CHILD = { adult: 1, child: 1 };

describe('adjacentSeats', () => {
  it('treats the aisle as the gap between C and D only', () => {
    expect(adjacentSeats('12C')).toEqual(['12B']);
    expect(adjacentSeats('12D')).toEqual(['12E']);
  });

  it('gives an interior seat both neighbours on its own side', () => {
    expect(adjacentSeats('12B')).toEqual(['12A', '12C']);
    expect(adjacentSeats('12E')).toEqual(['12D', '12F']);
  });

  it('does not wrap around the ends of the row', () => {
    expect(adjacentSeats('12A')).toEqual(['12B']);
    expect(adjacentSeats('12F')).toEqual(['12E']);
  });

  it('returns nothing for a seat number it cannot read', () => {
    expect(adjacentSeats('')).toEqual([]);
    expect(adjacentSeats('12Z')).toEqual([]);
  });
});

describe('canSelectSeat', () => {
  it('lets an adult take any free seat', () => {
    expect(canSelectSeat({ seatId: '25A', selected: [], paxCounts: TWO_ADULTS_ONE_CHILD })).toBe(
      true
    );
    expect(
      canSelectSeat({ seatId: '25A', selected: ['25B'], paxCounts: TWO_ADULTS_ONE_CHILD })
    ).toBe(true);
  });

  it('lets a child sit beside an adult', () => {
    expect(
      canSelectSeat({ seatId: '12C', selected: ['12A', '12B'], paxCounts: TWO_ADULTS_ONE_CHILD })
    ).toBe(true);
    expect(
      canSelectSeat({ seatId: '12A', selected: ['12B', '12C'], paxCounts: TWO_ADULTS_ONE_CHILD })
    ).toBe(true);
  });

  it('refuses a child seat across the aisle from every adult', () => {
    // Adults in 12A/12B; the far side of the aisle is not beside either of them.
    expect(
      canSelectSeat({ seatId: '12D', selected: ['12A', '12B'], paxCounts: TWO_ADULTS_ONE_CHILD })
    ).toBe(false);
    expect(
      canSelectSeat({ seatId: '30F', selected: ['12A', '12B'], paxCounts: TWO_ADULTS_ONE_CHILD })
    ).toBe(false);
  });

  it('refuses a second seat in the same slot', () => {
    expect(
      canSelectSeat({ seatId: '12A', selected: ['12A', '12B'], paxCounts: TWO_ADULTS_ONE_CHILD })
    ).toBe(false);
  });

  it('stops the array at the size of the seated party', () => {
    expect(
      canSelectSeat({
        seatId: '12D',
        selected: ['12A', '12B', '12C'],
        paxCounts: TWO_ADULTS_ONE_CHILD,
      })
    ).toBe(false);
  });

  // With a single adult the child may only take that adult's own neighbours,
  // which is the case the aisle bug hid most often.
  it('keeps a lone child beside a lone adult', () => {
    expect(
      canSelectSeat({ seatId: '20C', selected: ['20B'], paxCounts: ONE_ADULT_ONE_CHILD })
    ).toBe(true);
    expect(
      canSelectSeat({ seatId: '20E', selected: ['20B'], paxCounts: ONE_ADULT_ONE_CHILD })
    ).toBe(false);
  });
});

describe('canDeselectSeat', () => {
  it('refuses to drop an adult seat a child is relying on', () => {
    expect(
      canDeselectSeat({
        seatId: '12B',
        selected: ['12A', '12B', '12C'],
        paxCounts: TWO_ADULTS_ONE_CHILD,
      })
    ).toBe(false);
  });

  it('allows dropping an adult seat nothing depends on', () => {
    expect(
      canDeselectSeat({
        seatId: '12A',
        selected: ['12A', '12B', '12C'],
        paxCounts: TWO_ADULTS_ONE_CHILD,
      })
    ).toBe(true);
  });

  it('is unrestricted for an all-adult party', () => {
    expect(
      canDeselectSeat({
        seatId: '12A',
        selected: ['12A', '12B'],
        paxCounts: { adult: 2, child: 0 },
      })
    ).toBe(true);
  });
});
