// Booking-related constants

export const BOOKING_API_ENDPOINTS = {
  CREATE: '/api/bookings',
  GET: '/api/bookings/:id',
  LIST: '/api/bookings',
  CANCEL: '/api/bookings/:id/cancel',
  UPDATE: '/api/bookings/:id',
} as const;

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PASSENGER_TYPES = {
  ADULT: 'adult',
  CHILD: 'child',
  INFANT: 'infant',
} as const;

export const SEAT_CLASSES = {
  STANDARD: 'standard',
  EXTRA_LEGROOM: 'extra_legroom',
  WINDOW: 'window',
  AISLE: 'aisle',
} as const;

export const BOOKING_VALIDATION = {
  MIN_PASSENGERS: 1,
  MAX_PASSENGERS: 9,
  MIN_AGE_ADULT: 18,
  MAX_AGE_CHILD: 17,
} as const;
