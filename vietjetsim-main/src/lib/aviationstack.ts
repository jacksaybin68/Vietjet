import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

export interface AviationStackFlight {
  id: string;
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price: number;
  class: 'economy' | 'business';
  available: number;
  created_at: string;
  updated_at: string;
}

interface AviationStackResponse {
  data: Array<{
    flight: {
      iata?: string;
      number?: string;
    };
    airline: {
      name: string;
    };
    departure: {
      iata: string;
      scheduled: string;
    };
    arrival: {
      iata: string;
      scheduled: string;
    };
    flight_status: string;
  }>;
  pagination?: {
    limit?: number;
    offset?: number;
    count?: number;
    total?: number;
  };
  error?: {
    code?: string | number;
    message?: string;
    level?: string;
  };
}

const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY;
const AVIATIONSTACK_BASE_URL = 'https://api.aviationstack.com/v1';

function buildCacheKey(fromCode: string, toCode: string, departDate?: string): string {
  return CacheKeys.flightsSearch(`aviation:${fromCode}:${toCode}:${departDate || 'any'}`);
}

function normalizeFlight(
  item: AviationStackResponse['data'][0],
  index: number
): AviationStackFlight {
  const flightNo = item.flight.iata || item.flight.number || `EXTERNAL-${index + 1}`;
  const fromCode = item.departure.iata;
  const toCode = item.arrival.iata;
  const departTime = item.departure.scheduled;
  const arriveTime = item.arrival.scheduled;

  return {
    id: `external-${flightNo}-${departTime}`,
    flight_no: flightNo,
    from_code: fromCode,
    to_code: toCode,
    depart_time: departTime,
    arrive_time: arriveTime,
    price: 0,
    class: 'economy',
    available: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function fetchExternalFlights(params: {
  from_code: string;
  to_code: string;
  depart_date?: string;
  limit?: number;
}): Promise<AviationStackFlight[]> {
  if (!AVIATIONSTACK_API_KEY) {
    return [];
  }

  const cacheKey = buildCacheKey(params.from_code, params.to_code, params.depart_date);
  const cached = cache.get<AviationStackFlight[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(`${AVIATIONSTACK_BASE_URL}/flights`);
  url.searchParams.set('access_key', AVIATIONSTACK_API_KEY);
  url.searchParams.set('dep_iata', params.from_code);
  url.searchParams.set('arr_iata', params.to_code);
  url.searchParams.set('limit', String(params.limit || 5));

  if (params.depart_date) {
    url.searchParams.set('flight_date', params.depart_date);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[AVIATIONSTACK] HTTP ${response.status}: ${response.statusText}`);
      return [];
    }

    const result = (await response.json()) as AviationStackResponse;

    if (result.error) {
      console.error('[AVIATIONSTACK] API error:', result.error);
      return [];
    }

    const flights = (result.data || []).map((item, index) => normalizeFlight(item, index));

    cache.set(cacheKey, flights, CacheTTL.flights);
    return flights;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[AVIATIONSTACK] Fetch error:', error);
    return [];
  }
}
