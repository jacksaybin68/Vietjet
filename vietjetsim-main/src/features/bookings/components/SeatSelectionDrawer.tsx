'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { getSeatCharge } from '@/features/bookings/pricing';
import { RiCloseLine } from 'react-icons/ri';
import Image from 'next/image';
import { useSeatMapSSE } from '@/hooks/useSeatMapSSE';

interface SeatSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  returnFlight?: Flight | null;
  passengerName?: string;
  initialSeats?: string[];
  initialReturnSeats?: string[];
  onConfirmSeats: (seats: string[], seatFee: number, returnSeats?: string[]) => void;
  isRoundTrip?: boolean;
}

const COLS_LEFT = ['A', 'B', 'C'] as const;
const COLS_RIGHT = ['D', 'E', 'F'] as const;
const TOTAL_ROWS = 22;
const HOLD_TIMEOUT_SECONDS = 10 * 60;

export default function SeatSelectionDrawer({
  isOpen,
  onClose,
  flight,
  returnFlight,
  passengerName = 'LONG CHIN',
  initialSeats = [],
  initialReturnSeats = [],
  onConfirmSeats,
  isRoundTrip = false,
}: SeatSelectionDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');
  const [outboundSeats, setOutboundSeats] = useState<string[]>(initialSeats);
  const [inboundSeats, setInboundSeats] = useState<string[]>(initialReturnSeats);
  const [lockedSeats, setLockedSeats] = useState<Set<string>>(new Set());
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(HOLD_TIMEOUT_SECONDS);
  const [isLocking, setIsLocking] = useState(false);
  const sessionIdRef = useRef<string>('');

  // Get or create session ID for seat locking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let sid = sessionStorage.getItem('vietjet_seat_session');
    if (!sid) {
      sid = `seat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('vietjet_seat_session', sid);
    }
    sessionIdRef.current = sid;
  }, []);

  // SSE for real-time seat data
  const currentFlightId = activeLeg === 'outbound' ? flight.id : (returnFlight?.id ?? flight.id);
  const { data: seatMapData } = useSeatMapSSE(currentFlightId);

  // Merge SSE data: occupied from DB + locked from SSE
  const sseOccupied = useMemo(() => {
    const set = new Set<string>();
    if (seatMapData?.occupied) {
      seatMapData.occupied.forEach((s) => set.add(s));
    }
    return set;
  }, [seatMapData]);

  const sseLocked = useMemo(() => {
    const set = new Set<string>();
    if (seatMapData?.locked) {
      seatMapData.locked.forEach((l) => set.add(l.seatId));
    }
    return set;
  }, [seatMapData]);

  // Combined occupied set (SSE + locally locked)
  const occupiedSeats = useMemo(() => {
    const set = new Set(sseOccupied);
    lockedSeats.forEach((s) => set.add(s));
    return set;
  }, [sseOccupied, lockedSeats]);

  const releaseAllLocks = useCallback(async () => {
    if (lockedSeats.size === 0) return;
    const seatsToRelease = Array.from(lockedSeats);
    try {
      await fetch('/api/ghe/khoa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightId: currentFlightId,
          seatIds: seatsToRelease,
          sessionId: sessionIdRef.current,
        }),
        keepalive: true,
      });
    } catch {
      // silent
    }
    setLockedSeats(new Set());
  }, [lockedSeats, currentFlightId]);

  // Hold timer: starts when first seat is selected
  useEffect(() => {
    const hasSelection = outboundSeats.length > 0 || inboundSeats.length > 0;
    if (!hasSelection || !isOpen) {
      setHoldSecondsLeft(HOLD_TIMEOUT_SECONDS);
      return;
    }
    const timer = setInterval(() => {
      setHoldSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time expired: release locks and clear selection
          releaseAllLocks();
          setOutboundSeats([]);
          setInboundSeats([]);
          return HOLD_TIMEOUT_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [outboundSeats, inboundSeats, isOpen, releaseAllLocks]);

  // Release all locks on unmount
  useEffect(() => {
    return () => {
      if (lockedSeats.size > 0) {
        releaseAllLocks();
      }
    };
  }, [lockedSeats.size, releaseAllLocks]);

  const lockSeat = useCallback(
    async (seatId: string) => {
      setIsLocking(true);
      try {
        const res = await fetch('/api/ghe/khoa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flightId: currentFlightId,
            seatIds: [seatId],
            sessionId: sessionIdRef.current,
          }),
        });
        if (res.ok) {
          setLockedSeats((prev) => new Set(prev).add(seatId));
        }
      } catch {
        // silent
      } finally {
        setIsLocking(false);
      }
    },
    [currentFlightId]
  );

  const unlockSeat = useCallback(
    async (seatId: string) => {
      try {
        await fetch('/api/ghe/khoa', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flightId: currentFlightId,
            seatIds: [seatId],
            sessionId: sessionIdRef.current,
          }),
        });
      } catch {
        // silent
      }
      setLockedSeats((prev) => {
        const next = new Set(prev);
        next.delete(seatId);
        return next;
      });
    },
    [currentFlightId]
  );

  useEffect(() => {
    setOutboundSeats(initialSeats);
    setInboundSeats(initialReturnSeats);
  }, [initialSeats, initialReturnSeats, isOpen]);

  if (!isOpen) return null;

  const currentSeats = activeLeg === 'outbound' ? outboundSeats : inboundSeats;
  const setCurrentSeats = activeLeg === 'outbound' ? setOutboundSeats : setInboundSeats;

  const handleToggleSeat = (seatId: string) => {
    if (occupiedSeats.has(seatId)) return;

    if (currentSeats.includes(seatId)) {
      // Deselect: unlock seat
      unlockSeat(seatId);
      setCurrentSeats(currentSeats.filter((s) => s !== seatId));
    } else {
      // Select: lock seat
      lockSeat(seatId);
      setCurrentSeats([seatId]); // 1 passenger selects 1 seat
    }
  };

  const outboundSeatFee = outboundSeats.reduce((sum, seat) => sum + getSeatCharge(seat), 0);
  const inboundSeatFee = isRoundTrip
    ? inboundSeats.reduce((sum, seat) => sum + getSeatCharge(seat), 0)
    : 0;
  const totalSeatFee = outboundSeatFee + inboundSeatFee;

  const handleConfirm = () => {
    onConfirmSeats(outboundSeats, totalSeatFee, inboundSeats);
    onClose();
  };

  const handleSkip = () => {
    releaseAllLocks();
    onConfirmSeats([], 0, []);
    onClose();
  };

  const formatHoldTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasSelection = outboundSeats.length > 0 || inboundSeats.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
        {/* Header with Vietjet curve top-right (Screenshot 9) */}
        <div className="relative bg-primary-dark text-white px-4 py-3 flex items-center justify-between shadow-md overflow-hidden">
          <div className="w-8 shrink-0" />
          <h2 className="font-jambono font-medium text-base2 uppercase text-white text-center">
            CHỌN CHỖ NGỒI YÊU THÍCH
          </h2>
          <div className="relative z-10">
            <button
              onClick={onClose}
              className="text-gray-900 bg-white/90 hover:bg-white p-1 rounded-full transition-colors flex items-center justify-center h-7 w-7"
              aria-label="Đóng"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
          {/* Vietjet green-yellow swoosh on top right */}
          <div className="pointer-events-none absolute top-0 right-0 h-14 w-24 overflow-hidden">
            <svg
              className="absolute -top-4 -right-4 h-20 w-28 opacity-95"
              viewBox="0 0 100 60"
              fill="none"
            >
              <path d="M100 0 L 20 0 C 40 30, 70 50, 100 60 Z" fill="#2E7D32" />
              <path d="M100 0 L 45 0 C 60 25, 80 45, 100 50 Z" fill="#FBB612" />
            </svg>
          </div>
        </div>

        {/* Legs tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveLeg('outbound')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-all border-b-2 ${
              activeLeg === 'outbound'
                ? 'border-primary-dark text-primary-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Chuyến đi
          </button>
          {isRoundTrip && (
            <button
              type="button"
              onClick={() => setActiveLeg('inbound')}
              className={`flex-1 py-2.5 text-center text-xs font-bold transition-all border-b-2 ${
                activeLeg === 'inbound'
                  ? 'border-primary-dark text-primary-dark'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Chuyến về
            </button>
          )}
        </div>

        {/* Passenger Card matching Screenshot 9 */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="max-w-xs mx-auto overflow-hidden rounded-vj border border-red-200 shadow-sm bg-white text-center">
            <div className="bg-primary-dark py-2 px-4 text-white">
              <div className="text-3xs uppercase tracking-wider text-white/80">Người lớn</div>
              <div className="text-sm font-black uppercase tracking-tight">{passengerName}</div>
            </div>
            <div className="py-2.5 px-4 text-sm font-bold text-gray-900 font-koho">
              {activeLeg === 'outbound'
                ? `${flight.from} - ${flight.to}`
                : `${returnFlight?.from || flight.to} - ${returnFlight?.to || flight.from}`}
            </div>
          </div>
        </div>

        {/* Scrollable Cabin Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
          {/* Banner */}
          <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-vj p-3 mb-3 border border-red-100 flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden bg-white shadow-sm border border-red-200">
              <Image
                src="/images/hero/vj-flight-attendant.png"
                alt="Tiếp viên Vietjet"
                fill
                className="object-cover object-top"
              />
            </div>
            <p className="text-xs font-semibold text-brand-wine leading-snug">
              Chỗ ngồi chuẩn ý cho bạn một chuyến bay thoải mái hài lòng
            </p>
          </div>

          {/* Hold Timer */}
          {hasSelection && (
            <div className="bg-amber-50 border border-amber-200 rounded-vj p-2.5 mb-3 flex items-center justify-between">
              <span className="text-2xs font-bold text-amber-800">
                Ghế được giữ trong:{' '}
                <span className="font-black text-amber-900">{formatHoldTime(holdSecondsLeft)}</span>
              </span>
              <span className="text-3xs text-amber-600">Giữ ghế tối đa 10 phút</span>
            </div>
          )}

          {/* SSE Live indicator */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-3xs font-medium text-emerald-700">
              Cập nhật chỗ ngồi thời gian thực
            </span>
          </div>

          {/* Seat Legend */}
          <div className="bg-white rounded-vj p-3 border border-gray-200 shadow-sm mb-4">
            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs2 font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-yellow-500 shrink-0" />
                <span>Ghế Business</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-red-600 shrink-0" />
                <span>Ghế cao cấp</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-green-500 shrink-0" />
                <span>Ghế tiêu chuẩn</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-sky-600 shrink-0" />
                <span>Ghế để chân rộng</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-purple-600 shrink-0" />
                <span>Ghế hàng trước</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-orange-600 shrink-0 ring-2 ring-orange-600/40" />
                <span className="font-bold text-orange-600">Ghế đang chọn</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-3xs font-bold shrink-0">
                  ✕
                </span>
                <span>Đã có người</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-gray-300 text-gray-500 flex items-center justify-center text-3xs font-bold shrink-0">
                  🔒
                </span>
                <span>Đang giữ</span>
              </div>
            </div>
          </div>

          {/* Cabin Doors Notice */}
          <div className="flex justify-between text-2xs text-gray-500 font-bold uppercase mb-2 px-1">
            <span>Cửa lên tàu bay ↗</span>
            <span>Cửa lên tàu bay ↖</span>
          </div>

          {/* Seat Grid */}
          <div className="bg-white rounded-vj p-3 border border-gray-200 shadow-inner">
            {/* Header letters */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-2 px-1">
              <div className="flex gap-2">
                {COLS_LEFT.map((col) => (
                  <span key={col} className="w-7 text-center">
                    {col}
                  </span>
                ))}
              </div>
              <span className="w-6 text-center text-gray-300">|</span>
              <div className="flex gap-2">
                {COLS_RIGHT.map((col) => (
                  <span key={col} className="w-7 text-center">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1).map((row) => {
                const isExitRow = row === 11 || row === 12;
                return (
                  <React.Fragment key={row}>
                    {isExitRow && row === 11 && (
                      <div className="py-1 my-1 border-y border-dashed border-sky-400 bg-sky-50 text-center text-2xs font-bold text-sky-700">
                        Cửa thoát hiểm (Chân rộng)
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {/* Left 3 seats */}
                      <div className="flex gap-2">
                        {COLS_LEFT.map((col) => {
                          const seatId = `${row}${col}`;
                          const isOccupied = occupiedSeats.has(seatId);
                          const isLocked = sseLocked.has(seatId) && !lockedSeats.has(seatId);
                          const isSelected = currentSeats.includes(seatId);

                          let bgColor = 'bg-green-500 text-white hover:opacity-90'; // standard
                          if (row <= 2)
                            bgColor = 'bg-yellow-500 text-white hover:opacity-90'; // business
                          else if (row <= 5)
                            bgColor = 'bg-purple-600 text-white hover:opacity-90'; // front
                          else if (isExitRow) bgColor = 'bg-sky-600 text-white hover:opacity-90'; // extra legroom
                          if (isSelected)
                            bgColor = 'bg-orange-600 text-white ring-2 ring-orange-300';
                          if (isOccupied) bgColor = 'bg-gray-200 text-gray-400 cursor-not-allowed';
                          if (isLocked) bgColor = 'bg-gray-300 text-gray-500 cursor-not-allowed';

                          return (
                            <button
                              key={seatId}
                              disabled={isOccupied || isLocked || isLocking}
                              onClick={() => handleToggleSeat(seatId)}
                              className={`w-7 h-7 rounded text-2xs font-black flex items-center justify-center transition-all ${bgColor}`}
                              title={`Ghế ${seatId} - ${getSeatCharge(seatId).toLocaleString('vi-VN')}₫${
                                isLocked ? ' (Đang giữ bởi người khác)' : ''
                              }`}
                            >
                              {isOccupied ? '✕' : isLocked ? '🔒' : seatId}
                            </button>
                          );
                        })}
                      </div>

                      {/* Row number in aisle */}
                      <span className="w-6 text-center text-xs2 font-black text-gray-400">
                        {row}
                      </span>

                      {/* Right 3 seats */}
                      <div className="flex gap-2">
                        {COLS_RIGHT.map((col) => {
                          const seatId = `${row}${col}`;
                          const isOccupied = occupiedSeats.has(seatId);
                          const isLocked = sseLocked.has(seatId) && !lockedSeats.has(seatId);
                          const isSelected = currentSeats.includes(seatId);

                          let bgColor = 'bg-green-500 text-white hover:opacity-90';
                          if (row <= 2) bgColor = 'bg-yellow-500 text-white hover:opacity-90';
                          else if (row <= 5) bgColor = 'bg-purple-600 text-white hover:opacity-90';
                          else if (isExitRow) bgColor = 'bg-sky-600 text-white hover:opacity-90';
                          if (isSelected)
                            bgColor = 'bg-orange-600 text-white ring-2 ring-orange-300';
                          if (isOccupied) bgColor = 'bg-gray-200 text-gray-400 cursor-not-allowed';
                          if (isLocked) bgColor = 'bg-gray-300 text-gray-500 cursor-not-allowed';

                          return (
                            <button
                              key={seatId}
                              disabled={isOccupied || isLocked || isLocking}
                              onClick={() => handleToggleSeat(seatId)}
                              className={`w-7 h-7 rounded text-2xs font-black flex items-center justify-center transition-all ${bgColor}`}
                              title={`Ghế ${seatId} - ${getSeatCharge(seatId).toLocaleString('vi-VN')}₫${
                                isLocked ? ' (Đang giữ bởi người khác)' : ''
                              }`}
                            >
                              {isOccupied ? '✕' : isLocked ? '🔒' : seatId}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="bg-primary-dark text-white p-3 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs2 text-gray-200 block">
              Chỗ ngồi (
              {[
                outboundSeats.length > 0 ? `Đi: ${outboundSeats.join(', ')}` : null,
                inboundSeats.length > 0 ? `Về: ${inboundSeats.join(', ')}` : null,
              ]
                .filter(Boolean)
                .join(' | ') || 'Chưa chọn'}
              ):
            </span>
            <span className="text-base font-black">
              {totalSeatFee > 0 ? `${totalSeatFee.toLocaleString('vi-VN')} VND` : '0 VND'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {outboundSeats.length === 0 && inboundSeats.length === 0 ? (
              <button
                type="button"
                onClick={handleSkip}
                className="bg-vjgold hover:bg-yellow-400 text-black text-xs font-bold px-4 py-2 rounded shadow transition-colors"
              >
                Không, cảm ơn
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className="bg-vjgold hover:bg-yellow-400 text-black text-xs font-black px-5 py-2.5 rounded shadow transition-colors"
              >
                Xác nhận chọn ghế
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
