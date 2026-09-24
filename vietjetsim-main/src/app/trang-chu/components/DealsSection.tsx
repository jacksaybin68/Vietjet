'use client';
'use client';
import React, { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { DealCard } from '@/features/flights';
import { MdArrowForward, MdLocalFireDepartment } from 'react-icons/md';

const DEALS = [
  {
    route: 'HAN → SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    price: 399000,
    original: 799000,
    discount: '50%',
    date: '15 - 30/04/2026',
    image: '/images/hero/download.jpg',
    alt: 'Ha Noi nhin tu tren cao voi Ho Tay va pho co',
    badge: 'Flash Sale',
    from: 'HAN',
    to: 'SGN',
  },
  {
    route: 'SGN → PQC',
    fromCity: 'TP.HCM',
    toCity: 'Phú Quốc',
    price: 299000,
    original: 599000,
    discount: '50%',
    date: '01 - 15/05/2026',
    image: '/images/hero/download-3.jpg',
    alt: 'Bai bien Phu Quoc voi nuoc bien xanh trong va cat trang',
    badge: 'Hè 2026',
    from: 'SGN',
    to: 'PQC',
  },
  {
    route: 'HAN → DAD',
    fromCity: 'Hà Nội',
    toCity: 'Đà Nẵng',
    price: 249000,
    original: 499000,
    discount: '50%',
    date: '20/03 - 10/04/2026',
    image: '/images/hero/banner-4-44-sale.jpg',
    alt: 'Cau Rong Da Nang phun lua ve dem',
    badge: 'Cuối tuần',
    from: 'HAN',
    to: 'DAD',
  },
  {
    route: 'SGN → HUI',
    fromCity: 'TP.HCM',
    toCity: 'Huế',
    price: 329000,
    original: 649000,
    discount: '49%',
    date: '01 - 20/04/2026',
    image: '/images/hero/download-4.jpg',
    alt: 'Dai Noi Hue - Co do trieu Nguyen',
    badge: 'Lễ 30/4',
    from: 'SGN',
    to: 'HUI',
  },
  {
    route: 'HAN → PQC',
    fromCity: 'Hà Nội',
    toCity: 'Phú Quốc',
    price: 499000,
    original: 999000,
    discount: '50%',
    date: '10 - 25/05/2026',
    image: '/images/hero/download-5.jpg',
    alt: 'Dao Phu Quoc nhin tu tren cao voi rung va bien xanh',
    badge: 'Bay thẳng',
    from: 'HAN',
    to: 'PQC',
  },
];

export default function DealsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' }
    );
    sectionRef?.current
      ?.querySelectorAll('.reveal-up, .reveal-left')
      ?.forEach((el) => observer?.observe(el));
    return () => observer?.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const rect = sectionRef?.current?.getBoundingClientRect();
      if (!rect) return;
      const offset = rect.top + scrollY;
      const headerEl = headerRef.current;
      if (headerEl && scrollY < offset) {
        headerEl.style.transform = `translateY(${scrollY * 0.15}px)`;
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <section ref={sectionRef} className="py-8 md:py-12 lg:py-14 bg-white/5">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className="flex items-end justify-between mb-5 md:mb-7 lg:mb-8 reveal-left gap-3"
          style={{ transition: 'transform 0.1s linear' }}
        >
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="text-[9px] md:text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.18em] md:tracking-[0.22em] text-primary"
                style={{ letterSpacing: '0.22em' }}
              >
                Khuyến mãi hot
              </span>
              <MdLocalFireDepartment className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-navysm:text-2xl md:text-3xl">
              Săn vé giá rẻ mỗi ngày
            </h2>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {DEALS.length > 0 && (
              <span className="text-[10px] md:text-xs text-vj-muted/60">{DEALS.length} ưu đãi</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {DEALS?.map((deal) => (
            <DealCard key={deal.route} deal={deal} />
          ))}
        </div>

        <div className="md:hidden mt-3 text-center reveal-up" style={{ transitionDelay: '450ms' }}>
          <Link
            href="/tim-ve"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primarytransition-all duration-200 border px-3 py-1.5 rounded-md hover:shadow-md hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(236,32,41,0.25)',
              fontWeight: 700,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#EC2029';
              (e.currentTarget as HTMLElement).style.color = 'white';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#EC2029';
            }}
          >
            Xem tất cả ưu đãi
            <MdArrowForward className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
