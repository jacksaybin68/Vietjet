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
    // Số đo site thật (13/11/2026, viewport 1440×900):
    //   - Hero cao 725px, nằm ngay dưới thanh thông báo 50px (y=50..775).
    //   - Ảnh slider 1440×720, bo tròn không, canh trên.
    //   - Dải đặt vé rộng 380px nằm ở mép phải container 1200px, đỉnh ở
    //     y=214 (164px tính từ đỉnh hero).
    //   - Chấm điều hướng slider: `ul` absolute tại top 589.016px (hero-relative),
    //     canh giữa toàn bề ngang, mỗi chấm 20×20px.
    // Lưu ý: `section` KHÔNG dùng `overflow-hidden` — popover lịch 630px mở ra
    // ngoài khung panel và sẽ bị cắt mất nếu khối cha cắt tràn. Ảnh nền vẫn
    // được cắt riêng trong lớp bọc của nó.
    <section className="relative w-full bg-sky-100">
      <h1 className="sr-only">Vietjet Air - Thông báo quan trọng Nhà ga T3 Jakarta</h1>

      <div className="relative h-[380px] sm:h-[560px] lg:h-[725px]">
        {/* Ảnh nền hero — slider các banner. */}
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

        {/* Chấm điều hướng slider — site thật: absolute tại top 589.016px tính từ
            đỉnh hero, `text-align:center`, mỗi chấm là nút 20×20px với nội dung
            "•" 12px (trắng khi không active, đỏ #EC2029 khi active). */}
        <ul
          data-testid="hero-slider-dots"
          className="pointer-events-none absolute inset-x-0 top-[589px] z-20 flex justify-center"
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

        {/* Dải đặt vé — container 1200px, panel 380px neo ở mép phải.
            Chỉ hiển thị từ `lg` trở lên; trên mobile bản riêng nằm dưới hero. */}
        <div className="absolute inset-x-0 top-0 z-20 hidden h-full lg:block">
          <div className="mx-auto flex h-full max-w-[1200px] items-center justify-end">
            <div className="w-[380px] max-w-[380px] translate-y-[65px]">
              <HeroBookingWidget />
            </div>
          </div>
        </div>
      </div>

      {/* Dải đặt vé trên mobile — trôi xuống ngay sau banner. */}
      <div className="relative z-20 lg:hidden">
        <HeroBookingWidget />
      </div>
    </section>
  );
}
