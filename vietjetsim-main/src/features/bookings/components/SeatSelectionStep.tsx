'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flight,
  Passenger,
  countPassengerTypes,
  isSeated,
} from '@/features/bookings/types/booking-flow';
import { Icon } from '@/shared/components/ui';
import { SeatMapSkeleton } from '@/shared/components/ui';
import {
  ANCILLARY_OPTIONS,
  SEAT_SERVICE_FEE_RATE,
  SEAT_TAX_RATE,
  SEAT_TIER_PRICES,
  TAX_AND_FEE_RATE,
  getBookingTotals,
  getSeatPrice,
  type AncillaryOption,
  type AncillaryId,
} from '@/features/bookings/pricing';
import { canDeselectSeat, canSelectSeat } from '@/features/bookings/seat-adjacency';
import BookingBottomBar from './BookingBottomBar';

interface Props {
  flight: Flight;
  passengers: Passenger[];
  initialSeats?: string[];
  initialAncillaries?: AncillaryId[];
  /**
   * Save the seat selection and continue to passenger details. Returns whether
   * the wizard advanced so the seat picker can keep its button enabled when the
   * parent rejects the selection.
   */
  onConfirm: (
    seats: string[],
    seatPrices: number[],
    ancillaries: AncillaryId[]
  ) => boolean | Promise<boolean>;
  onBack: () => void;
}

interface SeatInfo {
  status: 'available' | 'occupied' | 'business' | 'hot';
  price: number;
  basePrice: number;
  tax: number;
  fee: number;
  occupancyLevel: 'low' | 'medium' | 'high' | 'critical'; // for heatmap
}

interface TooltipState {
  seatId: string;
  /** Viewport coordinates of the hovered seat's centre. */
  x: number;
  y: number;
}

const HOLD_TIMEOUT_SECONDS = 10 * 60; // 10 minutes

// The map is 3+3 with a centre aisle. Row numbers are rendered on both sides so
// a passenger can read their seat without tracing back across the cabin. These
// must stay ahead of generateSeats(), which runs at module load.
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const TOTAL_ROWS = 30;
const AISLE_AFTER = 3;
/** Rows 1-3 are the business cabin (mirrors generateSeats). */
const BUSINESS_ROWS = 3;
/** Rows beside the over-wing exits — more legroom, so they carry a tag. */
const EXIT_ROWS = new Set([10, 11]);
const EXIT_ROWS_MIN = Math.min(...EXIT_ROWS);

/** Screen-reader labels for the seat grid (the seat text is rendered via CSS). */
const SEAT_STATUS_LABELS: Record<SeatInfo['status'], string> = {
  available: 'còn trống',
  occupied: 'đã đặt',
  business: 'thương gia',
  hot: 'sức chứa cao',
};

function generateSeats(): Record<string, SeatInfo> {
  const seats: Record<string, SeatInfo> = {};
  const rows = Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1);
  const cols = COLS;
  const occupied = [
    '2A',
    '2B',
    '3C',
    '5D',
    '7F',
    '8A',
    '10B',
    '11E',
    '12F',
    '15A',
    '15B',
    '18C',
    '20D',
    '22E',
    '25F',
    '28A',
    '29B',
    '30C',
  ];
  // Simulate hot/high-demand seats
  const hotSeats = ['4A', '4B', '4C', '5A', '5B', '6D', '6E', '6F'];

  rows.forEach((row) => {
    cols.forEach((col) => {
      const seatId = `${row}${col}`;
      let status: SeatInfo['status'];
      let occupancyLevel: SeatInfo['occupancyLevel'];

      if (row <= 3) {
        status = 'business';
        occupancyLevel = 'high';
      } else if (occupied.includes(seatId)) {
        status = 'occupied';
        occupancyLevel = 'critical';
      } else if (hotSeats.includes(seatId)) {
        status = 'hot';
        occupancyLevel = 'high';
      } else {
        status = 'available';
        // Assign occupancy level for heatmap
        if (row <= 6) occupancyLevel = 'high';
        else if (row <= 15) occupancyLevel = 'medium';
        else occupancyLevel = 'low';
      }

      // One price source, shared with the booking API. The map used to carry
      // its own row bands while `getSeatPrice` had different ones, so a seat
      // the customer saw at 55,000đ was charged 70,000đ by the server.
      const basePrice = getSeatPrice(seatId);
      const tax = Math.round(basePrice * SEAT_TAX_RATE);
      const fee = Math.round(basePrice * SEAT_SERVICE_FEE_RATE);
      const price = basePrice + tax + fee;

      seats[seatId] = { status, price, basePrice, tax, fee, occupancyLevel };
    });
  });
  return seats;
}

const SEATS = generateSeats();

export { SEATS, generateSeats };

/** Heatmap color based on occupancy */
function getHeatmapClass(
  seatId: string,
  status: SeatInfo['status'],
  occupancyLevel: SeatInfo['occupancyLevel'],
  isSelected: boolean,
  showHeatmap: boolean
): string {
  if (isSelected) return 'seat-selected';
  if (status === 'occupied') return 'seat-occupied';
  if (status === 'business') return 'seat-business';

  if (!showHeatmap) {
    if (status === 'hot') return 'seat-hot';
    return 'seat-available hover:border-primary hover:text-primary';
  }

  // Heatmap mode: one class per level (see the .seat-heat-* block in
  // tailwind.css for why these cannot be bg-* utilities).
  switch (occupancyLevel) {
    case 'critical':
      return 'seat-heat-critical';
    case 'high':
      return 'seat-heat-high';
    case 'medium':
      return 'seat-heat-medium';
    case 'low':
      return 'seat-heat-low';
    default:
      return 'seat-available hover:border-primary hover:text-primary';
  }
}

/** Heatmap ramp, low → high. Shared by the grid and the legend ramp below it. */
const HEATMAP_RAMP = [
  'seat-heat-low',
  'seat-heat-medium',
  'seat-heat-high',
  'seat-heat-critical',
] as const;

/** Compact "45k" style price for the legend chips. */
function formatSeatPrice(price: number): string {
  return `${Math.round(price / 1000).toLocaleString('vi-VN')}k₫`;
}

/**
 * Legend entries. `swatch` reuses the exact seat classes the grid applies, so a
 * chip can never drift from the seat it describes.
 */
const SEAT_LEGEND: { label: string; note: string; swatch: string }[] = [
  {
    label: 'Phổ thông',
    note: `${formatSeatPrice(SEAT_TIER_PRICES.available - 25000)}–${formatSeatPrice(SEAT_TIER_PRICES.available)}`,
    swatch: 'seat seat-available',
  },
  {
    label: 'Thương gia',
    note: `${formatSeatPrice(SEAT_TIER_PRICES.business)}+`,
    swatch: 'seat seat-business',
  },
  {
    label: 'Ưa chuộng',
    note: formatSeatPrice(SEAT_TIER_PRICES.hot),
    swatch: 'seat seat-hot',
  },
  { label: 'Đã chọn', note: 'Của bạn', swatch: 'seat seat-selected' },
  { label: 'Đã đặt', note: 'Không có', swatch: 'seat seat-occupied' },
];

/** Dashed rule with a caption, used to separate cabins and mark the exits. */
function CabinDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5" role="presentation">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-3xs font-bold uppercase tracking-[0.14em] text-[var(--foreground-subtle)] font-koho whitespace-nowrap">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SeatSelectionStep({
  flight,
  passengers,
  initialSeats = [],
  initialAncillaries = [],
  onConfirm,
  onBack,
}: Props) {
  const [selected, setSelected] = useState<string[]>(initialSeats);
  const [ancillaries, setAncillaries] = useState<AncillaryId[]>(initialAncillaries);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [holdTimer, setHoldTimer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(HOLD_TIMEOUT_SECONDS);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Infants travel on a lap, so the picker only has to seat the others; the
  // seat array the API receives is therefore shorter than the passenger list.
  const seatedPassengers = passengers.filter((passenger) => isSeated(passenger.type));
  const passengerCount = seatedPassengers.length;
  const allSeatsPicked = selected.length >= passengerCount;
  const rows = React.useMemo(() => Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1), []);

  // Simulate seat data loading
  useEffect(() => {
    const timer = setTimeout(() => setSeatsLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);

  // Start hold timer when first seat is selected
  useEffect(() => {
    if (selected.length > 0 && holdTimer === null) {
      setHoldTimer(Date.now());
      setTimeLeft(HOLD_TIMEOUT_SECONDS);
    }
    if (selected.length === 0 && holdTimer !== null) {
      setHoldTimer(null);
      setTimeLeft(HOLD_TIMEOUT_SECONDS);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [selected.length, holdTimer]);

  useEffect(() => {
    if (holdTimer !== null) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setSelected([]);
            setHoldTimer(null);
            return HOLD_TIMEOUT_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [holdTimer]);

  const [exitRowCandidate, setExitRowCandidate] = useState<string | null>(null);

  // A child must sit beside an adult; an infant is absent here because it
  // rides on a lap and is filtered out of `seatedPassengers`.
  const paxCounts = React.useMemo(() => {
    const counts = countPassengerTypes(passengers);
    return { adult: counts.adult, child: counts.child };
  }, [passengers]);

  const isExitRow = useCallback((seat: string) => {
    const rowMatch = seat.match(/^(\d+)/);
    if (!rowMatch) return false;
    return EXIT_ROWS.has(Number(rowMatch[1]));
  }, []);

  const toggleSeat = useCallback(
    (seatId: string) => {
      const info = SEATS[seatId];
      if (info.status === 'occupied') return;
      if (selected.includes(seatId)) {
        setSelected((prev) =>
          canDeselectSeat({ seatId, selected: prev, paxCounts })
            ? prev.filter((s) => s !== seatId)
            : prev
        );
        return;
      }
      if (isExitRow(seatId)) {
        setExitRowCandidate(seatId);
        return;
      }
      if (canSelectSeat({ seatId, selected, paxCounts })) {
        setSelected((prev) => [...prev, seatId]);
      }
    },
    [selected, paxCounts, isExitRow]
  );

  const confirmExitRowSeat = useCallback(() => {
    if (exitRowCandidate) {
      if (canSelectSeat({ seatId: exitRowCandidate, selected, paxCounts })) {
        setSelected((prev) => [...prev, exitRowCandidate]);
      }
      setExitRowCandidate(null);
    }
  }, [exitRowCandidate, selected, paxCounts]);

  const handleSeatEnter = useCallback((target: HTMLElement, seatId: string) => {
    const rect = target.getBoundingClientRect();
    setTooltip({
      seatId,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, []);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, seatId: string) => {
      handleSeatEnter(e.currentTarget, seatId);
    },
    [handleSeatEnter]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const timerUrgent = timeLeft <= 120; // last 2 minutes
  const timerWarning = timeLeft <= 300; // last 5 minutes

  const tooltipSeat = tooltip ? SEATS[tooltip.seatId] : null;

  const handleConfirm = async () => {
    if (selected.length < passengerCount || isConfirming) return;
    setIsConfirming(true);
    try {
      const seatPrices = selected.map((seatId) => SEATS[seatId]?.price || 0);
      const advanced = await onConfirm(selected, seatPrices, ancillaries);
      if (!advanced) setIsConfirming(false);
    } catch {
      setIsConfirming(false);
    }
  };

  const toggleAncillary = (id: AncillaryId) => {
    setAncillaries((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const totals = getBookingTotals({
    farePerPassenger: flight.price,
    passengerCount: passengers.length,
    paxCounts: countPassengerTypes(passengers),
    seatFee: selected.reduce((sum, s) => sum + SEATS[s].price, 0),
    ancillaries,
  });

  return (
    <>
      {seatsLoading ? (
        <SeatMapSkeleton />
      ) : (
        <>
          {/* pb: keep the last row clear of the sticky bottom totals bar. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pb-32 lg:pb-16 lg:sm:pb-14">
            {/* Seat Map */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Hold Timeout Counter - responsive */}
              {holdTimer !== null && (
                <div
                  className={`rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border ${
                    timerUrgent
                      ? 'bg-[rgb(var(--primary-rgb))]/10 border-[rgb(var(--primary-rgb))]/40 text-primary'
                      : timerWarning
                        ? 'bg-[rgb(var(--orange-rgb))]/10 border-[rgb(var(--orange-rgb))]/40 text-[var(--orange)]'
                        : 'bg-primary/5 border-primary/20 text-primary '
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Icon
                      name="ClockIcon"
                      size={14}
                      className={
                        timerUrgent
                          ? 'text-primary'
                          : timerWarning
                            ? 'text-[var(--orange)]'
                            : 'text-primary'
                      }
                    />
                    <span className="text-2xs sm:text-sm font-semibold font-koho">
                      {timerUrgent ? '⚠️ Ghế sắp hết hạn giữ!' : 'Thời gian giữ chỗ còn lại'}
                    </span>
                  </div>
                  <div
                    className={`font-mono font-bold text-base sm:text-lg tabular-nums ${timerUrgent ? 'text-primary' : timerWarning ? 'text-[var(--orange)]' : 'text-primary'}`}
                  >
                    {formatTime(timeLeft)}
                  </div>
                </div>
              )}

              {/* Extra Services - responsive */}
              <div className="bg-[var(--surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] overflow-hidden mb-4 sm:mb-6 shadow-vj-md">
                <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <div className="p-4 sm:p-5">
                  <h2 className="font-black text-[var(--foreground)] flex items-center gap-1.5 sm:gap-2 font-koho mb-3 sm:mb-4">
                    <span className="inline-block w-1 h-4 sm:h-5 bg-primary rounded-full" />
                    Dịch vụ bổ sung
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {ANCILLARY_OPTIONS.map((svc: AncillaryOption) => {
                      const isOn = ancillaries.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleAncillary(svc.id)}
                          aria-pressed={isOn}
                          className={`border rounded-xl p-2.5 sm:p-3 flex flex-col justify-between text-left transition-all ${
                            isOn
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-[var(--border)] hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center p-0.5 shrink-0 ${
                                isOn ? 'bg-amber-50 ring-1 ring-amber-400' : 'bg-[var(--surface-2)]'
                              }`}
                            >
                              {svc.id === 'baggage' ? (
                                <img
                                  src="/images/ancillary/baggage.png"
                                  alt={svc.title}
                                  className="w-full h-full object-contain"
                                />
                              ) : svc.id === 'meal' ? (
                                <img
                                  src="/images/ancillary/meal.png"
                                  alt={svc.title}
                                  className="w-full h-full object-contain"
                                />
                              ) : svc.id === 'insurance' ? (
                                <img
                                  src="/images/ancillary/insurance.png"
                                  alt={svc.title}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Icon name={svc.icon} size={16} />
                              )}
                            </div>
                            <span className="font-bold text-[var(--foreground)] font-koho">
                              {svc.title}
                            </span>
                            {isOn && (
                              <Icon
                                name="CheckCircleIcon"
                                size={16}
                                className="ml-auto text-primary"
                              />
                            )}
                          </div>
                          <div className="mt-auto">
                            <div className="text-4xs sm:text-2xs text-[var(--foreground-subtle)]">
                              {svc.description}
                            </div>
                            <div className="text-xs2 sm:text-sm font-black text-primary font-koho">
                              {svc.price.toLocaleString('vi-VN')}₫
                              <span className="font-body text-3xs sm:text-2xs font-normal text-[var(--foreground-muted)]">
                                {' '}
                                / khách
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-[var(--surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] overflow-hidden shadow-vj-md">
                {/* Red accent top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 sm:mb-2">
                    <h2 className="font-black text-[var(--foreground)] flex items-center gap-1.5 sm:gap-2 font-koho">
                      <span className="inline-block w-1 h-4 sm:h-5 bg-primary rounded-full" />
                      Chọn chỗ ngồi
                    </h2>
                    {/* Heatmap toggle */}
                    <button
                      onClick={() => setShowHeatmap((v) => !v)}
                      className={`flex items-center gap-1 text-2xs sm:gap-1.5 sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all ${
                        showHeatmap
                          ? 'bg-[var(--orange)] text-white border-[var(--orange)]'
                          : 'bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--orange)] hover:text-[var(--orange)]'
                      }`}
                    >
                      <Icon name="FireIcon" size={12} />
                      Bản đồ nhiệt
                    </button>
                  </div>
                  {/* Progress — vietjetair.com states the remaining count in words
                      and shows the fill as a bar, not as a "(1/1)" parenthetical. */}
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex-1">
                      <p className="text-xs2 sm:text-sm text-[var(--foreground-muted)]">
                        {allSeatsPicked ? (
                          <span className="font-semibold text-primary">
                            Đã chọn xong chỗ ngồi cho {passengerCount} hành khách
                          </span>
                        ) : (
                          <>
                            Chọn{' '}
                            <span className="font-semibold text-[var(--foreground)]">
                              {passengerCount - selected.length}
                            </span>{' '}
                            chỗ ngồi còn lại
                          </>
                        )}
                      </p>
                      <div
                        className="mt-1.5 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={passengerCount}
                        aria-valuenow={selected.length}
                        aria-label="Tiến độ chọn chỗ ngồi"
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-300"
                          style={{
                            width: `${
                              passengerCount > 0 ? (selected.length / passengerCount) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs2 sm:text-xs font-bold font-koho tabular-nums border ${
                        allSeatsPicked
                          ? 'bg-[rgb(var(--primary-rgb))]/10 text-primary border-[rgb(var(--primary-rgb))]/30'
                          : 'bg-[var(--surface-2)] text-[var(--foreground-muted)] border-[var(--border)]'
                      }`}
                    >
                      {selected.length}/{passengerCount}
                    </span>
                  </div>

                  {/* Aircraft body */}
                  <div className="seat-fuselage px-3 sm:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5">
                    {/* Nose */}
                    <div className="flex flex-col items-center gap-1.5 mb-3 sm:mb-4">
                      <svg
                        viewBox="0 0 120 22"
                        className="w-24 sm:w-28 h-4 sm:h-5"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M60 2 L118 20 H2 Z"
                          fill="rgb(var(--primary-rgb) / 0.08)"
                          stroke="rgb(var(--primary-rgb) / 0.35)"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-3xs sm:text-2xs font-bold uppercase tracking-[0.16em] text-[var(--foreground-subtle)] font-koho">
                        Mũi máy bay
                      </span>
                    </div>

                    {/* Seat grid + tooltip. Rows are capped in height so the sidebar
                      summary stays reachable on a 30-row cabin. */}
                    <div className="overflow-x-auto no-scrollbar">
                      <div className="seat-map-container relative mx-auto w-full min-w-[340px] sm:min-w-[330px] max-w-[400px]">
                        {/* Column letters, aligned to the grid via the same
                          spacer widths the rows use for the aisle. */}
                        <div className="flex items-center mb-2">
                          <span className="w-8 sm:w-7" />
                          {COLS.map((col, i) => (
                            <React.Fragment key={col}>
                              {i === AISLE_AFTER && <span className="w-8 sm:w-8" />}
                              <span className="w-8 sm:w-8 text-center text-2xs sm:text-xs2 font-bold tracking-wide text-[var(--foreground-muted)]">
                                {col}
                              </span>
                            </React.Fragment>
                          ))}
                          <span className="w-8 sm:w-7" />
                        </div>

                        {/* Rows */}
                        <div
                          className="space-y-1.5 max-h-[360px] sm:max-h-[430px] overflow-y-auto pr-1.5"
                          onScroll={handleMouseLeave}
                        >
                          {rows.map((row) => (
                            <React.Fragment key={row}>
                              {row === 1 && <CabinDivider label="Hạng Thương gia" />}
                              {row === BUSINESS_ROWS + 1 && <CabinDivider label="Hạng Phổ thông" />}
                              {row === EXIT_ROWS_MIN && <CabinDivider label="Lối cứu thư" />}
                              <div className="flex items-center">
                                <span className="w-8 sm:w-7 text-2xs sm:text-xs2 text-[var(--foreground-subtle)] font-medium tabular-nums text-center">
                                  {row}
                                </span>
                                {COLS.map((col, i) => {
                                  const seatId = `${row}${col}`;
                                  const info = SEATS[seatId];
                                  const isSelected = selected.includes(seatId);
                                  return (
                                    <React.Fragment key={col}>
                                      {i === AISLE_AFTER && (
                                        <span className="w-8 sm:w-8 seat-aisle self-stretch flex items-center justify-center">
                                          {EXIT_ROWS.has(row) && (
                                            <span className="seat-exit-tag">EXIT</span>
                                          )}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => toggleSeat(seatId)}
                                        onMouseEnter={(e) => handleMouseEnter(e, seatId)}
                                        onMouseLeave={handleMouseLeave}
                                        onFocus={(e) => handleSeatEnter(e.currentTarget, seatId)}
                                        onBlur={handleMouseLeave}
                                        disabled={info.status === 'occupied'}
                                        aria-pressed={isSelected}
                                        aria-label={`Ghế ${seatId}, ${SEAT_STATUS_LABELS[info.status]}${isSelected ? ', đã chọn' : ''}, ${info.price.toLocaleString('vi-VN')}₫`}
                                        className={`w-8 h-8 sm:w-8 sm:h-8 rounded-[3px] text-2xs sm:text-xs2 font-bold seat flex-shrink-0 ${getHeatmapClass(
                                          seatId,
                                          info.status,
                                          info.occupancyLevel,
                                          isSelected,
                                          showHeatmap
                                        )}`}
                                      >
                                        {isSelected ? '✓' : row}
                                      </button>
                                    </React.Fragment>
                                  );
                                })}
                                <span className="w-8 sm:w-7 text-2xs sm:text-xs2 text-[var(--foreground-subtle)] font-medium tabular-nums text-center">
                                  {row}
                                </span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Tooltip. Anchored to the viewport rather than the scroll
                          container so it stays beside the seat while the cabin
                          scrolls, and flipped below when there is no room above. */}
                        {tooltip &&
                          tooltipSeat &&
                          (() => {
                            const TIP_W = 176;
                            const TIP_H = 150;
                            const flipBelow = tooltip.y - TIP_H < 72;
                            return (
                              <div
                                ref={tooltipRef}
                                role="tooltip"
                                className="fixed z-50 pointer-events-none"
                                style={{
                                  left: Math.min(
                                    Math.max(tooltip.x - TIP_W / 2, 8),
                                    window.innerWidth - TIP_W - 8
                                  ),
                                  top: flipBelow ? tooltip.y + 22 : tooltip.y - TIP_H,
                                }}
                              >
                                <div className="bg-[var(--vj-navy)] text-white rounded-xl shadow-xl p-2.5 sm:p-3 w-44 text-2xs sm:text-xs">
                                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                    <span className="font-black text-sm sm:text-base font-koho">
                                      Ghế {tooltip.seatId}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-2xs sm:text-xs font-bold ${
                                        tooltipSeat.status === 'business'
                                          ? 'bg-accent text-[var(--vj-navy)]'
                                          : tooltipSeat.status === 'hot'
                                            ? 'bg-[var(--orange)] text-white'
                                            : tooltipSeat.status === 'occupied'
                                              ? 'bg-[var(--foreground-muted)] text-white'
                                              : 'bg-primary text-white'
                                      }`}
                                    >
                                      {tooltipSeat.status === 'business'
                                        ? 'BIZ'
                                        : tooltipSeat.status === 'hot'
                                          ? 'HOT'
                                          : tooltipSeat.status === 'occupied'
                                            ? 'ĐẶT'
                                            : 'ECO'}
                                    </span>
                                  </div>
                                  {tooltipSeat.status !== 'occupied' && (
                                    <>
                                      <div className="space-y-0.5 sm:space-y-1 border-t border-white/10 pt-1.5 sm:pt-2">
                                        <div className="flex justify-between">
                                          <span className="text-white/60">Giá gốc</span>
                                          <span>
                                            {tooltipSeat.basePrice.toLocaleString('vi-VN')}₫
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-white/60">
                                            Thuế ({Math.round(SEAT_TAX_RATE * 100)}%)
                                          </span>
                                          <span>{tooltipSeat.tax.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-white/60">
                                            Phí dịch vụ ({Math.round(SEAT_SERVICE_FEE_RATE * 100)}%)
                                          </span>
                                          <span>{tooltipSeat.fee.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between font-bold border-t border-white/10 pt-0.5 sm:pt-1 text-accent">
                                          <span>Tổng</span>
                                          <span>{tooltipSeat.price.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                      </div>
                                      <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-white/10">
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                          <div
                                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                              tooltipSeat.occupancyLevel === 'low'
                                                ? 'bg-[var(--vj-green)]'
                                                : tooltipSeat.occupancyLevel === 'medium'
                                                  ? 'bg-accent'
                                                  : tooltipSeat.occupancyLevel === 'high'
                                                    ? 'bg-[var(--orange)]'
                                                    : 'bg-primary'
                                            }`}
                                          />
                                          <span className="text-white/60">
                                            {tooltipSeat.occupancyLevel === 'low'
                                              ? 'Còn nhiều chỗ'
                                              : tooltipSeat.occupancyLevel === 'medium'
                                                ? 'Đang lấp đầy'
                                                : tooltipSeat.occupancyLevel === 'high'
                                                  ? 'Ít chỗ trống'
                                                  : 'Gần hết'}
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {tooltipSeat.status === 'occupied' && (
                                    <div className="text-white/50 text-center py-0.5 sm:py-1">
                                      Ghế đã được đặt
                                    </div>
                                  )}
                                  {/* Arrow — points back at the seat, so it flips with
                                the tooltip body. */}
                                  <div
                                    className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[var(--vj-navy)] rotate-45 ${
                                      flipBelow ? 'top-[-5px]' : 'bottom-[-5px]'
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    </div>
                  </div>

                  {/* Legend — a single compact row under the map, the way
                      vietjetair.com presents it. Each chip reuses the grid's own
                      seat class, so the two can never disagree. */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[var(--border)]">
                    <div className="flex flex-wrap items-center gap-x-3.5 sm:gap-x-5 gap-y-2">
                      {SEAT_LEGEND.map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5 sm:gap-2">
                          <span
                            className={`w-5 h-5 sm:w-[22px] sm:h-[22px] rounded-[3px] flex-shrink-0 ${item.swatch}`}
                            aria-hidden="true"
                          />
                          <span className="leading-tight">
                            <span className="block text-2xs sm:text-xs font-semibold text-[var(--foreground)]">
                              {item.label}
                            </span>
                            <span className="block text-3xs sm:text-2xs text-[var(--foreground-subtle)] tabular-nums">
                              {item.note}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Heatmap ramp, only while the overlay is on. The swatches
                        reuse the seat classes so the ramp cannot drift. */}
                    {showHeatmap && (
                      <div className="mt-3 pt-3 border-t border-dashed border-[var(--border)]">
                        <div className="flex items-center gap-2 text-2xs sm:text-xs text-[var(--foreground-muted)]">
                          <span>Mức độ lấp đầy</span>
                          <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
                            {HEATMAP_RAMP.map((level, i) => (
                              <span
                                key={level}
                                className={`h-2.5 flex-1 seat ${level} ${
                                  i === 0 ? 'rounded-l-sm' : ''
                                } ${i === HEATMAP_RAMP.length - 1 ? 'rounded-r-sm' : ''}`}
                              />
                            ))}
                          </div>
                          <span className="flex items-center gap-1">
                            <span className="text-[var(--foreground-subtle)]">Thấp</span>
                            <Icon
                              name="ArrowRightIcon"
                              size={10}
                              className="text-[var(--foreground-subtle)]"
                            />
                            <span className="text-[var(--foreground-subtle)]">Cao</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary - responsive */}
            <div className="lg:col-span-1">
              <div className="bg-[var(--surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] overflow-hidden sticky top-[180px] sm:top-[200px] lg:top-[230px] shadow-vj-md">
                {/* Yellow accent top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
                <div className="p-4 sm:p-5">
                  <h3 className="font-black text-[var(--foreground)] mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 font-koho">
                    <Icon name="TicketIcon" size={16} className="text-primary" />
                    Chỗ đã chọn
                  </h3>

                  {selected.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-[var(--foreground-subtle)]">
                      <Icon
                        name="TicketIcon"
                        size={32}
                        className="mx-auto mb-1.5 sm:mb-2 text-[var(--foreground-muted)]"
                      />
                      <div className="text-xs2 sm:text-sm">Chưa chọn chỗ ngồi</div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      {selected.map((seat, i) => {
                        const info = SEATS[seat];
                        return (
                          <div
                            key={seat}
                            className="flex items-center justify-between rounded-xl border border-[rgb(var(--primary-rgb))]/10 bg-[rgb(var(--primary-rgb))]/5 px-2.5 py-2 sm:px-3 sm:py-2.5"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-red rounded text-white text-2xs sm:text-xs font-black flex items-center justify-center shadow-sm">
                                {i + 1}
                              </div>
                              <div>
                                <div className="font-black text-[var(--foreground)] text-xs2 sm:text-sm font-koho">
                                  Ghế {seat}
                                </div>
                                <div className="text-3xs sm:text-xs text-[var(--foreground-muted)]">
                                  {seatedPassengers[i]?.name || `Hành khách ${i + 1}`}
                                </div>
                                <div className="text-3xs sm:text-xs text-primary font-bold">
                                  {info.price.toLocaleString('vi-VN')}₫
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelected((prev) => prev.filter((s) => s !== seat))}
                              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--foreground-subtle)] hover:bg-[rgb(var(--primary-rgb))/5] hover:text-primary transition-colors"
                            >
                              <Icon name="XMarkIcon" size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Price - responsive */}
                  <div className="border-t border-[var(--border)] pt-3 sm:pt-4 mb-3 sm:mb-4 space-y-1.5 sm:space-y-2 text-xs2 sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">Vé máy bay</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {totals.fareSubtotal.toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">
                        Thuế &amp; phí ({Math.round(TAX_AND_FEE_RATE * 100)}%)
                      </span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {totals.taxAndFee.toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">Phí chọn chỗ</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {totals.seatFee.toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                    {totals.ancillaryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">Dịch vụ bổ sung</span>
                        <span className="font-semibold text-[var(--foreground)]">
                          {totals.ancillaryFee.toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-[var(--foreground)] pt-1 border-t border-[var(--border)] font-koho">
                      <span>Tổng cộng</span>
                      <span className="text-primary">{totals.total.toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>

                  {/* Compact hold timer in sidebar - responsive */}
                  {holdTimer !== null && (
                    <div
                      className={`rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 mb-2.5 sm:mb-3 flex items-center justify-between text-2xs sm:text-xs ${
                        timerUrgent
                          ? 'bg-[rgb(var(--primary-rgb))]/10 text-primary border border-[rgb(var(--primary-rgb))]/30'
                          : timerWarning
                            ? 'bg-[rgb(var(--orange-rgb))]/10 text-[var(--orange)] border border-[rgb(var(--orange-rgb))]/30'
                            : 'bg-primary/5 text-primary border border-primary/10'
                      }`}
                    >
                      <span className="flex items-center gap-0.5 sm:gap-1 font-semibold">
                        <Icon name="ClockIcon" size={12} />
                        Giữ chỗ còn
                      </span>
                      <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleConfirm}
                      disabled={selected.length < passengerCount || isConfirming}
                      className="w-full vj-btn vj-btn-md vj-btn-accent rounded-xl font-black disabled:opacity-50 disabled:cursor-not-allowed font-koho"
                    >
                      {isConfirming ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <Icon name="ArrowRightIcon" size={16} />
                          Tiếp tục nhập hành khách
                        </>
                      )}
                    </button>
                    <button
                      onClick={onBack}
                      disabled={isConfirming}
                      className="w-full vj-btn vj-btn-md vj-btn-outline rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon name="ArrowLeftIcon" size={14} />
                      Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Sticky totals bar — keeps the live total visible while the user
            completes seat selection before moving to passenger details.
            Disabled until every passenger has a seat, same rule as the
            sidebar button above. */}
          <BookingBottomBar
            total={totals.total}
            ctaLabel="Tiếp tục nhập hành khách"
            onCta={handleConfirm}
            disabled={selected.length < passengerCount || isConfirming}
            testId="seat-bottom-bar"
          />
        </>
      )}

      {/* Exit Row Safety Confirmation Modal */}
      {exitRowCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-fadeIn">
            <div className="bg-vjred p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="ShieldCheckIcon" size={20} className="text-vjyellow" />
                <h3 className="text-base font-black uppercase">
                  Quy định ghế lối thoát hiểm ({exitRowCandidate})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExitRowCandidate(null)}
                className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
                aria-label="Đóng"
              >
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-vjdark">
              <p className="font-semibold text-vjdark">
                Theo quy định an toàn của Cục Hàng không và Vietjet, hành khách ngồi tại hàng ghế
                thoát hiểm cần đáp ứng các điều kiện sau:
              </p>
              <ul className="space-y-2 list-disc pl-4 text-vjdark/80">
                <li>Độ tuổi từ 15 đến 65 tuổi, có đầy đủ thể lực.</li>
                <li>Không đi cùng trẻ sơ sinh, trẻ em hoặc người cần trợ giúp đặc biệt.</li>
                <li>Không có thai hoặc mang thương tật hạn chế khả năng vận động.</li>
                <li>
                  Hiểu và có khả năng làm theo khẩu lệnh sơ tán bằng tiếng Việt hoặc tiếng Anh.
                </li>
                <li>Sẵn sàng hỗ trợ phi hành đoàn trong trường hợp khẩn cấp.</li>
              </ul>
            </div>

            <div className="bg-vjbgs p-4 flex gap-2 justify-end border-t border-black/10">
              <button
                type="button"
                onClick={() => setExitRowCandidate(null)}
                className="vj-btn vj-btn-sm vj-btn-outline rounded-xl px-4 py-2 text-xs font-bold"
              >
                Chọn ghế khác
              </button>
              <button
                type="button"
                onClick={confirmExitRowSeat}
                className="vj-btn vj-btn-sm vj-btn-primary rounded-xl px-4 py-2 text-xs font-bold"
              >
                Tôi đồng ý & Chọn ghế
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
