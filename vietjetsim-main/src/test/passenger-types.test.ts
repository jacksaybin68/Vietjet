import { describe, it, expect } from 'vitest';
import { FARE_RATE_BY_TYPE, getBookingTotals, TAX_AND_FEE_RATE } from '@/features/bookings/pricing';
import {
  countPassengerTypes,
  isSeated,
  requiresIdNumber,
} from '@/features/bookings/types/booking-flow';
import { MAX_PASSENGERS, maxFor } from '@/app/trang-chu/components/PassengerPicker';

const FARE = 1_000_000;

describe('passenger type fares', () => {
  // Callers that predate passenger types pass no counts at all. Their totals
  // must not move, or every quoted price in the product would shift.
  it('leaves an all-adult booking priced exactly as before', () => {
    const totals = getBookingTotals({ farePerPassenger: FARE, passengerCount: 3 });
    expect(totals.fareSubtotal).toBe(3_000_000);
    expect(totals.taxAndFee).toBe(Math.round(3_000_000 * TAX_AND_FEE_RATE));
    expect(totals.seatedPassengerCount).toBe(3);
  });

  it('matches the legacy total when counts are spelled out as adults only', () => {
    const legacy = getBookingTotals({ farePerPassenger: FARE, passengerCount: 2 });
    const explicit = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 2,
      paxCounts: { adult: 2, child: 0, infant: 0 },
    });
    expect(explicit.total).toBe(legacy.total);
  });

  it('charges a child the reduced fare', () => {
    const totals = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 2,
      paxCounts: { adult: 1, child: 1, infant: 0 },
    });
    expect(totals.fareSubtotal).toBe(FARE * (1 + FARE_RATE_BY_TYPE.child));
    expect(totals.taxAndFee).toBe(
      Math.round(FARE * (1 + FARE_RATE_BY_TYPE.child) * TAX_AND_FEE_RATE)
    );
  });

  // An infant rides on a lap: a tenth of the fare, and no tax because there is
  // no ticket of its own to tax.
  it('charges an infant a tenth of the fare and no tax', () => {
    const totals = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 2,
      paxCounts: { adult: 1, child: 0, infant: 1 },
    });
    expect(totals.fareSubtotal).toBe(Math.round(FARE + FARE * FARE_RATE_BY_TYPE.infant));
    expect(totals.taxAndFee).toBe(Math.round(FARE * TAX_AND_FEE_RATE));
  });

  it('seats adults and children only', () => {
    const totals = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 4,
      paxCounts: { adult: 2, child: 1, infant: 1 },
    });
    expect(totals.seatedPassengerCount).toBe(3);
  });

  // An infant has no seat, so baggage/meal/insurance are not sold for one.
  it('bills ancillaries for seated passengers only', () => {
    const totals = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 3,
      paxCounts: { adult: 1, child: 0, infant: 2 },
      ancillaries: ['baggage'],
    });
    expect(totals.ancillaryFee).toBe(150_000);
  });
});

describe('passenger roster helpers', () => {
  it('counts a passenger with no type as an adult', () => {
    const counts = countPassengerTypes([{}, { type: 'child' }, { type: 'infant' }]);
    expect(counts).toEqual({ adult: 1, child: 1, infant: 1 });
  });

  it('does not seat an infant and skips its identity document', () => {
    expect(isSeated('adult')).toBe(true);
    expect(isSeated('child')).toBe(true);
    expect(isSeated('infant')).toBe(false);
    expect(requiresIdNumber('child')).toBe(true);
    expect(requiresIdNumber('infant')).toBe(false);
  });
});

describe('passenger picker limits', () => {
  const base = { adult: 1, child: 0, infant: 0 };

  it('always keeps at least one adult', () => {
    expect(maxFor(base, 'adult')).toBe(MAX_PASSENGERS);
  });

  // A child or an infant has to be accompanied, so neither may outnumber the
  // adults on the booking.
  it('never lets a child or infant outnumber the adults', () => {
    expect(maxFor(base, 'child')).toBe(1);
    expect(maxFor(base, 'infant')).toBe(1);
    expect(maxFor({ adult: 2, child: 1, infant: 0 }, 'child')).toBe(2);
  });

  it('caps the party at 9 people', () => {
    // `maxFor` returns the highest count allowed, so a full party returns the
    // count already reached — which is exactly what disables the "+" button.
    const full = { adult: 6, child: 2, infant: 1 };
    expect(MAX_PASSENGERS).toBe(9);
    expect(maxFor(full, 'child')).toBe(full.child);
    expect(maxFor(full, 'infant')).toBe(full.infant);
    expect(maxFor(full, 'adult')).toBe(MAX_PASSENGERS);
  });

  it('still allows one more person while a seat remains in the cap', () => {
    const oneShort = { adult: 6, child: 2, infant: 0 };
    expect(maxFor(oneShort, 'infant')).toBe(1);
  });
});
