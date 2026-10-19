'use client';

import React, { useState, useEffect } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { getSeatCharge } from '@/features/bookings/pricing';
import { RiCloseLine } from 'react-icons/ri';
import Image from 'next/image';

interface SeatSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  passengerName?: string;
  initialSeats?: string[];
  onConfirmSeats: (seats: string[], seatFee: number) => void;
  isRoundTrip?: boolean;
}

const COLS_LEFT = ['A', 'B', 'C'] as const;
const COLS_RIGHT = ['D', 'E', 'F'] as const;
const TOTAL_ROWS = 22;

const OCCUPIED_SEATS = new Set([
  '1A',
  '1C',
  '2B',
  '4A',
  '4B',
  '7C',
  '8D',
  '9E',
  '10F',
  '11A',
  '12B',
  '14D',
  '15F',
  '17B',
  '18E',
  '20C',
  '21A',
]);

export default function SeatSelectionDrawer({
  isOpen,
  onClose,
  flight,
  passengerName = 'LONG CHIN',
  initialSeats = [],
  onConfirmSeats,
  isRoundTrip = false,
}: SeatSelectionDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');
  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialSeats);

  useEffect(() => {
    setSelectedSeats(initialSeats);
  }, [initialSeats, isOpen]);

  if (!isOpen) return null;

  const handleToggleSeat = (seatId: string) => {
    if (OCCUPIED_SEATS.has(seatId)) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
    } else {
      setSelectedSeats([seatId]); // 1 passenger selects 1 seat
    }
  };

  const totalSeatFee = selectedSeats.reduce((sum, seat) => sum + getSeatCharge(seat), 0);

  const handleConfirm = () => {
    onConfirmSeats(selectedSeats, totalSeatFee);
    onClose();
  };

  const handleSkip = () => {
    onConfirmSeats([], 0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
        {/* Header */}
        <div className="bg-primary-dark text-white px-4 py-3 flex items-center justify-between shadow-md">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider font-koho">
            CHỌN CHỖ NGỒI
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-vjgold p-1 rounded transition-colors"
            aria-label="Đóng"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Legs tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveLeg('outbound')}
            className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 ${
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
              className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 ${
                activeLeg === 'inbound'
                  ? 'border-primary-dark text-primary-dark'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Chuyến về
            </button>
          )}
        </div>

        {/* Passenger Bar */}
        <div className="bg-brand-wine text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
          <div>
            <span className="text-gray-300 mr-1">Người lớn:</span>
            <span className="uppercase">{passengerName}</span>
          </div>
          <div className="text-yellow-300">
            {flight.from} - {flight.to}
          </div>
        </div>

        {/* Scrollable Cabin Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
          {/* Banner */}
          <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-lg p-3 mb-3 border border-red-100 flex items-center gap-3">
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

          {/* Seat Legend */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm mb-4">
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
              <div className="flex items-center gap-2 col-span-2">
                <span className="w-3.5 h-3.5 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-3xs font-bold shrink-0">
                  ✕
                </span>
                <span>Đã có người</span>
              </div>
            </div>
          </div>

          {/* Cabin Doors Notice */}
          <div className="flex justify-between text-2xs text-gray-500 font-bold uppercase mb-2 px-1">
            <span>Cửa lên tàu bay ↗</span>
            <span>Cửa lên tàu bay ↖</span>
          </div>

          {/* Seat Grid */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-inner">
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
                          const isOccupied = OCCUPIED_SEATS.has(seatId);
                          const isSelected = selectedSeats.includes(seatId);

                          let bgColor = 'bg-green-500 text-white hover:opacity-90'; // standard
                          if (row <= 2)
                            bgColor = 'bg-yellow-500 text-white hover:opacity-90'; // business
                          else if (row <= 5)
                            bgColor = 'bg-purple-600 text-white hover:opacity-90'; // front
                          else if (isExitRow) bgColor = 'bg-sky-600 text-white hover:opacity-90'; // extra legroom
                          if (isSelected)
                            bgColor = 'bg-orange-600 text-white ring-2 ring-orange-300';
                          if (isOccupied) bgColor = 'bg-gray-200 text-gray-400 cursor-not-allowed';

                          return (
                            <button
                              key={seatId}
                              disabled={isOccupied}
                              onClick={() => handleToggleSeat(seatId)}
                              className={`w-7 h-7 rounded text-2xs font-black flex items-center justify-center transition-all ${bgColor}`}
                              title={`Ghế ${seatId} - ${getSeatCharge(seatId).toLocaleString('vi-VN')}₫`}
                            >
                              {isOccupied ? '✕' : seatId}
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
                          const isOccupied = OCCUPIED_SEATS.has(seatId);
                          const isSelected = selectedSeats.includes(seatId);

                          let bgColor = 'bg-green-500 text-white hover:opacity-90';
                          if (row <= 2) bgColor = 'bg-yellow-500 text-white hover:opacity-90';
                          else if (row <= 5) bgColor = 'bg-purple-600 text-white hover:opacity-90';
                          else if (isExitRow) bgColor = 'bg-sky-600 text-white hover:opacity-90';
                          if (isSelected)
                            bgColor = 'bg-orange-600 text-white ring-2 ring-orange-300';
                          if (isOccupied) bgColor = 'bg-gray-200 text-gray-400 cursor-not-allowed';

                          return (
                            <button
                              key={seatId}
                              disabled={isOccupied}
                              onClick={() => handleToggleSeat(seatId)}
                              className={`w-7 h-7 rounded text-2xs font-black flex items-center justify-center transition-all ${bgColor}`}
                              title={`Ghế ${seatId} - ${getSeatCharge(seatId).toLocaleString('vi-VN')}₫`}
                            >
                              {isOccupied ? '✕' : seatId}
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
            <span className="text-xs2 text-gray-200 block">Chỗ ngồi:</span>
            <span className="text-base font-black">
              {totalSeatFee > 0 ? `${totalSeatFee.toLocaleString('vi-VN')} VND` : '0 VND'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedSeats.length === 0 ? (
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
