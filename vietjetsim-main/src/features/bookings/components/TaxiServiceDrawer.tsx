'use client';

import React, { useState } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { RiCloseLine, RiTaxiLine, RiAddLine, RiCheckLine } from 'react-icons/ri';

interface TaxiServiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  isRoundTrip?: boolean;
  onConfirmTaxi?: (fee: number) => void;
}

export default function TaxiServiceDrawer({
  isOpen,
  onClose,
  flight,
  isRoundTrip = false,
  onConfirmTaxi,
}: TaxiServiceDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');
  const [selectedTaxi, setSelectedTaxi] = useState<boolean>(false);

  if (!isOpen) return null;

  const taxiPrice = 450000;
  const currentFee = selectedTaxi ? taxiPrice : 0;

  const handleConfirm = () => {
    onConfirmTaxi?.(currentFee);
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
        {/* Header - Red bar matching Screenshot 3 */}
        <div className="bg-primary-dark text-white px-4 py-3 flex items-center justify-between shadow-md">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">DỊCH VỤ TAXI</h2>
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
          {/* Promo banner matching Screenshot 3 */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-amber-500 via-orange-400 to-red-500 text-white p-4 shadow-sm relative">
            <div className="relative z-10 max-w-[70%]">
              <span className="text-2xs font-bold bg-white text-primary-dark px-1.5 py-0.5 rounded uppercase">
                vietjetAir.com
              </span>
              <h3 className="text-base font-black text-white mt-1 leading-snug">
                Bay cùng Vietjet - Đi đường có Taxi sân bay
              </h3>
              <p className="text-xs2 font-bold text-amber-100 mt-1">Đặt trước tiết kiệm đến 20%</p>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-4xl">🚕</div>
          </div>

          <div className="space-y-1.5 text-xs2 text-gray-600">
            <p className="font-semibold text-gray-800">
              Chặng bay:{' '}
              {activeLeg === 'outbound'
                ? `${flight.from} ✈ ${flight.to}`
                : `${flight.to} ✈ ${flight.from}`}
            </p>
            <p>
              Hướng dẫn sử dụng Dịch Vụ Taxi Đón Sân bay{' '}
              <a
                href="#"
                className="text-vjblue font-bold underline"
                onClick={(e) => e.preventDefault()}
              >
                tại đây
              </a>
            </p>
            <p>E-Voucher sẽ được Green SM gửi đến quý khách qua email đăng ký khi mua vé.</p>
          </div>

          {/* Green SM Taxi Card matching Screenshot 3 */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-green-300 shadow-sm transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-900 text-white flex items-center justify-center text-2xl shrink-0">
                🚗
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-xs text-gray-900">Green SM Premium</h4>
                  <span className="text-2xs text-gray-500 font-semibold">👤 4 seats</span>
                </div>
                <p className="text-xs2 text-gray-500">Dịch Vụ Taxi Đón Sân bay</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Gói 30 Km
                  </span>
                  <span className="text-xs font-black text-primary-dark">
                    {taxiPrice.toLocaleString('vi-VN')} VND
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTaxi(!selectedTaxi)}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all shrink-0 ${
                selectedTaxi
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'border-2 border-green-500 text-green-600 hover:bg-green-50'
              }`}
              aria-label="Chọn dịch vụ taxi"
            >
              {selectedTaxi ? <RiCheckLine size={18} /> : <RiAddLine size={18} />}
            </button>
          </div>
        </div>

        {/* Footer Red Bar matching Screenshot 3 */}
        <div className="bg-primary-dark text-white p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <RiTaxiLine size={20} className="text-white" />
            </div>
            <div className="text-xs2 leading-tight">
              <span className="opacity-90 block">Dịch vụ Taxi</span>
              <span className="font-black text-sm text-vjyellow">
                {currentFee.toLocaleString('vi-VN')} VND
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-vjyellow hover:bg-accent-light text-gray-900 font-black px-6 py-2 rounded-lg text-sm shadow transition-all active:scale-95"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
