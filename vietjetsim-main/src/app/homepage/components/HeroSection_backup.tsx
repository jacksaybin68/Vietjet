'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
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
    image: 'https://images.unsplash.com/photo-1662820186073-1fef880e53f8',
    alt: 'Bay VietjetSim nhận lộc vàng - khuyến mãi vé máy bay hấp dẫn',
    title: 'BAY VIETJETSIM NHẬN LỘC VÀNG',
    subtitle: 'Mua vé từ 03/03/2026 đến 19/05/2026 để nhận thưởng',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1675424084053-a07a44953b0b',
    alt: 'Khám phá điểm đến mới cùng VietjetSim - hơn 50 đường bay',
    title: 'KHÁM PHÁ ĐIỂM ĐẾN MỚI',
    subtitle: 'Hơn 50 đường bay nội địa',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1692536836218-6aedbbef884f',
    alt: 'Nghỉ dưỡng biển Phú Quốc Nha Trang Đà Nẵng giá rẻ',
    title: 'NGHỈ DƯỠNG BIỂN',
    subtitle: 'Phú Quốc, Nha Trang, Đà Nẵng',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05',
    alt: 'Hàng trăm giải thưởng hấp dẫn từ VietjetSim',
    title: 'HÀNG TRĂM GIẢI THƯỞNG',
    subtitle: 'Cơ hội nhận thưởng mỗi ngày',
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
    <section className="relative pt-[72px]">
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
              priority={i === 0}
              className="object-cover object-center"
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
            <div className="absolute top-6 left-4 sm:top-8 sm:left-10 hidden sm:block">
              <h2
                className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight"
                style={{
                  fontStyle: 'italic',
                  textShadow: '0 2px 16px rgba(0,0,0,0.6)',
                  WebkitTextStroke: '1px rgba(255,255,255,0.15)'
                }}
              >
                {banner.title}
              </h2>
              <p
                className="text-white/85 text-sm mt-2 font-semibold"
                style={{
                  textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                  fontWeight: 600
                }}
              >
                {banner.subtitle}
              </p>
            </div>
          </div>
        ))}

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveBanner(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeBanner
                  ? 'bg-white w-6 h-2.5'
                  : 'bg-white/50 w-2.5 h-2.5 hover:bg-white/75'
              }`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>

        {/* ===== CENTERED SEARCH FORM OVERLAY ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-20 px-3 sm:px-4 py-4 sm:py-6">
          {formLoading ? (
            <div className="w-full max-w-3xl">
              <FlightSearchFormSkeleton />
            </div>
          ) : (
            <div
              className="w-full max-w-3xl rounded-2xl overflow-visible shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.97)' }}
            >
              {/* Trip type tabs */}
              <div
                className="flex rounded-t-2xl overflow-hidden"
                style={{
                  background:
                    'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
                }}
              >
                {[
                  { key: 'round-trip', label: 'Khứ hồi' },
                  { key: 'one-way', label: 'Một chiều' },
                  { key: 'multi', label: 'Nhiều chặng' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setTripType(tab.key as typeof tripType)}
                    className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-black transition-all duration-200 tracking-wide ${
                      tripType === tab.key
                        ? 'bg-white text-[#EC2029]'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                    } font-body`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Form body */}
              <div className="px-3 sm:px-5 pt-3 sm:pt-4 pb-3 sm:pb-5">
                {/* From / To row */}
                <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-3">
                  {/* From */}
                  <div className="flex-1 relative">
                    <div
                      className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer border border-gray-200 rounded-xl hover:border-[#EC2029] transition-colors bg-white"
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
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wider font-koho"
                        >
                          Điểm khởi hành
                        </div>
                        <div className="font-black text-sm truncate">{fromAirport?.name}</div>
                        <div
                          className="text-[10px] font-koho"
                        >
                          {fromAirport?.code} · {fromAirport?.city}
                        </div>
                      </div>
                    </div>
                    {showFromDropdown && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto mt-1">
                        {AIRPORTS.map((airport) => (
                          <button
                            key={airport.code}
                            onClick={() => {
                              setFrom(airport.code);
                              setShowFromDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors flex items-center justify-between font-koho"
                          >
                            <div>
                              <span
                                className="text-sm font-black"
                                style={{
                                  color: '#EC2029'
                                }}
                              >
                                {airport.code}
                              </span>
                              <span className="text-xs ml-2" style={{ color: '#6D6E71' }}>
                                {airport.name}
                              </span>
                            </div>
                            {airport.code === from && (
                              <MdCheck className="w-4 h-4" style={{ color: '#EC2029' }} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Swap button */}
                  <button
                    onClick={swapAirports}
                    className="self-center w-8 h-8 sm:w-9 sm:h-9 bg-white border-2 rounded-full flex items-center justify-center transition-all shadow-sm flex-shrink-0 group hover:text-white"
                    style={{ borderColor: '#EC2029' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#EC2029')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    <MdSwapVert className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'inherit' }} />
                  </button>

                  {/* To */}
                  <div className="flex-1 relative">
                    <div
                      className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer border border-gray-200 rounded-xl hover:border-[#EC2029] transition-colors bg-white"
                      onClick={() => {
                        setShowToDropdown(!showToDropdown);
                        setShowFromDropdown(false);
                        setShowPassengerDropdown(false);
                      }}
                    >
                      <MdFlightLand
                        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                        style={{ color: '#EC2029' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wider font-koho"
                        >
                          Điểm đến
                        </div>
                        <div className="font-black text-sm truncate">{toAirport?.name}</div>
                        <div
                          className="text-[10px] font-koho"
                        >
                          {toAirport?.code} · {toAirport?.city}
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
                            className="w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors flex items-center justify-between font-koho"
                          >
                            <div>
                              <span
                                className="text-sm font-black"
                                style={{
                                  color: '#EC2029'
                                }}
                              >
                                {airport.code}
                              </span>
                              <span className="text-xs ml-2" style={{ color: '#6D6E71' }}>
                                {airport.name}
                              </span>
                            </div>
                            {airport.code === to && (
                              <MdCheck className="w-4 h-4" style={{ color: '#EC2029' }} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date / Passenger row */}
                <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-3">
                  {/* Departure date */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl bg-white">
                      <MdCalendarToday
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: '#EC2029' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wider font-koho"
                        >
                          Ngày đi
                        </div>
                        <input
                          id="depart-date"
                          name="departDate"
                          type="date"
                          value={departDate}
                          onChange={(e) => setDepartDate(e.target.value)}
                          className="w-full text-sm font-bold bg-transparent border-none outline-none"
                          style={{
                            color: '#333333',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Return date */}
                  {tripType === 'round-trip' && (
                    <div className="flex-1">
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl bg-white">
                        <MdCalendarToday
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: '#EC2029' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-[10px] font-semibold uppercase tracking-wider font-koho"
                          >
                            Ngày về
                          </div>
                          <input
                            id="return-date"
                            name="returnDate"
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="w-full text-sm font-bold bg-transparent border-none outline-none"
                            style={{
                              color: '#333333',
                              fontWeight: 700
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passengers */}
                  <div className="flex-1 relative">
                    <div
                      className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl bg-white cursor-pointer hover:border-[#EC2029] transition-colors"
                      onClick={() => {
                        setShowPassengerDropdown(!showPassengerDropdown);
                        setShowFromDropdown(false);
                        setShowToDropdown(false);
                      }}
                    >
                      <MdPerson className="w-4 h-4 flex-shrink-0" style={{ color: '#EC2029' }} />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wider font-koho"
                        >
                          Hành khách
                        </div>
                        <div
                          className="text-sm font-bold"
                          style={{
                            color: '#333333',
                            fontWeight: 700
                          }}
                        >
                          {passengers} người lớn
                        </div>
                      </div>
                      <MdKeyboardArrowDown className="w-4 h-4" style={{ color: '#939598' }} />
                    </div>
                    {showPassengerDropdown && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 p-4 mt-1">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-sm font-semibold font-body-vj"
                          >
                            Người lớn
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setPassengers(Math.max(1, passengers - 1))}
                              className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold transition-colors hover:bg-red-50"
                              style={{ borderColor: '#EC2029', color: '#EC2029' }}
                            >
                              -
                            </button>
                            <span
                              className="w-6 text-center font-bold font-body-vj"
                            >
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
                    <MdLocalOffer className="w-4 h-4 flex-shrink-0" style={{ color: '#EC2029' }} />
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
                        fontWeight: 500
                      }}
                    />
                  </div>
                  <label
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer font-koho"
                  >
                    <input
                      id="find-lowest"
                      name="findLowest"
                      type="checkbox"
                      checked={findLowest}
                      onChange={(e) => setFindLowest(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: '#EC2029' }}
                    />

                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: '#333333',
                        fontWeight: 600
                      }}
                    >
                      Tìm giá thấp nhất
                    </span>
                  </label>
                </div>

                {/* Search button */}
                <Link
                  href={`/flight-booking?from=${from}&to=${to}&depart=${departDate}&return=${returnDate}&pax=${passengers}`}
                  // #region agent log
                  onClick={() => {
                    fetch('http://127.0.0.1:7465/ingest/4f40219d-db96-4bdd-83d7-39741c3ced27',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c0c98'},body:JSON.stringify({sessionId:'9c0c98',location:'HeroSection.tsx:531',message:'Navigating to flight-booking',data:{from,to,departDate,returnDate,passengers,href:`/flight-booking?from=${from}&to=${to}&depart=${departDate}`},timestamp:Date.now()})}).catch(()=>{});
                  }}
                  // #endregion
                  className="block w-full py-3 sm:py-3.5 text-center font-black text-base rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    background:
                      'linear-gradient(26.73deg, rgb(249,165,26) 13.7%, rgb(251,182,18) 29.8%, rgb(255,221,0) 66.81%)',
                    color: '#1A2948',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                    boxShadow:
                      'rgba(0,0,0,0.18) 0px 3px 6px -2px, rgba(0,0,0,0.10) 0px 2px 4px 0px'
                  }}
                >
                  Let&apos;s go
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hot deals strip */}
      <div
        className="py-2.5 overflow-x-auto no-scrollbar"
        style={{
          background:
            'linear-gradient(20.12deg, rgba(217,26,33,0.97) 19.6%, rgba(111,0,0,0.97) 93.86%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 text-[11px] font-black text-white flex-shrink-0 font-body"
            >
              <MdLocalFireDepartment className="w-4 h-4 text-yellow-300" />
              Ưu đãi:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {HOT_DEALS.map((deal, i) => (
                <Link
                  key={i}
                  href={`/flight-booking?from=${deal.fromCode}&to=${deal.toCode}`}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-2.5 py-1.5 flex-shrink-0 transition-all hover:scale-105"
                >
                  <span
                    className="text-white text-[11px] font-bold whitespace-nowrap font-koho-bold"
                  >
                    {deal.from}
                  </span>
                  <FaPlane className="w-2.5 h-2.5 text-yellow-300 flex-shrink-0" />
                  <span
                    className="text-white text-[11px] font-bold whitespace-nowrap font-koho-bold"
                  >
                    {deal.to}
                  </span>
                  <span
                    className="text-[11px] font-black whitespace-nowrap"
                    style={{
                      color: '#FFD400',
                      fontWeight: 900
                    }}
                  >
                    {deal.price.toLocaleString('vi-VN')}₫
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
