'use client';

import React, { useState, useEffect } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { BAGGAGE_PACKAGES, OVERSIZED_BAGGAGE } from '@/features/bookings/pricing';
import {
  RiCloseLine,
  RiSuitcaseLine,
  RiInformationLine,
  RiCheckboxCircleFill,
} from 'react-icons/ri';

interface BaggageSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  returnFlight?: Flight | null;
  passengerName?: string;
  initialPackageId?: string | null;
  initialReturnPackageId?: string | null;
  onConfirmBaggage: (
    packageId: string | null,
    baggageFee: number,
    label: string,
    returnPackageId?: string | null,
    returnLabel?: string,
    returnFee?: number
  ) => void;
  isRoundTrip?: boolean;
}

export default function BaggageSelectionDrawer({
  isOpen,
  onClose,
  flight,
  returnFlight,
  passengerName = 'LONG CHIN',
  initialPackageId = null,
  initialReturnPackageId = null,
  onConfirmBaggage,
  isRoundTrip = false,
}: BaggageSelectionDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');
  const [outboundPkgId, setOutboundPkgId] = useState<string | null>(initialPackageId);
  const [returnPkgId, setReturnPkgId] = useState<string | null>(initialReturnPackageId);
  const [outboundPriority, setOutboundPriority] = useState(false);
  const [returnPriority, setReturnPriority] = useState(false);

  useEffect(() => {
    setOutboundPkgId(initialPackageId);
    setReturnPkgId(initialReturnPackageId);
  }, [initialPackageId, initialReturnPackageId, isOpen]);

  if (!isOpen) return null;

  const currentPkgId = activeLeg === 'outbound' ? outboundPkgId : returnPkgId;
  const setCurrentPkgId = (pkgId: string | null) => {
    if (activeLeg === 'outbound') {
      setOutboundPkgId(pkgId);
    } else {
      setReturnPkgId(pkgId);
    }
  };

  const currentPriority = activeLeg === 'outbound' ? outboundPriority : returnPriority;
  const setCurrentPriority = (val: boolean) => {
    if (activeLeg === 'outbound') {
      setOutboundPriority(val);
    } else {
      setReturnPriority(val);
    }
  };

  const allPackages = [...BAGGAGE_PACKAGES, ...OVERSIZED_BAGGAGE];
  const outboundPackage = allPackages.find((p) => p.id === outboundPkgId) ?? null;
  const returnPackage = allPackages.find((p) => p.id === returnPkgId) ?? null;

  const outboundFee =
    (outboundPackage ? outboundPackage.price : 0) + (outboundPriority ? 230000 : 0);
  const returnFee = isRoundTrip
    ? (returnPackage ? returnPackage.price : 0) + (returnPriority ? 230000 : 0)
    : 0;
  const totalFee = outboundFee + returnFee;

  const handleSelectPkg = (pkgId: string) => {
    setCurrentPkgId(currentPkgId === pkgId ? null : pkgId);
  };

  const handleConfirm = () => {
    const outboundLabel = outboundPackage
      ? outboundPackage.label
      : outboundPriority
        ? 'Xách tay 9kg'
        : 'Không mua thêm';
    const returnLabel = returnPackage
      ? returnPackage.label
      : returnPriority
        ? 'Xách tay 9kg'
        : 'Không mua thêm';

    onConfirmBaggage(outboundPkgId, totalFee, outboundLabel, returnPkgId, returnLabel, returnFee);
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
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">
            CHỌN HÀNH LÝ/DỊCH VỤ NỐI CHUYẾN
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
            Chuyến đi {outboundPkgId ? '✓' : ''}
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
              Chuyến về {returnPkgId ? '✓' : ''}
            </button>
          )}
        </div>

        {/* Passenger Bar */}
        <div className="bg-brand-wine text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
          <div>
            <span className="text-gray-300 mr-1">Người lớn:</span>
            <span className="uppercase">{passengerName}</span>
          </div>
          <div className="text-yellow-300 text-xs2">
            {activeLeg === 'outbound'
              ? `${flight.from} - ${flight.to}`
              : `${returnFlight?.from || flight.to} - ${returnFlight?.to || flight.from}`}{' '}
            | Bạn đã có 7kg xách tay
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 space-y-4">
          {/* Promo banner */}
          <div className="bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <RiSuitcaseLine size={28} className="text-yellow-300" />
            </div>
            <div>
              <h3 className="text-sm font-black">
                {activeLeg === 'outbound' ? 'Hành lý chuyến đi' : 'Hành lý chuyến về'}
              </h3>
              <p className="text-xs2 text-red-100">
                Tiết kiệm đến 40% so với mua trực tiếp tại sân bay
              </p>
            </div>
          </div>

          {/* Included note */}
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <RiInformationLine size={18} className="text-emerald-600 shrink-0" />
            <span>
              Hạng vé của bạn đã bao gồm <strong>7kg hành lý xách tay</strong>
            </span>
          </div>

          {/* Section: Standard Baggage Packages */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">
              Chọn thêm hành lý ({activeLeg === 'outbound' ? 'Chiều đi' : 'Chiều về'})
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              {BAGGAGE_PACKAGES.map((pkg) => {
                const isSelected = currentPkgId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPkg(pkg.id)}
                    className={`relative cursor-pointer rounded-xl border p-2.5 flex flex-col items-center justify-center text-center transition-all bg-white ${
                      isSelected
                        ? 'border-primary-dark ring-2 ring-primary-dark/20 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    {isSelected && (
                      <RiCheckboxCircleFill
                        size={16}
                        className="absolute top-1.5 right-1.5 text-green-500"
                      />
                    )}
                    <RiSuitcaseLine
                      size={24}
                      className={isSelected ? 'text-primary-dark' : 'text-gray-400'}
                    />
                    <span className="text-xs font-black text-gray-900 mt-1">{pkg.label}</span>
                    <span className="text-xs2 font-bold text-primary-dark mt-0.5">
                      {pkg.price.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Oversized Baggage (HLQK) */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">
              Chọn gói hành lý quá khổ (HLQK)
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {OVERSIZED_BAGGAGE.map((pkg) => {
                const isSelected = currentPkgId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPkg(pkg.id)}
                    className={`relative cursor-pointer rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-all bg-white ${
                      isSelected
                        ? 'border-primary-dark ring-2 ring-primary-dark/20 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    {isSelected && (
                      <RiCheckboxCircleFill
                        size={16}
                        className="absolute top-1.5 right-1.5 text-green-500"
                      />
                    )}
                    <span className="text-xs font-black text-gray-900">{pkg.label}</span>
                    <span className="text-xs font-bold text-primary-dark mt-1">
                      {pkg.price.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radio: Không mua thêm */}
          <div
            onClick={() => setCurrentPkgId(null)}
            className={`cursor-pointer rounded-xl border p-3 flex items-center gap-2.5 transition-all bg-white ${
              currentPkgId === null
                ? 'border-green-500 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              checked={currentPkgId === null}
              onChange={() => setCurrentPkgId(null)}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-gray-800">
              Không, cảm ơn (chỉ dùng 7kg xách tay)
            </span>
          </div>

          {/* Priority Hand Luggage (+2kg) */}
          <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Hành lý xách tay ưu tiên ({activeLeg === 'outbound' ? 'Chiều đi' : 'Chiều về'})
            </h4>
            <p className="text-xs2 text-gray-500">
              Bổ sung 2kg nâng tổng xách tay lên 9kg, kích thước 56x36x23cm
            </p>
            <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100">
              <span className="text-xs font-bold text-gray-800">
                Hành lý xách tay ưu tiên (tối đa 9 kg)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary-dark">230.000 VND</span>
                <input
                  type="checkbox"
                  checked={currentPriority}
                  onChange={(e) => setCurrentPriority(e.target.checked)}
                  className="rounded text-primary-dark focus:ring-primary-dark"
                />
              </div>
            </label>
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="bg-primary-dark text-white p-3 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs2 text-gray-200 block">
              {isRoundTrip ? (
                <>
                  Đi: {outboundPackage ? outboundPackage.label : '7kg'} | Về:{' '}
                  {returnPackage ? returnPackage.label : '7kg'}
                </>
              ) : outboundPackage ? (
                outboundPackage.label
              ) : (
                'Hành lý:'
              )}
            </span>
            <span className="text-base font-black">
              {totalFee > 0 ? `${totalFee.toLocaleString('vi-VN')} VND` : '0 VND'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="bg-vjgold hover:bg-yellow-400 text-black text-xs font-bold px-6 py-2 rounded shadow transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
