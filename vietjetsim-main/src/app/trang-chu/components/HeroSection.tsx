'use client';

import { useEffect, useState } from 'react';
import HeroBookingWidget from './HeroBookingWidget';

export const HERO_BANNERS = [
  {
    id: 'banner-tet-celebration',
    image: '/images/hero/hero-tet-celebration.jpg',
    title: 'Vé Tết tới, mời bạn bay! - Vietjet Air',
    focusClass: 'object-cover object-top',
  },
  {
    id: 'banner-vietjet-starlink',
    image: '/images/hero/hero-vietjet-holiday.jpg',
    title: 'VietjetAir Starlink - Kết nối không giới hạn trên mỗi chuyến bay',
    focusClass: 'object-cover object-center',
  },
  {
    id: 'banner-bay-khap-the-gioi',
    image: '/images/hero/banner-bay-khap-the-gioi.jpg',
    title: 'Bay khắp thế giới, chạm đỉnh cao mới',
    focusClass: 'object-cover object-top',
  },
  {
    id: 'banner-jakarta-announcement',
    image: '/images/hero/banner-jakarta-cgk-hero.jpg',
    title: 'Thông báo chuyển nhà ga T3 Jakarta (CGK) - Vietjet Air',
    focusClass: 'object-cover object-top',
  },
  {
    id: 'banner-vietjet-0dong',
    image: '/images/hero/hero-sale-aerial.jpg',
    title: 'Vé máy bay siêu tiết kiệm chỉ từ 0đ',
    focusClass: 'object-cover object-center',
  },
  {
    id: 'banner-vietjet-skyboss',
    image: '/images/hero/hero-skyboss-cabin.jpg',
    title: 'Trải nghiệm phong cách Người dẫn đầu',
    focusClass: 'object-cover object-center',
  },
];

export default function HeroSection() {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setCurrentBannerIndex((i) => (i + 1) % HERO_BANNERS.length),
      7000
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-sky-100 lg:-mt-[128px]">
      <h1 className="sr-only">Vietjet Air - Thông báo quan trọng Nhà ga T3 Jakarta</h1>
      {/* Background Hero Banner Slider */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {HERO_BANNERS.map((banner, idx) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              idx === currentBannerIndex ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className={`w-full h-full object-cover object-top ${banner.focusClass}`}
            />
          </div>
        ))}
      </div>

      {/* Nội dung Hero: 2 cột desktop (Trái: Artwork trống / Phải: Form đặt vé) */}
      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-[152px] pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_356px] gap-8 items-start">
          {/* Cột trái: Vùng quảng cáo (ảnh banner đã in sẵn chữ và artwork) */}
          <div className="hidden lg:block min-h-[460px] pointer-events-none" />

          {/* Cột phải: Form đặt vé Vietjet */}
          <div className="relative w-full max-w-[356px] mx-auto lg:mr-0 lg:ml-auto">
            <HeroBookingWidget />

            {/* Mascot Amy + Bong bóng lời chào "Xin chào!" theo ảnh tham chiếu */}
            <div className="hidden xl:flex items-end absolute -bottom-10 -right-28 pointer-events-none z-20">
              <div className="mb-8 mr-1 rounded-xl bg-white/95 px-3 py-1 shadow-md border border-gray-100/80">
                <span className="text-xs2 font-black text-[var(--foreground)]">Xin chào!</span>
              </div>
              <img
                src="/images/hero/amy-mascot.png"
                alt="Mascot Amy"
                className="h-28 w-auto object-contain drop-shadow-md"
              />
            </div>
          </div>
        </div>

        {/* Chấm điều hướng slider căn giữa phía dưới banner */}
        <div className="relative z-20 flex justify-center items-center gap-2 mt-8 mb-2">
          {HERO_BANNERS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Chuyển sang banner ${idx + 1}`}
              onClick={() => setCurrentBannerIndex(idx)}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentBannerIndex
                  ? 'w-2.5 h-2.5 bg-vjred scale-110 shadow-xs'
                  : 'w-2 h-2 bg-white/80 hover:bg-white'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Dải mây chân trời chuyển tiếp mềm mại vào phần dưới */}
      <div className="relative z-10 w-full overflow-hidden leading-none -mb-1">
        <svg
          viewBox="0 0 1440 98"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-12 sm:h-16 lg:h-20"
        >
          <path
            d="M0,45 C120,85 240,10 360,40 C480,70 600,15 720,42 C840,68 960,18 1080,45 C1200,72 1320,20 1440,40 L1440,98 L0,98 Z"
            fill="var(--background, #ffffff)"
          />
        </svg>
      </div>
    </section>
  );
}
