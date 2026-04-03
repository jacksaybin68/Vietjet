'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Flight } from './FlightBookingClient';
import Icon from '@/components/ui/AppIcon';
import { FlightResultsSkeleton } from '@/components/ui/SkeletonLoader';

// ─── Fallback mock data (used when API is unavailable) ──────────────────────

const FALLBACK_FLIGHTS: Flight[] = [
  {
    id: 'VJ101',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '06:00',
    arriveTime: '08:10',
    duration: '2h 10m',
    price: 899000,
    class: 'economy',
    airline: 'VietjetSim',
    flightNo: 'VJ 101',
    available: 42,
    stops: 0,
  },
  {
    id: 'VJ103',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '09:30',
    arriveTime: '11:40',
    duration: '2h 10m',
    price: 1299000,
    class: 'economy',
    airline: 'VietjetSim',
    flightNo: 'VJ 103',
    available: 15,
    stops: 0,
  },
  {
    id: 'VJ105',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '12:15',
    arriveTime: '14:25',
    duration: '2h 10m',
    price: 749000,
    class: 'economy',
    airline: 'VietjetSim',
    flightNo: 'VJ 105',
    available: 68,
    stops: 0,
  },
  {
    id: 'VJ107B',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '15:00',
    arriveTime: '17:10',
    duration: '2h 10m',
    price: 2899000,
    class: 'business',
    airline: 'VietjetSim',
    flightNo: 'VJ 107',
    available: 8,
    stops: 0,
  },
  {
    id: 'VJ109',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '18:45',
    arriveTime: '20:55',
    duration: '2h 10m',
    price: 599000,
    class: 'economy',
    airline: 'VietjetSim',
    flightNo: 'VJ 109',
    available: 3,
    stops: 0,
  },
  {
    id: 'VJ201',
    from: 'SGN',
    to: 'PQC',
    fromCity: 'TP.HCM',
    toCity: 'Phú Quốc',
    departTime: '07:30',
    arriveTime: '08:45',
    duration: '1h 15m',
    price: 499000,
    class: 'economy',
    airline: 'VietjetSim',
    flightNo: 'VJ 201',
    available: 55,
    stops: 0,
  },
  {
    id: 'VJ301',
    from: 'HAN',
    to: 'DAD',
    fromCity: 'Hà Nội',
    toCity: 'Đà Nẵng',
    departTime: '07:00',
    arriveTime: '08:20',
    duration: '1h 20m',
    price: 449000,
    class: 'economy',
    airline: 'VietjetSim',
    flightNo: 'VJ 301',
    available: 30,
    stops: 0,
  },
  {
    id: 'VJ401',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '21:00',
    arriveTime: '23:10',
    duration: '2h 10m',
    price: 1099000,
    class: 'economy',
    airline: 'BambooSim',
    flightNo: 'QH 401',
    available: 22,
    stops: 1,
  },
  {
    id: 'VJ402',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '14:00',
    arriveTime: '17:30',
    duration: '3h 30m',
    price: 650000,
    class: 'economy',
    airline: 'BambooSim',
    flightNo: 'QH 402',
    available: 40,
    stops: 1,
  },
  {
    id: 'VJ501',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    departTime: '10:00',
    arriveTime: '12:10',
    duration: '2h 10m',
    price: 1500000,
    class: 'business',
    airline: 'VietnamSim',
    flightNo: 'VN 501',
    available: 12,
    stops: 0,
  },
];

// ─── Airport code → City name mapping ───────────────────────────────────────

const AIRPORT_CITIES: Record<string, string> = {
  HAN: 'Hà Nội', SGN: 'TP.HCM', DAD: 'Đà Nẵng', PQC: 'Phú Quốc',
  CXR: 'Nha Trang', HPH: 'Hải Phòng', HUI: 'Huế',
  VCL: 'Chu Lai', PUI: 'Phù Cát', VCS: 'Côn Đảo', VCA: 'Phú Cat',
  DLI: 'Lâm Đồng', BMV: 'Buôn Ma Thuột',
};

function getAirportCity(code: string): string {
  return AIRPORT_CITIES[code] || code;
}

// ─── DB FlightRecord → UI Flight mapper ─────────────────────────────────────

function mapDbFlightToFlight(row: any): Flight {
  const depTime = new Date(row.depart_time);
  const arrTime = new Date(row.arrive_time);
  const diffMs = arrTime.getTime() - depTime.getTime();
  const durationMin = Math.round(diffMs / 60000);
  const durH = Math.floor(durationMin / 60);
  const durM = durationMin % 60;
  const duration = `${durH}h ${durM}m`;

  // Derive airline prefix from flight_no
  const fn = (row.flight_no || '').toUpperCase().replace(/\s+/g, '');
  let airline = 'VietjetSim';
  if (fn.startsWith('VJ')) airline = 'VietjetSim';
  else if (fn.startsWith('VN') || fn.startsWith('VNA')) airline = 'VietnamSim';
  else if (fn.startsWith('QH') || fn.startsWith('BL')) airline = 'BambooSim';

  return {
    id: row.id || fn,
    from: (row.from_code || '').toUpperCase(),
    to: (row.to_code || '').toUpperCase(),
    fromCity: getAirportCity(row.from_code || ''),
    toCity: getAirportCity(row.to_code || ''),
    departTime: `${String(depTime.getHours()).padStart(2,'0')}:${String(depTime.getMinutes()).padStart(2,'0')}`,
    arriveTime: `${String(arrTime.getHours()).padStart(2,'0')}:${String(arrTime.getMinutes()).padStart(2,'0')}`,
    duration,
    price: Number(row.price) || 0,
    class: row.class === 'business' ? 'business' : 'economy',
    airline,
    flightNo: row.flight_no || '',
    available: Number(row.available) || 0,
    stops: 0,
  };
}

const CLASS_LABELS: Record<string, string> = { economy: 'Phổ thông', business: 'Thương gia' };

// Fare class config
const FARE_CLASS_CONFIG: Record<
  string,
  { code: string; label: string; color: string; bg: string }
> = {
  economy: {
    code: 'ECO',
    label: 'Phổ thông',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  business: {
    code: 'BIZ',
    label: 'Thương gia',
    color: 'text-amber-800',
    bg: 'bg-amber-50 border-amber-300',
  },
};

function getFareBreakdown(price: number, fareClass: string) {
  const taxRate = fareClass === 'business' ? 0.12 : 0.1;
  const feeRate = 0.05;
  const discountRate = fareClass === 'economy' ? 0.08 : 0.05;
  const discount = Math.round((price * discountRate) / 1000) * 1000;
  const priceBeforeDiscount = price + discount;
  const taxes = Math.round((priceBeforeDiscount * taxRate) / 1000) * 1000;
  const fees = Math.round((priceBeforeDiscount * feeRate) / 1000) * 1000;
  const base = priceBeforeDiscount - taxes - fees;
  return { base, taxes, fees, discount, total: price };
}

const DEPARTURE_TIME_SLOTS = [
  { label: 'Sáng sớm', sublabel: '00:00 – 06:00', start: 0, end: 6 },
  { label: 'Buổi sáng', sublabel: '06:00 – 12:00', start: 6, end: 12 },
  { label: 'Buổi chiều', sublabel: '12:00 – 18:00', start: 12, end: 18 },
  { label: 'Buổi tối', sublabel: '18:00 – 24:00', start: 18, end: 24 },
];

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'time_asc', label: 'Giờ bay sớm nhất' },
  { value: 'duration_asc', label: 'Bay ngắn nhất' },
  { value: 'stops_asc', label: 'Ít điểm dừng nhất' },
];

function parseDurationMinutes(duration: string): number {
  const hMatch = duration.match(/(\d+)h/);
  const mMatch = duration.match(/(\d+)m/);
  return (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0);
}

function parseHour(time: string): number {
  return parseInt(time.split(':')[0]);
}

const ALL_AIRLINES: string[] = [];
let MIN_PRICE = 0;
let MAX_PRICE = 0;
let MAX_DURATION = 0;

interface Filters {
  airlines: string[];
  minPrice: number;
  maxPrice: number;
  departureSlots: number[];
  stops: number[];
  maxDuration: number;
}

function makeDefaultFilters(minP: number, maxP: number, maxD: number): Filters {
  return {
    airlines: [],
    minPrice: minP,
    maxPrice: maxP,
    departureSlots: [],
    stops: [],
    maxDuration: maxD,
  };
}

// ─── Search Error Modal ───────────────────────────────────────────────────────
interface SearchErrorModalProps {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}

function SearchErrorModal({ message, onRetry, onDismiss }: SearchErrorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        style={{ boxShadow: '0 32px 72px rgba(0,0,0,0.25)', animation: 'fadeInUp 0.3s ease-out' }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5 border-4 border-red-100">
            <Icon name="MagnifyingGlassIcon" size={28} className="text-primary" />
          </div>
          <h3
            className="font-black text-[#1A2948] text-xl mb-2 font-koho"
          >
            Không tìm thấy chuyến bay
          </h3>
          <p className="text-sm text-stone-500 leading-relaxed mb-7">{message}</p>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(236,32,41,0.3)] hover:shadow-[0_8px_24px_rgba(236,32,41,0.4)] hover:-translate-y-0.5"
            >
              <Icon name="ArrowPathIcon" size={16} />
              Tìm lại
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-3 rounded-xl border border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50 transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FlightResultsStep({ onSelect }: { onSelect: (f: Flight) => void }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [sortBy, setSortBy] = useState<string>('price_asc');
  const [filters, setFilters] = useState<Filters>({ airlines: [], minPrice: 0, maxPrice: Infinity, departureSlots: [], stops: [], maxDuration: Infinity });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredFlight, setHoveredFlight] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // ─── Derived constants (computed from fetched flights) ─────────────────
  const allAirlines = useMemo(() => Array.from(new Set(flights.map((f) => f.airline))), [flights]);
  const minPrice = useMemo(() => flights.length > 0 ? Math.min(...flights.map((f) => f.price)) : 0, [flights]);
  const maxPrice = useMemo(() => flights.length > 0 ? Math.max(...flights.map((f) => f.price)) : 0, [flights]);
  const maxDuration = useMemo(() => flights.length > 0 ? Math.max(...flights.map((f) => parseDurationMinutes(f.duration))) : 240, [flights]);

  // Reset filters when flight data changes
  useEffect(() => {
    if (flights.length > 0) {
      setFilters({
        airlines: [],
        minPrice,
        maxPrice,
        departureSlots: [],
        stops: [],
        maxDuration,
      });
    }
  }, [flights.length, minPrice, maxPrice, maxDuration]);

  // ─── Fetch flights from API ──────────────────────────────────────────────
  const fetchFlights = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // Read search params from sessionStorage (set by FlightBookingClient)
      let searchUrl = '/api/flights';
      let sessionHasData = false;
      let fromCode = '';
      let toCode = '';
      try {
        const stored = sessionStorage.getItem('vjsim_booking');
        if (stored) {
          const bookingData = JSON.parse(stored);
          sessionHasData = !!(bookingData.from && bookingData.to);
          fromCode = bookingData.from || '';
          toCode = bookingData.to || '';
          if (bookingData.from && bookingData.to) {
            const params = new URLSearchParams();
            params.set('from', bookingData.from);
            params.set('to', bookingData.to);
            if (bookingData.date) params.set('date', bookingData.date);
            searchUrl = `/api/flights?${params.toString()}`;
          }
        }
      } catch { /* no session data — use default */ }

      const res = await fetch(searchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const apiFlights: Flight[] = (data.flights || []).map(mapDbFlightToFlight);

      if (apiFlights.length > 0) {
        setFlights(apiFlights);
      } else {
        // No results from DB — fall back to mock data so UI is usable
        console.warn('[FlightResultsStep] API returned empty results, using fallback data');
        setFlights(FALLBACK_FLIGHTS);
      }
    } catch (err: any) {
      console.error('[FlightResultsStep] Fetch error:', err?.message || err);
      setLoadError(err?.message || 'Không thể tải danh sách chuyến bay. Vui lòng thử lại.');
      // Fall back to mock data on error
      setFlights(FALLBACK_FLIGHTS);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  const compareFlights = flights.filter((f) => compareIds.includes(f.id));

  const toggleAirline = (airline: string) => {
    setFilters((prev) => ({
      ...prev,
      airlines: prev.airlines.includes(airline)
        ? prev.airlines.filter((a) => a !== airline)
        : [...prev.airlines, airline],
    }));
  };

  const toggleSlot = (idx: number) => {
    setFilters((prev) => ({
      ...prev,
      departureSlots: prev.departureSlots.includes(idx)
        ? prev.departureSlots.filter((s) => s !== idx)
        : [...prev.departureSlots, idx],
    }));
  };

  const toggleStop = (stop: number) => {
    setFilters((prev) => ({
      ...prev,
      stops: prev.stops.includes(stop)
        ? prev.stops.filter((s) => s !== stop)
        : [...prev.stops, stop],
    }));
  };

  const resetFilters = () => setFilters(makeDefaultFilters(minPrice, maxPrice, maxDuration));

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.airlines.length > 0) count++;
    if (filters.minPrice > minPrice || filters.maxPrice < maxPrice) count++;
    if (filters.departureSlots.length > 0) count++;
    if (filters.stops.length > 0) count++;
    if (filters.maxDuration < maxDuration) count++;
    return count;
  }, [filters, minPrice, maxPrice, maxDuration]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flights.filter((f) => {
      if (!q) return true;
      return (
        f.flightNo.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        f.fromCity.toLowerCase().includes(q) ||
        f.toCity.toLowerCase().includes(q) ||
        f.from.toLowerCase().includes(q) ||
        f.to.toLowerCase().includes(q)
      );
    })
      .filter((f) => filters.airlines.length === 0 || filters.airlines.includes(f.airline))
      .filter((f) => f.price >= filters.minPrice && f.price <= filters.maxPrice)
      .filter((f) => {
        if (filters.departureSlots.length === 0) return true;
        const hour = parseHour(f.departTime);
        return filters.departureSlots.some((idx) => {
          const slot = DEPARTURE_TIME_SLOTS[idx];
          return hour >= slot.start && hour < slot.end;
        });
      })
      .filter((f) => filters.stops.length === 0 || filters.stops.includes(f.stops))
      .filter((f) => parseDurationMinutes(f.duration) <= filters.maxDuration)
      .sort((a, b) => {
        switch (sortBy) {
          case 'price_asc':
            return a.price - b.price;
          case 'price_desc':
            return b.price - a.price;
          case 'time_asc':
            return a.departTime.localeCompare(b.departTime);
          case 'duration_asc':
            return parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration);
          case 'stops_asc':
            return a.stops - b.stops;
          default:
            return 0;
        }
      });
  }, [filters, sortBy, searchQuery, flights]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Search error modal */}
      {showErrorModal && loadError && (
        <SearchErrorModal
          message={loadError}
          onRetry={() => {
            setShowErrorModal(false);
            setLoadError(null);
            fetchFlights();
          }}
          onDismiss={() => setShowErrorModal(false)}
        />
      )}

      {/* Sidebar Filters */}
      <aside className="lg:col-span-1">
        <div
          className="bg-white rounded-xl border border-stone-200 sticky top-[108px] overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
        >
          {/* Red accent top bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary-light to-primary" />
          {/* Filter Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-100 bg-stone-50">
            <h3
              className="font-bold text-[#1A2948] text-sm flex items-center gap-1.5 font-koho"
            >
              <Icon name="AdjustmentsHorizontalIcon" size={15} className="text-primary" />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-primary font-semibold hover:underline"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          <div className="p-3 space-y-4">
            {/* Sort */}
            <div>
              <label
                className="text-[10px] font-bold text-[#1A2948] uppercase tracking-wider block mb-1.5 font-koho"
              >
                Sắp xếp theo
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:border-primary bg-stone-50 form-input"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Airline Filter */}
            <div>
              <label
                className="text-[10px] font-bold text-[#1A2948] uppercase tracking-wider block mb-2 font-koho"
              >
                Hãng hàng không
              </label>
              <div className="space-y-1.5">
                {allAirlines.map((airline) => (
                  <label key={airline} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      id={`filter-airline-${airline}`}
                      name="airline"
                      type="checkbox"
                      checked={filters.airlines.includes(airline)}
                      onChange={() => toggleAirline(airline)}
                      className="accent-primary w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs text-stone-700 group-hover:text-stone-900 flex-1">
                      {airline}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {flights.filter((f) => f.airline === airline).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label
                className="text-[10px] font-bold text-[#1A2948] uppercase tracking-wider block mb-2 font-koho"
              >
                Khoảng giá
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-stone-500">
                  <span className="font-semibold text-primary">
                    {minPrice.toLocaleString('vi-VN')}₫
                  </span>
                  <span className="font-semibold text-primary">
                    {maxPrice.toLocaleString('vi-VN')}₫
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-stone-400 w-7">Min</span>
                    <input
                      id="min-price"
                      name="minPrice"
                      type="range"
                      min={minPrice}
                      max={maxPrice}
                      step={50000}
                      value={filters.minPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val <= filters.maxPrice)
                          setFilters((prev) => ({ ...prev, minPrice: val }));
                      }}
                      className="flex-1 accent-primary"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-stone-400 w-7">Max</span>
                    <input
                      id="max-price"
                      name="maxPrice"
                      type="range"
                      min={minPrice}
                      max={maxPrice}
                      step={50000}
                      value={filters.maxPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= filters.minPrice)
                          setFilters((prev) => ({ ...prev, maxPrice: val }));
                      }}
                      className="flex-1 accent-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Departure Time */}
            <div>
              <label
                className="text-[10px] font-bold text-[#1A2948] uppercase tracking-wider block mb-2 font-koho"
              >
                Giờ khởi hành
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DEPARTURE_TIME_SLOTS.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSlot(idx)}
                    className={`text-left px-2 py-1.5 rounded-lg border text-[10px] transition-all ${
                      filters.departureSlots.includes(idx)
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-stone-200 text-stone-600 hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    <div className="font-semibold">{slot.label}</div>
                    <div className="text-stone-400 text-[9px] mt-0.5">{slot.sublabel}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Count */}
            <div>
              <label
                className="text-[10px] font-bold text-[#1A2948] uppercase tracking-wider block mb-2 font-koho"
              >
                Số điểm dừng
              </label>
              <div className="space-y-1.5">
                {[
                  { value: 0, label: 'Bay thẳng' },
                  { value: 1, label: '1 điểm dừng' },
                  { value: 2, label: '2+ điểm dừng' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      id={`filter-stops-${opt.value}`}
                      name="stops"
                      type="checkbox"
                      checked={filters.stops.includes(opt.value)}
                      onChange={() => toggleStop(opt.value)}
                      className="accent-primary w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs text-stone-700 group-hover:text-stone-900">
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-auto">
                      {
                        flights.filter((f) =>
                          opt.value === 2 ? f.stops >= 2 : f.stops === opt.value
                        ).length
                      }
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label
                className="text-[10px] font-bold text-[#1A2948] uppercase tracking-wider block mb-2 font-koho"
              >
                Thời gian bay tối đa:{' '}
                <span className="text-primary">
                  {Math.floor(filters.maxDuration / 60)}h{' '}
                  {filters.maxDuration % 60 > 0 ? `${filters.maxDuration % 60}m` : ''}
                </span>
              </label>
              <input
                id="max-duration"
                name="maxDuration"
                type="range"
                min={60}
                max={maxDuration}
                step={15}
                value={filters.maxDuration === Infinity ? maxDuration : filters.maxDuration}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, maxDuration: Number(e.target.value) }))
                }
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>1h</span>
                <span>
                  {Math.floor(maxDuration / 60)}h{' '}
                  {maxDuration % 60 > 0 ? `${maxDuration % 60}m` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Flight List */}
      <div className="lg:col-span-3 space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Icon name="MagnifyingGlassIcon" size={16} className="text-stone-400" />
          </div>
          <input
            id="search-input"
            name="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số hiệu, hãng bay, thành phố đi / đến..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all form-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
            >
              <Icon name="XMarkIcon" size={15} />
            </button>
          )}
        </div>

        {/* Results header with sort chips */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            className="font-black text-[#1A2948] flex items-center gap-2"
            style={{ fontSize: '0.9rem' }}
          >
            {isLoading ? (
              <span className="inline-block h-4 w-36 bg-stone-200 rounded-full animate-pulse" />
            ) : (
              <>
                <span className="inline-block w-1 h-4 bg-primary rounded-full mr-1" />
                {filtered.length} chuyến bay phù hợp
              </>
            )}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-stone-400 font-semibold">Sắp xếp:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all ${
                  sortBy === opt.value
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-stone-200 text-stone-600 hover:border-primary/40 hover:text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skeleton loaders */}
        {isLoading && <FlightResultsSkeleton count={4} />}

        {/* Error state */}
        {!isLoading && loadError && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
            <div className="px-8 py-12 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="ExclamationTriangleIcon" size={32} className="text-primary" />
              </div>
              <h3
                className="text-lg font-black text-[#1A2948] mb-2 font-koho"
              >
                Lỗi tìm kiếm chuyến bay
              </h3>
              <p className="text-sm text-stone-500 max-w-sm mx-auto mb-6">{loadError}</p>
              <button
                onClick={() => {
                  setLoadError(null);
                  setShowErrorModal(false);
                  fetchFlights();
                }}
                className="vj-btn vj-btn-md vj-btn-primary rounded-xl shadow-glow-red hover:shadow-none"
              >
                <Icon name="ArrowPathIcon" size={15} />
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Flight results */}
        {!isLoading &&
          !loadError &&
          filtered.map((flight, idx) => (
            <div
              key={flight.id}
              style={{
                transitionDelay: `${Math.min(idx * 50, 300)}ms`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
              }}
              className={`bg-white rounded-xl border transition-all duration-250 cursor-pointer hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(236,32,41,0.12)] active:scale-[0.99] group relative overflow-hidden ${
                flight.class === 'business'
                  ? 'border-accent/50 bg-gradient-to-r from-amber-50/40 to-white'
                  : 'border-stone-200'
              } ${compareIds.includes(flight.id) ? 'ring-2 ring-primary border-primary' : ''}`}
              onMouseEnter={() => setHoveredFlight(flight.id)}
              onMouseLeave={() => setHoveredFlight(null)}
            >
              {/* Top accent bar */}
              <div
                className={`h-0.5 w-full ${flight.class === 'business' ? 'bg-gradient-to-r from-accent via-accent-dark to-accent' : 'bg-gradient-to-r from-primary/60 via-primary to-primary/60'}`}
              />

              {/* Fare Breakdown Tooltip */}
              {hoveredFlight === flight.id &&
                (() => {
                  const fare = getFareBreakdown(flight.price, flight.class);
                  const fareClass = FARE_CLASS_CONFIG[flight.class] || FARE_CLASS_CONFIG.economy;
                  return (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 pointer-events-none">
                      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-[#1A2948] to-[#0F1E3A] px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon name="ReceiptPercentIcon" size={15} className="text-stone-300" />
                            <span
                              className="text-xs font-bold text-white uppercase tracking-wider font-koho"
                            >
                              Chi tiết giá vé
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${fareClass.bg} ${fareClass.color}`}
                          >
                            {fareClass.code} · {fareClass.label}
                          </span>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-stone-500 flex items-center gap-1.5">
                              <Icon name="TagIcon" size={13} className="text-stone-400" />
                              Giá cơ bản
                            </span>
                            <span className="font-semibold text-stone-800">
                              {fare.base.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-stone-500 flex items-center gap-1.5">
                              <Icon
                                name="BuildingLibraryIcon"
                                size={13}
                                className="text-stone-400"
                              />
                              Thuế
                            </span>
                            <span className="font-semibold text-stone-800">
                              +{fare.taxes.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-stone-500 flex items-center gap-1.5">
                              <Icon name="CreditCardIcon" size={13} className="text-stone-400" />
                              Phí dịch vụ
                            </span>
                            <span className="font-semibold text-stone-800">
                              +{fare.fees.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-emerald-600 flex items-center gap-1.5">
                              <Icon name="GiftIcon" size={13} className="text-emerald-500" />
                              Giảm giá
                            </span>
                            <span className="font-semibold text-emerald-600">
                              -{fare.discount.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                          <div className="border-t border-stone-100 pt-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-stone-800">Tổng cộng</span>
                            <span className="text-base font-black text-primary">
                              {fare.total.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                        </div>
                        <div className="px-4 pb-3">
                          <p className="text-[10px] text-stone-400 text-center">
                            Giá đã bao gồm thuế & phí / hành khách
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-3 h-3 bg-white border-b border-r border-stone-200 rotate-45 -mt-1.5 shadow-sm" />
                      </div>
                    </div>
                  );
                })()}

              <div className="px-4 py-2.5">
                {/* Row 1: airline icon + flight number + name + class badge | compare + seats badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${flight.class === 'business' ? 'bg-accent' : 'bg-gradient-red'}`}
                    >
                      <Icon
                        name="PaperAirplaneIcon"
                        size={11}
                        className={flight.class === 'business' ? 'text-[#1A2948]' : 'text-white'}
                      />
                    </div>
                    <span
                      className="font-black text-[#1A2948] text-sm leading-none font-koho"
                    >
                      {flight.flightNo}
                    </span>
                    <span className="text-xs text-stone-400">{flight.airline}</span>
                    {flight.class === 'business' && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-accent text-[#1A2948] rounded-full border border-accent-dark">
                        ✦ Thương gia
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompare(flight.id);
                      }}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                        compareIds.includes(flight.id)
                          ? 'bg-primary text-white border-primary'
                          : compareIds.length >= 3
                            ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                            : 'border-stone-200 text-stone-400 hover:border-primary hover:text-primary'
                      }`}
                      disabled={!compareIds.includes(flight.id) && compareIds.length >= 3}
                    >
                      <Icon
                        name={compareIds.includes(flight.id) ? 'CheckIcon' : 'ArrowsRightLeftIcon'}
                        size={10}
                      />
                      {compareIds.includes(flight.id) ? 'Đã chọn' : 'So sánh'}
                    </button>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        flight.available <= 5
                          ? 'badge-error'
                          : flight.available <= 15
                            ? 'badge-warning'
                            : 'badge-success'
                      }`}
                    >
                      {flight.available <= 5
                        ? `Còn ${flight.available} chỗ`
                        : `${flight.available} chỗ trống`}
                    </span>
                  </div>
                </div>

                {/* Row 2: depart → route line → arrive | divider | price + button */}
                <div className="flex items-center gap-3">
                  {/* Departure */}
                  <div className="text-center min-w-[52px]">
                    <div
                      className="text-xl font-black text-[#1A2948] leading-none font-koho"
                    >
                      {flight.departTime}
                    </div>
                    <div className="text-xs font-bold text-stone-600 mt-0.5">{flight.from}</div>
                    <div className="text-[10px] text-stone-400">{flight.fromCity}</div>
                  </div>

                  {/* Route line */}
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="text-[10px] text-stone-400">{flight.duration}</div>
                    <div className="w-full flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full border-2 border-stone-300 shrink-0" />
                      <div className="flex-1 h-px bg-stone-200 relative">
                        <Icon
                          name="PaperAirplaneIcon"
                          size={10}
                          className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-primary"
                        />
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full border-2 border-primary shrink-0" />
                    </div>
                    <div
                      className={`text-[10px] font-medium ${flight.stops === 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                    >
                      {flight.stops === 0 ? 'Bay thẳng' : `${flight.stops} điểm dừng`}
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="text-center min-w-[52px]">
                    <div
                      className="text-xl font-black text-[#1A2948] leading-none font-koho"
                    >
                      {flight.arriveTime}
                    </div>
                    <div className="text-xs font-bold text-stone-600 mt-0.5">{flight.to}</div>
                    <div className="text-[10px] text-stone-400">{flight.toCity}</div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-stone-100 mx-1 shrink-0" />

                  {/* Price + Button */}
                  <div className="text-right shrink-0 min-w-[100px]">
                    <div
                      className={`text-lg font-black leading-none ${flight.class === 'business' ? 'text-accent-dark' : 'text-primary'} font-koho`}
                    >
                      {flight.price.toLocaleString('vi-VN')}₫
                    </div>
                    <div className="text-[10px] text-stone-400 mb-1.5">/ hành khách</div>
                    <button
                      onClick={() => onSelect(flight)}
                      className={`vj-btn vj-btn-sm text-xs font-bold rounded-lg transition-all w-full ${
                        flight.class === 'business'
                          ? 'vj-btn-accent'
                          : 'vj-btn-primary shadow-glow-red hover:shadow-none'
                      }`}
                    >
                      Chọn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* Enhanced empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
            <div className="flex flex-col sm:flex-row items-center gap-6 px-8 py-10">
              {/* SVG Illustration */}
              <div className="shrink-0 w-36 h-36 flex items-center justify-center">
                <img
                  src="/assets/empty-flight-search.svg"
                  alt="Không tìm thấy chuyến bay"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Content */}
              <div className="flex-1 text-center sm:text-left">
                <h3
                  className="text-xl font-black text-[#1A2948] mb-2 font-koho"
                >
                  {searchQuery ? 'Không tìm thấy chuyến bay' : 'Không có chuyến bay phù hợp'}
                </h3>

                <p className="text-sm text-stone-500 mb-5 max-w-sm">
                  {searchQuery
                    ? `Không có kết quả nào cho "${searchQuery}". Hãy thử từ khóa khác hoặc kiểm tra lại tên thành phố, số hiệu chuyến bay.`
                    : 'Bộ lọc hiện tại không khớp với chuyến bay nào. Hãy thử mở rộng tiêu chí tìm kiếm của bạn.'}
                </p>

                {/* Suggestions */}
                <div className="bg-stone-50 rounded-xl p-4 mb-5 text-left max-w-sm">
                  <p
                    className="text-xs font-bold text-[#1A2948] uppercase tracking-wider mb-3 font-koho"
                  >
                    Gợi ý cho bạn
                  </p>
                  <ul className="space-y-2">
                    {searchQuery ? (
                      <>
                        <li className="flex items-start gap-2 text-sm text-stone-600">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Kiểm tra chính tả tên thành phố hoặc mã sân bay
                        </li>
                        <li className="flex items-start gap-2 text-sm text-stone-600">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Thử tìm bằng mã IATA (VD: HAN, SGN, DAD)
                        </li>
                        <li className="flex items-start gap-2 text-sm text-stone-600">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Xóa tìm kiếm để xem tất cả chuyến bay
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-2 text-sm text-stone-600">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Mở rộng khoảng giá hoặc đặt lại về mặc định
                        </li>
                        <li className="flex items-start gap-2 text-sm text-stone-600">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Bỏ chọn một số hãng hàng không hoặc giờ khởi hành
                        </li>
                        <li className="flex items-start gap-2 text-sm text-stone-600">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Tăng thời gian bay tối đa trong bộ lọc
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-all hover:opacity-90 hover:shadow-md active:scale-95"
                      style={{ background: '#EC2029' }}
                    >
                      <Icon name="XMarkIcon" size={15} />
                      Xóa tìm kiếm
                    </button>
                  )}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-all hover:opacity-90 hover:shadow-md active:scale-95"
                      style={{ background: '#EC2029' }}
                    >
                      <Icon name="ArrowPathIcon" size={15} />
                      Đặt lại bộ lọc
                    </button>
                  )}
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 px-5 py-2.5 rounded-xl transition-all"
                  >
                    <Icon name="AdjustmentsHorizontalIcon" size={15} />
                    Xem tất cả chuyến bay
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Bar */}
        {compareIds.length >= 1 && !showComparison && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-primary shadow-2xl">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="text-sm font-black text-[#1A2948] flex items-center gap-1.5 font-koho"
                >
                  <Icon name="ArrowsRightLeftIcon" size={16} className="text-primary" />
                  So sánh ({compareIds.length}/3):
                </span>
                {compareFlights.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-full px-3 py-1"
                  >
                    <span className="text-xs font-bold text-primary">{f.flightNo}</span>
                    <span className="text-xs text-stone-500">{f.departTime}</span>
                    <button
                      onClick={() => toggleCompare(f.id)}
                      className="text-stone-400 hover:text-primary ml-0.5"
                    >
                      <Icon name="XMarkIcon" size={12} />
                    </button>
                  </div>
                ))}
                {compareIds.length < 2 && (
                  <span className="text-xs text-stone-400 italic">
                    Chọn thêm {2 - compareIds.length} chuyến bay để so sánh
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setCompareIds([])}
                  className="vj-btn vj-btn-sm vj-btn-outline rounded-xl"
                >
                  Xóa tất cả
                </button>
                <button
                  onClick={() => setShowComparison(true)}
                  disabled={compareIds.length < 2}
                  className={`vj-btn vj-btn-sm rounded-xl ${
                    compareIds.length >= 2
                      ? 'vj-btn-primary shadow-glow-red hover:shadow-none'
                      : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  Xem so sánh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Modal */}
        {showComparison && compareFlights.length >= 2 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="bg-white w-full sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
              style={{ maxWidth: compareFlights.length === 3 ? '1100px' : '820px' }}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#1A2948] to-[#0F1E3A] px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Icon name="ArrowsRightLeftIcon" size={18} className="text-accent" />
                  <h2
                    className="text-white font-black text-lg font-koho"
                  >
                    So sánh chuyến bay
                  </h2>
                  <span className="text-xs bg-primary/30 text-white border border-primary/40 rounded-full px-2 py-0.5 font-semibold">
                    {compareFlights.length} chuyến bay
                  </span>
                </div>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-stone-400 hover:text-white transition-colors p-1"
                >
                  <Icon name="XMarkIcon" size={22} />
                </button>
              </div>

              {/* Comparison Table */}
              <div className="overflow-y-auto flex-1">
                <div
                  className={`grid divide-x divide-stone-100`}
                  style={{ gridTemplateColumns: `180px repeat(${compareFlights.length}, 1fr)` }}
                >
                  {/* Column Headers */}
                  <div className="bg-stone-50 p-4 flex items-end pb-5">
                    <span
                      className="text-xs font-bold text-[#1A2948] uppercase tracking-wider font-koho"
                    >
                      Tiêu chí
                    </span>
                  </div>
                  {compareFlights.map((flight, idx) => {
                    const fareClass = FARE_CLASS_CONFIG[flight.class] || FARE_CLASS_CONFIG.economy;
                    const isCheapest =
                      flight.price === Math.min(...compareFlights.map((f) => f.price));
                    const isFastest =
                      parseDurationMinutes(flight.duration) ===
                      Math.min(...compareFlights.map((f) => parseDurationMinutes(f.duration)));
                    return (
                      <div key={flight.id} className={`p-4 pb-5 relative ${idx === 0 ? '' : ''}`}>
                        {(isCheapest || isFastest) && (
                          <div className="flex gap-1 mb-2 flex-wrap">
                            {isCheapest && (
                              <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                                Rẻ nhất
                              </span>
                            )}
                            {isFastest && (
                              <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                Nhanh nhất
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${flight.class === 'business' ? 'bg-accent' : 'bg-gradient-red'}`}
                          >
                            <Icon
                              name="PaperAirplaneIcon"
                              size={12}
                              className={
                                flight.class === 'business' ? 'text-[#1A2948]' : 'text-white'
                              }
                            />
                          </div>
                          <div>
                            <div
                              className="font-black text-[#1A2948] text-base font-koho"
                            >
                              {flight.flightNo}
                            </div>
                            <div className="text-xs text-stone-400">{flight.airline}</div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${fareClass.bg} ${fareClass.color}`}
                        >
                          {fareClass.code} · {fareClass.label}
                        </span>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Price Row */}
                  <CompareRowLabel icon="CurrencyDollarIcon" label="Giá vé" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === Math.min(...compareFlights.map((f) => f.price));
                    return (
                      <div
                        key={flight.id}
                        className={`px-4 py-4 flex flex-col justify-center ${isBest ? 'bg-emerald-50/50' : ''}`}
                      >
                        <div
                          className={`text-xl font-black ${isBest ? 'text-emerald-600' : 'text-primary'} font-koho`}
                        >
                          {flight.price.toLocaleString('vi-VN')}₫
                        </div>
                        <div className="text-xs text-stone-400">/ hành khách</div>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Departure Time Row */}
                  <CompareRowLabel icon="ClockIcon" label="Giờ khởi hành" />
                  {compareFlights.map((flight) => (
                    <div key={flight.id} className="px-4 py-4 flex flex-col justify-center">
                      <div
                        className="text-xl font-black text-[#1A2948] font-koho"
                      >
                        {flight.departTime}
                      </div>
                      <div className="text-xs text-stone-500">
                        {flight.fromCity} ({flight.from})
                      </div>
                    </div>
                  ))}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Arrival Time Row */}
                  <CompareRowLabel icon="MapPinIcon" label="Giờ đến" />
                  {compareFlights.map((flight) => (
                    <div key={flight.id} className="px-4 py-4 flex flex-col justify-center">
                      <div
                        className="text-xl font-black text-[#1A2948] font-koho"
                      >
                        {flight.arriveTime}
                      </div>
                      <div className="text-xs text-stone-500">
                        {flight.toCity} ({flight.to})
                      </div>
                    </div>
                  ))}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Duration Row */}
                  <CompareRowLabel icon="ClockIcon" label="Thời gian bay" />
                  {compareFlights.map((flight) => {
                    const isBest =
                      parseDurationMinutes(flight.duration) ===
                      Math.min(...compareFlights.map((f) => parseDurationMinutes(f.duration)));
                    return (
                      <div
                        key={flight.id}
                        className={`px-4 py-4 flex flex-col justify-center ${isBest ? 'bg-blue-50/50' : ''}`}
                      >
                        <div
                          className={`text-lg font-black ${isBest ? 'text-blue-600' : 'text-[#1A2948]'} font-koho`}
                        >
                          {flight.duration}
                        </div>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Stops Row */}
                  <CompareRowLabel icon="MapIcon" label="Điểm dừng" />
                  {compareFlights.map((flight) => (
                    <div key={flight.id} className="px-4 py-4 flex flex-col justify-center">
                      <div
                        className={`text-sm font-bold ${flight.stops === 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                      >
                        {flight.stops === 0 ? 'Bay thẳng' : `${flight.stops} điểm dừng`}
                      </div>
                    </div>
                  ))}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Availability Row */}
                  <CompareRowLabel icon="UsersIcon" label="Chỗ trống" />
                  {compareFlights.map((flight) => (
                    <div key={flight.id} className="px-4 py-4 flex flex-col justify-center">
                      <span
                        className={`text-sm font-bold px-2 py-0.5 rounded-full inline-block w-fit ${
                          flight.available <= 5
                            ? 'badge-error'
                            : flight.available <= 15
                              ? 'badge-warning'
                              : 'badge-success'
                        }`}
                      >
                        {flight.available <= 5
                          ? `Còn ${flight.available} chỗ`
                          : `${flight.available} chỗ`}
                      </span>
                    </div>
                  ))}

                  <div className="col-span-full h-px bg-stone-200" />

                  {/* Fare Breakdown Section Header */}
                  <div className="col-span-full bg-[#1A2948]/5 px-4 py-2.5 flex items-center gap-2 border-l-4 border-primary">
                    <Icon name="ReceiptPercentIcon" size={14} className="text-primary" />
                    <span
                      className="text-xs font-bold text-[#1A2948] uppercase tracking-wider font-koho"
                    >
                      Chi tiết giá vé
                    </span>
                  </div>

                  {/* Base Price */}
                  <CompareRowLabel icon="TagIcon" label="Giá cơ bản" sublabel="Trước thuế & phí" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === Math.min(...compareFlights.map((f) => f.price));
                    return (
                      <div
                        key={flight.id}
                        className={`px-4 py-3 flex flex-col justify-center ${isBest ? 'bg-emerald-50/50' : 'bg-stone-50'}`}
                      >
                        <div className="text-sm font-semibold text-stone-800">
                          {flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Taxes */}
                  <CompareRowLabel icon="BuildingLibraryIcon" label="Thuế" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === Math.min(...compareFlights.map((f) => f.price));
                    return (
                      <div
                        key={flight.id}
                        className={`px-4 py-3 flex flex-col justify-center ${isBest ? 'bg-emerald-50/50' : 'bg-stone-50'}`}
                      >
                        <div className="text-sm font-semibold text-stone-600">
                          +{flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Fees */}
                  <CompareRowLabel icon="CreditCardIcon" label="Phí dịch vụ" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === Math.min(...compareFlights.map((f) => f.price));
                    return (
                      <div
                        key={flight.id}
                        className={`px-4 py-3 flex flex-col justify-center ${isBest ? 'bg-emerald-50/50' : 'bg-stone-50'}`}
                      >
                        <div className="text-sm font-semibold text-stone-600">
                          +{flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Discount */}
                  <CompareRowLabel icon="GiftIcon" label="Giảm giá" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === Math.min(...compareFlights.map((f) => f.price));
                    return (
                      <div
                        key={flight.id}
                        className={`px-4 py-3 flex flex-col justify-center ${isBest ? 'bg-emerald-50/50' : 'bg-stone-50'}`}
                      >
                        <div className="text-sm font-semibold text-emerald-600">
                          -{flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Total */}
                  <div className="bg-stone-50 px-4 py-4 flex items-center">
                    <span
                      className="text-sm font-bold text-[#1A2948] font-koho"
                    >
                      Tổng cộng
                    </span>
                  </div>
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === Math.min(...compareFlights.map((f) => f.price));
                    return (
                      <div
                        key={flight.id}
                        className={`px-4 py-4 flex flex-col justify-center ${isBest ? 'bg-emerald-50/50' : 'bg-stone-50'}`}
                      >
                        <div
                          className="text-lg font-black text-primary font-koho"
                        >
                          {flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </div>
                    );
                  })}

                  <div className="col-span-full h-px bg-stone-100" />

                  {/* Select Buttons */}
                  <div className="px-4 py-4 flex items-center">
                    <span className="text-xs text-stone-400 italic">/ hành khách</span>
                  </div>
                  {compareFlights.map((flight) => (
                    <div key={flight.id} className="px-4 py-4 flex items-center">
                      <button
                        onClick={() => {
                          setShowComparison(false);
                          onSelect(flight);
                        }}
                        className={`w-full vj-btn vj-btn-md rounded-xl font-bold ${
                          flight.class === 'business'
                            ? 'vj-btn-accent'
                            : 'vj-btn-primary shadow-glow-red hover:shadow-none'
                        }`}
                      >
                        Chọn chuyến này
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-stone-100 px-6 py-3 flex items-center justify-between bg-stone-50 shrink-0">
                <p className="text-xs text-stone-400">Giá đã bao gồm thuế & phí / hành khách</p>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-sm font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors"
                >
                  <Icon name="XMarkIcon" size={15} />
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompareRowLabel({
  icon,
  label,
  sublabel,
}: {
  icon: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-stone-50 px-4 py-4 flex flex-col justify-center gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={13} className="text-primary shrink-0" />
        <span className="text-xs font-semibold text-stone-600">{label}</span>
      </div>
      {sublabel && <span className="text-[10px] text-stone-400 pl-5">{sublabel}</span>}
    </div>
  );
}
