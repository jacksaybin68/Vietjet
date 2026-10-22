'use client';

import React, { useState } from 'react';
import { Icon } from '@/shared/components/ui';

interface Passenger {
  name: string;
  seat: string;
}

interface BookingTicketCardProps {
  flightNo?: string;
  from?: string;
  to?: string;
  fromCity?: string;
  toCity?: string;
  departTime?: string;
  arriveTime?: string;
  date?: string;
  bookingCode?: string | null;
  passengers?: Passenger[];
  fareClass?: string;
  ancillaries?: string[];
  onOpenDetails?: () => void;
}

export default function BookingTicketCard({
  flightNo = 'VJ141',
  from = 'SGN',
  to = 'HAN',
  fromCity = 'TP. Hồ Chí Minh',
  toCity = 'Hà Nội',
  departTime = '08:30',
  arriveTime = '10:40',
  date,
  bookingCode,
  passengers = [{ name: 'NGUYEN VAN A', seat: '12A' }],
  fareClass = 'Eco',
  ancillaries = ['Hành lý xách tay 7kg'],
  onOpenDetails,
}: BookingTicketCardProps) {
  const [copiedPnr, setCopiedPnr] = useState(false);

  const copyPnr = () => {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode);
    setCopiedPnr(true);
    setTimeout(() => setCopiedPnr(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg">
      {/* Header bar: Vietjet brand red */}
      <div className="bg-gradient-to-r from-[var(--vj-red)] to-rose-600 px-5 py-3.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-6 px-2 bg-white rounded-md flex items-center justify-center">
            <span className="font-black italic text-xs tracking-tight text-[var(--vj-red)]">
              vietjet<span className="text-[var(--vj-yellow)]">Air</span>
            </span>
          </div>
          <span className="font-extrabold text-sm tracking-wide">Chuyến bay {flightNo}</span>
          <span className="text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
            {fareClass}
          </span>
        </div>

        {bookingCode && (
          <button
            type="button"
            onClick={copyPnr}
            className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-200 transition-colors cursor-pointer border border-white/20"
            title="Sao chép mã đặt chỗ"
          >
            <span>PNR: {bookingCode}</span>
            <Icon name={copiedPnr ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={13} />
          </button>
        )}
      </div>

      {/* Main ticket content */}
      <div className="p-5">
        {/* Route info */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="text-left">
            <span className="text-2xl sm:text-3xl font-black font-koho text-gray-900 block leading-none">
              {from}
            </span>
            <span className="text-xs font-semibold text-gray-500 mt-1 block">{fromCity}</span>
            <span className="text-sm font-bold text-primary mt-1 block">{departTime}</span>
          </div>

          {/* Plane flight path */}
          <div className="flex-1 px-4 flex flex-col items-center">
            <span className="text-4xs font-bold uppercase tracking-wider text-gray-400 mb-1">
              Bay thẳng
            </span>
            <div className="w-full flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--vj-red)] shrink-0" />
              <div className="h-0.5 flex-1 bg-gradient-to-r from-[var(--vj-red)] via-amber-400 to-[var(--vj-red)] relative">
                <Icon
                  name="PaperAirplaneIcon"
                  size={14}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 text-[var(--vj-red)] bg-white px-0.5"
                />
              </div>
              <div className="w-2 h-2 rounded-full bg-[var(--vj-red)] shrink-0" />
            </div>
            {date && <span className="text-3xs font-medium text-gray-500 mt-1.5">{date}</span>}
          </div>

          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black font-koho text-gray-900 block leading-none">
              {to}
            </span>
            <span className="text-xs font-semibold text-gray-500 mt-1 block">{toCity}</span>
            <span className="text-sm font-bold text-primary mt-1 block">{arriveTime}</span>
          </div>
        </div>

        {/* Passengers section */}
        <div className="pt-3 pb-2">
          <span className="text-3xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
            Hành khách ({passengers.length})
          </span>
          <div className="space-y-1.5">
            {passengers.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs bg-gray-50 rounded-xl px-3 py-2 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <Icon name="UserIcon" size={14} className="text-gray-400" />
                  <span className="font-bold text-gray-800">{p.name}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <span className="text-3xs text-gray-500">Ghế:</span>
                  <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-mono text-2xs font-extrabold border border-red-100">
                    {p.seat || 'Chưa chọn'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ancillaries / Services */}
        {ancillaries.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-1.5">
            {ancillaries.map((service, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-3xs font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200/60"
              >
                <span>✓</span> {service}
              </span>
            ))}
          </div>
        )}

        {/* Button: Xem chi tiết đặt chỗ */}
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            className="w-full mt-3 py-2 text-center text-xs font-bold text-primary hover:text-primary-dark hover:underline flex items-center justify-center gap-1 cursor-pointer"
          >
            <Icon name="InformationCircleIcon" size={14} />
            Xem chi tiết điều kiện vé & đặt chỗ
          </button>
        )}
      </div>
    </div>
  );
}
