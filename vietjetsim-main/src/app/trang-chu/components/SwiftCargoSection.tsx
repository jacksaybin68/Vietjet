'use client';

import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

/**
 * Khối ảnh–chữ "Swift 247 / Gửi hàng nhanh chóng".
 * Site thật (đo 13/11/2026): ảnh bên trái 634×1091 tràn ra ngoài khung, chữ bên
 * phải. Ảnh dùng asset local + CSS gradient để tôn vinh tông xanh trời.
 */
export default function SwiftCargoSection() {
  return (
    <section className="relative overflow-hidden bg-white py-12 sm:py-16">
      <div className="vj-section-wide">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Ảnh bên trái */}
          <div className="relative">
            <div className="relative h-[320px] overflow-hidden rounded-[24px] sm:h-[420px] lg:h-[520px]">
              <AppImage
                src="/images/hero/hero-skyboss-cabin.jpg"
                alt="Swift 247 — gửi hàng nhanh chóng"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--vj-teal-rgb))]/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-flex items-center rounded-full bg-white/95 px-4 py-2 text-base font-bold text-[var(--vj-teal)]">
                  Swift 247
                </span>
              </div>
            </div>
          </div>

          {/* Chữ bên phải */}
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
              Dịch vụ vận chuyển
            </p>
            <h2 className="vj-headline">Gửi hàng nhanh chóng</h2>
            <p className="vj-headline-sub mt-4 max-w-[32rem]">
              Swift 247 — dịch vụ chuyển hàng nhanh trong 24 giờ đến tận khắp Việt Nam. Gửi quà
              tặng, gửi tài liệu và gửi hàng hóa đều tiện lợi, an toàn.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Giao hàng trong 24 giờ nội địa',
                'Theo dõi hành trình đơn vị theo thời gian thực',
                'Đồng hành cùng Vietjet trên mọi chuyến bay',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-base text-[var(--foreground)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dich-vu?service=cargo"
              className="vj-cta mt-8 px-6 py-2.5 text-sm font-bold"
            >
              Tìm hiểu dịch vụ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
