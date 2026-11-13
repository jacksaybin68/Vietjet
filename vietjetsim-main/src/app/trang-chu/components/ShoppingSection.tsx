'use client';

import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

/**
 * Khối "Mua sắm trực tuyến, nhận hàng trên máy bay".
 * Site thật (đo 13/11/2026): ảnh–chữ hai cột, H2 56px/600.
 */
const PRODUCTS = [
  {
    title: 'Mua sắm trực tuyến',
    description:
      'Đặt món đồ yêu thích ngay trên website, nhận ngay trên máy bay mà không cần xếp hàng ở cửa hàng miễn thuế.',
    image: '/images/hero/hero-skyboss-cabin.jpg',
    alt: 'Khoang cabin Vietjet với hàng hóa miễn thuế',
    href: '/dich-vu?service=skyshop',
  },
  {
    title: 'Gửi quà yêu thích',
    description:
      'Gửi quà đến người thân bằng dịch vụ Swift 247 — nhanh chóng, tiện lợi và an toàn trên mọi chuyến bay.',
    image: '/images/hero/hero-window-clouds.jpg',
    alt: 'Gửi hàng nhanh Swift 247',
    href: '/dich-vu?service=cargo',
  },
] as const;

export default function ShoppingSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="vj-section-wide">
        <h2 className="vj-headline mb-12">Mua sắm trực tuyến, nhận hàng trên máy bay</h2>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative h-[300px] overflow-hidden rounded-[24px] sm:h-[380px] lg:h-[440px]">
            <AppImage
              src={PRODUCTS[0].image}
              alt={PRODUCTS[0].alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--vj-ink-rgb))]/60 via-transparent to-transparent" />
          </div>

          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
              Skyshop
            </p>
            <h3 className="text-3xl font-bold text-[var(--vj-ink)]">{PRODUCTS[0].title}</h3>
            <p className="mt-4 max-w-[32rem] text-lg leading-8 text-[var(--foreground)]">
              {PRODUCTS[0].description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {PRODUCTS.map((product) => (
                <Link
                  key={product.title}
                  href={product.href}
                  className="inline-flex items-center rounded-full border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {product.title}
                </Link>
              ))}
            </div>

            <Link href={PRODUCTS[0].href} className="vj-cta mt-8 px-6 py-2.5 text-sm font-bold">
              Khám phá ngay
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
