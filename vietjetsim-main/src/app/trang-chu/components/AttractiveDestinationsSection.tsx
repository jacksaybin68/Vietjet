'use client';

import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

const DESTINATIONS = [
  {
    city: 'Quảng Bình',
    country: 'Việt Nam',
    code: 'VDH',
    image: '/images/hero/hero-sale-aerial.jpg',
    alt: 'Phong nhà hang Quảng Bình',
  },
  {
    city: 'Gia Lai',
    country: 'Việt Nam',
    code: 'PXU',
    image: '/images/hero/hero-bali-terraces.jpg',
    alt: 'Gia Lai - bình nguyên Pleiku',
  },
  {
    city: 'Nghệ An',
    country: 'Việt Nam',
    code: 'VII',
    image: '/images/hero/hero-window-clouds.jpg',
    alt: 'Nghệ An - cửa sien Mông',
  },
  {
    city: 'Hà Nội',
    country: 'Việt Nam',
    code: 'HAN',
    image: '/images/hero/hero-hongkong-skyline.jpg',
    alt: 'Hà Nội - phố cổ và hồ Gươm',
  },
  {
    city: 'Thành phố Hồ Chí Minh',
    country: 'Việt Nam',
    code: 'SGN',
    image: '/images/hero/hero-artwork-beach-sunset.jpg',
    alt: 'TP. Hồ Chí Minh - phố người đi vorüber',
  },
  {
    city: 'Phú Quốc',
    country: 'Việt Nam',
    code: 'PQC',
    image: '/images/hero/hero-tet-celebration.jpg',
    alt: 'Phú Quốc - bãi biển trắng nước xanh',
  },
] as const;

export default function AttractiveDestinationsSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">
            Điểm đến hấp dẫn
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight">
            Khám phá đất nước từ trên cao
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--foreground-muted)] max-w-2xl mx-auto">
            6 điểm đến nhất định phải đến trong năm, giá vé bắt đầu từ 199.000đ.
          </p>
        </div>

        {/* Lưới 2×3: chữ trắng in đậm trên nền gradient chân ảnh */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
          {DESTINATIONS.map((dest) => (
            <Link
              key={dest.code}
              href={`/tim-ve?to=${encodeURIComponent(dest.city)}`}
              className="group block rounded-2xl overflow-hidden border border-vj-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-44 sm:h-52 overflow-hidden">
                <AppImage
                  src={dest.image}
                  alt={dest.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-wine/85 via-brand-wine/35 to-transparent" />
              </div>
              <div className="p-4 sm:p-5 bg-white">
                <h3 className="font-black text-base sm:text-lg text-[var(--foreground)] leading-tight group-hover:text-[var(--primary)] transition-colors">
                  {dest.city}
                </h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs2 sm:text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-[0.08em]">
                    {dest.country}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[var(--primary)]">
                    Từ 199.000đ*
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
