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

/** Share of the adult fare charged per category. */
export const FARE_RATE_BY_TYPE: Record<PassengerType, number> = {
  adult: 1,
  child: 0.75,
  infant: 0.1,
};

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

  // Tax is charged on the fares actually flown: the adult and child fares, but
  // not the infant lap fare, which carries no ticket of its own.
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
