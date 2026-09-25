import type { BookingRecord, BookingDetail } from '@/lib/db';
import type { BookingConsents, Passenger } from './booking-flow';

export type { BookingRecord, BookingDetail };
export type {
  Flight,
  Passenger,
  BookingConsents,
  BookingState,
  SearchParams,
} from './booking-flow';

export type PassengerInput = Passenger;

export interface CreateBookingInput {
  flight_id: string;
  total_price: number;
  passengers: PassengerInput[];
  seats?: string[];
  consents: BookingConsents;
}

export interface BookingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BookingListResponse {
  bookings: BookingRecord[];
  pagination: BookingPagination;
}

export interface CreateBookingResponse {
  booking: BookingRecord;
  message?: string;
}

export interface BookingDetailResponse {
  booking: BookingDetail;
}

export type BookingStatus = BookingRecord['status'];

/** Statuses accepted by the `GET /api/dat-ve?status=` filter. */
export const ALLOWED_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'refunded',
];
