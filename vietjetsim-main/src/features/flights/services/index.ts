import { apiRequest } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';
import type { FlightRecord } from '@/lib/db';
import type { Flight, FlightSearchParams, FlightSearchResponse } from '../types';

/** Airport code → Vietnamese city name, falling back to the raw code. */
export const AIRPORT_CITIES: Record<string, string> = {
  HAN: 'Hà Nội',
  SGN: 'TP.HCM',
  DAD: 'Đà Nẵng',
  PQC: 'Phú Quốc',
  CXR: 'Nha Trang',
  HPH: 'Hải Phòng',
  HUI: 'Huế',
  VCL: 'Chu Lai',
  PUI: 'Phù Cát',
  VCS: 'Côn Đảo',
  VCA: 'Phú Cat',
  DLI: 'Lâm Đồng',
  BMV: 'Buôn Ma Thuột',
};

export function getAirportCity(code: string): string {
  return AIRPORT_CITIES[code.toUpperCase()] || code;
}

function resolveAirline(flightNo: string): string {
  const normalized = flightNo.toUpperCase().replace(/\s+/g, '');
  if (normalized.startsWith('VN') || normalized.startsWith('VNA')) return 'VietnamSim';
  if (normalized.startsWith('QH') || normalized.startsWith('BL')) return 'BambooSim';
  return 'Vietjet Air';
}

function formatDuration(departIso: string, arriveIso: string): string {
  const diffMs = new Date(arriveIso).getTime() - new Date(departIso).getTime();
  const totalMinutes = Math.round(diffMs / 60000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Map a raw `flights` row onto the display-ready UI shape. */
export function mapFlightRecordToFlight(row: FlightRecord): Flight {
  const flightNo = row.flight_no || '';
  return {
    id: row.id || flightNo,
    from: (row.from_code || '').toUpperCase(),
    to: (row.to_code || '').toUpperCase(),
    fromCity: getAirportCity(row.from_code || ''),
    toCity: getAirportCity(row.to_code || ''),
    departTime: formatClock(row.depart_time),
    arriveTime: formatClock(row.arrive_time),
    duration: formatDuration(row.depart_time, row.arrive_time),
    price: Number(row.price) || 0,
    class: row.class === 'business' ? 'business' : 'economy',
    airline: resolveAirline(flightNo),
    flightNo,
    available: Number(row.available) || 0,
    stops: 0,
  };
}

/** Search flights for a route. Returns an empty list when the route has none. */
export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
  const query = new URLSearchParams({ from: params.from_code, to: params.to_code });
  if (params.depart_date) query.set('date', params.depart_date);
  if (params.class) query.set('class', params.class);

  return apiRequest<FlightSearchResponse>(`${API_ENDPOINTS.FLIGHTS.SEARCH}?${query.toString()}`);
}

/** Search and map in one step — what the results step actually needs. */
export async function searchFlightsForUi(params: FlightSearchParams): Promise<Flight[]> {
  const { flights } = await searchFlights(params);
  return (flights || []).map(mapFlightRecordToFlight);
}
