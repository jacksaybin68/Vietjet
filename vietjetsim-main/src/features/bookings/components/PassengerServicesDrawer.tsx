'use client';

import React, { useState } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { RiCloseLine, RiLuggageCartLine, RiAddLine, RiCheckLine, RiArrowDownSLine } from 'react-icons/ri';

interface PassengerServicesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  passengerName?: string;
  isRoundTrip?: boolean;
}

export default function PassengerServicesDrawer({
  isOpen,
  onClose,
  flight,
  passengerName = 'LONG NGUYEN',
  isRoundTrip = false,
}: PassengerServicesDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');
  const [isSelected, setIsSelected] = useState(false);

  if (!isOpen) return null;

  const serviceFee = isSelected ? 1000000 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
        {/* Header - Red bar with Vietjet curve top-right (Screenshot 1) */}
        <div className="relative bg-[#C4161C] text-white px-4 py-3 flex items-center justify-between shadow-md overflow-hidden">
          <div className="w-8 shrink-0" />
          <h2 className="font-sans font-black italic tracking-wide text-base sm:text-lg uppercase text-white text-center">
            DỊCH VỤ THEO HÀNH KHÁCH
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
            <svg className="absolute -top-4 -right-4 h-20 w-28 opacity-95" viewBox="0 0 100 60" fill="none">
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

        {/* Passenger Card matching Screenshot 1 */}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {/* Banner SkyKIDS matching Screenshot 1 */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-red-100 via-pink-50 to-amber-100 border border-red-200 p-4 shadow-sm relative min-h-[110px] flex items-center">
            <div className="relative z-10 max-w-[70%]">
              <span className="text-3xs uppercase font-black px-1.5 py-0.5 rounded bg-red-600 text-white tracking-wider">
                SkyKIDS
              </span>
              <h3 className="text-sm sm:text-base font-black italic text-red-700 leading-tight mt-1.5">
                CON TỰ TIN BAY MỘT MÌNH
              </h3>
              <p className="text-3xs text-gray-600 mt-1">Dịch vụ chăm sóc & đồng hành cùng trẻ em chu đáo</p>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-5xl opacity-90 select-none">
              ✈️👦
            </div>
          </div>

          {/* Section: Chi tiết dịch vụ */}
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">Chi tiết dịch vụ</h4>
              <RiArrowDownSLine size={18} className="text-gray-500" />
            </div>

            {/* Service Item Card */}
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
                  👧
                </div>
                <div>
                  <h5 className="text-xs font-extrabold text-gray-900 leading-snug">
                    Trẻ em bay một mình (12- dưới 14 tuổi)
                  </h5>
                  <div className="text-xs sm:text-sm font-black text-red-600 italic mt-1 font-koho">
                    1.000.000 VND
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

            {/* Option "Không, cảm ơn" */}
            <div className="mt-3 flex items-center gap-2 px-1">
              <label
                onClick={() => setIsSelected(false)}
                className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 select-none"
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    !isSelected
                      ? 'border-green-600 bg-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {!isSelected && <div className="w-2 h-2 rounded-full bg-green-600" />}
                </div>
                <span>Không, cảm ơn</span>
              </label>
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-red-600 to-amber-500 text-white p-3 text-center shadow-xs">
            <span className="text-3xs sm:text-2xs font-black uppercase tracking-wider">
              DỊCH VỤ MỚI - BAY THẢNH THƠI CÙNG VIETJET
            </span>
          </div>
        </div>

        {/* Footer Red Bar matching Screenshot 1 */}
        <div className="bg-[#C4161C] text-white p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFCC00] flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-xl">🧳</span>
            </div>
            <div className="text-xs leading-tight">
              <span className="opacity-95 font-medium block text-white text-3xs sm:text-xs">
                Dịch vụ
              </span>
              <span className="font-black text-xs sm:text-sm text-white font-koho">
                {serviceFee.toLocaleString('vi-VN')} VND
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
