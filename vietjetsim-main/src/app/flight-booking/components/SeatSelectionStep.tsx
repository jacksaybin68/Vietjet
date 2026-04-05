'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flight, Passenger } from './FlightBookingClient';
import Icon from '@/components/ui/AppIcon';
import { SeatMapSkeleton } from '@/components/ui/SkeletonLoader';

interface Props {
  flight: Flight;
  passengers: Passenger[];
  onConfirm: (seats: string[]) => void;
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
  x: number;
  y: number;
}

const HOLD_TIMEOUT_SECONDS = 10 * 60; // 10 minutes

function generateSeats(): Record<string, SeatInfo> {
  const seats: Record<string, SeatInfo> = {};
  const rows = Array.from({ length: 30 }, (_, i) => i + 1);
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
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
      let basePrice: number;
      let occupancyLevel: SeatInfo['occupancyLevel'];

      if (row <= 3) {
        status = 'business';
        basePrice = 350000;
        occupancyLevel = 'high';
      } else if (occupied.includes(seatId)) {
        status = 'occupied';
        basePrice = 50000;
        occupancyLevel = 'critical';
      } else if (hotSeats.includes(seatId)) {
        status = 'hot';
        basePrice = 80000;
        occupancyLevel = 'high';
      } else {
        status = 'available';
        // Price varies by row proximity to front/exit rows
        if (row <= 10) basePrice = 70000;
        else if (row <= 20) basePrice = 55000;
        else basePrice = 45000;
        // Assign occupancy level for heatmap
        if (row <= 6) occupancyLevel = 'high';
        else if (row <= 15) occupancyLevel = 'medium';
        else occupancyLevel = 'low';
      }

      const tax = Math.round(basePrice * 0.1);
      const fee = Math.round(basePrice * 0.05);
      const price = basePrice + tax + fee;

      seats[seatId] = { status, price, basePrice, tax, fee, occupancyLevel };
    });
  });
  return seats;
}

const SEATS = generateSeats();

// Heatmap color based on occupancy
function getHeatmapClass(
  seatId: string,
  status: SeatInfo['status'],
  occupancyLevel: SeatInfo['occupancyLevel'],
  isSelected: boolean,
  showHeatmap: boolean
): string {
  if (isSelected) return 'seat-selected';
  if (status === 'occupied') return 'seat-occupied';
  if (status === 'business') return 'seat-business hover:opacity-80';

  if (!showHeatmap) {
    if (status === 'hot')
      return 'bg-orange-100 border-2 border-orange-400 text-orange-700 hover:bg-orange-200';
    return 'seat-available hover:border-primary hover:bg-primary-50';
  }

  // Heatmap mode
  switch (occupancyLevel) {
    case 'critical':
      return 'bg-red-200 border-2 border-red-500 text-red-800 cursor-not-allowed opacity-70';
    case 'high':
      return 'bg-orange-100 border-2 border-orange-400 text-orange-700 hover:bg-orange-200';
    case 'medium':
      return 'bg-yellow-50 border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-100';
    case 'low':
      return 'bg-green-50 border-2 border-green-400 text-green-700 hover:bg-green-100';
    default:
      return 'seat-available hover:border-primary hover:bg-primary-50';
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SeatSelectionStep({ flight, passengers, onConfirm, onBack }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [holdTimer, setHoldTimer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(HOLD_TIMEOUT_SECONDS);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const passengerCount = passengers.length;

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

  const toggleSeat = useCallback(
    (seatId: string) => {
      const info = SEATS[seatId];
      if (info.status === 'occupied') return;
      if (selected.includes(seatId)) {
        setSelected((prev) => prev.filter((s) => s !== seatId));
      } else if (selected.length < passengerCount) {
        setSelected((prev) => [...prev, seatId]);
      }
    },
    [selected, passengerCount]
  );

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>, seatId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = e.currentTarget.closest('.seat-map-container')?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltip({
      seatId,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const rows = Array.from({ length: 30 }, (_, i) => i + 1);
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

  const timerUrgent = timeLeft <= 120; // last 2 minutes
  const timerWarning = timeLeft <= 300; // last 5 minutes

  const tooltipSeat = tooltip ? SEATS[tooltip.seatId] : null;

  const handleConfirm = () => {
    if (selected.length < passengerCount || isConfirming) return;
    setIsConfirming(true);
    onConfirm(selected);
  };

  return (
    <>
      {seatsLoading ? (
        <SeatMapSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seat Map */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hold Timeout Counter */}
            {holdTimer !== null && (
              <div
                className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
                  timerUrgent
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : timerWarning
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-[#1A2948]/5 border-[#1A2948]/20 text-[#1A2948]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name="ClockIcon"
                    size={16}
                    className={
                      timerUrgent
                        ? 'text-red-500'
                        : timerWarning
                          ? 'text-orange-500'
                          : 'text-primary'
                    }
                  />
                  <span
                    className="text-sm font-semibold font-koho"
                  >
                    {timerUrgent ? '⚠️ Ghế sắp hết hạn giữ!' : 'Thời gian giữ chỗ còn lại'}
                  </span>
                </div>
                <div
                  className={`font-mono font-bold text-lg tabular-nums ${timerUrgent ? 'text-red-600' : timerWarning ? 'text-orange-600' : 'text-primary'}`}
                >
                  {formatTime(timeLeft)}
                </div>
              </div>
            )}

            <div
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              {/* Red accent top bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2
                    className="font-black text-[#1A2948] flex items-center gap-2 font-koho"
                  >
                    <span className="inline-block w-1 h-5 bg-primary rounded-full" />
                    Chọn chỗ ngồi
                  </h2>
                  {/* Heatmap toggle */}
                  <button
                    onClick={() => setShowHeatmap((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      showHeatmap
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-stone-600 border-stone-300 hover:border-orange-400 hover:text-orange-600'
                    }`}
                  >
                    <Icon name="FireIcon" size={12} />
                    Bản đồ nhiệt
                  </button>
                </div>
                <p className="text-sm text-stone-500 mb-5">
                  Chọn {passengerCount} chỗ ngồi ({selected.length}/{passengerCount} đã chọn)
                </p>

                {/* Seat Type Legend */}
                <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 mb-5">
                  <div
                    className="text-xs font-bold text-[#1A2948] uppercase tracking-wide mb-2 font-koho"
                  >
                    Chú thích loại ghế
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded seat seat-available border-2 border-stone-300 bg-white flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-stone-700">Phổ thông</div>
                        <div className="text-stone-400">45k–70k₫</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded seat seat-business flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-stone-700">Thương gia</div>
                        <div className="text-stone-400">350k₫+</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-orange-100 border-2 border-orange-400 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-stone-700">Ưa chuộng</div>
                        <div className="text-stone-400">Đặt nhiều</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded seat seat-selected flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-stone-700">Đã chọn</div>
                        <div className="text-stone-400">Của bạn</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded seat seat-occupied flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-stone-700">Đã đặt</div>
                        <div className="text-stone-400">Không có</div>
                      </div>
                    </div>
                    {showHeatmap && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-green-50 border-2 border-green-400 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-stone-700">Ít người</div>
                          <div className="text-stone-400">Còn nhiều</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Heatmap scale */}
                  {showHeatmap && (
                    <div className="mt-3 pt-3 border-t border-stone-200">
                      <div
                        className="text-xs font-bold text-[#1A2948] mb-1.5 font-koho"
                      >
                        Mức độ lấp đầy
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-stone-400">Thấp</span>
                        <div className="flex gap-0.5 flex-1">
                          <div className="h-3 flex-1 rounded-l bg-green-200" />
                          <div className="h-3 flex-1 bg-yellow-200" />
                          <div className="h-3 flex-1 bg-orange-200" />
                          <div className="h-3 flex-1 rounded-r bg-red-300" />
                        </div>
                        <span className="text-xs text-stone-400">Cao</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Airplane nose */}
                <div className="text-center mb-4">
                  <div
                    className="inline-flex items-center gap-2 bg-[#1A2948]/5 text-[#1A2948] text-xs px-4 py-1.5 rounded-full border border-[#1A2948]/10 font-semibold font-koho"
                  >
                    <Icon name="PaperAirplaneIcon" size={12} className="text-primary" />
                    Mũi máy bay
                  </div>
                </div>

                {/* Seat map with tooltip */}
                <div className="overflow-x-auto">
                  <div className="min-w-[340px] seat-map-container relative">
                    {/* Col headers */}
                    <div className="flex items-center mb-2 pl-8">
                      {cols.map((col, i) => (
                        <React.Fragment key={col}>
                          {i === 3 && <div className="w-6" />}
                          <div className="w-8 text-center text-xs font-bold text-[#1A2948]">
                            {col}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Rows */}
                    <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                      {rows.map((row) => (
                        <div key={row} className="flex items-center gap-0">
                          <span className="w-7 text-xs text-stone-400 font-medium text-right mr-1">
                            {row}
                          </span>
                          {cols.map((col, i) => {
                            const seatId = `${row}${col}`;
                            const info = SEATS[seatId];
                            const isSelected = selected.includes(seatId);
                            return (
                              <React.Fragment key={col}>
                                {i === 3 && <div className="w-5" />}
                                <button
                                  onClick={() => toggleSeat(seatId)}
                                  onMouseEnter={(e) => handleMouseEnter(e, seatId)}
                                  onMouseLeave={handleMouseLeave}
                                  disabled={info.status === 'occupied'}
                                  className={`w-8 h-8 rounded text-xs font-bold seat mx-0.5 transition-all relative ${getHeatmapClass(
                                    seatId,
                                    info.status,
                                    info.occupancyLevel,
                                    isSelected,
                                    showHeatmap
                                  )}`}
                                >
                                  {isSelected ? '✓' : info.status === 'hot' ? '🔥' : ''}
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Tooltip */}
                    {tooltip && tooltipSeat && (
                      <div
                        ref={tooltipRef}
                        className="absolute z-50 pointer-events-none"
                        style={{
                          left: Math.min(tooltip.x - 80, 220),
                          top: tooltip.y - 160,
                        }}
                      >
                        <div className="bg-[#1A2948] text-white rounded-xl shadow-xl p-3 w-44 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="font-black text-sm font-koho"
                            >
                              Ghế {tooltip.seatId}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                tooltipSeat.status === 'business'
                                  ? 'bg-accent text-[#1A2948]'
                                  : tooltipSeat.status === 'hot'
                                    ? 'bg-orange-400 text-white'
                                    : tooltipSeat.status === 'occupied'
                                      ? 'bg-stone-600 text-stone-300'
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
                              <div className="space-y-1 border-t border-white/10 pt-2">
                                <div className="flex justify-between">
                                  <span className="text-white/60">Giá gốc</span>
                                  <span>{tooltipSeat.basePrice.toLocaleString('vi-VN')}₫</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/60">Thuế (10%)</span>
                                  <span>{tooltipSeat.tax.toLocaleString('vi-VN')}₫</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/60">Phí dịch vụ</span>
                                  <span>{tooltipSeat.fee.toLocaleString('vi-VN')}₫</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-white/10 pt-1 text-accent">
                                  <span>Tổng</span>
                                  <span>{tooltipSeat.price.toLocaleString('vi-VN')}₫</span>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="flex items-center gap-1">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      tooltipSeat.occupancyLevel === 'low'
                                        ? 'bg-green-400'
                                        : tooltipSeat.occupancyLevel === 'medium'
                                          ? 'bg-yellow-400'
                                          : tooltipSeat.occupancyLevel === 'high'
                                            ? 'bg-orange-400'
                                            : 'bg-red-400'
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
                            <div className="text-white/50 text-center py-1">Ghế đã được đặt</div>
                          )}
                          {/* Arrow */}
                          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1A2948] rotate-45" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden sticky top-[230px]"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              {/* Yellow accent top bar */}
              <div className="h-1 w-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
              <div className="p-5">
                <h3
                  className="font-black text-[#1A2948] mb-4 flex items-center gap-2 font-koho"
                >
                  <Icon name="TicketIcon" size={16} className="text-primary" />
                  Chỗ đã chọn
                </h3>

                {selected.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <Icon name="TicketIcon" size={32} className="mx-auto mb-2 text-stone-300" />
                    <div className="text-sm">Chưa chọn chỗ ngồi</div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {selected.map((seat, i) => {
                      const info = SEATS[seat];
                      return (
                        <div
                          key={seat}
                          className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-red rounded text-white text-xs font-black flex items-center justify-center shadow-sm">
                              {i + 1}
                            </div>
                            <div>
                              <div
                                className="font-black text-[#1A2948] text-sm font-koho"
                              >
                                Ghế {seat}
                              </div>
                              <div className="text-xs text-stone-500">
                                {passengers[i]?.name || `Hành khách ${i + 1}`}
                              </div>
                              <div className="text-xs text-primary font-bold">
                                {info.price.toLocaleString('vi-VN')}₫
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelected((prev) => prev.filter((s) => s !== seat))}
                            className="text-stone-400 hover:text-primary transition-colors"
                          >
                            <Icon name="XMarkIcon" size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Price */}
                <div className="border-t border-stone-100 pt-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Vé máy bay</span>
                    <span className="font-semibold text-stone-800">
                      {(flight.price * passengerCount).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Phí chọn chỗ</span>
                    <span className="font-semibold text-stone-800">
                      {selected.reduce((sum, s) => sum + SEATS[s].price, 0).toLocaleString('vi-VN')}
                      ₫
                    </span>
                  </div>
                  <div
                    className="flex justify-between font-black text-[#1A2948] pt-1 border-t border-stone-100 font-koho"
                  >
                    <span>Tổng cộng</span>
                    <span className="text-primary">
                      {(
                        flight.price * passengerCount * 1.1 +
                        selected.reduce((sum, s) => sum + SEATS[s].price, 0)
                      ).toLocaleString('vi-VN')}
                      ₫
                    </span>
                  </div>
                </div>

                {/* Compact hold timer in sidebar */}
                {holdTimer !== null && (
                  <div
                    className={`rounded-lg px-3 py-2 mb-3 flex items-center justify-between text-xs ${
                      timerUrgent
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : timerWarning
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'bg-primary/5 text-primary border border-primary/10'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-semibold">
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
                        <Icon name="CreditCardIcon" size={16} />
                        Tiến hành thanh toán
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
      )}
    </>
  );
}
