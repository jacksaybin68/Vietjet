import { API_ENDPOINTS, AIRPORT_CITIES } from '@/shared/constants';
import { apiRequest } from '@/shared/services';
import type { FlightRecord } from '@/lib/db';
import { toVietnamWallClock } from '@/lib/utils';
import type { Flight, FlightSearchParams, FlightSearchResponse } from '../types';
import { resolveAircraft, normalizeAircraftName } from './aircraft';

export { resolveAircraft, normalizeAircraftName };

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
  return toVietnamWallClock(iso).time;
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
    // The departure *day*, in Vietnam, `YYYY-MM-DD`. The booking summary used
    // to stamp today's date here, so a flight booked for next month carried
    // the wrong day all the way to the payment screen.
    departDate: toVietnamWallClock(row.depart_time).date,
    duration: formatDuration(row.depart_time, row.arrive_time),
    // A fare is whole đồng: rounding here means a stray decimal in the column
    // can never reach the card as "898.916,97₫".
    price: Math.round(Number(row.price) || 0),
    // The fare ladder comes from the database (migration 030) so the card the
    // traveller reads and the amount the API charges are the same number.
    economyPrice: Math.round(Number(row.economy_price ?? row.price) || 0),
    businessPrice: Math.round(Number(row.business_price ?? row.price) || 0),
    class: row.class === 'business' ? 'business' : 'economy',
    airline: resolveAirline(flightNo),
    flightNo,
    available: Number(row.available) || 0,
    stops: 0,
    aircraft: resolveAircraft(
      flightNo,
      row.from_code,
      row.to_code,
      (row as unknown as { aircraft?: string }).aircraft
    ),
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

/**
 * Search and keep the alternative dates.
 *
 * The results page needs both: the flights, and — when there are none — the
 * dates that do have departures. A separate call would race two requests for
 * what is one question, so the API answers with both in a single response.
 */
export async function searchFlightsWithDates(params: FlightSearchParams): Promise<{
  flights: Flight[];
  availableDates: string[];
}> {
  const response = await searchFlights(params);
  return {
    flights: (response.flights || []).map(mapFlightRecordToFlight),
    availableDates: response.availableDates || [],
  };
}
