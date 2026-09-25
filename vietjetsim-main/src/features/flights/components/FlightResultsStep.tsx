'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { getBookingTotals } from '@/features/bookings/pricing';
import BookingBottomBar from '@/features/bookings/components/BookingBottomBar';
import { Icon, AppImage } from '@/shared/components/ui';
import { FlightResultsSkeleton } from '@/shared/components/ui';
import { getErrorMessage } from '@/lib/utils';
import { searchFlightsForUi, getAirportCity } from '@/features/flights/services';

// Fare class config
const FARE_CLASS_CONFIG: Record<
  string,
  { code: string; label: string; color: string; bg: string }
> = {
  economy: {
    code: 'ECO',
    label: 'Phổ thông',
    color: 'text-[var(--vj-green)]',
    bg: 'bg-[rgb(var(--vj-green-rgb))]/10 border-[rgb(var(--vj-green-rgb))]/30',
  },
  business: {
    code: 'BIZ',
    label: 'Thương gia',
    color: 'text-[var(--accent-dark)]',
    bg: 'bg-[rgb(var(--accent-rgb))]/15 border-[rgb(var(--accent-rgb))]/40',
  },
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4">
      <div
        className="bg-[var(--surface)] rounded-2xl sm:rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        style={{ boxShadow: '0 32px 72px rgba(0,0,0,0.25)', animation: 'fadeInUp 0.3s ease-out' }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[rgb(var(--primary-rgb))]/10 rounded-full flex items-center justify-center mb-4 sm:mb-5 border-2 sm:border-4 border-[rgb(var(--primary-rgb))]/20">
            <Icon name="MagnifyingGlassIcon" size={20} className="text-primary" />
          </div>
          <h3 className="font-black text-[var(--foreground)] text-lg sm:text-xl mb-1.5 sm:mb-2 font-koho">
            Không tìm thấy chuyến bay
          </h3>
          <p className="text-sm text-[var(--foreground-muted)] leading-relaxed mb-6 sm:mb-7">
            {message}
          </p>
          <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 sm:py-3.5 rounded-xl transition-all shadow-vj-btn hover:shadow-vj-btn-hover hover:-translate-y-0.5"
            >
              <Icon name="ArrowPathIcon" size={14} />
              Tìm lại
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-2.5 sm:py-3 rounded-xl border border-[var(--border)] text-[var(--foreground-muted)] font-semibold text-sm hover:bg-[var(--surface-2)] transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Props for {@link FlightResultsStep}.
 *
 * Declared as a named type rather than an inline object literal on purpose: the
 * Next.js TS plugin's `TS71007` check only inspects inline type literals, and
 * would otherwise flag `onSelect` as a non-serializable prop. That warning is a
 * false positive here — this component is only ever rendered from another client
 * component (`FlightBookingClient`), so `onSelect` is a plain in-memory callback
 * and never crosses a server→client boundary.
 */
export interface FlightResultsStepProps {
  /** Called with the chosen flight; advances the booking wizard to step 2. */
  onSelect: (f: Flight) => void;
  /** Route/departure filters from the search form; drive the real API lookup. */
  search?: { from?: string; to?: string; depart?: string };
  /** Lets the date strip re-search another departure day (vietjetair.com parity). */
  onDateChange?: (isoDate: string) => void;
  /** Passenger count from the URL (`pax`) — drives the sticky totals bar. */
  pax?: string;
}

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

/** `Date` → `YYYY-MM-DD` in local time (never UTC, the API expects a plain day). */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Departure date strip — the real site lets travellers re-pick the day without
 * walking back to the search form, so the same 5-day window sits on top of the
 * flight list with the chosen day highlighted in the brand yellow.
 */
function DateStrip({ value, onSelect }: { value?: string; onSelect?: (iso: string) => void }) {
  const selected = useMemo(() => {
    const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  const days = useMemo(() => {
    const window: Date[] = [];
    for (let offset = -2; offset <= 2; offset += 1) {
      const day = new Date(selected);
      day.setDate(selected.getDate() + offset);
      window.push(day);
    }
    return window;
  }, [selected]);

  const shift = (delta: number) => {
    if (!onSelect) return;
    const day = new Date(selected);
    day.setDate(selected.getDate() + delta);
    onSelect(toIsoDate(day));
  };

  const arrowClass =
    'shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div
      className="flex items-center gap-1 sm:gap-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-1.5 sm:px-2 py-2"
      data-testid="departure-date-strip"
    >
      <button
        type="button"
        aria-label="Ngày trước"
        onClick={() => shift(-1)}
        disabled={!onSelect}
        className={arrowClass}
      >
        <Icon name="ChevronLeftIcon" size={14} />
      </button>
      <div className="flex-1 min-w-0 flex items-stretch justify-between gap-0.5 sm:gap-1">
        {days.map((day) => {
          const iso = toIsoDate(day);
          const isSelected = iso === toIsoDate(selected);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect?.(iso)}
              aria-current={isSelected ? 'date' : undefined}
              className={`flex-1 min-w-0 px-0.5 sm:px-1 py-1 sm:py-1.5 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-[var(--accent)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <span
                className={`block text-[9px] sm:text-[10px] truncate ${isSelected ? 'font-bold text-[var(--vj-navy)]' : ''}`}
              >
                {WEEKDAY_LABELS[day.getDay()]}
              </span>
              <span
                className={`block text-xs sm:text-sm whitespace-nowrap ${isSelected ? 'font-black' : 'font-semibold'}`}
              >
                {day.getDate()} tháng {day.getMonth() + 1}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Ngày sau"
        onClick={() => shift(1)}
        disabled={!onSelect}
        className={arrowClass}
      >
        <Icon name="ChevronRightIcon" size={14} />
      </button>
    </div>
  );
}

export default function FlightResultsStep({
  onSelect,
  search,
  onDateChange,
  pax,
}: FlightResultsStepProps) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [sortBy, setSortBy] = useState<string>('price_asc');
  const [filters, setFilters] = useState<Filters>({
    airlines: [],
    minPrice: 0,
    maxPrice: Infinity,
    departureSlots: [],
    stops: [],
    maxDuration: Infinity,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // ─── Derived constants (computed from fetched flights) ─────────────────
  const allAirlines = useMemo(() => Array.from(new Set(flights.map((f) => f.airline))), [flights]);
  const minPrice = useMemo(
    () => (flights.length > 0 ? Math.min(...flights.map((f) => f.price)) : 0),
    [flights]
  );
  const maxPrice = useMemo(
    () => (flights.length > 0 ? Math.max(...flights.map((f) => f.price)) : 0),
    [flights]
  );
  const maxDuration = useMemo(
    () =>
      flights.length > 0 ? Math.max(...flights.map((f) => parseDurationMinutes(f.duration))) : 240,
    [flights]
  );
  // "No limit" sentinel (Infinity — e.g. a day with no flights never resets
  // filters) renders as the same capped value the duration slider handle uses.
  const shownMaxDuration = Number.isFinite(filters.maxDuration) ? filters.maxDuration : maxDuration;

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
      // Route/departure come from the URL (the search form), not from a stale
      // `vjsim_booking` entry — that key is only written once a booking exists.
      const fromCode = search?.from || '';
      const toCode = search?.to || '';
      const departDate = search?.depart || undefined;

      const apiFlights =
        fromCode && toCode
          ? await searchFlightsForUi({
              from_code: fromCode,
              to_code: toCode,
              depart_date: departDate,
            })
          : [];

      if (apiFlights.length > 0) {
        setFlights(apiFlights);
      } else {
        // A successful search with no rows is a real answer: no flight matches
        // this route/date. Never substitute mock flights — their ids are not
        // DB UUIDs, so booking one would fail server-side.
        setFlights([]);
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('[FlightResultsStep] Fetch error:', errorMessage);
      setLoadError(errorMessage || 'Không thể tải danh sách chuyến bay. Vui lòng thử lại.');
      setFlights([]);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  }, [search?.from, search?.to, search?.depart]);

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

  // Best-value lookups for the comparison modal. Computed once per change to the
  // compared set instead of inline in every cell — the modal previously called
  // Math.min(...compareFlights.map(...)) inside each of its ~12 cell renders,
  // which is O(n²) per paint and re-allocated a throwaway array every time.
  const cheapestPrice = useMemo(
    () => (compareFlights.length ? Math.min(...compareFlights.map((f) => f.price)) : 0),
    [compareFlights]
  );
  const fastestDuration = useMemo(
    () =>
      compareFlights.length
        ? Math.min(...compareFlights.map((f) => parseDurationMinutes(f.duration)))
        : 0,
    [compareFlights]
  );

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
    return flights
      .filter((f) => {
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

  // ─── Sticky totals bar (vietjetair.com parity) ──────────────────────────
  // The real results page pins a bar with the running total and a "Đi tiếp"
  // CTA to the bottom of the viewport. Before a fare is picked the site shows
  // 0 VND; here the bar previews the top-ranked flight (cheapest under the
  // default sort) so the CTA carries a concrete price. Fare + the shared
  // tax/fee rate is exactly what `createBooking` will charge.
  const passengerCount = Math.max(1, Number.parseInt(pax ?? '1', 10) || 1);
  const leadFlight = !isLoading && filtered.length > 0 ? filtered[0] : null;
  const leadTotal = leadFlight
    ? getBookingTotals({ farePerPassenger: leadFlight.price, passengerCount }).total
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 relative items-start pb-16 sm:pb-14">
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

      {/* Filter Sidebar */}
      <aside className="lg:col-span-3 w-full min-w-0 space-y-3">
        <div
          className="bg-[var(--surface)] rounded-xl border border-[var(--border)] sticky top-[200px] sm:top-[230px] overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
        >
          {/* Red accent top bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary-light to-primary" />
          {/* Filter Header - responsive */}
          <div className="flex items-center justify-between px-2 sm:px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] ">
            <h3 className="font-bold text-[var(--foreground)] text-sm flex items-center gap-1.5 font-koho">
              <Icon name="AdjustmentsHorizontalIcon" size={14} className="text-primary" />
              <span className="hidden sm:inline">Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-[10px] sm:text-[11px] text-primary font-semibold hover:underline"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          <div className="p-2 sm:p-3 space-y-3 sm:space-y-4">
            {/* Sort */}
            <div>
              <label className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider block mb-1 font-koho">
                Sắp xếp theo
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-sm border border-[var(--border)] rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-[var(--foreground)] focus:outline-none focus:border-primary bg-[var(--surface-2)] form-input"
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
              <label className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider block mb-1.5 font-koho">
                Hãng hàng không
              </label>
              <div className="space-y-1">
                {allAirlines.map((airline) => (
                  <label key={airline} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      id={`filter-airline-${airline}`}
                      name="airline"
                      type="checkbox"
                      checked={filters.airlines.includes(airline)}
                      onChange={() => toggleAirline(airline)}
                      className="accent-primary w-3 h-3 rounded"
                    />
                    <span className="text-[11px] sm:text-xs text-[var(--foreground-muted)] group-hover:text-primary flex-1">
                      {airline}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[var(--foreground-subtle)]">
                      {flights.filter((f) => f.airline === airline).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider block mb-1.5 font-koho">
                Khoảng giá
              </label>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[var(--foreground-subtle)]">
                  <span className="font-semibold text-primary">
                    {minPrice.toLocaleString('vi-VN')}₫
                  </span>
                  <span className="font-semibold text-primary">
                    {maxPrice.toLocaleString('vi-VN')}₫
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] sm:text-[10px] text-[var(--foreground-subtle)] w-5 sm:w-7">
                      Thấp
                    </span>
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
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] sm:text-[10px] text-[var(--foreground-subtle)] w-5 sm:w-7">
                      Cao
                    </span>
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
              <label className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider block mb-1.5 font-koho">
                Giờ khởi hành
              </label>
              <div className="grid grid-cols-2 gap-1">
                {DEPARTURE_TIME_SLOTS.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSlot(idx)}
                    className={`text-left px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border text-[9px] sm:text-[10px] transition-all ${
                      filters.departureSlots.includes(idx)
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    <div className="font-semibold">{slot.label}</div>
                    <div className="text-[var(--foreground-subtle)] text-[8px] sm:text-[9px] mt-0.5">
                      {slot.sublabel}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Count */}
            <div>
              <label className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider block mb-1.5 font-koho">
                Số điểm dừng
              </label>
              <div className="space-y-1">
                {[
                  { value: 0, label: 'Bay thẳng' },
                  { value: 1, label: '1 điểm dừng' },
                  { value: 2, label: '2+ điểm dừng' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      id={`filter-stops-${opt.value}`}
                      name="stops"
                      type="checkbox"
                      checked={filters.stops.includes(opt.value)}
                      onChange={() => toggleStop(opt.value)}
                      className="accent-primary w-3 h-3 rounded"
                    />
                    <span className="text-[11px] sm:text-xs text-[var(--foreground-muted)] group-hover:text-primary">
                      {opt.label}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[var(--foreground-subtle)] ml-auto">
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
              <label className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider block mb-1.5 font-koho">
                Thời gian bay tối đa:{' '}
                <span className="text-primary">
                  {Math.floor(shownMaxDuration / 60)}h{' '}
                  {shownMaxDuration % 60 > 0 ? `${shownMaxDuration % 60}m` : ''}
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
              <div className="flex justify-between text-[9px] sm:text-[10px] text-[var(--foreground-subtle)] mt-1">
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
      <main className="lg:col-span-6 w-full min-w-0 space-y-3">
        {/* Route board — the real site repeats HAN → SGN above the results. */}
        {search?.from && search?.to && (
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              <div className="text-center min-w-0">
                <div className="text-lg sm:text-xl font-black text-[var(--foreground)] font-koho">
                  {search.from.toUpperCase()}
                </div>
                <div className="text-[11px] sm:text-xs text-[var(--foreground-muted)] truncate">
                  {getAirportCity(search.from)}
                </div>
              </div>
              <div className="flex-1 max-w-[140px] flex items-center gap-1.5 text-primary">
                <span className="h-px flex-1 bg-current opacity-30" />
                <Icon name="PaperAirplaneIcon" size={14} />
                <span className="h-px flex-1 bg-current opacity-30" />
              </div>
              <div className="text-center min-w-0">
                <div className="text-lg sm:text-xl font-black text-[var(--foreground)] font-koho">
                  {search.to.toUpperCase()}
                </div>
                <div className="text-[11px] sm:text-xs text-[var(--foreground-muted)] truncate">
                  {getAirportCity(search.to)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Departure date strip */}
        <DateStrip value={search?.depart} onSelect={onDateChange} />

        {/* Search Bar - responsive */}
        <div className="relative">
          <Icon
            name="MagnifyingGlassIcon"
            size={14}
            className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]"
          />
          <input
            id="search-input"
            name="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số hiệu, hãng bay..."
            className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all form-input text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-2.5 sm:right-3 flex items-center text-[var(--foreground-subtle)] hover:text-primary transition-colors"
            >
              <Icon name="XMarkIcon" size={14} />
            </button>
          )}
        </div>

        {/* Results header with sort chips - responsive */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          <h2
            className="font-black text-[var(--foreground)] flex items-center gap-1.5 sm:gap-2"
            style={{ fontSize: '0.85rem' }}
          >
            {isLoading ? (
              <span className="inline-block h-3.5 w-28 sm:w-36 bg-[var(--border)] rounded-full animate-pulse" />
            ) : (
              <>
                <span className="inline-block w-1 h-3.5 bg-primary rounded-full mr-1" />
                {filtered.length} chuyến bay phù hợp
              </>
            )}
          </h2>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] sm:text-[11px] text-[var(--foreground-subtle)] font-semibold">
              Sắp xếp:
            </span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border font-semibold transition-all ${
                  sortBy === opt.value
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-primary/40 hover:text-primary'
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
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
            <div className="px-6 py-8 sm:px-8 sm:py-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[rgb(var(--primary-rgb))]/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Icon name="ExclamationTriangleIcon" size={24} className="text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-[var(--foreground)] mb-1.5 sm:mb-2 font-koho">
                Lỗi tìm kiếm chuyến bay
              </h3>
              <p className="text-sm text-[var(--foreground-muted)] max-w-sm mx-auto mb-5 sm:mb-6">
                {loadError}
              </p>
              <button
                onClick={() => {
                  setLoadError(null);
                  setShowErrorModal(false);
                  fetchFlights();
                }}
                className="vj-btn vj-btn-md vj-btn-primary rounded-xl shadow-glow-red hover:shadow-none"
              >
                <Icon name="ArrowPathIcon" size={14} />
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Flight results */}
        {!isLoading &&
          !loadError &&
          filtered.map((flight, idx) => {
            const basePrice = flight.price;
            const fareClasses = [
              {
                id: 'business',
                cabin: 'business' as const,
                name: 'Business',
                price: basePrice + 1200000,
                color:
                  'bg-[var(--surface-2)] text-[var(--primary)] border-transparent hover:border-[var(--primary)]',
                headerClass: 'bg-[var(--primary)] text-white',
                priceColor: 'text-[var(--primary)]',
              },
              {
                id: 'skyboss',
                cabin: 'business' as const,
                name: 'SkyBOSS',
                price: basePrice + 800000,
                color:
                  'bg-[var(--surface-2)] text-[var(--foreground)] border-transparent hover:border-[var(--foreground)]',
                headerClass: 'bg-[var(--vj-navy)] text-white',
                priceColor: 'text-[var(--foreground)]',
              },
              {
                id: 'deluxe',
                cabin: 'economy' as const,
                name: 'Deluxe',
                price: basePrice + 300000,
                color:
                  'bg-[var(--surface-2)] text-[var(--foreground)] border-transparent hover:border-[var(--border)] ',
                headerClass: 'bg-[var(--accent)] text-[var(--vj-navy)]',
                priceColor: 'text-[var(--foreground)]',
              },
              {
                id: 'eco',
                cabin: 'economy' as const,
                name: 'Eco',
                price: basePrice,
                color:
                  'bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--primary)]:border-[var(--primary)] hover:text-[var(--primary)]:text-[var(--primary)]',
                headerClass: 'bg-[var(--surface-2)] text-[var(--foreground-muted)]',
                priceColor: 'text-[var(--foreground)]',
              },
            ];

            return (
              <div
                key={flight.id}
                data-testid="flight-result-card"
                style={{ transitionDelay: `${Math.min(idx * 50, 300)}ms` }}
                className={`@container bg-[var(--surface)] rounded-xl border border-primary/30 transition-all hover:shadow-lg relative overflow-hidden flex flex-col lg:flex-row shadow-[0_2px_8px_rgba(209,22,27,0.15)]`}
              >
                {/* Left: Flight Info - responsive */}
                <div className="w-full lg:w-[240px] shrink-0 p-3 sm:p-4 border-b lg:border-b-0 border-primary/10 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
                    <span className="font-black text-[var(--foreground)] text-sm leading-none font-koho">
                      {flight.flightNo}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[var(--foreground-muted)] font-semibold uppercase">
                      {flight.airline}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    {/* Dep */}
                    <div className="text-center min-w-[45px] sm:min-w-[50px]">
                      <div className="text-lg sm:text-xl font-black text-[var(--foreground)] leading-none font-koho">
                        {flight.departTime}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-[var(--foreground-muted)] mt-1">
                        {flight.from}
                      </div>
                    </div>
                    {/* Line */}
                    <div className="flex-1 flex flex-col items-center px-1.5 sm:px-2">
                      <div className="text-[9px] sm:text-[10px] text-[var(--foreground-subtle)] font-semibold mb-1">
                        {flight.duration}
                      </div>
                      <div className="w-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-[var(--border)] shrink-0"></div>
                        <div className="flex-1 border-t border-dashed border-[var(--border)] min-w-[15px] sm:min-w-[20px]"></div>
                        <Icon
                          name="PaperAirplaneIcon"
                          size={8}
                          className="text-primary rotate-90 mx-0.5 sm:mx-1 shrink-0"
                        />
                        <div className="flex-1 border-t border-dashed border-[var(--border)] min-w-[15px] sm:min-w-[20px]"></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-primary bg-primary shrink-0"></div>
                      </div>
                      <div className="text-[8px] sm:text-[10px] text-primary font-bold mt-1 text-center whitespace-nowrap">
                        {flight.stops === 0 ? 'Bay thẳng' : `${flight.stops} Điểm dừng`}
                      </div>
                    </div>
                    {/* Arr */}
                    <div className="text-center min-w-[45px] sm:min-w-[50px]">
                      <div className="text-lg sm:text-xl font-black text-[var(--foreground)] leading-none font-koho">
                        {flight.arriveTime}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-[var(--foreground-muted)] mt-1">
                        {flight.to}
                      </div>
                    </div>
                  </div>
                  <button className="text-[10px] sm:text-[11px] font-bold text-primary hover:underline text-left inline-flex items-center gap-1">
                    Chi tiết chuyến bay <Icon name="ChevronDownIcon" size={8} />
                  </button>
                </div>

                {/* Right: Fare Classes - responsive */}
                <div className="flex-1 min-w-0 grid grid-cols-4 gap-0.5 bg-[var(--surface-2)] p-1">
                  {fareClasses.map((fc) => (
                    <div
                      key={fc.id}
                      className="relative flex min-w-0 flex-col overflow-hidden rounded-lg group"
                    >
                      <div className={`text-center py-1 ${fc.headerClass}`}>
                        <div className="truncate text-[8px] font-black uppercase font-koho tracking-tight sm:text-[9px] 2xl:text-[10px]">
                          {fc.name}
                        </div>
                      </div>
                      <div className="bg-[var(--surface)] flex flex-col justify-center items-center flex-1 p-1 sm:p-1.5 2xl:p-3 border-x border-b border-[var(--border)] rounded-b-lg">
                        <div
                          className={`text-[8px] sm:text-[9px] 2xl:text-sm font-black ${fc.priceColor} font-koho mb-1.5 sm:mb-2 2xl:mb-3 leading-none break-words text-center`}
                        >
                          {fc.price.toLocaleString('vi-VN')}₫
                        </div>
                        <button
                          onClick={() => onSelect({ ...flight, price: fc.price, class: fc.cabin })}
                          className={`w-full py-1 rounded text-[8px] sm:text-[9px] 2xl:text-xs font-bold transition-all border ${fc.color}`}
                        >
                          Chọn
                        </button>
                      </div>
                      {/* Overlay effect on hover */}
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary pointer-events-none rounded-lg transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

        {/* Enhanced empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-6 sm:px-8 py-8 sm:py-10">
              {/* SVG Illustration */}
              <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
                <AppImage
                  src="/assets/empty-flight-search.svg"
                  alt="Không tìm thấy chuyến bay"
                  width={144}
                  height={144}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Content */}
              <div className="flex-1 text-center sm:text-left">
                <h3
                  className={`text-lg sm:text-xl font-black mb-1.5 sm:mb-2 font-koho ${
                    searchQuery ? 'text-[var(--foreground)]' : 'text-primary'
                  }`}
                >
                  {searchQuery
                    ? 'Không tìm thấy chuyến bay'
                    : 'Không tìm thấy chuyến bay nào cho lựa chọn của bạn'}
                </h3>

                <p className="text-sm text-[var(--foreground-muted)] mb-4 sm:mb-5 max-w-sm">
                  {searchQuery
                    ? `Không có kết quả nào cho "${searchQuery}". Hãy thử từ khóa khác hoặc kiểm tra lại tên thành phố, số hiệu chuyến bay.`
                    : 'Quay lại để chọn ngày khác, hoặc chọn một ngày gần đó ở dải ngày phía trên.'}
                </p>

                {/* Suggestions */}
                <div className="bg-[var(--surface-2)] rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 text-left max-w-sm">
                  <p className="text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-2.5 sm:mb-3 font-koho">
                    Gợi ý cho bạn
                  </p>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {searchQuery ? (
                      <>
                        <li className="flex items-start gap-2 text-sm text-[var(--foreground-muted)]">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Kiểm tra chính tả tên thành phố hoặc mã sân bay
                        </li>
                        <li className="flex items-start gap-2 text-sm text-[var(--foreground-muted)]">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Thử tìm bằng mã IATA (VD: HAN, SGN, DAD)
                        </li>
                        <li className="flex items-start gap-2 text-sm text-[var(--foreground-muted)]">
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
                        <li className="flex items-start gap-2 text-sm text-[var(--foreground-muted)]">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Mở rộng khoảng giá hoặc đặt lại về mặc định
                        </li>
                        <li className="flex items-start gap-2 text-sm text-[var(--foreground-muted)]">
                          <Icon
                            name="CheckCircleIcon"
                            size={15}
                            className="text-primary mt-0.5 shrink-0"
                          />
                          Bỏ chọn một số hãng hàng không hoặc giờ khởi hành
                        </li>
                        <li className="flex items-start gap-2 text-sm text-[var(--foreground-muted)]">
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

                {/* Action buttons - responsive */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-bold text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all hover:opacity-90 hover:shadow-md active:scale-95"
                      style={{ background: 'var(--primary)' }}
                    >
                      <Icon name="XMarkIcon" size={12} />
                      Xóa tìm kiếm
                    </button>
                  )}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-bold text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all hover:opacity-90 hover:shadow-md active:scale-95"
                      style={{ background: 'var(--primary)' }}
                    >
                      <Icon name="ArrowPathIcon" size={12} />
                      Đặt lại bộ lọc
                    </button>
                  )}
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-bold text-[var(--foreground-muted)] border border-[var(--border)] hover:border-primary/40 hover:bg-[var(--surface-2)] px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all"
                  >
                    <Icon name="AdjustmentsHorizontalIcon" size={12} />
                    Xem tất cả chuyến bay
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Bar - responsive */}
        {compareIds.length >= 1 && !showComparison && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t-2 border-primary shadow-2xl">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-[10px] sm:text-sm font-black text-[var(--foreground)] flex items-center gap-1 sm:gap-1.5 font-koho">
                  <Icon name="ArrowsRightLeftIcon" size={14} className="text-primary" />
                  So sánh ({compareIds.length}/3):
                </span>
                {compareFlights.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-full px-3 py-1"
                  >
                    <span className="text-xs font-bold text-primary">{f.flightNo}</span>
                    <span className="text-xs text-[var(--foreground-muted)]">{f.departTime}</span>
                    <button
                      onClick={() => toggleCompare(f.id)}
                      className="text-[var(--foreground-muted)] hover:text-primary ml-0.5"
                    >
                      <Icon name="XMarkIcon" size={12} />
                    </button>
                  </div>
                ))}
                {compareIds.length < 2 && (
                  <span className="text-xs text-[var(--foreground-muted)] italic">
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
                      : 'bg-[var(--surface-2)] text-[var(--foreground-muted)] cursor-not-allowed'
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
              className="bg-[var(--surface)] w-full sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
              style={{ maxWidth: compareFlights.length === 3 ? '1100px' : '820px' }}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[var(--vj-navy)] to-[var(--vj-navy-2)] px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Icon name="ArrowsRightLeftIcon" size={18} className="text-accent" />
                  <h2 className="text-white font-black text-lg font-koho">So sánh chuyến bay</h2>
                  <span className="text-xs bg-primary/30 text-white border border-primary/40 rounded-full px-2 py-0.5 font-semibold">
                    {compareFlights.length} chuyến bay
                  </span>
                </div>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-[var(--foreground-muted)] hover:text-white transition-colors p-1"
                >
                  <Icon name="XMarkIcon" size={22} />
                </button>
              </div>

              {/* Comparison Table */}
              <div className="overflow-y-auto flex-1">
                <div
                  className={`grid divide-x divide-[var(--border)] `}
                  style={{ gridTemplateColumns: `180px repeat(${compareFlights.length}, 1fr)` }}
                >
                  {/* Column Headers */}
                  <div className="bg-[var(--surface-2)] p-4 flex items-end pb-5">
                    <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider font-koho">
                      Tiêu chí
                    </span>
                  </div>
                  {compareFlights.map((flight, idx) => {
                    const fareClass = FARE_CLASS_CONFIG[flight.class] || FARE_CLASS_CONFIG.economy;
                    const isCheapest = flight.price === cheapestPrice;
                    const isFastest = parseDurationMinutes(flight.duration) === fastestDuration;
                    return (
                      <div key={flight.id} className={`p-4 pb-5 relative ${idx === 0 ? '' : ''}`}>
                        {(isCheapest || isFastest) && (
                          <div className="flex gap-1 mb-2 flex-wrap">
                            {isCheapest && (
                              <span className="text-[10px] font-black bg-[var(--vj-green)] text-white px-2 py-0.5 rounded-full">
                                Rẻ nhất
                              </span>
                            )}
                            {isFastest && (
                              <span className="text-[10px] font-black bg-[var(--blue)] text-white px-2 py-0.5 rounded-full">
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
                                flight.class === 'business' ? 'text-[var(--vj-navy)]' : 'text-white'
                              }
                            />
                          </div>
                          <div>
                            <div className="font-black text-[var(--foreground)] text-base font-koho">
                              {flight.flightNo}
                            </div>
                            <div className="text-xs text-[var(--foreground-muted)]">
                              {flight.airline}
                            </div>
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

                  <CompareDivider />

                  {/* Price Row */}
                  <CompareRowLabel icon="CurrencyDollarIcon" label="Giá vé" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === cheapestPrice;
                    return (
                      <CompareCell key={flight.id} tone={isBest ? 'best' : 'plain'}>
                        <div
                          className={`text-xl font-black ${isBest ? 'text-[var(--vj-green)]' : 'text-primary'} font-koho`}
                        >
                          {flight.price.toLocaleString('vi-VN')}₫
                        </div>
                        <div className="text-xs text-[var(--foreground-muted)]">/ hành khách</div>
                      </CompareCell>
                    );
                  })}

                  <CompareDivider />

                  {/* Departure Time Row */}
                  <CompareRowLabel icon="ClockIcon" label="Giờ khởi hành" />
                  {compareFlights.map((flight) => (
                    <CompareCell key={flight.id}>
                      <div className="text-xl font-black text-[var(--foreground)] font-koho">
                        {flight.departTime}
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)]">
                        {flight.fromCity} ({flight.from})
                      </div>
                    </CompareCell>
                  ))}

                  <CompareDivider />

                  {/* Arrival Time Row */}
                  <CompareRowLabel icon="MapPinIcon" label="Giờ đến" />
                  {compareFlights.map((flight) => (
                    <CompareCell key={flight.id}>
                      <div className="text-xl font-black text-[var(--foreground)] font-koho">
                        {flight.arriveTime}
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)]">
                        {flight.toCity} ({flight.to})
                      </div>
                    </CompareCell>
                  ))}

                  <CompareDivider />

                  {/* Duration Row */}
                  <CompareRowLabel icon="ClockIcon" label="Thời gian bay" />
                  {compareFlights.map((flight) => {
                    const isBest = parseDurationMinutes(flight.duration) === fastestDuration;
                    return (
                      <CompareCell key={flight.id} tone={isBest ? 'fastest' : 'plain'}>
                        <div
                          className={`text-lg font-black ${isBest ? 'text-[var(--blue)]' : 'text-[var(--foreground)]'} font-koho`}
                        >
                          {flight.duration}
                        </div>
                      </CompareCell>
                    );
                  })}

                  <CompareDivider />

                  {/* Stops Row */}
                  <CompareRowLabel icon="MapIcon" label="Điểm dừng" />
                  {compareFlights.map((flight) => (
                    <CompareCell key={flight.id}>
                      <div
                        className={`text-sm font-bold ${flight.stops === 0 ? 'text-[var(--vj-green)]' : 'text-[var(--accent-dark)]'}`}
                      >
                        {flight.stops === 0 ? 'Bay thẳng' : `${flight.stops} điểm dừng`}
                      </div>
                    </CompareCell>
                  ))}

                  <CompareDivider />

                  {/* Availability Row */}
                  <CompareRowLabel icon="UsersIcon" label="Chỗ trống" />
                  {compareFlights.map((flight) => (
                    <CompareCell key={flight.id}>
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
                    </CompareCell>
                  ))}

                  <CompareDivider />

                  {/* Fare Breakdown Section Header */}
                  <div className="col-span-full bg-primary/5 px-4 py-2.5 flex items-center gap-2 border-l-4 border-primary">
                    <Icon name="ReceiptPercentIcon" size={14} className="text-primary" />
                    <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider font-koho">
                      Chi tiết giá vé
                    </span>
                  </div>

                  {/* Base Price */}
                  <CompareRowLabel icon="TagIcon" label="Giá cơ bản" sublabel="Trước thuế & phí" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === cheapestPrice;
                    return (
                      <CompareCell key={flight.id} size="sm" tone={isBest ? 'best' : 'plain'}>
                        <div className="text-sm font-semibold text-[var(--foreground)]">
                          {flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </CompareCell>
                    );
                  })}

                  <CompareDivider />

                  {/* Taxes */}
                  <CompareRowLabel icon="BuildingLibraryIcon" label="Thuế" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === cheapestPrice;
                    return (
                      <CompareCell key={flight.id} size="sm" tone={isBest ? 'best' : 'plain'}>
                        <div className="text-sm font-semibold text-[var(--foreground-muted)]">
                          +{flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </CompareCell>
                    );
                  })}

                  <CompareDivider />

                  {/* Fees */}
                  <CompareRowLabel icon="CreditCardIcon" label="Phí dịch vụ" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === cheapestPrice;
                    return (
                      <CompareCell key={flight.id} size="sm" tone={isBest ? 'best' : 'plain'}>
                        <div className="text-sm font-semibold text-[var(--foreground-muted)]">
                          +{flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </CompareCell>
                    );
                  })}

                  <CompareDivider />

                  {/* Discount */}
                  <CompareRowLabel icon="GiftIcon" label="Giảm giá" />
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === cheapestPrice;
                    return (
                      <CompareCell key={flight.id} size="sm" tone={isBest ? 'best' : 'plain'}>
                        <div className="text-sm font-semibold text-[var(--vj-green)]">
                          -{flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </CompareCell>
                    );
                  })}

                  <CompareDivider />

                  {/* Total */}
                  <div className="bg-[var(--surface-2)] px-4 py-4 flex items-center">
                    <span className="text-sm font-bold text-[var(--foreground)] font-koho">
                      Tổng cộng
                    </span>
                  </div>
                  {compareFlights.map((flight) => {
                    const isBest = flight.price === cheapestPrice;
                    return (
                      <CompareCell key={flight.id} tone={isBest ? 'best' : 'plain'}>
                        <div className="text-lg font-black text-primary font-koho">
                          {flight.price.toLocaleString('vi-VN')}₫
                        </div>
                      </CompareCell>
                    );
                  })}

                  <CompareDivider />

                  {/* Select Buttons */}
                  <div className="px-4 py-4 flex items-center">
                    <span className="text-xs text-[var(--foreground-muted)] italic">
                      / hành khách
                    </span>
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
              <div className="border-t border-[var(--border)] px-6 py-3 flex items-center justify-between bg-[var(--surface-2)] shrink-0">
                <p className="text-xs text-[var(--foreground-muted)]">
                  Giá đã bao gồm thuế & phí / hành khách
                </p>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center gap-1.5 transition-colors"
                >
                  <Icon name="XMarkIcon" size={15} />
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Booking Summary Sidebar */}
      <aside className="lg:col-span-3 w-full min-w-0">
        <div className="bg-[var(--background)] rounded-xl border border-primary/20 sticky top-[160px] overflow-hidden shadow-sm">
          {/* Header bar — vietjetair.com paints this one solid red. */}
          <div className="bg-primary px-3 py-2 text-white flex items-center justify-center relative">
            <h3 className="font-black font-koho text-sm tracking-wider uppercase">
              Thông tin đặt chỗ
            </h3>
            <div className="absolute right-0 top-0 h-full overflow-hidden flex items-center pointer-events-none">
              <div className="w-16 h-24 bg-white/5 rounded-full -translate-x-1/4 -rotate-45" />
            </div>
          </div>

          <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-3 py-2">
            <span className="text-xs font-bold text-[var(--foreground)]">Thông tin hành khách</span>
          </div>

          <div className="p-4 space-y-4">
            <div className="border border-[rgb(var(--primary-rgb))]/10 rounded-lg p-3 bg-[rgb(var(--primary-rgb))]/5 border-l-4 border-l-primary">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-[var(--vj-navy)] font-koho text-sm uppercase">
                  Chuyến đi
                </span>
                <button className="text-[10px] font-bold text-primary hover:underline">
                  Chi tiết
                </button>
              </div>
              <div className="text-xs font-bold text-[var(--foreground)] pb-1 break-words">
                {search?.from && search?.to ? (
                  <>
                    {getAirportCity(search.from)} ({search.from.toUpperCase()})
                    <Icon name="PaperAirplaneIcon" size={11} className="inline mx-1 text-primary" />
                    {getAirportCity(search.to)} ({search.to.toUpperCase()})
                  </>
                ) : (
                  <span className="italic font-normal text-[var(--foreground-muted)]">
                    Vui lòng chọn chuyến bay
                  </span>
                )}
              </div>
              {/* Fare placeholders — the real site keeps the three cells empty until a
                  flight is picked, which is exactly the state of this step. */}
              <div className="text-[11px] tracking-[0.2em] text-[var(--foreground-subtle)] pt-1">
                --- | --- | --- | ---
              </div>
            </div>

            <div className="border border-[var(--border)] rounded-lg p-3 bg-[rgb(var(--surface-2-rgb))]/50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-[var(--foreground-muted)] font-koho text-sm uppercase">
                  Hành khách
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[var(--foreground-muted)] font-semibold border-b border-dashed border-[var(--border)] pb-2 mb-2">
                <span>Người lớn (x1)</span>
                <span>0₫</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-wider">
                  Hành lý & Dịch vụ
                </span>
                <span className="text-xs font-semibold text-[var(--foreground-subtle)]">
                  Chưa chọn
                </span>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-[var(--border)] pt-3 relative">
              <div className="absolute -left-5 top-1.5 w-3 h-3 bg-[var(--surface)] rounded-full border-r border-[rgb(var(--primary-rgb))]/20" />
              <div className="absolute -right-5 top-1.5 w-3 h-3 bg-[var(--surface)] rounded-full border-l border-[rgb(var(--primary-rgb))]/20" />
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-[var(--foreground-muted)] font-koho text-[11px] tracking-widest uppercase">
                  Tóm tắt
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {['Giá vé', 'Thuế, phí'].map((row) => (
                  <div
                    key={row}
                    className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-[var(--foreground-muted)]">
                      {row}
                    </span>
                    <span className="text-xs font-bold text-[var(--foreground-subtle)]">---</span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--foreground-muted)]">
                    Dịch vụ
                  </span>
                  <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1">
                    0 VND
                    <Icon name="ChevronDownIcon" size={12} />
                  </span>
                </div>
              </div>
              <div className="text-right text-[10px] text-[var(--foreground-subtle)] italic mt-2">
                Đã bao gồm thuế, phí, phụ thu
              </div>
            </div>
          </div>

          {/* Total bar — solid red band, same as the real site's summary footer. */}
          <div className="bg-primary px-3 py-2.5 flex items-center justify-between">
            <span className="text-sm font-black font-koho uppercase tracking-wide text-white">
              Tổng tiền
            </span>
            <span className="text-sm sm:text-base font-black font-koho text-white">0 VND</span>
          </div>
        </div>
      </aside>

      {/* Sticky totals bar — the real /select-flight page pins this to the bottom
          of the viewport with the amount on the left and "Đi tiếp" on the right.
          It continues with the top-ranked flight so the wizard flow is unchanged:
          picking an individual fare still goes through that card's "Chọn". */}
      <BookingBottomBar
        total={leadTotal}
        ctaLabel="Đi tiếp"
        onCta={() => leadFlight && onSelect(leadFlight)}
        disabled={!leadFlight}
        testId="results-bottom-bar"
      />
    </div>
  );
}

/**
 * One data cell in the comparison modal grid.
 *
 * Every row repeated the same wrapper (padding + "best" highlight), so it lives
 * here once. `tone="best"` paints the green winner highlight, `"fastest"` the
 * blue one, and `"plain"` the neutral surface.
 */
function CompareCell({
  tone = 'plain',
  size = 'md',
  children,
}: {
  tone?: 'plain' | 'best' | 'fastest';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}) {
  const isHighlighted = tone !== 'plain';
  const highlightBg =
    tone === 'fastest' ? 'bg-[rgb(var(--blue-rgb))]/10' : 'bg-[rgb(var(--vj-green-rgb))]/10';

  return (
    <div
      className={`px-4 ${size === 'sm' ? 'py-3' : 'py-4'} flex flex-col justify-center ${
        isHighlighted ? highlightBg : 'bg-[var(--surface-2)] '
      }`}
    >
      {children}
    </div>
  );
}

/** Full-width row separator used between comparison rows. */
function CompareDivider() {
  return <div className="col-span-full h-px bg-[var(--border)] " />;
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
    <div className="bg-[var(--surface-2)] px-4 py-4 flex flex-col justify-center gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={13} className="text-primary shrink-0" />
        <span className="text-xs font-semibold text-[var(--foreground-muted)]">{label}</span>
      </div>
      {sublabel && (
        <span className="text-[10px] text-[var(--foreground-subtle)] pl-5">{sublabel}</span>
      )}
    </div>
  );
}
