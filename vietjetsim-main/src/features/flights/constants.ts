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

/** Common aircraft fleet models operated or partnered with Vietjet. */
export const AIRCRAFT_MODELS = {
  A321NEO: 'Airbus A321neo',
  A321: 'Airbus A321',
  A320: 'Airbus A320',
  A330: 'Airbus A330-300',
  B737_MAX: 'Boeing 737 MAX',
  B787: 'Boeing 787 Dreamliner',
} as const;

export type AircraftModel = (typeof AIRCRAFT_MODELS)[keyof typeof AIRCRAFT_MODELS];

