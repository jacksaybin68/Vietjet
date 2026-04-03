'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { DealsSkeleton } from '@/components/ui/SkeletonLoader';
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
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1588098f1-1773722431272.png',
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
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1ba495ad4-1772468780050.png',
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
    image: 'https://images.unsplash.com/photo-1622390666541-42cad6e870b9',
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
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1f2671aa7-1773722433938.png',
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
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1a2c02d00-1767606150764.png',
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
  const [loading, setLoading] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1100);
    return () => clearTimeout(timer);
  }, []);

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
    <section ref={sectionRef} id="deals" className="py-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header strip with parallax drift */}
        <div
          ref={headerRef}
          className="flex items-center justify-between mb-5 reveal-left will-change-transform"
          style={{ transition: 'transform 0.1s linear' }}
        >
          <div className="flex items-center gap-3">
            <span className="vj-section-label flex items-center gap-1">
              <MdLocalFireDepartment className="w-3.5 h-3.5 text-orange-300 animate-pulse" />
              Ưu đãi nóng
            </span>
            <h2
              className="text-lg sm:text-xl font-black tracking-tight text-vj-text"
              style={{ fontWeight: 900 }}
            >
              Vé giá rẻ hôm nay
            </h2>
          </div>
          <Link
            href="/flight-booking"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-primary transition-all duration-200 border px-3 py-1.5 rounded-md hover:shadow-md hover:scale-105 active:scale-95"
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
            Xem tất cả
            <MdArrowForward className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Deal cards — staggered fade-in + per-image parallax */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {DEALS?.map((deal, i) => (
            <Link
              key={deal?.route}
              href={`/flight-booking?from=${deal?.from}&to=${deal?.to}`}
              style={{
                transitionDelay: `${i * 90}ms`,
                transitionDuration: '0.65s',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="vj-deal-card min-w-[210px] sm:min-w-[230px] flex-shrink-0 reveal-up"
            >
              {/* Image wrapper — overflow hidden so parallax stays clipped */}
              <div className="relative h-32 overflow-hidden">
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
                    sizes="230px"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span
                  className="absolute top-0 left-0 text-[10px] font-black px-2.5 py-1 text-white shadow-sm bg-primary-solid"
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
                  className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm text-navy"
                  style={{
                    background:
                      'linear-gradient(26.73deg, rgb(249,165,26) 13.7%, rgb(251,182,18) 29.8%, rgb(255,221,0) 66.81%)',
                    fontWeight: 900,
                  }}
                >
                  -{deal?.discount}
                </span>
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                  <span className="text-white font-black text-xs font-body">{deal?.fromCity}</span>
                  <FaPlane className="w-3 h-3 text-yellow-300 flex-shrink-0" />
                  <span className="text-white font-black text-xs font-body">{deal?.toCity}</span>
                </div>
              </div>

              <div className="p-3">
                <div className="text-[10px] font-bold tracking-widest uppercase mb-1 text-vj-muted">
                  {deal?.route}
                </div>
                <div className="text-[10px] mb-2.5 flex items-center gap-1 font-koho">
                  <MdCalendarToday className="w-3 h-3" />
                  <span>{deal?.date}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] line-through leading-none mb-0.5 text-vj-muted">
                      {deal?.original?.toLocaleString('vi-VN')}đ
                    </div>
                    <div
                      className="text-base font-black leading-none text-primary"
                      style={{ fontWeight: 900 }}
                    >
                      {deal?.price?.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <div
                    className="text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md hover:shadow-md transition-all duration-200 hover:brightness-110 bg-primary-solid"
                    style={{
                      letterSpacing: '0.02em',
                      fontWeight: 700,
                    }}
                  >
                    Đặt ngay
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="sm:hidden mt-4 text-center reveal-up" style={{ transitionDelay: '450ms' }}>
          <Link href="/flight-booking" className="vj-btn vj-btn-outline vj-btn-sm inline-flex">
            Xem tất cả ưu đãi
            <MdArrowForward className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
