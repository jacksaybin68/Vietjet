// Single source of truth for everything that contributes to a booking total.
//
// Tax/fee rate and seat prices used to be duplicated across the seat step, the
// passenger step and the booking creator with different values (10% vs 15%), so
// the total shown to the user did not match what was charged. Keep every
// consumer importing from here.

import type { PassengerType } from '@/features/bookings/types/booking-flow';

/** Tax + airport fee applied to the air fare. */
export const TAX_AND_FEE_RATE = 0.15;

/** Seat prices carry their own tax/service-fee split, used only in the seat tooltip. */
export const SEAT_TAX_RATE = 0.1;
export const SEAT_SERVICE_FEE_RATE = 0.05;

export const SEAT_TIER_PRICES = {
  business: 350000,
  hot: 80000,
  available: 70000,
  occupied: 50000,
} as const;

/**
 * What a seat costs before tax, from its position in the cabin.
 *
 * The rows are priced in bands, exactly as the seat map draws them
 * (`generateSeats` in `SeatSelectionStep`): rows 1–3 are business, a handful
 * of rows are flagged high-demand, and the rest step down the further back
 * they sit. The band edges live here rather than in the component because the
 * booking API has to charge the same amount the seat was quoted at — the two
 * used to be separate tables, and a row-12 seat was priced 70,000₫ on the
 * server while the map showed 55,000₫, so the customer was billed 15% of a
 * seat they had not agreed to.
 */
export function getSeatPrice(seatNumber: string): number {
  const match = /^(\d+)[A-F]$/.exec(seatNumber.trim().toUpperCase());
  if (!match) return 0;
  const row = Number(match[1]);
  if (row <= 3) return SEAT_TIER_PRICES.business;
  if (row <= 10) return SEAT_TIER_PRICES.available;
  if (row <= 20) return SEAT_TIER_PRICES.available - 15_000;
  return SEAT_TIER_PRICES.available - 25_000;
}

/**
 * What a seat adds to the booking: its price plus the seat tax and service fee,
 * which the seat tooltip itemises separately from the air fare.
 */
export function getSeatCharge(seatNumber: string): number {
  return Math.round(getSeatPrice(seatNumber) * (1 + SEAT_TAX_RATE + SEAT_SERVICE_FEE_RATE));
}

export type AncillaryId = 'baggage' | 'meal' | 'insurance';

export interface AncillaryOption {
  id: AncillaryId;
  title: string;
  description: string;
  icon: 'BriefcaseIcon' | 'SparklesIcon' | 'ShieldCheckIcon';
  /** Price per passenger. */
  price: number;
}

export const ANCILLARY_OPTIONS: readonly AncillaryOption[] = [
  {
    id: 'baggage',
    title: 'Hành lý',
    description: 'Hành lý ký gửi 20kg',
    icon: 'BriefcaseIcon',
    price: 150000,
  },
  {
    id: 'meal',
    title: 'Suất ăn',
    description: 'Bữa ăn nóng trên máy bay',
    icon: 'SparklesIcon',
    price: 100000,
  },
  {
    id: 'insurance',
    title: 'Bảo hiểm',
    description: 'Bảo hiểm chuyến bay',
    icon: 'ShieldCheckIcon',
    price: 60000,
  },
] as const;

export interface PriceBreakdownInput {
  /** Air fare for ONE adult. */
  farePerPassenger: number;
  passengerCount: number;
  /**
   * Head count per category. Omit it for an all-adult booking: the totals then
   * come out identical to the single-fare behaviour this module had before
   * passenger types existed, so every existing caller keeps working.
   */
  paxCounts?: Partial<Record<PassengerType, number>>;
  /** Total of all selected seats. */
  seatFee?: number;
  /** Ancillary options selected for the whole booking. */
  ancillaries?: readonly AncillaryId[];
}

export interface BookingTotals {
  farePerPassenger: number;
  passengerCount: number;
  /** Passengers who occupy a seat; excludes infants. */
  seatedPassengerCount: number;
  /** air fare across every passenger */
  fareSubtotal: number;
  taxAndFee: number;
  seatFee: number;
  ancillaryFee: number;
  total: number;
}

/**
 * Share of the adult fare charged per category.
 *
 * Adults pay the quoted fare; a child (2–11) pays 75% of it; an infant under 2
 * travels on an adult's lap and is free. The infant rate is 0 rather than a
 * small fraction, so the fare line itself is free — tax follows the fares
 * actually flown and the infant contributes none.
 */
export const FARE_RATE_BY_TYPE: Record<PassengerType, number> = {
  adult: 1,
  child: 0.75,
  infant: 0,
};

/**
 * The fare buckets the results page sells, cheapest first.
 *
 * `flights` stores two fares per row (migration 030), so four cards cannot each
 * have a stored price. The two middle buckets are therefore stepped evenly
 * between them — and that ladder lives here, not in the results component,
 * because the booking API has to charge the bucket the traveller tapped. When
 * it was derived in the card and the server read only `business_price`, the
 * SkyBOSS card quoted 10,682,000₫ and charged 13,573,000₫.
 */
export const FARE_CLASSES = ['eco', 'deluxe', 'skyboss', 'business'] as const;

export type FareClassId = (typeof FARE_CLASSES)[number];

/** Cabin a fare bucket is sold in; the fare itself comes from the `flights` row. */
export const FARE_CLASS_CABIN: Record<FareClassId, 'economy' | 'business'> = {
  eco: 'economy',
  deluxe: 'economy',
  skyboss: 'business',
  business: 'business',
};

/**
 * Fare for one adult in `fareClass`, derived from the row's two stored fares.
 *
 * The endpoints are the stored values, so Economy and Business on the card are
 * exactly the amounts the API charges for them; only the two middle buckets are
 * interpolated. Ordering is guaranteed: `deluxe` and `skyboss` sit at one and
 * two thirds of the gap, and migration 030's `flights_fare_ladder_ordered`
 * CHECK keeps the gap from inverting.
 *
 * Both fares are coerced with `Number` because a `NUMERIC(12, 2)` column comes
 * back from the driver as a *string* (`"4900000.00"`). Arithmetic on that
 * concatenates instead of adding — `step` becomes `NaN` and every interpolated
 * bucket silently collapses onto the cheapest fare, so the card would quote
 * 7,791,000₫ and the API would charge 4,900,000₫. A NULL is still 0 rather than
 * an error, so migration 030's NOT NULL is what keeps a missing fare from ever
 * reaching this function.
 */
export function getFareForClass(
  fareClass: FareClassId,
  // `null` is in the type because that is what a nullable column serialises to;
  // migration 030's NOT NULL is what stops it in practice, not the compiler.
  fares: { economyPrice: number | string | null; businessPrice: number | string | null }
): number {
  const economyPrice = Number(fares.economyPrice);
  const businessPrice = Number(fares.businessPrice);
  const step = (businessPrice - economyPrice) / 3;
  switch (fareClass) {
    case 'business':
      return Math.round(businessPrice);
    case 'skyboss':
      return Math.round(economyPrice + step * 2);
    case 'deluxe':
      return Math.round(economyPrice + step);
    default:
      return Math.round(economyPrice);
  }
}

const round = (n: number) => Math.round(n);

/** Ancillary total: each option is priced per passenger. */
export function getAncillaryFee(
  ancillaries: readonly AncillaryId[] = [],
  passengerCount = 1
): number {
  return ancillaries.reduce((sum, id) => {
    const option = ANCILLARY_OPTIONS.find((o) => o.id === id);
    return sum + (option ? option.price * passengerCount : 0);
  }, 0);
}

/**
 * The one place booking totals are computed. Every step must render its summary
 * from this so the quoted price and the charged price cannot drift apart.
 */
export function getBookingTotals({
  farePerPassenger,
  passengerCount,
  paxCounts,
  seatFee = 0,
  ancillaries = [],
}: PriceBreakdownInput): BookingTotals {
  const adultCount = paxCounts?.adult ?? passengerCount;
  const childCount = paxCounts?.child ?? 0;
  const infantCount = paxCounts?.infant ?? 0;

  // Tax is charged on the fares actually flown: the adult and child fares. The
  // infant rides on a lap for free, so it adds neither fare nor tax.
  const taxableFare = farePerPassenger * (adultCount + childCount * FARE_RATE_BY_TYPE.child);
  const fareSubtotal = round(
    taxableFare + farePerPassenger * infantCount * FARE_RATE_BY_TYPE.infant
  );
  const taxAndFee = round(taxableFare * TAX_AND_FEE_RATE);

  // Infants occupy no seat, so neither seat nor ancillary fees apply to them.
  const seatedPassengerCount = adultCount + childCount;
  const ancillaryFee = getAncillaryFee(ancillaries, seatedPassengerCount);

  return {
    farePerPassenger,
    passengerCount,
    seatedPassengerCount,
    fareSubtotal,
    taxAndFee,
    seatFee,
    ancillaryFee,
    total: fareSubtotal + taxAndFee + seatFee + ancillaryFee,
  };
}
