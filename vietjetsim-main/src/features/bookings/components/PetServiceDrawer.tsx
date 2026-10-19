'use client';

import React, { useState } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { RiCloseLine, RiHeartFill } from 'react-icons/ri';
import { MdPets } from 'react-icons/md';

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
  passengerName = 'LONG CHIN',
  isRoundTrip = false,
}: PetServiceDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
        {/* Header - Red bar matching Screenshot 7 */}
        <div className="bg-primary-dark text-white px-4 py-3 flex items-center justify-between shadow-md">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">
            MANG THEO THÚ CƯNG
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-amber-300 p-1 rounded transition-colors"
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-gray-700 leading-relaxed">
          {/* Passenger card */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-primary-dark text-white px-3 py-1.5 text-center">
              <span className="text-2xs uppercase font-bold opacity-80 block">Người lớn</span>
              <span className="text-xs font-black tracking-wider uppercase">{passengerName}</span>
            </div>
            <div className="bg-gray-50 px-3 py-1.5 text-center text-xs font-black text-gray-800">
              {activeLeg === 'outbound'
                ? `${flight.from} - ${flight.to}`
                : `${flight.to} - ${flight.from}`}
            </div>
          </div>

          {/* Banner "THÚ CƯNG ƠI, BAY THÔI!" */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-amber-200 via-orange-100 to-amber-200 border border-amber-300 p-4 text-center shadow-sm">
            <h3 className="text-base font-black text-primary-dark tracking-wide mb-2 uppercase flex items-center justify-center gap-1.5">
              <span>THÚ CƯNG ƠI, BAY THÔI!</span>
              <RiHeartFill className="text-red-500 text-sm" />
            </h3>
            <div className="flex justify-center items-center gap-4 py-2">
              <div className="w-16 h-16 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center text-3xl shadow-sm">
                🐶
              </div>
              <div className="w-16 h-16 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center text-3xl shadow-sm">
                🐱
              </div>
              <div className="w-16 h-16 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center text-3xl shadow-sm">
                🐩
              </div>
            </div>
          </div>

          <p className="text-gray-700 leading-normal">
            Vietjet cung cấp dịch vụ vận chuyển thú cưng (động vật cảnh) dành cho hành khách có nhu
            cầu đi du lịch cùng thú cưng (chó, mèo), cho phép bạn mang thú cưng lên khoang hành
            khách; mang đến sự an toàn, thoải mái cho bạn và thú cưng suốt trọn hành trình.{' '}
            <a
              href="#"
              className="text-vjblue font-bold underline"
              onClick={(e) => e.preventDefault()}
            >
              Chi tiết xem tại đây
            </a>
          </p>

          {/* Notice: Flight does not support this service */}
          <div className="py-8 text-center">
            <p className="text-xs font-bold text-primary-dark">
              Chuyến bay không hỗ trợ dịch vụ này.
            </p>
          </div>
        </div>

        {/* Footer Red Bar matching Screenshot 7 */}
        <div className="bg-primary-dark text-white p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <MdPets size={20} className="text-white" />
            </div>
            <div className="text-xs2 leading-tight">
              <span className="opacity-90 block">Dịch vụ</span>
              <span className="font-black text-sm text-vjyellow">0 VND</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-vjyellow hover:bg-accent-light text-gray-900 font-black px-6 py-2 rounded-lg text-sm shadow transition-all active:scale-95"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
