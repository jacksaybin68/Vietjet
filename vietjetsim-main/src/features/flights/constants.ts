// Flight-related constants

export const FLIGHT_API_ENDPOINTS = {
  SEARCH: '/api/flights/search',
  GET: '/api/flights/:id',
  LIST: '/api/flights',
} as const;

export const FLIGHT_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  CANCELLED: 'cancelled',
} as const;

export const FLIGHT_CLASSES = {
  ECONOMY: 'economy',
  BUSINESS: 'business',
  FIRST: 'first',
} as const;

export const FLIGHT_SORT_OPTIONS = [
  { value: 'price_asc', label: 'Giá: Thấp → Cao' },
  { value: 'price_desc', label: 'Giá: Cao → Thấp' },
  { value: 'departure', label: 'Giờ khởi hành' },
  { value: 'arrival', label: 'Giờ hạ cánh' },
  { value: 'duration', label: 'Thời gian bay' },
] as const;
