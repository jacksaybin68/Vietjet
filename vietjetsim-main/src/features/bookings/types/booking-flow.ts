import type { Flight } from '@/features/flights/types';

export type { Flight };

export interface Passenger {
  name: string;
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
};

export type SearchParams = {
  from?: string;
  to?: string;
  depart?: string;
  return?: string;
  pax?: string;
};
