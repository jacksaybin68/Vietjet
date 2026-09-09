'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';
import { DealsSkeleton } from '@/shared/components/ui';
import { DealCard } from '@/features/flights';
import type { Deal } from '@/types/deals';
import { FaPlane } from 'react-icons/fa';
import { MdCalendarToday, MdArrowForward, MdLocalFireDepartment } from 'react-icons/md';

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
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  // imageRefs used for per‑image parallax (kept for backward compatibility)
  // Instant render without artificial skeleton delay
  const [loading, setLoading] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Intersection observer for staggered reveal
  useEffect(() => {
    if (loading) return;
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
  }, [loading]);

  // Parallax scroll handler
  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const viewH = window.innerHeight;

      // Header strip parallax — subtle upward drift
      if (headerRef.current) {
        const progress = Math.max(0, Math.min(1, (viewH - rect.top) / (viewH + rect.height)));
        const drift = (progress - 0.5) * 18;
        headerRef.current.style.transform = `translateY(${drift}px)`;
      }

      // Per-card image parallax
      imageRefs.current.forEach((imgWrapper) => {
        if (!imgWrapper) return;
        const cardRect = imgWrapper.getBoundingClientRect();
        const cardCenter = cardRect.top + cardRect.height / 2;
        const relativePos = (viewH / 2 - cardCenter) / viewH;
        const parallaxY = relativePos * 28;
        imgWrapper.style.transform = `translateY(${parallaxY}px) scale(1.12)`;
      });
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loading, handleScroll]);

  if (loading) return <DealsSkeleton />;

  return (
    <section ref={sectionRef} id="deals" className="py-4 md:py-8 bg-white dark:bg-navy-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        {/* Header strip with parallax drift */}
        <div
          ref={headerRef}
          className="flex flex-wrap items-center justify-between mb-3 md:mb-5 reveal-left will-change-transform"
          style={{ transition: 'transform 0.1s linear' }}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <span className="vj-section-label flex items-center gap-1">
              <MdLocalFireDepartment className="w-3 h-3 md:w-3.5 md:h-3.5 text-orange-300 animate-pulse" />
              Ưu đãi nóng
            </span>
            <h2
              className="text-lg md:text-xl sm:text-2xl font-black tracking-tight text-vj-text dark:text-white"
              style={{ fontWeight: 900 }}
            >
              Vé giá rẻ hôm nay
            </h2>
          </div>
          <Link
            href="/tim-ve"
            className="hidden md:flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-primary dark:text-[#FFC400] transition-all duration-200 border px-2.5 md:px-3 py-1 md:py-1.5 rounded-md hover:shadow-md hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(236,32,41,0.25)',
              fontWeight: 700,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#ED1D23';
              (e.currentTarget as HTMLElement).style.color = 'white';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#ED1D23';
            }}
          >
            Xem tất cả
            <MdArrowForward className="w-3 h-3 md:w-3.5 md:h-3.5" />
          </Link>
        </div>

        {/* Deal cards — staggered fade-in + per-image parallax */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-2">
          {DEALS?.map((deal, i) => (
            <Link
              key={deal?.route}
              href={`/tim-ve?from=${deal?.from}&to=${deal?.to}`}
              style={{
                transitionDelay: `${i * 90}ms`,
                transitionDuration: '0.65s',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="vj-deal-card reveal-up group"
            >
              {/* Image wrapper — overflow hidden so parallax stays clipped */}
              <div className="relative h-36 md:h-44 overflow-hidden">
                <div
                  ref={(el) => {
                    imageRefs.current[i] = el;
                  }}
                  className="absolute inset-0 will-change-transform"
                  style={{ transform: 'translateY(0px) scale(1.12)' }}
                >
                  <AppImage
                    src={deal?.image}
                    alt={deal?.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="280px"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span
                  className="absolute top-0 left-0 text-[10px] md:text-xs font-black px-2 md:px-3 py-1 md:py-1.5 text-white shadow-sm bg-primary-solid"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)',
                    letterSpacing: '0.03em',
                    fontStyle: 'italic',
                    fontWeight: 800,
                  }}
                >
                  {deal?.badge}
                </span>
                <span
                  className="absolute top-1.5 right-1.5 md:top-2 md:right-2 text-[10px] md:text-xs font-black px-2 md:px-2.5 py-0.5 md:py-1 rounded-md shadow-sm text-navy"
                  style={{
                    background:
                      'linear-gradient(26.73deg, rgb(249,165,26) 13.7%, rgb(251,182,18) 29.8%, rgb(255,221,0) 66.81%)',
                    fontWeight: 900,
                  }}
                >
                  -{deal?.discount}
                </span>
                <div className="absolute bottom-1.5 left-2 right-2 md:bottom-2 md:left-3 md:right-3 flex items-center gap-1 md:gap-1.5">
                  <span className="text-white font-black text-[11px] md:text-sm font-body">{deal?.fromCity}</span>
                  <FaPlane className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-yellow-300 flex-shrink-0" />
                  <span className="text-white font-black text-[11px] md:text-sm font-body">{deal?.toCity}</span>
                </div>
              </div>

              <div className="p-3 md:p-4">
                <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase mb-1 text-vj-muted dark:text-white/60">
                  {deal?.route}
                </div>
                <div className="text-[10px] md:text-xs mb-2 md:mb-3 flex items-center gap-1 font-koho text-vj-gray dark:text-white/60">
                  <MdCalendarToday className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span>{deal?.date}</span>
                </div>
                <div className="flex items-end justify-between gap-1">
                  <div>
                    <div className="text-[10px] md:text-xs line-through leading-none mb-0.5 text-vj-muted dark:text-white/50">
                      {deal?.original?.toLocaleString('vi-VN')}đ
                    </div>
                    <div
                      className="text-base md:text-lg font-black leading-none text-primary dark:text-[#FFC400]"
                      style={{ fontWeight: 900 }}
                    >
                      {deal?.price?.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <div
                    className="text-white dark:text-navy-dark text-[10px] md:text-xs font-bold px-2 md:px-3 py-1.5 md:py-2 rounded-lg hover:shadow-md transition-all duration-200 hover:brightness-110 bg-primary-solid flex-shrink-0"
                    style={{ letterSpacing: '0.02em', fontWeight: 700 }}
                  >
                    Đặt ngay
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="md:hidden mt-3 text-center reveal-up" style={{ transitionDelay: '450ms' }}>
          <Link href="/tim-ve" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary dark:text-[#FFC400] transition-all duration-200 border px-3 py-1.5 rounded-md hover:shadow-md hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(236,32,41,0.25)',
              fontWeight: 700,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#ED1D23';
              (e.currentTarget as HTMLElement).style.color = 'white';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#ED1D23';
            }}
          >
            Xem tất cả ưu đãi
            <MdArrowForward className="w-3 h-3" />
          </Link>
        </div
      </div>
    </section>
  );
}
