import type { FlightRecord } from '@/lib/db/types';

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
  price: number;
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
