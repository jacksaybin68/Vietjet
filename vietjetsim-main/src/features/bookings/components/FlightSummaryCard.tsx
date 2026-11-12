'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@/shared/components/ui';
import { getAirportCity } from '@/features/flights';
import { resolveAircraft } from '@/features/flights/services';

export interface FlightSummaryItem {
  flight_no?: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price?: number;
  class?: string;
}

export interface FlightSummaryCardProps {
  flight: FlightSummaryItem | null;
  returnFlight?: FlightSummaryItem | null;
  paxCount?: number;
  totalPrice?: number;
  bookingCode?: string;
  title?: string;
  className?: string;
}

const AIRPORT_FULL_NAMES: Record<string, string> = {
  HAN: 'Sân bay Quốc tế Nội Bài',
  SGN: 'Sân bay Quốc tế Tân Sơn Nhất',
  DAD: 'Sân bay Quốc tế Đà Nẵng',
  CXR: 'Sân bay Quốc tế Cam Ranh',
  PQC: 'Sân bay Quốc tế Phú Quốc',
  HPH: 'Sân bay Quốc tế Cát Bi',
  HUI: 'Sân bay Quốc tế Phú Bài',
  VCA: 'Sân bay Quốc tế Cần Thơ',
  VDO: 'Sân bay Quốc tế Vân Đồn',
  VII: 'Sân bay Quốc tế Vinh',
  THD: 'Sân bay Thọ Xuân',
  VDH: 'Sân bay Đồng Hới',
  UIH: 'Sân bay Phù Cát',
  PXU: 'Sân bay Pleiku',
  BMV: 'Sân bay Buôn Ma Thuột',
  DLI: 'Sân bay Liên Khương',
  VCL: 'Sân bay Chu Lai',
  DIN: 'Sân bay Điện Biên Phủ',
  VKG: 'Sân bay Rạch Giá',
  VCS: 'Sân bay Côn Đảo',
  SIN: 'Sân bay Quốc tế Changi (Singapore)',
  BKK: 'Sân bay Quốc tế Suvarnabhumi (Bangkok)',
  DMK: 'Sân bay Quốc tế Don Mueang (Bangkok)',
  ICN: 'Sân bay Quốc tế Incheon (Seoul)',
  KIX: 'Sân bay Quốc tế Kansai (Osaka)',
  NRT: 'Sân bay Quốc tế Narita (Tokyo)',
  HKG: 'Sân bay Quốc tế Hong Kong',
  TPE: 'Sân bay Quốc tế Taoyuan (Đài Bắc)',
  KHH: 'Sân bay Quốc tế Cao Hùng',
};

function getAirportFullName(code: string): string {
  const c = (code || '').toUpperCase();
  return AIRPORT_FULL_NAMES[c] || `Sân bay ${getAirportCity(c)}`;
}

interface FareBenefitInfo {
  label: string;
  badgeClass: string;
  cabinBaggage: string;
  checkedBaggage: string;
  features: string[];
}

const FARE_BENEFITS: Record<string, FareBenefitInfo> = {
  eco: {
    label: 'Economy',
    badgeClass: 'bg-red-50 text-[#ED1B24] border-red-200',
    cabinBaggage: '07kg xách tay',
    checkedBaggage: 'Chưa bao gồm (mua thêm linh hoạt)',
    features: [
      '07kg hành lý xách tay kích thước tiêu chuẩn',
      'Đổi ngày bay/hành trình có thu phí chênh lệch',
      'Tích lũy điểm xét hạng Vietjet SkyJoy',
    ],
  },
  deluxe: {
    label: 'Deluxe',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-black',
    cabinBaggage: '07kg xách tay + 01 túi nhỏ (3kg)',
    checkedBaggage: '20kg hành lý ký gửi miễn cước',
    features: [
      '10kg hành lý xách tay + 20kg ký gửi miễn phí',
      'Miễn phí thay đổi ngày bay, giờ bay, chặng bay',
      'Ưu tiên chọn chỗ ngồi yêu thích (không bao gồm ghế SkyBoss)',
      'Bảo hiểm du lịch Deluxe Flight Care',
    ],
  },
  skyboss: {
    label: 'SkyBoss',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-black',
    cabinBaggage: '10kg xách tay',
    checkedBaggage: '30kg ký gửi + 01 bộ dụng cụ Golf',
    features: [
      'Phòng chờ sang trọng (Luxury Lounge) tại sân bay',
      'Ưu tiên làm thủ tục tại quầy SkyBoss & lối đi riêng',
      'Xe đưa đón riêng ra tàu bay (Private Shuttling)',
      'Phục vụ ẩm thực tươi ngon không giới hạn trên chuyến bay',
    ],
  },
  business: {
    label: 'Business',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 font-black',
    cabinBaggage: '18kg xách tay',
    checkedBaggage: '40kg ký gửi + 01 bộ dụng cụ Golf',
    features: [
      'Ghế ngồi khoang riêng ngả phẳng 180° thành giường êm ái',
      'Phòng chờ riêng thương gia tiêu chuẩn quốc tế',
      'Ưu tiên quầy thủ tục, lối đi an ninh và hành lý ra đầu tiên',
      'Thực đơn ẩm thực cao cấp Organic & đồ uống không giới hạn',
    ],
  },
};

function getFareInfo(fareClass?: string): FareBenefitInfo {
  const key = (fareClass || 'eco').toLowerCase();
  return FARE_BENEFITS[key] || FARE_BENEFITS.eco;
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'T6, 13/11/2026';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'T6, 13/11/2026';
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const day = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${day}, ${dd}/${mm}/${yyyy}`;
}

function formatTime(iso?: string | null, fallback = '00:00'): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function calcDuration(depart?: string | null, arrive?: string | null): string {
  if (!depart || !arrive) return '2 giờ 10 phút';
  const start = new Date(depart).getTime();
  const end = new Date(arrive).getTime();
  if (isNaN(start) || isNaN(end)) return '2 giờ 10 phút';
  const diff = Math.abs(end - start);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} giờ ${minutes} phút`;
}

interface FlightLegProps {
  leg: FlightSummaryItem;
  label: string;
  isFirst?: boolean;
  paxCount?: number;
  totalPrice?: number;
  showPrice?: boolean;
}

function FlightLegSection({
  leg,
  label,
  isFirst = true,
  paxCount = 1,
  totalPrice = 0,
  showPrice = true,
}: FlightLegProps) {
  const [isOpen, setIsOpen] = useState(false);

  const fromCode = (leg.from_code || 'HAN').toUpperCase();
  const toCode = (leg.to_code || 'SGN').toUpperCase();
  const fromCity = getAirportCity(fromCode);
  const toCity = getAirportCity(toCode);
  const fromAirport = getAirportFullName(fromCode);
  const toAirport = getAirportFullName(toCode);

  const flightNo = leg.flight_no || 'VJ121';
  const aircraft = resolveAircraft(flightNo, fromCode, toCode);
  const dateFormatted = formatDate(leg.depart_time);
  const departTime = formatTime(leg.depart_time, '05:30');
  const arriveTime = formatTime(leg.arrive_time, '07:40');
  const duration = calcDuration(leg.depart_time, leg.arrive_time);

  const fare = getFareInfo(leg.class);

  return (
    <div className={`p-4 sm:p-5 ${!isFirst ? 'border-t border-gray-100' : ''}`}>
      {/* Header bar của chặng bay */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-sm bg-gray-100 text-gray-700 font-extrabold text-2xs uppercase tracking-wider">
            {label}
          </span>
          <span className="text-xs font-extrabold text-gray-900">{dateFormatted}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-sm bg-red-50 text-[#ED1B24] border border-red-200 font-mono font-bold text-3xs">
            {flightNo}
          </span>
          <span className="text-3xs text-gray-500 font-medium hidden sm:inline-block">
            {aircraft}
          </span>
        </div>
      </div>

      {/* Grid hành trình */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Điểm khởi hành */}
        <div className="flex items-center sm:block gap-3">
          <div className="flex flex-col sm:block">
            <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono tracking-tight leading-none">
              {fromCode}
            </span>
            <span className="block text-sm sm:text-base font-bold text-gray-800 mt-1">
              {departTime}
            </span>
            <span className="text-2xs text-gray-500 font-medium mt-0.5 block">{fromCity}</span>
          </div>
        </div>

        {/* Cột giữa: thời gian bay, đường bay dashed, nút chi tiết */}
        <div className="flex-1 px-1 sm:px-6 text-center">
          <span className="text-3xs sm:text-2xs font-semibold text-gray-600 block mb-1">
            {duration}
          </span>
          <div className="relative flex items-center justify-center my-1.5">
            <div className="w-full border-t border-gray-300 border-dashed" />
            <div className="absolute px-2.5 bg-white text-[#ED1B24]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
                aria-hidden="true"
                width="14"
                height="14"
                className="rotate-90 transform"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-3xs font-bold text-gray-700 hover:text-[#ED1B24] transition-colors cursor-pointer inline-flex items-center gap-1 active:scale-95"
            aria-expanded={isOpen}
          >
            <span>Bay thẳng | Chi tiết</span>
            <span className="text-3xs transition-transform duration-200">{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Điểm đến */}
        <div className="flex items-center sm:block gap-3 sm:text-right">
          <div className="flex flex-col sm:block sm:items-end">
            <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono tracking-tight leading-none">
              {toCode}
            </span>
            <span className="block text-sm sm:text-base font-bold text-gray-800 mt-1">
              {arriveTime}
            </span>
            <span className="text-2xs text-gray-500 font-medium mt-0.5 block">{toCity}</span>
          </div>
        </div>

        {/* Cột phải: Hạng vé, hành lý & Tổng tiền */}
        <div className="sm:border-l sm:border-gray-200 sm:pl-6 pt-3 sm:pt-0 text-left sm:text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t border-gray-100 sm:border-t-0">
          <div className="flex flex-col sm:items-end gap-1">
            <div
              className={`inline-block px-2.5 py-0.5 rounded-sm border text-xs tracking-wide ${fare.badgeClass}`}
            >
              {fare.label}
            </div>
            <div className="flex items-center gap-1 text-3xs text-gray-600 font-medium">
              <span>🎒</span>
              <span>{fare.cabinBaggage}</span>
            </div>
          </div>

          <div className="flex flex-col items-end sm:mt-1">
            <span className="text-3xs font-semibold text-gray-500">{paxCount} hành khách</span>
            {showPrice && totalPrice > 0 && (
              <span className="text-sm sm:text-base font-black text-[#ED1B24] tracking-tight">
                {totalPrice.toLocaleString('vi-VN')} VND
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chi tiết lộ trình mở rộng */}
      {isOpen && (
        <div className="mt-4 pt-3.5 border-t border-gray-100 bg-gray-50/80 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 rounded-b-xl text-xs space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Lộ trình chuyến bay */}
            <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                <span className="font-extrabold text-gray-900 text-2xs uppercase tracking-wide">
                  Chi tiết hành trình
                </span>
                <span className="font-mono font-black text-[#ED1B24] text-xs">{flightNo}</span>
              </div>
              <div className="space-y-1.5 text-2xs text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">●</span>
                  <div>
                    <span className="font-bold text-gray-900">{departTime}</span> — {fromAirport} (
                    {fromCode})
                  </div>
                </div>
                <div className="pl-3.5 text-3xs text-gray-500">
                  Thời gian bay: {duration} (Bay thẳng) • Khai thác bởi Vietjet Air
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">●</span>
                  <div>
                    <span className="font-bold text-gray-900">{arriveTime}</span> — {toAirport} (
                    {toCode})
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between text-3xs text-gray-500 border-t border-gray-100 mt-2">
                  <span>Dòng tàu bay:</span>
                  <span className="font-semibold text-gray-800">{aircraft}</span>
                </div>
              </div>
            </div>

            {/* Tiêu chuẩn hành lý & tiện ích */}
            <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                <span className="font-extrabold text-gray-900 text-2xs uppercase tracking-wide">
                  Quyền lợi hạng vé: {fare.label}
                </span>
                <span className="text-3xs font-semibold text-gray-500">Tiêu chuẩn</span>
              </div>
              <div className="space-y-1.5 text-2xs text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Hành lý xách tay:</span>
                  <span className="font-bold text-gray-900">{fare.cabinBaggage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Hành lý ký gửi:</span>
                  <span className="font-bold text-gray-900">{fare.checkedBaggage}</span>
                </div>
                <div className="pt-1.5 border-t border-gray-100 space-y-1">
                  {fare.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-3xs text-gray-600">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlightSummaryCard({
  flight,
  returnFlight,
  paxCount = 1,
  totalPrice = 0,
  bookingCode,
  title = 'Thông tin chuyến bay',
  className = '',
}: FlightSummaryCardProps) {
  if (!flight) return null;

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className}`}
    >
      {/* Header Card với thương hiệu Vietjet Air */}
      <div className="bg-gradient-to-r from-[#ED1B24] via-[#D8161F] to-[#B00E16] text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl font-black italic tracking-tighter font-serif text-white">
            vietjet<span className="text-[#FFCC00]">Air</span>.com
          </span>
          <span className="hidden sm:inline-block w-px h-6 bg-white/25" />
          <span className="text-xs sm:text-sm font-bold text-white/95 uppercase tracking-wider font-koho">
            {title}
          </span>
        </div>
        {bookingCode && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/25 text-white shadow-2xs">
            <span className="text-3xs uppercase tracking-wider text-white/80 font-bold">
              Mã đặt chỗ:
            </span>
            <span className="font-mono font-black text-xs sm:text-sm text-[#FFCC00] tracking-wider">
              {bookingCode}
            </span>
          </div>
        )}
      </div>

      {/* Chuyến đi */}
      <FlightLegSection
        leg={flight}
        label="Chuyến đi"
        isFirst={true}
        paxCount={paxCount}
        totalPrice={totalPrice}
        showPrice={!returnFlight}
      />

      {/* Chuyến về nếu có */}
      {returnFlight && (
        <FlightLegSection
          leg={returnFlight}
          label="Chuyến về"
          isFirst={false}
          paxCount={paxCount}
          totalPrice={totalPrice}
          showPrice={true}
        />
      )}
    </div>
  );
}
