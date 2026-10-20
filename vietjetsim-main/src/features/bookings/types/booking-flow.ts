import type { Flight } from '@/features/flights/types';

export type { Flight };

/**
 * Passenger categories. Vietnam domestic fares follow the standard airline
 * split: a child (2-11) pays 75% of the adult fare, an infant (under 2) travels
 * on a lap for free so it is neither seated nor charged fare, tax or fees.
 */
export type PassengerType = 'adult' | 'child' | 'infant';

/** Passengers who occupy a seat; an infant is excluded. */
export const SEATED_PASSENGER_TYPES: readonly PassengerType[] = ['adult', 'child'];

export const PASSENGER_TYPE_LABELS: Record<PassengerType, string> = {
  adult: 'Người lớn',
  child: 'Trẻ em',
  infant: 'Em bé',
};

/** A passenger rides free only when they are seated. */
export function isSeated(type: PassengerType | undefined): boolean {
  return SEATED_PASSENGER_TYPES.includes(type ?? 'adult');
}

/** A passenger needs an identity document; an infant may travel on a birth certificate. */
export function requiresIdNumber(type: PassengerType | undefined): boolean {
  return (type ?? 'adult') !== 'infant';
}

/** Head count per category, used by every step that prices or labels a booking. */
export function countPassengerTypes(
  passengers: readonly Pick<Passenger, 'type'>[]
): Record<PassengerType, number> {
  const counts: Record<PassengerType, number> = { adult: 0, child: 0, infant: 0 };
  for (const passenger of passengers) {
    counts[passenger.type ?? 'adult'] += 1;
  }
  return counts;
}

export interface Passenger {
  /** Absent only on objects built before passenger types existed; read as 'adult'. */
  type?: PassengerType;
  name: string;
  firstName?: string;
  dob: string;
  idNumber: string;
  gender: string;
  countryCode: string;
  phone: string;
  email: string;
  residence: string;
  skyJoyMemberId: string;
}

export interface BookingConsents {
  marketing: boolean;
  survey: boolean;
  retainForFutureBooking: boolean;
  policyAccepted: boolean;
}

import type { AncillaryId } from '../pricing';

export type BookingState = {
  selectedFlight: Flight | null;
  passengers: Passenger[];
  selectedSeats: string[];
  ancillaries: AncillaryId[];
  selectedBaggage?: string | null;
  hasInsurance?: boolean;
};

export type SearchParams = {
  from?: string;
  to?: string;
  depart?: string;
  return?: string;
  /** Adults (12+). */
  pax?: string;
  /** Children aged 2-11. */
  child?: string;
  /** Infants under 2, travelling on a lap. */
  infant?: string;
  /** Auto-select cheapest fare when set to '1'. */
  cheapest?: string;
};
