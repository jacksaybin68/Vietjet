'use client';

import React, { useState } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { RiCloseLine, RiHeartFill, RiAddLine, RiCheckLine } from 'react-icons/ri';

interface PetServiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  passengerName?: string;
  isRoundTrip?: boolean;
}

export default function PetServiceDrawer({
  isOpen,
  onClose,
  flight,
  passengerName = 'LONG NGUYEN',
  isRoundTrip = false,
}: PetServiceDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');
  const [isSelected, setIsSelected] = useState(false);

  if (!isOpen) return null;

  const petFee = isSelected ? 4000000 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
        {/* Header - Red bar with Vietjet curve top-right (Screenshot 2) */}
        <div className="relative bg-[#C4161C] text-white px-4 py-3 flex items-center justify-between shadow-md overflow-hidden">
          <div className="w-8 shrink-0" />
          <h2 className="font-sans font-black italic tracking-wide text-base sm:text-lg uppercase text-white text-center">
            MANG THEO THÚ CƯNG
          </h2>
          <div className="relative z-10">
            <button
              onClick={onClose}
              className="text-gray-900 bg-white/90 hover:bg-white p-1 rounded-full transition-colors flex items-center justify-center h-7 w-7 cursor-pointer"
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
                ? 'border-[#C4161C] text-[#C4161C]'
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
                  ? 'border-[#C4161C] text-[#C4161C]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Chuyến về
            </button>
          )}
        </div>

        {/* Passenger card matching Screenshot 2 */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="max-w-xs mx-auto overflow-hidden rounded-xl border border-red-200 shadow-sm bg-white text-center">
            <div className="bg-[#C4161C] py-2 px-4 text-white">
              <div className="text-3xs uppercase tracking-wider text-white/80">Người lớn</div>
              <div className="text-sm font-black uppercase tracking-tight">{passengerName}</div>
            </div>
            <div className="py-2.5 px-4 text-sm font-bold text-gray-900 font-koho">
              {activeLeg === 'outbound'
                ? `${flight.from} - ${flight.to}`
                : `${flight.to} - ${flight.from}`}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-gray-700 leading-relaxed bg-slate-50">
          {/* Banner "THÚ CƯNG ƠI, BAY THÔI!" matching Screenshot 2 */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-amber-100 via-orange-100 to-sky-100 border border-amber-300 p-4 text-center shadow-sm relative">
            <div className="relative z-10">
              <h3 className="text-base font-black text-red-600 tracking-wide mb-2 uppercase flex items-center justify-center gap-1.5 font-sans drop-shadow-2xs">
                <span>THÚ CƯNG ƠI, BAY THÔI!</span>
                <RiHeartFill className="text-red-500 text-sm" />
              </h3>

              {/* 3 airplane window frames with pets */}
              <div className="flex justify-center items-center gap-3 py-2">
                <div className="w-16 h-20 rounded-full border-4 border-amber-200/90 bg-white/80 shadow-md flex flex-col items-center justify-center text-3xl overflow-hidden relative">
                  <span>🐕</span>
                  <span className="text-4xs text-gray-600 font-bold">Poodle</span>
                </div>
                <div className="w-16 h-20 rounded-full border-4 border-amber-200/90 bg-white/80 shadow-md flex flex-col items-center justify-center text-3xl overflow-hidden relative">
                  <span>🐱</span>
                  <span className="text-4xs text-gray-600 font-bold">Mèo cưng</span>
                </div>
                <div className="w-16 h-20 rounded-full border-4 border-amber-200/90 bg-white/80 shadow-md flex flex-col items-center justify-center text-3xl overflow-hidden relative">
                  <span>🐶</span>
                  <span className="text-4xs text-gray-600 font-bold">Cún yêu</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-700 text-xs leading-relaxed bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
            Vietjet cung cấp dịch vụ vận chuyển thú cưng (động vật cảnh) dành cho hành khách có nhu
            cầu đi du lịch cùng thú cưng (chó, mèo), cho phép bạn mang thú cưng lên khoang hành
            khách; mang đến sự an toàn; thoải mái cho bạn và thú cưng suốt trọn hành trình.{' '}
            <a
              href="#"
              className="text-blue-600 font-bold underline"
              onClick={(e) => e.preventDefault()}
            >
              Chi tiết xem tại đây
            </a>
          </p>

          {/* Section: Chọn gói dịch vụ matching Screenshot 2 */}
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 mb-2.5">
              Chọn gói dịch vụ
            </h4>

            {/* Service Package Card */}
            <div
              onClick={() => setIsSelected((prev) => !prev)}
              className={`p-3.5 rounded-xl border bg-white shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
                isSelected
                  ? 'border-green-600 ring-1 ring-green-600'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FFCC00] flex items-center justify-center shrink-0 shadow-xs text-2xl">
                  🐕
                </div>
                <div>
                  <h5 className="text-xs font-extrabold text-gray-900 leading-snug">
                    Mang theo thú cưng
                  </h5>
                  <div className="text-xs sm:text-sm font-black text-red-600 italic mt-1 font-koho">
                    4.000.000 VND
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isSelected ? (
                  <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center font-black shadow-xs">
                    <RiCheckLine size={18} />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-7 h-7 rounded-full border border-green-600 text-green-600 flex items-center justify-center font-black text-base hover:bg-green-600 hover:text-white transition-all shadow-2xs"
                  >
                    <RiAddLine size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Red Bar matching Screenshot 2 */}
        <div className="bg-[#C4161C] text-white p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFCC00] flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-xl">🐾</span>
            </div>
            <div className="text-xs leading-tight">
              <span className="opacity-95 font-medium block text-white text-3xs sm:text-xs">
                Dịch vụ
              </span>
              <span className="font-black text-xs sm:text-sm text-white font-koho">
                {petFee.toLocaleString('vi-VN')} VND
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#FFCC00] hover:bg-[#FFD200] text-gray-950 font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow transition-all active:scale-95 cursor-pointer italic"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
