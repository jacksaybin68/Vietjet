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
    // Số đo site thật (13/11/2026, viewport 1440×900):
    //   - Hero cao 725px, nằm ngay dưới thanh thông báo 50px (y=50..775).
    //   - Ảnh slider 1440×720, bo tròn không, canh trên.
    //   - Dải đặt vé rộng 380px nằm ở mép phải container 1200px, đỉnh ở
    //     y=214 (164px tính từ đỉnh hero).
    //   - Chấm điều hướng slider: `ul` absolute tại top 589.016px (hero-relative),
    //     canh giữa toàn bề ngang, mỗi chấm 20×20px.
    //
    // MOBILE (390×844, đo trực tiếp site thật):
    //   - Ảnh slider cao 422px, bắt đầu ngay dưới thanh thông báo 35px
    //     (y=35..457) — hàng header 56px PHỦ lên trên ảnh.
    //   - Chấm điều hướng: `ul` absolute tại top 297px (hero-relative) →
    //     y=332 tuyệt đối, mỗi chấm 20×20px nằm ở y=338.
    //   - Dải đặt vé PHỦ xuống banner: hàng tab bắt đầu ở y=368, thân panel
    //     ở y=420 (cao 305px) → tổng khối đặt vé tràn xuống dưới banner.
    // Lưu ý: `section` KHÔNG dùng `overflow-hidden` — popover lịch 630px mở ra
    // ngoài khung panel và sẽ bị cắt mất nếu khối cha cắt tràn. Ảnh nền vẫn
    // được cắt riêng trong lớp bọc của nó.
    <section className="relative w-full bg-sky-100 pb-[268px] lg:pb-0">
      <h1 className="sr-only">Vietjet Air - Thông báo quan trọng Nhà ga T3 Jakarta</h1>

      <div className="relative h-[422px] sm:h-[560px] lg:h-[725px]">
        {/* Ảnh nền hero — slider các banner. */}
        <div
          className="absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
          data-visual-mask="hero"
        >
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

        {/* Chấm điều hướng slider — site thật: absolute tại top 589px tính từ đỉnh hero */}
        <ul
          data-testid="hero-slider-dots"
          className="pointer-events-none absolute inset-x-0 top-[297px] z-20 flex justify-center pt-[6px] lg:top-[589px] lg:pt-0"
        >
          {HERO_BANNERS.map((_, idx) => (
            <li key={idx} className="relative inline-block h-5 w-5">
              <button
                type="button"
                aria-label={`Chuyển sang banner ${idx + 1}`}
                aria-current={idx === currentBannerIndex ? 'true' : undefined}
                onClick={() => setCurrentBannerIndex(idx)}
                className="pointer-events-auto block h-5 w-5 cursor-pointer p-[5px] text-xs leading-none transition-colors before:block before:h-auto before:w-auto before:content-['•']"
                style={{ color: idx === currentBannerIndex ? '#EC2029' : '#FFFFFF' }}
              />
            </li>
          ))}
        </ul>

        {/* Dải mây lượn sóng đáy banner đặc trưng Vietjet */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 sm:h-12 w-full"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 100%, #ffffff 65%, rgba(255,255,255,0.7) 70%, transparent 72%)`,
            backgroundSize: '40px 20px',
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'bottom',
          }}
          aria-hidden="true"
        />

        {/* Amy Mascot với tooltip "Xin chào!" góc dưới bên phải */}
        <div className="absolute right-4 sm:right-8 bottom-3 sm:bottom-4 z-30 flex items-end pointer-events-none select-none">
          <div className="relative mb-12 sm:mb-14 -mr-1">
            <div className="bg-white text-gray-800 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg border border-gray-200">
              Xin chào!
            </div>
            <div className="w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45 ml-auto mr-4 -mt-1 shadow-xs" />
          </div>
          <img
            src="/images/hero/amy-mascot.png"
            alt="Mascot Amy"
            className="w-16 sm:w-20 lg:w-24 h-auto drop-shadow-lg"
            loading="lazy"
          />
        </div>
      </div>

      {/* Dải đặt vé 380px neo mép phải container 1200px chuẩn vietjetair.com */}
      <div className="absolute inset-x-0 top-[333px] z-20 mx-auto w-full max-w-[1200px] lg:inset-x-auto lg:left-1/2 lg:top-[164px] lg:-translate-x-1/2 lg:flex lg:justify-end lg:px-0">
        <div className="w-full lg:w-[380px] lg:max-w-[380px]">
          <HeroBookingWidget />
        </div>
      </div>
    </section>
  );
}
