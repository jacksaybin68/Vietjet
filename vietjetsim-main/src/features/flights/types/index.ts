import type { FlightRecord } from '@/lib/db';
import type { FareClassId } from '@/features/bookings/pricing';

/** Flight shape consumed by the booking UI (camelCase, display-ready). */
export type Flight = {
  id: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  /** Fare for one adult in the selected bucket; equals `economyPrice` for a flight row. */
  price: number;
  /** Fare ladder from `flights` (migration 030); the card and the charge agree on these. */
  economyPrice: number;
  businessPrice: number;
  /**
   * Which fare card the traveller tapped. Set on selection, not on the search
   * result — a listed flight is the economy row until a card is chosen.
   */
  fareClass?: FareClassId;
  /** Cabin the row itself seats; decides which rows a search returns. */
  class: 'economy' | 'business';
  airline: string;
  flightNo: string;
  available: number;
  stops: number;
};

export interface FlightSearchParams {
  from_code: string;
  to_code: string;
  depart_date?: string;
  class?: string;
}

export interface FlightSearchResponse {
  flights: FlightRecord[];
  error?: string;
}

export type SeatClass = 'economy' | 'business';
