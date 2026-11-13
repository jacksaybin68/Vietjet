'use client';

import React from 'react';
import { useFlightStatusSSE } from '@/hooks/useFlightStatusSSE';

export interface FlightPrice {
  business: number;
  skyboss: number;
  deluxe: number;
  eco: number;
}

export interface FlightCardProps {
  flight: {
    id?: string;
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

// One palette only (see the design brief in AGENTS.md): the fare header of
// every cabin shares the same neutral surface `#F8F8F8`; the selected cabin
// is the only one that gets the brand-red mark. The four coloured chips that
// Vietjet's site uses (green / orange / brown) were measured live but are
// deliberately NOT reproduced — they read as noise next to the red CTAs.
const FARE_COLUMNS: readonly {
  id: string;
  label: string;
  priceKey: keyof FlightPrice;
}[] = [
  { id: 'BUSINESS', label: 'BUSINESS', priceKey: 'business' },
  { id: 'SKYBOSS', label: 'SkyBOSS', priceKey: 'skyboss' },
  { id: 'DELUXE', label: 'Deluxe', priceKey: 'deluxe' },
  { id: 'ECO', label: 'Eco', priceKey: 'eco' },
] as const;

export default function FlightCard({
  flight,
  selectedClass,
  onSelect,
  onOpenBenefits,
}: FlightCardProps) {
  const isSelected = Boolean(selectedClass);
  const { data: liveStatus } = useFlightStatusSSE(flight.id ?? null);

  return (
    <div className="rounded-vj border border-black/10 bg-white overflow-hidden shadow-xs transition-all mb-3">
      <article className="flex flex-row items-stretch">
        {/* Cột 1: Giờ bay & Số hiệu — Khung vàng chuẩn Screenshot 3 */}
        <div className="w-[100px] sm:w-[130px] shrink-0 bg-vj-gold-deep p-2 flex flex-col justify-between items-center text-center">
          <span className="text-3xs font-bold text-gray-700">{flight.no}</span>
          <div className="py-1">
            <div className="text-sm font-medium text-gray-950 leading-tight font-koho">
              {flight.depart} <span className="text-3xs font-normal">Đến</span> {flight.arrive}
            </div>
            <div className="text-4xs sm:text-3xs text-gray-800 font-medium mt-0.5 flex items-center justify-center gap-1">
              <svg
                className="w-2.5 h-2.5 text-gray-800 shrink-0 rotate-45 inline-block"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              <span>{flight.aircraft || 'Airbus A321'} - Bay thẳng</span>
            </div>
          </div>
          {/* Realtime status badges */}
          {liveStatus?.status === 'delayed' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              ⏱ Trễ chuyến
            </span>
          )}
          {liveStatus?.status === 'cancelled' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              ✕ Đã hủy
            </span>
          )}
          <span className="text-3xs text-gray-600 leading-none">˅</span>
        </div>

        {/* Cột 2: 4 cột hạng ghế — ô 141×96, nền #F8F8F8 (đo 13/11/2026) */}
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
                className={`flex flex-col items-center justify-between h-24 min-w-[141px] rounded-md border transition-all overflow-hidden focus:outline-none focus:ring-0 ${
                  active
                    ? 'border-primary bg-[rgb(var(--vj-red-rgb))]/10'
                    : isZero
                      ? 'border-gray-100 bg-gray-50/70 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Header ô hạng: nền #F8F8F8, chữ 12px/700 uppercase #333333 */}
                <div className="w-full py-1 text-center text-xs font-bold uppercase text-vj-text bg-vj-surface-fare">
                  {col.label}
                </div>
                <div className="py-1.5 sm:py-2 flex flex-col items-center">
                  {isZero ? (
                    <div className="flex flex-col items-center justify-center py-1 gap-0.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                          fill="currentColor"
                        />
                        <line
                          x1="4"
                          y1="4"
                          x2="20"
                          y2="20"
                          stroke="#EF4444"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* "Hết chỗ" 14px/600 màu #939598 (đo 13/11/2026) */}
                      <span className="text-sm font-semibold text-vj-sold-out">Hết chỗ</span>
                    </div>
                  ) : (
                    <>
                      {/* Giá 26px/400 JambonoMedium #333333; mã tiền tệ 16px/500 #6D6E71 */}
                      <span className="text-xl5 font-jambono font-normal text-vj-text leading-tight whitespace-nowrap">
                        {priceVal.toLocaleString('vi-VN')}
                        <span className="text-base font-medium text-vj-currency-gray ml-1">VND</span>
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

      {/* Expanded Fare Benefit details when selected — nền đỏ nhạt để đồng bộ
          quy ước "một bảng màu" (không dùng xanh lá cho trạng thái chọn). */}
      {isSelected && (
        <div className="border-t border-[rgb(var(--vj-red-rgb))]/20 bg-[rgb(var(--vj-red-rgb))]/5 p-4 text-xs space-y-2 text-gray-800 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--vj-red-rgb))]/20 pb-2">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <span className="inline-flex items-center gap-1">
                <span>{flight.from || 'SGN'}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-gray-400 inline shrink-0"
                  aria-hidden="true"
                >
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                <span>{flight.to || 'HAN'}</span>
              </span>
              <span>•</span>
              <span className="text-gray-600">{flight.duration || '2 giờ 10 phút'}</span>
              <span>•</span>
              <span className="text-success">Bay thẳng</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>Đã chọn</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-primary shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Bao gồm:</span>
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
