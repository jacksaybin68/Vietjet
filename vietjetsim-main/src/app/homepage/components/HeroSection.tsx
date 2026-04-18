'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { FlightSearchFormSkeleton } from '@/components/ui/SkeletonLoader';
import {
  MdFlightTakeoff,
  MdFlightLand,
  MdSwapVert,
  MdPerson,
  MdLocalOffer,
  MdKeyboardArrowDown,
  MdCheck,
  MdCalendarToday,
  MdLocalFireDepartment,
} from 'react-icons/md';
import { FaPlane } from 'react-icons/fa';

const AIRPORTS = [
  { code: 'HAN', name: 'Hà Nội', city: 'Nội Bài' },
  { code: 'SGN', name: 'TP. Hồ Chí Minh', city: 'Tân Sơn Nhất' },
  { code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng' },
  { code: 'PQC', name: 'Phú Quốc', city: 'Phú Quốc' },
  { code: 'CXR', name: 'Nha Trang', city: 'Cam Ranh' },
  { code: 'HPH', name: 'Hải Phòng', city: 'Cát Bi' },
  { code: 'HUI', name: 'Huế', city: 'Phú Bài' },
  { code: 'VDH', name: 'Đồng Hới', city: 'Đồng Hới' },
];

const HOT_DEALS = [
  { from: 'Hà Nội', to: 'TP.HCM', price: 299000, fromCode: 'HAN', toCode: 'SGN' },
  { from: 'TP.HCM', to: 'Phú Quốc', price: 179000, fromCode: 'SGN', toCode: 'PQC' },
  { from: 'Hà Nội', to: 'Đà Nẵng', price: 249000, fromCode: 'HAN', toCode: 'DAD' },
  { from: 'TP.HCM', to: 'Nha Trang', price: 159000, fromCode: 'SGN', toCode: 'CXR' },
  { from: 'Hà Nội', to: 'Phú Quốc', price: 329000, fromCode: 'HAN', toCode: 'PQC' },
  { from: 'TP.HCM', to: 'Đà Nẵng', price: 199000, fromCode: 'SGN', toCode: 'DAD' },
];

const BANNERS = [
  {
    id: 1,
    image: '/assets/images/banners/loc_vang.png',
    alt: 'Bay Vietjet Air nhận lộc vàng - khuyến mãi vé máy bay hấp dẫn',
    title: 'BAY VIETJET AIR NHẬN LỘC VÀNG',
    subtitle: 'Mua vé từ 03/03/2026 đến 19/05/2026 để nhận thưởng',
    hideOverlay: false,
  },
  {
    id: 2,
    image: '/assets/images/banners/destinations.png',
    alt: 'Khám phá điểm đến mới cùng Vietjet Air - hơn 50 đường bay',
    title: 'KHÁM PHÁ ĐIỂM ĐẾN MỚI',
    subtitle: 'Hơn 50 đường bay nội địa và quốc tế',
    hideOverlay: false,
  },
  {
    id: 3,
    image: '/assets/images/banners/services.png',
    alt: 'Trải nghiệm dịch vụ cao cấp trên máy bay Vietjet Air',
    title: 'DỊCH VỤ SKYBOSS CAO CẤP',
    subtitle: 'Tận hưởng sự thoải mái tối đa và tiện ích đặc quyền',
    hideOverlay: false,
  },
];

export default function HeroSection() {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip' | 'multi'>('round-trip');
  const [from, setFrom] = useState('HAN');
  const [to, setTo] = useState('SGN');
  const [departDate, setDepartDate] = useState('2026-04-15');
  const [returnDate, setReturnDate] = useState('2026-04-22');
  const [passengers, setPassengers] = useState(1);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [findLowest, setFindLowest] = useState(false);
  const bannerRef = useRef<NodeJS.Timeout | null>(null);

  const fromAirport = AIRPORTS.find((a) => a.code === from)!;
  const toAirport = AIRPORTS.find((a) => a.code === to)!;

  useEffect(() => {
    bannerRef.current = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % BANNERS.length);
    }, 4500);
    return () => {
      if (bannerRef.current) clearInterval(bannerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFormLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const swapAirports = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <section className="relative pt-[128px]">
      {/* Full-width banner */}
      <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
        {BANNERS.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === activeBanner ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <AppImage
              src={banner.image}
              alt={banner.alt}
              fill
              priority={i === 0 || i === 1}
              className={`object-cover object-center transition-transform duration-[8000ms] ease-out ${
                i === activeBanner ? 'scale-110' : 'scale-100'
              }`}
              sizes="100vw"
            />

            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.65) 100%)',
              }}
            />

            {/* Banner text - top left */}
            {!banner.hideOverlay && (
              <div
                className={`absolute top-1/4 left-4 sm:left-10 hidden lg:block transition-all duration-1000 transform ${
                  i === activeBanner ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
                }`}
              >
                <h2
                  className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight uppercase"
                  style={{
                    fontStyle: 'italic',
                    textShadow: '0 4px 30px rgba(0,0,0,0.9)',
                    WebkitTextStroke: '0.5px rgba(255,255,255,0.2)',
                    letterSpacing: '-0.02em',
                    maxWidth: '60%',
                  }}
                >
                  {banner.title}
                </h2>
                <div className="h-1.5 w-32 bg-yellow-400 mt-2 rounded-full shadow-2xl" />
                <p
                  className="text-white text-base sm:text-xl mt-4 font-bold max-w-lg"
                  style={{
                    textShadow: '0 3px 15px rgba(0,0,0,0.8)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {banner.subtitle}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Dot indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveBanner(i)}
              className={`rounded-full transition-all duration-500 shadow-sm ${
                i === activeBanner
                  ? 'bg-white w-10 h-2.5 scale-110'
                  : 'bg-white/40 w-2.5 h-2.5 hover:bg-white/70 hover:scale-125'
              }`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>

        {/* Cloud background fade effect at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 lg:h-48 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to top, rgba(230,243,255,0.9) 0%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* Promo icon bottom left */}
        <div className="absolute bottom-[-20px] left-5 lg:left-20 z-30 hidden md:block w-[280px] h-[280px] hover:scale-105 transition-transform duration-500 cursor-pointer pointer-events-auto">
          <AppImage
            src="/assets/images/banners/loc_vang.png"
            alt="Bay Vietjet Nhận Lộc Vàng"
            fill
            className="object-contain drop-shadow-2xl"
          />
        </div>

        {/* ===== RIGHT-ALIGNED SEARCH FORM OVERLAY ===== */}
        <div className="absolute inset-x-0 top-0 bottom-10 flex items-center justify-center lg:justify-end z-20 px-3 sm:px-10 lg:px-20 max-w-[1400px] mx-auto pointer-events-none">
          {formLoading ? (
            <div className="w-full max-w-lg pointer-events-auto">
              <FlightSearchFormSkeleton />
            </div>
          ) : (
            <div
              className="w-full max-w-[440px] rounded-2xl overflow-visible shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 relative pointer-events-auto"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}
            >
              {/* Mascot */}
              <div className="absolute -right-24 top-[50%] transform -translate-y-1/2 w-24 hidden md:flex flex-col items-center pointer-events-none z-50">
                <div
                  className="bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-100 mb-1.5 relative animate-bounce"
                  style={{ zIndex: 2 }}
                >
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">
                    Xin chào!
                  </span>
                  <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
                </div>
                <div className="w-20 h-24 relative drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                  <div className="absolute inset-0 bg-[#EC2029] rounded-[2rem_2rem_0.5rem_0.5rem] border-2 border-white flex items-center justify-center text-3xl">
                    👨‍✈️
                  </div>
                </div>
              </div>

              {/* Red Header Bar with Fare Types */}
              <div
                className="flex rounded-t-2xl overflow-hidden p-2 gap-1"
                style={{
                  background: '#D1161B',
                }}
              >
                <div className="flex-1 px-2.5 py-1.5">
                  <span className="text-white text-xs font-bold block mb-0.5">
                    Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa...
                  </span>
                </div>
                <div className="flex-none bg-[#FFDD00] rounded-md px-3 py-1.5 flex items-center justify-center shadow-inner text-[#B30000] text-xs font-black leading-tight cursor-pointer hover:bg-yellow-300 transition-colors">
                  Đổi thưởng &<br />
                  Mua Skypoint
                </div>
                <div className="flex-none bg-[#B30000] rounded-md px-3 py-1.5 flex items-center justify-center text-white text-xs font-bold leading-tight cursor-pointer hover:bg-[#8F0000] transition-colors">
                  Gửi hàng
                  <br />
                  nhanh
                </div>
              </div>

              {/* Quick Trip Type Selectors (Khứ hồi / Một chiều - Radio buttons) */}
              <div
                className="px-5 pt-3 pb-2 flex items-center gap-4 border-b border-gray-100"
                style={{ background: '#D1161B' }}
              >
                {[
                  { key: 'round-trip', label: 'Khứ hồi' },
                  { key: 'one-way', label: 'Một chiều' },
                ].map((tab) => (
                  <label
                    key={tab.key}
                    className="flex items-center gap-1.5 cursor-pointer text-white"
                  >
                    <input
                      type="radio"
                      name="tripType"
                      checked={tripType === tab.key}
                      onChange={() => setTripType(tab.key as typeof tripType)}
                      className="accent-[#FFDD00] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm font-bold">{tab.label}</span>
                  </label>
                ))}
                <div className="flex-1 text-right">
                  <span className="text-sm font-bold text-white hover:text-yellow-300 cursor-pointer">
                    Nhiều chặng{' '}
                    <Icon
                      name="ArrowTopRightOnSquareIcon"
                      size={14}
                      className="inline relative -top-0.5"
                    />
                  </span>
                </div>
                <div className="flex items-center gap-1 text-white font-bold cursor-pointer">
                  VND <Icon name="ChevronDownIcon" size={12} />
                </div>
              </div>

              {/* Form body */}
              <div className="px-4 pt-4 pb-4 bg-[#D1161B] rounded-b-2xl">
                {/* Search Fields Wrapper (White rounded block) */}
                <div className="space-y-0 text-gray-800">
                  {/* From / To row */}
                  <div className="flex flex-col relative">
                    {/* From */}
                    <div className="w-full relative bg-white rounded-t-xl group">
                      <div
                        className="flex items-center cursor-pointer p-0"
                        onClick={() => {
                          setShowFromDropdown(!showFromDropdown);
                          setShowToDropdown(false);
                          setShowPassengerDropdown(false);
                        }}
                      >
                        <MdFlightTakeoff
                          className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                          style={{ color: '#EC2029' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider font-koho">
                            Điểm khởi hành
                          </div>
                          <div className="font-black text-sm truncate">{fromAirport?.name}</div>
                          <div className="text-[10px] font-koho">
                            {fromAirport?.code} · {fromAirport?.city}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Swap button */}
                    <div className="absolute left-[16px] top-[50%] -translate-y-1/2 z-10 hidden sm:flex pt-[10px]">
                      <button
                        onClick={swapAirports}
                        className="w-6 h-6 sm:w-7 sm:h-7 bg-[#D1161B] text-white rounded-md flex items-center justify-center transition-all shadow-md group hover:bg-[#8F0000]"
                      >
                        <MdSwapVert className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </button>
                    </div>

                    {/* To */}
                    <div className="w-full relative bg-white group rounded-b-xl border-t border-gray-200 mt-0.5">
                      <div
                        className="flex items-center cursor-pointer p-0"
                        onClick={() => {
                          setShowToDropdown(!showToDropdown);
                          setShowFromDropdown(false);
                          setShowPassengerDropdown(false);
                        }}
                      >
                        <div className="w-10 sm:w-12 h-12 flex items-center justify-center flex-shrink-0 text-gray-500">
                          <FaPlane className="rotate-90 w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pr-4 h-12 flex items-center">
                          <span className="font-bold text-sm sm:text-base text-gray-800 tracking-wide">
                            Điểm đến
                          </span>
                        </div>
                        {/* Return Date aligned across */}
                        <div className="w-[120px] sm:w-[150px] border-l border-gray-200 h-10 flex flex-col justify-center px-3">
                          <div className="text-[10px] text-gray-500 font-semibold mb-0.5">
                            Ngày về
                          </div>
                          <div className="font-bold text-xs sm:text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                            Xin chào!
                          </div>
                        </div>
                      </div>
                      {showToDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto mt-1">
                          {AIRPORTS.map((airport) => (
                            <button
                              key={airport.code}
                              onClick={() => {
                                setTo(airport.code);
                                setShowToDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center justify-between font-koho"
                            >
                              <div>
                                <span className="text-sm font-black text-[#EC2029]">
                                  {airport.code}
                                </span>
                                <span className="text-xs ml-2 text-gray-500">{airport.name}</span>
                              </div>
                              {airport.code === to && (
                                <MdCheck className="w-4 h-4 text-[#EC2029]" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Passenger row */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <div className="w-full relative min-w-0">
                      <div
                        className="flex items-center h-12 px-3 sm:px-4 bg-white rounded-xl cursor-pointer hover:border-[#EC2029] transition-colors"
                        onClick={() => {
                          setShowPassengerDropdown(!showPassengerDropdown);
                          setShowFromDropdown(false);
                          setShowToDropdown(false);
                        }}
                      >
                        <MdPerson className="w-4 h-4 flex-shrink-0 text-gray-500 mr-2" />
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider font-koho">
                            Hành khách
                          </span>
                          <span className="text-sm font-bold text-gray-800">
                            {passengers} người lớn
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded px-2 py-0.5 ml-2 cursor-pointer relative -top-3 left-6">
                          <div className="w-16 h-12 bg-white border border-gray-200 absolute rounded shadow-md z-[51] flex items-center justify-center p-1 -right-2 top-0 pointer-events-none">
                            <div className="text-[10px] absolute -top-4 rounded bg-white shadow py-0.5 px-1 right-2 text-gray-600 whitespace-nowrap">
                              Xin chào!
                            </div>
                            <img
                              src="/assets/images/app_logo.png"
                              className="w-10 h-10 object-contain drop-shadow"
                              alt="Vietjet Mascot"
                            />
                          </div>
                        </div>
                      </div>
                      {showPassengerDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 p-4 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold font-body-vj">Người lớn</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setPassengers(Math.max(1, passengers - 1))}
                                className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold transition-colors hover:bg-red-50"
                                style={{ borderColor: '#EC2029', color: '#EC2029' }}
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-bold font-body-vj">
                                {passengers}
                              </span>
                              <button
                                onClick={() => setPassengers(Math.min(9, passengers + 1))}
                                className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold transition-colors hover:bg-red-50"
                                style={{ borderColor: '#EC2029', color: '#EC2029' }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowPassengerDropdown(false)}
                            className="mt-3 w-full py-2 rounded-lg text-sm font-bold text-white transition-colors"
                            style={{ background: '#EC2029' }}
                          >
                            Xác nhận
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Promo code + Find lowest */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="flex-1 flex items-center gap-2 px-3 sm:px-4 py-2.5 border border-gray-200 rounded-xl bg-white">
                      <MdLocalOffer
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: '#EC2029' }}
                      />
                      <input
                        id="promo-code"
                        name="promoCode"
                        type="text"
                        placeholder="Mã khuyến mãi"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1 text-sm bg-transparent border-none outline-none"
                        style={{
                          color: '#333333',
                          fontWeight: 500,
                        }}
                      />
                    </div>
                    <label className="flex items-center gap-2 px-3 py-2.5 cursor-pointer font-koho">
                      <input
                        id="find-lowest"
                        name="findLowest"
                        type="checkbox"
                        checked={findLowest}
                        onChange={(e) => setFindLowest(e.target.checked)}
                        className="rounded"
                        style={{ accentColor: '#EC2029' }}
                      />

                      <span className="text-xs font-semibold text-white ml-2">Tìm vé rẻ nhất</span>
                    </label>
                  </div>

                  {/* Search button */}
                  <Link
                    href={`/flight-booking?from=${from}&to=${to}&depart=${departDate}&return=${returnDate}&pax=${passengers}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 text-center font-black text-base rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{
                      background:
                        'linear-gradient(26.73deg, rgb(249,165,26) 13.7%, rgb(251,182,18) 29.8%, rgb(255,221,0) 66.81%)',
                      color: '#1A2948',
                      fontWeight: 900,
                    }}
                  >
                    Tìm chuyến bay
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
