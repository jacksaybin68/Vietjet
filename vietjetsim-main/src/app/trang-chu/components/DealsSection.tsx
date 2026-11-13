'use client';

import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

/**
 * Khối "Ưu đãi giá tốt mỗi ngày".
 * Site thật (đo 13/11/2026): H2 56px/600 (margin-bottom 48px), thẻ ưu đãi
 * 343×291 — ảnh cao 191px, phần dưới là nội dung trên nền #F3EFEC, bo góc 20px.
 */
const DAILY_DEALS = [
  {
    from: 'SGN',
    fromCity: 'TP. Hồ Chí Minh',
    price: 299000,
    date: 'Hôm nay',
    tag: 'Nội địa',
    image: '/images/hero/hero-artwork-beach-sunset.jpg',
    alt: 'TP. Hồ Chí Minh nhìn từ trên cao',
  },
  {
    from: 'HAN',
    fromCity: 'Hà Nội',
    price: 349000,
    date: 'Cuối tuần',
    tag: 'Nội địa',
    image: '/images/hero/hero-hongkong-skyline.jpg',
    alt: 'Hà Nội — phố cổ và hồ Hoàn Kiếm',
  },
  {
    from: 'DAD',
    fromCity: 'Đà Nẵng',
    price: 199000,
    date: 'Flash sale',
    tag: 'Biển đảo',
    image: '/images/hero/hero-sale-aerial.jpg',
    alt: 'Đà Nẵng — cầu Rồng và biển',
  },
  {
    from: 'PQC',
    fromCity: 'Phú Quốc',
    price: 499000,
    date: 'Giá sốc',
    tag: 'Biển đảo',
    image: '/images/hero/hero-tet-celebration.jpg',
    alt: 'Phú Quốc — bãi biển và lá cừ',
  },
] as const;

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function DealsSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="vj-section-wide">
        <h2 className="vj-headline mb-12">Ưu đãi giá tốt mỗi ngày</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {DAILY_DEALS.map((deal) => (
            <Link
              key={deal.from}
              href={`/tim-ve?from=${deal.from}`}
              className="group block overflow-hidden rounded-[20px] bg-[var(--vj-card-beige)] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative h-[191px] overflow-hidden">
                <AppImage
                  src={deal.image}
                  alt={deal.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                  {deal.tag}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-[var(--vj-ink)]">Từ {deal.fromCity}</h3>
                <p className="mt-1 text-sm text-[var(--vj-muted)]">Ngày bay: {deal.date}</p>
                <p className="mt-3 text-xl font-bold text-[var(--primary)]">
                  {formatVND(deal.price)}
                </p>
                <span className="mt-4 inline-flex items-center justify-center rounded-[10px] border-2 border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--foreground)] transition-colors group-hover:border-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white">
                  Chọn chuyến <span className="ml-1">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
