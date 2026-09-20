// Flight-related constants
import { API_ENDPOINTS } from '@/shared/constants';

export const FLIGHT_API_ENDPOINTS = API_ENDPOINTS.FLIGHTS;

/** Matches the `flights.class` CHECK constraint — only two cabins exist. */
export const FLIGHT_CLASSES = {
  ECONOMY: 'economy',
  BUSINESS: 'business',
} as const;

export const FLIGHT_CLASS_LABELS: Record<string, string> = {
  economy: 'Phổ thông',
  business: 'Thương gia',
};

export const FLIGHT_SORT_OPTIONS = [
  { value: 'price_asc', label: 'Giá: Thấp → Cao' },
  { value: 'price_desc', label: 'Giá: Cao → Thấp' },
  { value: 'departure', label: 'Giờ khởi hành' },
  { value: 'arrival', label: 'Giờ hạ cánh' },
  { value: 'duration', label: 'Thời gian bay' },
] as const;

/** Airline prefixes recognised when deriving the carrier from a flight number. */
export const AIRLINE_PREFIXES = {
  VJ: 'Vietjet Air',
  VN: 'VietnamSim',
  VNA: 'VietnamSim',
  QH: 'BambooSim',
  BL: 'BambooSim',
} as const;
