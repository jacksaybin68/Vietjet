import { describe, it, expect } from 'vitest';
import {
  FARE_CLASSES,
  FARE_RATE_BY_TYPE,
  getBookingTotals,
  getFareForClass,
  getSeatCharge,
  getSeatPrice,
  SEAT_TIER_PRICES,
  TAX_AND_FEE_RATE,
} from '@/features/bookings/pricing';
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

  // An infant rides on a lap and is free: no fare line, and no tax either,
  // because tax is charged on the fares actually flown.
  it('charges an infant nothing and adds no tax', () => {
    const totals = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 2,
      paxCounts: { adult: 1, child: 0, infant: 1 },
    });
    expect(totals.fareSubtotal).toBe(FARE);
    expect(totals.taxAndFee).toBe(Math.round(FARE * TAX_AND_FEE_RATE));
    expect(totals.total).toBe(FARE + Math.round(FARE * TAX_AND_FEE_RATE));
  });

  it('prices a child at 75% and an infant at nothing', () => {
    const totals = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 3,
      paxCounts: { adult: 1, child: 1, infant: 1 },
    });
    // 1 adult at 100% + 1 child at 75% + 1 infant at 0%.
    expect(totals.fareSubtotal).toBe(FARE + Math.round(FARE * 0.75));
    expect(totals.taxAndFee).toBe(Math.round(FARE * 1.75 * TAX_AND_FEE_RATE));
  });

  it('leaves an all-adult fare untouched when an infant joins for free', () => {
    const alone = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 1,
      paxCounts: { adult: 1, child: 0, infant: 0 },
    });
    const withInfant = getBookingTotals({
      farePerPassenger: FARE,
      passengerCount: 2,
      paxCounts: { adult: 1, child: 0, infant: 1 },
    });
    expect(withInfant.total).toBe(alone.total);
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

describe('seat pricing', () => {
  // The server prices a seat from its number so a client cannot post a cheaper
  // one. The bands must match what the seat map draws.
  it('prices the first rows as business class', () => {
    expect(getSeatPrice('1A')).toBe(SEAT_TIER_PRICES.business);
    expect(getSeatPrice('3F')).toBe(SEAT_TIER_PRICES.business);
    expect(getSeatPrice('4A')).not.toBe(SEAT_TIER_PRICES.business);
  });

  it('prices the premium and standard bands apart', () => {
    expect(getSeatPrice('5C')).toBe(SEAT_TIER_PRICES.hot);
    expect(getSeatPrice('12B')).toBe(SEAT_TIER_PRICES.available);
    expect(getSeatPrice('25A')).toBe(SEAT_TIER_PRICES.hot);
  });

  it('prices a seat by its row, not by its letter', () => {
    ['1A', '1F', '12C', '30D'].forEach((seat) => {
      const row = seat.match(/\d+/)![0];
      expect(getSeatPrice(seat)).toBe(getSeatPrice(`${row}A`));
    });
  });

  it('adds the seat tax and service fee to the headline price', () => {
    // 15% on top: 10% tax + 5% service fee.
    expect(getSeatCharge('12A')).toBe(Math.round(SEAT_TIER_PRICES.available * 1.15));
  });

  it('charges nothing for a seat number it cannot read', () => {
    expect(getSeatPrice('')).toBe(0);
    expect(getSeatPrice('12Z')).toBe(0);
    expect(getSeatCharge('nonsense')).toBe(0);
  });
});

describe('fare card ladder', () => {
  const fares = { economyPrice: 4_900_000, businessPrice: 13_573_000 };

  // The two stored fares are the endpoints, so the four cards have to be read
  // off the same ladder on both sides of the wire. The regression this pins is
  // a card that quotes one amount and the API charging another: SkyBOSS is the
  // middle business bucket, and it used to quote the interpolated figure while
  // the server charged the full business fare.
  it('puts every card on the stored endpoints', () => {
    expect(getFareForClass('eco', fares)).toBe(4_900_000);
    expect(getFareForClass('business', fares)).toBe(13_573_000);
  });

  it('steps the two middle cards evenly across the gap', () => {
    const step = (13_573_000 - 4_900_000) / 3;
    expect(getFareForClass('deluxe', fares)).toBe(Math.round(4_900_000 + step));
    expect(getFareForClass('skyboss', fares)).toBe(Math.round(4_900_000 + step * 2));
  });

  it('never orders a card below the one before it', () => {
    const prices = FARE_CLASSES.map((fareClass) => getFareForClass(fareClass, fares));
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  // A flight whose two fares are equal (the ladder 030 allows when both are
  // seeded from the same base) must not produce a descending set of cards.
  it('holds still when the two stored fares match', () => {
    const flat = { economyPrice: 900_000, businessPrice: 900_000 };
    FARE_CLASSES.forEach((fareClass) => {
      expect(getFareForClass(fareClass, flat)).toBe(900_000);
    });
  });
});

describe('thang giá đọc từ cột NUMERIC', () => {
  // A `NUMERIC(12, 2)` column is returned by the driver as a string, not a
  // number. `getFareForClass` did plain arithmetic on it, so `step` was NaN and
  // every interpolated card collapsed onto the economy fare: the page quoted
  // 7,791,000đ and the API charged 4,900,000đ. Coercion happens inside the
  // function, so every caller — the results page and the booking API — is
  // covered by this one case.
  const rawRow = { economyPrice: '4900000.00', businessPrice: '13573000.00' };

  it('nội suy đúng khi giá đến từ driver dạng chuỗi', () => {
    const step = (13_573_000 - 4_900_000) / 3;
    expect(getFareForClass('deluxe', rawRow)).toBe(Math.round(4_900_000 + step));
    expect(getFareForClass('skyboss', rawRow)).toBe(Math.round(4_900_000 + step * 2));
  });

  it('cho ra cùng kết quả với bản số thuần', () => {
    const numeric = { economyPrice: 4_900_000, businessPrice: 13_573_000 };
    for (const fareClass of FARE_CLASSES) {
      expect(getFareForClass(fareClass, rawRow)).toBe(getFareForClass(fareClass, numeric));
    }
  });

  // `Number(null)` is 0, so the coercion does not catch a NULL column — the
  // NOT NULL constraint migration 030 installs is what rules that out, and
  // `mapFlightRecordToFlight` falls back to `price` on the client side. Pinned
  // so the interaction is written down rather than assumed.
  it('một cột NULL thành 0, nên ràng buộc NOT NULL là hàng phòng vệ thật', () => {
    expect(getFareForClass('eco', { economyPrice: null, businessPrice: null })).toBe(0);
  });
});
