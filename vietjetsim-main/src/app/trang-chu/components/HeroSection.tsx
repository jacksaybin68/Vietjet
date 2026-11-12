'use client';

import { useEffect, useState } from 'react';
import HeroBookingWidget from './HeroBookingWidget';

export const HERO_BANNERS = [
  {
    id: 'banner-bay-khap-the-gioi',
    image: '/images/hero/banner-bay-khap-the-gioi.jpg',
    title: 'Bay khắp thế giới, chạm đỉnh cao mới',
    focusClass: 'object-cover object-top',
  },
  {
    id: 'banner-tet-celebration',
    image: '/images/hero/hero-tet-celebration.jpg',
    title: 'Vé Tết tới, mời bạn bay! - Vietjet Air',
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
  {
    id: 'banner-artwork-beach',
    image: '/images/hero/hero-artwork-beach-sunset.jpg',
    title: 'Kỳ nghỉ cùng Vietjet Air - Vietjet Air',
    focusClass: 'object-cover object-center',
  },
  {
    id: 'banner-bali',
    image: '/images/hero/hero-bali-terraces.jpg',
    title: 'Bali trong tầm tay - Vietjet Air',
    focusClass: 'object-cover object-center',
  },
  {
    id: 'banner-bangkok',
    image: '/images/hero/hero-bangkok-temple.jpg',
    title: 'Khám phá Bangkok - Vietjet Air',
    focusClass: 'object-cover object-center',
  },
  {
    id: 'banner-hongkong',
    image: '/images/hero/hero-hongkong-skyline.jpg',
    title: 'Hong Kong đêm rực rỡ - Vietjet Air',
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
    // Site thật (đo 13/11/2026): hero cao 950px ở desktop, đặt ngay dưới
    // thanh thông báo 50px. Dải đặt vé nằm ĐÈ lên mép dưới hero — không có
    // sóng SVG ở giữa. Trên mobile hero cao 380px và dải đặt vé trôi xuống
    // bình thường (absolute chỉ từ `lg` trở lên).
    <section className="relative w-full overflow-hidden bg-sky-100">
      <h1 className="sr-only">Vietjet Air - Thông báo quan trọng Nhà ga T3 Jakarta</h1>

      {/* Ảnh nền hero — slider các banner. Khung có chiều cao cụ thể vì ảnh
          nằm absolute; nếu không section sẽ collapse về 0px. */}
      <div className="relative h-[380px] sm:h-[560px] lg:h-[950px]">
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

        {/* Chấm điều hướng slider — site thật đặt ngay phía trên dải đặt vé
            (Y=686 ở mobile, chấm căn giữa banner). Canh theo container 1200px. */}
        <div
          data-testid="hero-slider-dots"
          className="absolute inset-x-0 bottom-[56px] z-20 mx-auto flex max-w-[1200px] items-center justify-center gap-2 px-4 sm:px-6 lg:bottom-[330px] lg:px-0"
        >
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

      {/* Dải đặt vé — 1200px, nằm ở mép dưới hero (desktop) và trôi xuống
          ngay sau banner (mobile). */}
      <div className="relative z-20 -mt-[40px] sm:-mt-[90px] lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0">
        <HeroBookingWidget />
      </div>
    </section>
  );
}
