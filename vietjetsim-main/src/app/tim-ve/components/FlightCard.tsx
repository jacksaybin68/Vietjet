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
  const isSelected = Boolean(selectedClass);

  return (
    <div className="rounded-xl border border-black/10 bg-white overflow-hidden shadow-xs transition-all mb-3">
      <article className="flex flex-row items-stretch">
        {/* Cột 1: Giờ bay & Số hiệu — Khung vàng chuẩn Screenshot 3 */}
        <div className="w-[100px] sm:w-[130px] shrink-0 bg-[#FFD100] p-2 flex flex-col justify-between items-center text-center">
          <span className="text-3xs font-bold text-gray-700">{flight.no}</span>
          <div className="py-1">
            <div className="text-xs sm:text-sm font-black text-gray-950 leading-tight">
              {flight.depart} <span className="text-3xs font-normal">Đến</span> {flight.arrive}
            </div>
            <div className="text-4xs sm:text-3xs text-gray-800 font-medium mt-0.5">
              {flight.aircraft} - Bay thẳng
            </div>
          </div>
          <span className="text-3xs text-gray-600 leading-none">˅</span>
        </div>

        {/* Cột 2: 4 cột hạng ghế */}
        <div className="flex-1 grid grid-cols-4 gap-1 p-1.5 sm:p-2 min-w-0 bg-white">
          {FARE_COLUMNS.map((col) => {
            const active = selectedClass?.toUpperCase() === col.id;
            const priceVal = flight.prices[col.priceKey];
            const isZero = !priceVal || priceVal <= 0;

            return (
              <button
                key={col.id}
                type="button"
                disabled={isZero}
                onClick={() => onSelect(flight.no, col.id, priceVal)}
                className={`flex flex-col items-center justify-between rounded-md border transition-all overflow-hidden ${
                  active
                    ? 'border-success ring-2 ring-success/30 bg-green-50/50'
                    : isZero
                      ? 'border-gray-100 bg-gray-50/70 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div
                  className={`w-full py-1 text-center text-4xs sm:text-3xs font-black uppercase tracking-wider ${col.bgHeader} ${col.textHeader}`}
                >
                  {col.label}
                </div>
                <div className="py-1.5 sm:py-2 flex flex-col items-center">
                  {isZero ? (
                    <div className="flex flex-col items-center justify-center py-1">
                      <span className="text-xs text-gray-400">✈⃠</span>
                      <span className="text-3xs text-gray-400 font-bold">Hết chỗ</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs sm:text-sm font-black text-gray-900 leading-tight font-koho group-hover:text-primary transition-colors">
                        {priceVal.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-4xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                        VND
                      </span>
                      <svg
                        className="w-2.5 h-2.5 text-gray-400 mt-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  )}
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
