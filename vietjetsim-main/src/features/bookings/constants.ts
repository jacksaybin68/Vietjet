// Booking-related constants
//
// Endpoints reuse the shared API map so there is a single source of truth for
// every `/api` path referenced across the app.
import { API_ENDPOINTS } from '@/shared/constants';
import type { BookingStatus } from './types';

export const BOOKING_API_ENDPOINTS = API_ENDPOINTS.BOOKINGS;

/** Matches the `bookings.status` CHECK constraint. */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const satisfies Record<string, BookingStatus>;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

export const PASSENGER_TYPES = {
  ADULT: 'adult',
  CHILD: 'child',
  INFANT: 'infant',
} as const;

/** Seat positions offered by the seat map, matching the `seats` table. */
export const SEAT_CLASSES = {
  WINDOW: 'window',
  MIDDLE: 'middle',
  AISLE: 'aisle',
} as const;

export const BOOKING_PAGE_SIZE = 10;

export const BOOKING_VALIDATION = {
  MIN_PASSENGERS: 1,
  MAX_PASSENGERS: 9,
  MIN_AGE_ADULT: 18,
  MAX_AGE_CHILD: 17,
} as const;
