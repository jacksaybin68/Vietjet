'use client';

import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

/* Dải sóng mây làm đường phân cách tự nhiên giữa Hero và khuyến mãi. */
const CLOUD_WAVE_SVG = `
<svg viewBox="0 0 1440 130" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,90 c160,90 160,-60 320,-60 c160,-60 160,90 320,90 c160,0 160,-90 320,-90 c160,90 160,0 320,0 c160,-60 160,90 320,90 c160,0 160,-90 160,-90 L1440,130 L0,130 Z" fill="white"/>
  <path d="M0,90 c160,90 160,-60 320,-60 c160,-60 160,90 320,90 c160,0 160,-90 320,-90 c160,90 160,0 320,0 c160,-60 160,90 320,90 c160,0 160,-90 160,-90" fill="none" stroke="#dcdcdc" stroke-width="2" opacity="0.6"/>
</svg>
`.trim();

const PROVINCE_DEALS = [
  {
    from: 'SGN',
    fromCity: 'TP. Hồ Chí Minh',
    price: 299000,
    date: 'Hôm nay',
    tag: 'Nội địa',
    image: '/images/hero/hero-artwork-beach-sunset.jpg',
    alt: 'Tp. Hồ Chí Minh - Tân Sơn Nhất nhìn từ trên cao',
  },
  {
    from: 'HAN',
    fromCity: 'Hà Nội',
    price: 349000,
    date: 'Cuối tuần',
    tag: 'Nội địa',
    image: '/images/hero/hero-hongkong-skyline.jpg',
    alt: 'Hà Nội - Nội Bài và hồ Tây',
  },
  {
    from: 'DAD',
    fromCity: 'Đà Nẵng',
    price: 199000,
    date: 'Flash sale',
    tag: 'Biển đảo',
    image: '/images/hero/hero-sale-aerial.jpg',
    alt: 'Đà Nẵng - cầu Rồng và biển',
  },
  {
    from: 'PQC',
    fromCity: 'Phú Quốc',
    price: 499000,
    date: 'Giá sốc',
    tag: 'Biển đảo',
    image: '/images/hero/hero-tet-celebration.jpg',
    alt: 'Phú Quốc - bãi biển và lá cừ',
  },
] as const;

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function DealsSection() {
  return (
    <section className="bg-[var(--surface)] py-12 sm:py-16 overflow-hidden">
      {/* Dải sóng mây phân cách */}
      <div className="relative -mt-[60px] sm:-mt-[70px] lg:-mt-[90px] z-10">
        <div className="relative w-full overflow-hidden">
          <div className="absolute inset-0 shadow-[0_16px_32px_rgba(0,0,0,0.08)]" />
          <div
            dangerouslySetInnerHTML={{ __html: CLOUD_WAVE_SVG }}
            className="w-full block max-w-[1440px] mx-auto"
          />
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">
            Vé rẻ theo tỉnh
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight">
            Khởi hành từ các thành phố lớn
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--foreground-muted)] max-w-2xl mx-auto">
            Săn vé khởi hành từ TP. Hồ Chí Minh, Hà Nội và các thành phố lớn với giá từ dưới
            200.000đ.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {PROVINCE_DEALS.map((deal) => (
            <Link
              key={deal.from}
              href={`/tim-ve?from=${deal.from}`}
              className="group relative block rounded-2xl overflow-hidden border border-vj-border bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-40 sm:h-48 overflow-hidden">
                <AppImage
                  src={deal.image}
                  alt={deal.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-wine/70 via-brand-wine/20 to-transparent" />
                <span
                  className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--vj-wine)] px-2.5 py-1 text-2xs font-bold text-white shadow-sm`}
                >
                  {deal.tag}
                </span>
                {/* Bong bóng giá tròn màu vàng chanh tràn góc phải trên */}
                <div className="absolute -top-3 -right-3 z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-200 px-2 text-center shadow-lg border border-white/60">
                    <span className="text-2xs sm:text-xs font-black text-[var(--vj-wine)] leading-none">
                      {formatVND(deal.price)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="font-black text-lg sm:text-xl text-[var(--foreground)] tracking-tight">
                  Từ {deal.fromCity}
                </h3>
                <p className="mt-1 text-sm text-[var(--foreground-muted)] font-semibold">
                  Ngày bay: {deal.date}
                </p>
                <div className="mt-5">
                  <span className="inline-flex items-center justify-center w-full rounded-xl border border-[var(--vj-wine)] bg-[var(--vj-wine)] px-3 py-2.5 text-xs2 sm:text-sm font-bold text-white transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--foreground)] group-hover:border-[var(--accent)]">
                    Chọn chuyến <span className="ml-1">→</span>
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
