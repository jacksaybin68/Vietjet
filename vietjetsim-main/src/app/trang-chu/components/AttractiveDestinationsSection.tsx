'use client';

import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

/**
 * Khối "Cảm hứng cho chuyến đi tiếp theo của bạn".
 * Site thật (đo 13/11/2026): H2 56px/600 (margin-bottom 48px), thẻ chính bên
 * trái 680×439 nền #DCE0F2 bo góc 16px, cột phải gồm các thẻ nhỏ rộng 292px.
 */
const FEATURED = {
  city: 'Đà Nẵng',
  country: 'Việt Nam',
  code: 'DAD',
  price: 199000,
  image: '/images/hero/hero-sale-aerial.jpg',
  alt: 'Đà Nẵng — cầu Rồng và biển',
};

const DESTINATIONS = [
  {
    city: 'Phú Quốc',
    country: 'Việt Nam',
    code: 'PQC',
    price: 399000,
    image: '/images/hero/hero-tet-celebration.jpg',
    alt: 'Phú Quốc — bãi biển trắng nước xanh',
  },
  {
    city: 'Hà Nội',
    country: 'Việt Nam',
    code: 'HAN',
    price: 349000,
    image: '/images/hero/hero-hongkong-skyline.jpg',
    alt: 'Hà Nội — phố cổ và hồ Gươm',
  },
  {
    city: 'Bali',
    country: 'Indonesia',
    code: 'DPS',
    price: 1999000,
    image: '/images/hero/hero-bali-terraces.jpg',
    alt: 'Bali — ruộng bậc thang',
  },
] as const;

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function AttractiveDestinationsSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="vj-section-wide">
        <h2 className="vj-headline mb-12">Cảm hứng cho chuyến đi tiếp theo của bạn</h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[680px_292px] lg:gap-6">
          {/* Thẻ chính 680×439, nền #DCE0F2, bo góc 16px. */}
          <Link
            href={`/tim-ve?to=${encodeURIComponent(FEATURED.code)}`}
            className="group relative block h-[439px] overflow-hidden rounded-[16px] bg-[var(--vj-sky-card)]"
          >
            <AppImage
              src={FEATURED.image}
              alt={FEATURED.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 680px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--vj-ink-rgb))]/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h3 className="text-3xl font-bold">{FEATURED.city}</h3>
              <p className="mt-1 text-base text-white/85">{FEATURED.country}</p>
              <p className="mt-3 text-xl font-bold text-[var(--accent)]">
                Từ {formatVND(FEATURED.price)}
              </p>
            </div>
          </Link>

          {/* Cột thẻ nhỏ rộng 292px. */}
          <div className="flex flex-col gap-5">
            {DESTINATIONS.map((dest) => (
              <Link
                key={dest.code}
                href={`/tim-ve?to=${encodeURIComponent(dest.code)}`}
                className="group flex h-[126px] items-center gap-4 overflow-hidden rounded-[16px] bg-[var(--vj-sky-card)] px-4 py-3 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[12px]">
                  <AppImage
                    src={dest.image}
                    alt={dest.alt}
                    fill
                    sizes="100px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-[var(--vj-ink)]">{dest.city}</h3>
                  <p className="mt-1 truncate text-sm text-[var(--vj-muted)]">{dest.country}</p>
                  <p className="mt-2 text-sm font-bold text-[var(--primary)]">
                    Từ {formatVND(dest.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
