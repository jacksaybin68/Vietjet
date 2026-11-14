import type {
  BookingRecord,
  BookingDetail,
  FlightStatus,
  FlightRecord,
  PassengerRecord,
  PaymentRecord,
} from '@/lib/db';
import type { BookingConsents, Passenger } from './booking-flow';
import type { FareClassId } from '../pricing';

export type { BookingRecord, BookingDetail };
export type {
  Flight,
  Passenger,
  PassengerType,
  BookingConsents,
  BookingState,
  SearchParams,
} from './booking-flow';
// Passenger-type helpers are runtime values (labels, counters), not types.
export {
  PASSENGER_TYPE_LABELS,
  SEATED_PASSENGER_TYPES,
  countPassengerTypes,
  fullPassengerName,
  isSeated,
  requiresIdNumber,
} from './booking-flow';

export type PassengerInput = Passenger;

export interface CreateBookingInput {
  flight_id: string;
  return_flight_id?: string;
  /** Ignored by the API, which prices the booking itself; kept for the local quote. */
  total_price: number;
  passengers: PassengerInput[];
  seats?: string[];
  return_seats?: string[];
  /**
   * The fare card the traveller tapped. The API re-derives the amount from
   * `flights` through the same `getFareForClass` ladder the card was drawn
   * with, so this names a bucket rather than quoting a price.
   */
  fareClass?: FareClassId;
  returnFareClass?: FareClassId;
  ancillaries?: string[];
  consents: BookingConsents;
}

export interface BookingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BookingListResponse {
  bookings: BookingListItem[];
  pagination: BookingPagination;
}

/**
 * Một booking trong danh sách, đã gộp sẵn thông tin cần cho UI.
 *
 * Gộp `check_ins` vào query danh sách để `/chuyen-bay-cua-toi` không phải gọi
 * `/api/checkin/status/<id>` cho từng dòng (N+1 request).
 */
export interface BookingListItem extends BookingRecord {
  flight: Pick<FlightRecord, 'flight_no' | 'from_code' | 'to_code' | 'depart_time' | 'arrive_time'>;
  passengers: PassengerRecord[];
  payment: PaymentRecord | null;
  flight_status?: FlightStatus;
  gate?: string | null;
  terminal?: string | null;
  check_ins: Array<{
    id: string;
    passenger_id: string | null;
    passenger_name: string;
    seat_number: string;
    check_in_number: string;
    boarding_pass_number: string | null;
    gate: string | null;
    terminal: string | null;
    check_in_time: string | null;
  }>;
}

export interface CreateBookingResponse {
  booking: BookingRecord & { return_booking_id?: string; return_booking_code?: string };
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
