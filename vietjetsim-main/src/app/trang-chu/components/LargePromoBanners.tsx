'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppImage from '@/shared/components/ui/AppImage';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

export const PROMO_BANNERS = [
  {
    title: 'Bay theo đoàn vui ngập tràn',
    description: 'Ưu đãi đặc biệt cho đoàn từ 10 khách trở lên',
    action: 'Xem chi tiết',
    image: '/images/promos/1.webp',
    href: '/lien-he',
  },
  {
    title: 'Vé Tết hời, mời bạn bay!',
    description: 'Săn ngay vé Tết giá cực sốc cho năm 2027',
    action: 'Săn vé ngay',
    image: '/images/promos/2.webp',
    href: '/tim-ve',
  },
  {
    title: 'Vi vu khắp Trung Quốc cùng DiDi',
    description: 'Ưu đãi đặt xe và bay cùng Vietjet',
    action: 'Tìm hiểu thêm',
    image: '/images/promos/3.webp',
    href: '/dich-vu',
  },
  {
    title: 'Bay khắp thế giới, chạm đỉnh cao mới',
    description: 'Khám phá các điểm đến tuyệt vời từ Đà Nẵng',
    action: 'Xem hành trình',
    image: '/images/promos/4.webp',
    href: '/tim-ve',
  },
  {
    title: 'Ưu đãi đặc biệt cho khách hàng',
    description: 'Khám phá hành trình mới với giá ưu đãi',
    action: 'Xem ngay',
    image: '/images/promos/5.png',
    href: '/tim-ve',
  },
  {
    title: 'Bay xa hơn, tiết kiệm hơn',
    description: 'Nhận voucher giảm giá cho chuyến bay tiếp theo',
    action: 'Nhận ưu đãi',
    image:
      'https://vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com/2-top-banner-mb-1790133377712.jpg',
    href: '/tim-ve',
  },
  {
    title: 'Hè rực rỡ, bay cùng Vietjet',
    description: 'Ưu đãi vé hè cho mọi điểm đến nội địa',
    action: 'Đặt vé ngay',
    image:
      'https://vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com/2-top-banner-mb-1786359790593.jpg',
    href: '/tim-ve',
  },
  {
    title: 'Khám phá Á Đông',
    description: 'Ưu đãi đặc biệt cho các chặng bay quốc tế',
    action: 'Xem chi tiết',
    image:
      'https://vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com/2-top-banner-mb-1785556231844.jpg',
    href: '/tim-ve',
  },
  {
    title: 'Săn deal hời, bay mỏi tay',
    description: 'Giảm giá sâu cho các khung giờ vàng trong ngày',
    action: 'Săn ngay',
    image:
      'https://vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com/2-topbannermb-1790215742466.jpg',
    href: '/tim-ve',
  },
  {
    title: 'Chào đón mùa lễ hội',
    description: 'Vui lễ hội, bay cùng bạn bè',
    action: 'Đặt chỗ ngay',
    image:
      'https://vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com/2topbannermbvn-1791347143265.jpg',
    href: '/tim-ve',
  },
  {
    title: 'Bay cùng Vietjet, trọn vẹn niềm vui',
    description: 'Khám phá những ưu đãi mới nhất từ chúng tôi',
    action: 'Xem thêm',
    image: '/images/promos/6.png',
    href: '/tim-ve',
  },
];

export default function LargePromoBanners() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
  const prevSlide = () =>
    setCurrentIndex((prev) => (prev - 1 + PROMO_BANNERS.length) % PROMO_BANNERS.length);

  return (
    <section className="relative w-full bg-white py-8 overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-4">
        <div className="relative group rounded-3xl overflow-hidden shadow-2xl aspect-[21/9] sm:aspect-[3/1]">
          {/* Slides */}
          <div
            className="flex transition-transform duration-700 ease-in-out h-full"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {PROMO_BANNERS.map((banner, index) => (
              <div key={index} className="w-full h-full shrink-0 relative">
                <AppImage
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                {/* Overlay for text readability on some images */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

                {/* Content Overlay */}
                <div className="absolute inset-0 flex items-center px-8 sm:px-16">
                  <div className="max-w-md text-white animate-fade-in-up">
                    <h3 className="text-2xl sm:text-4xl font-black italic uppercase mb-2 drop-shadow-lg">
                      {banner.title}
                    </h3>
                    <p className="text-sm sm:text-lg font-medium mb-6 opacity-90 drop-shadow-md">
                      {banner.description}
                    </p>
                    <Link
                      href={banner.href}
                      className="vj-cta inline-block px-6 py-3 rounded-full font-bold text-black transition-transform hover:scale-105 active:scale-95"
                    >
                      {banner.action}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/50 transition-all z-10"
          >
            <HiChevronLeft className="w-8 h-8 mx-auto" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/50 transition-all z-10"
          >
            <HiChevronRight className="w-8 h-8 mx-auto" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {PROMO_BANNERS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  currentIndex === index ? 'w-8 bg-vjyellow' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
