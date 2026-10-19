'use client';

import React from 'react';

export interface FlightPrice {
  business: number;
  skyboss: number;
  deluxe: number;
  eco: number;
}

export interface FlightCardProps {
  flight: {
    no: string;
    depart: string;
    arrive: string;
    aircraft: string;
    duration?: string;
    from?: string;
    to?: string;
    prices: FlightPrice;
  };
  selectedClass?: string;
  onSelect: (flightNo: string, fareClass: string, fare: number) => void;
  onOpenBenefits?: () => void;
}

const FARE_COLUMNS: readonly {
  id: string;
  label: string;
  bgHeader: string;
  textHeader: string;
  priceKey: keyof FlightPrice;
}[] = [
  {
    id: 'BUSINESS',
    label: 'BUSINESS',
    bgHeader: 'bg-vj-gold-bronze',
    textHeader: 'text-white',
    priceKey: 'business',
  },
  {
    id: 'SKYBOSS',
    label: 'SkyBOSS',
    bgHeader: 'bg-primary-dark',
    textHeader: 'text-white',
    priceKey: 'skyboss',
  },
  {
    id: 'DELUXE',
    label: 'Deluxe',
    bgHeader: 'bg-orange-500',
    textHeader: 'text-white',
    priceKey: 'deluxe',
  },
  { id: 'ECO', label: 'Eco', bgHeader: 'bg-success', textHeader: 'text-white', priceKey: 'eco' },
] as const;

export default function FlightCard({
  flight,
  selectedClass,
  onSelect,
  onOpenBenefits,
}: FlightCardProps) {
  const [depTime, depMin] = flight.depart.split(':');
  const [arrTime, arrMin] = flight.arrive.split(':');
  const isSelected = Boolean(selectedClass);

  return (
    <div className="rounded-xl border border-black/10 bg-white overflow-hidden shadow-sm transition-all mb-3">
      <article className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3 hover:bg-gray-50/50">
        {/* Cột 1: Giờ bay & Số hiệu */}
        <div className="shrink-0 flex items-center sm:flex-col gap-3 sm:gap-1 text-center min-w-[120px]">
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
              {depTime}:{depMin}
            </span>
            <span className="text-xs font-bold text-gray-400">→</span>
            <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
              {arrTime}:{arrMin}
            </span>
          </div>
          <div className="flex items-center gap-2 text-2xs text-gray-500 font-semibold">
            <span>{flight.no}</span>
            <span>•</span>
            <span>{flight.aircraft}</span>
            <span>•</span>
            <span className="text-primary-dark font-bold uppercase">Bay thẳng</span>
          </div>
        </div>

        {/* Cột 2: 4 cột hạng ghế */}
        <div className="w-full sm:flex-1 grid grid-cols-4 gap-1.5 min-w-0">
          {FARE_COLUMNS.map((col) => {
            const active = selectedClass?.toUpperCase() === col.id;
            const priceVal = flight.prices[col.priceKey];
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => onSelect(flight.no, col.id, priceVal)}
                className={`flex flex-col items-center justify-between rounded-lg border transition-all overflow-hidden ${
                  active
                    ? 'border-success ring-2 ring-success/30 bg-green-50/40'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div
                  className={`w-full py-1 text-center text-2xs font-black uppercase tracking-wider ${col.bgHeader} ${col.textHeader}`}
                >
                  {col.label}
                </div>
                <div className="py-2 flex flex-col items-center">
                  <span className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                    {(priceVal / 1000).toLocaleString('vi-VN')}
                  </span>
                  <span className="text-3xs text-gray-500 font-medium">000 VND</span>
                </div>
              </button>
            );
          })}
        </div>
      </article>

      {/* Expanded Fare Benefit details when selected (matching Screenshot 9) */}
      {isSelected && (
        <div className="border-t border-green-200 bg-green-50/60 p-4 text-xs space-y-2 text-gray-800 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green-200/80 pb-2">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <span>
                {flight.from || 'SGN'} ✈ {flight.to || 'HAN'}
              </span>
              <span>•</span>
              <span className="text-gray-600">{flight.duration || '2 giờ 10 phút'}</span>
              <span>•</span>
              <span className="text-success">Bay thẳng</span>
            </div>
            <div className="flex items-center gap-1.5 text-success font-bold">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>Đã chọn</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <span className="text-success">✔</span> Bao gồm:
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-0.5 pl-1">
                <li>Hành lý xách tay: 07kg</li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <span className="text-amber-600">ⓘ</span> Chưa bao gồm (Có thể mua thêm với phí):
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-0.5 pl-1">
                <li>Hành lý ký gửi (tùy chọn)</li>
                <li>Suất ăn nóng & thức uống</li>
                <li>Bộ tiện ích 3 trong 1</li>
                <li>Chọn trước chỗ ngồi</li>
                <li>Thay đổi chuyến bay, ngày bay, hành trình</li>
              </ul>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onOpenBenefits}
              className="text-primary-dark font-bold hover:underline flex items-center gap-1 text-xs"
            >
              <span>Xem quy định giá vé & quyền lợi</span> →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
