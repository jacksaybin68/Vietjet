'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { PopularRoutesSkeleton } from '@/components/ui/SkeletonLoader';
import {
  FaPlane,
  FaSuitcaseRolling,
  FaShieldAlt,
  FaTicketAlt,
  FaShoppingCart,
} from 'react-icons/fa';
import { MdCheckCircle, MdArrowForward } from 'react-icons/md';

const SERVICES = [
  { label: 'Đặt vé máy bay', href: '/flight-booking', Icon: FaPlane, iconBg: '#EC2029' },
  {
    label: 'Mua hành lý & bữa ăn',
    href: '/flight-booking',
    Icon: FaSuitcaseRolling,
    iconBg: '#10b981',
  },
  { label: 'Check-in ưu tiên', href: '/flight-booking', Icon: MdCheckCircle, iconBg: '#0ea5e9' },
  { label: 'Duty Free', href: '/homepage', Icon: FaShoppingCart, iconBg: '#b91c1c' },
  { label: 'Bảo hiểm du lịch', href: '/homepage', Icon: FaShieldAlt, iconBg: '#f59e0b' },
  { label: 'Vietjet e-Voucher', href: '/homepage', Icon: FaTicketAlt, iconBg: '#7c3aed' },
];

const PROMO_BANNERS = [
  {
    id: 1,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_191890201-1773716195662.png',
    alt: 'Jet Cafe - Bua an tuoi ngon tren chuyen bay Vietjet',
    label: 'Enjoy flying',
    title: 'Jet Café',
    subtitle: '9 món ăn tươi ngon',
    cta: 'Đặt ngay',
  },
  {
    id: 2,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_13b317307-1773716193087.png',
    alt: 'Bao hiem du lich toan dien cho hanh khach Vietjet',
    label: 'Bảo hiểm',
    title: 'An tâm bay',
    subtitle: 'Bảo hiểm toàn diện',
    cta: 'Mua ngay',
  },
  {
    id: 3,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1932a17a0-1773716193603.png',
    alt: 'Dich vu chuyen phat nhanh hang hoa Vietjet Cargo',
    label: 'Chuyển phát',
    title: 'Gửi hàng nhanh',
    subtitle: 'Giao hàng trong ngày',
    cta: 'Tìm hiểu',
  },
];

const POPULAR_ROUTES = [
  {
    from: 'Hà Nội',
    fromCode: 'HAN',
    to: 'TP. Hồ Chí Minh',
    toCode: 'SGN',
    price: '299.000',
    duration: '2h 05m',
    tag: 'Phổ biến nhất',
  },
  {
    from: 'TP. Hồ Chí Minh',
    fromCode: 'SGN',
    to: 'Đà Nẵng',
    toCode: 'DAD',
    price: '199.000',
    duration: '1h 20m',
    tag: 'Giá tốt',
  },
  {
    from: 'Hà Nội',
    fromCode: 'HAN',
    to: 'Đà Nẵng',
    toCode: 'DAD',
    price: '249.000',
    duration: '1h 15m',
    tag: 'Hot',
  },
  {
    from: 'TP. Hồ Chí Minh',
    fromCode: 'SGN',
    to: 'Phú Quốc',
    toCode: 'PQC',
    price: '179.000',
    duration: '1h 05m',
    tag: 'Nghỉ dưỡng',
  },
  {
    from: 'Hà Nội',
    fromCode: 'HAN',
    to: 'Phú Quốc',
    toCode: 'PQC',
    price: '329.000',
    duration: '2h 20m',
    tag: 'Khuyến mãi',
  },
  {
    from: 'TP. Hồ Chí Minh',
    fromCode: 'SGN',
    to: 'Nha Trang',
    toCode: 'CXR',
    price: '159.000',
    duration: '1h 00m',
    tag: 'Biển đẹp',
  },
];

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'Phổ biến nhất': { bg: 'rgba(236,32,41,0.10)', text: '#EC2029' },
  'Giá tốt':       { bg: 'rgba(16,185,129,0.12)', text: '#059669' },
  'Hot':           { bg: 'rgba(249,115,22,0.12)', text: '#ea580c' },
  'Nghỉ dưỡng':   { bg: 'rgba(14,165,233,0.12)', text: '#0284c7' },
  'Khuyến mãi':   { bg: 'rgba(124,58,237,0.12)', text: '#7c3aed' },
  'Biển đẹp':     { bg: 'rgba(6,182,212,0.12)', text: '#0891b2' },
};

export default function PopularRoutesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const routesHeaderRef = useRef<HTMLDivElement>(null);
  const promoHeaderRef = useRef<HTMLDivElement>(null);
  const promoBannerImgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Intersection observer — staggered reveal
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -5% 0px' }
    );
    const elements = sectionRef?.current?.querySelectorAll(
      '.reveal-up, .reveal-scale, .reveal-left, .reveal-right'
    );
    elements?.forEach((el) => observer?.observe(el));
    return () => observer?.disconnect();
  }, [loading]);

  // Parallax scroll handler
  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const viewH = window.innerHeight;

      // Routes section header parallax
      if (routesHeaderRef.current) {
        const rect = routesHeaderRef.current.getBoundingClientRect();
        const progress = (viewH / 2 - (rect.top + rect.height / 2)) / viewH;
        routesHeaderRef.current.style.transform = `translateY(${progress * 16}px)`;
      }

      // Promo section header parallax
      if (promoHeaderRef.current) {
        const rect = promoHeaderRef.current.getBoundingClientRect();
        const progress = (viewH / 2 - (rect.top + rect.height / 2)) / viewH;
        promoHeaderRef.current.style.transform = `translateY(${progress * 14}px)`;
      }

      // Promo banner image parallax
      promoBannerImgRefs.current.forEach((imgWrapper) => {
        if (!imgWrapper) return;
        const rect = imgWrapper.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const relativePos = (viewH / 2 - cardCenter) / viewH;
        imgWrapper.style.transform = `translateY(${relativePos * 32}px) scale(1.14)`;
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

  if (loading) return <PopularRoutesSkeleton />;

  return (
    <section ref={sectionRef} className="bg-white overflow-hidden">
      {/* Service icons grid */}
      <div className="py-5 sm:py-7 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 sm:gap-3">
            {SERVICES?.map((service, i) => (
              <Link
                key={service?.label}
                href={service?.href}
                style={{
                  transitionDelay: `${i * 75}ms`,
                  transitionDuration: '0.6s',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="vj-service-icon group flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl border border-transparent hover:border-[rgba(236,32,41,0.2)] hover:bg-[rgba(236,32,41,0.03)] hover:-translate-y-1 hover:shadow-md transition-all duration-300 reveal-up"
              >
                <div
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-white shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"
                  style={{ background: service?.iconBg }}
                >
                  <service.Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span
                  className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight text-vj-gray"
                  style={{ fontWeight: 600 }}
                >
                  {service?.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Routes */}
      <div className="py-6 sm:py-7 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with parallax drift */}
          <div
            ref={routesHeaderRef}
            className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 reveal-left will-change-transform"
            style={{ transition: 'transform 0.1s linear' }}
          >
            <span className="vj-section-label">Tuyến bay</span>
            <h2
              className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-vj-text"
              style={{ fontWeight: 900 }}
            >
              Tuyến đường phổ biến
            </h2>
          </div>

          {/* Route cards — staggered fade-in with spring easing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {POPULAR_ROUTES?.map((route, i) => (
              <Link
                key={i}
                href="/flight-booking"
                style={{
                  transitionDelay: `${i * 85}ms`,
                  transitionDuration: '0.65s',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="reveal-up group flex items-center justify-between bg-white border border-gray-100 hover:border-[rgba(236,32,41,0.3)] rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-all duration-300"
                    style={{ background: 'rgba(236,32,41,0.10)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(236,32,41,0.20)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'rgba(236,32,41,0.10)')
                    }
                  >
                    <FaPlane className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-vj-text" style={{ fontWeight: 900 }}>
                        {route?.fromCode}
                      </span>
                      <MdArrowForward
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-[#EC2029]"
                      />
                      <span className="text-sm font-black text-vj-text" style={{ fontWeight: 900 }}>
                        {route?.toCode}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: TAG_COLORS[route?.tag]?.bg ?? 'rgba(236,32,41,0.10)',
                          color: TAG_COLORS[route?.tag]?.text ?? '#EC2029',
                        }}
                      >
                        {route?.tag}
                      </span>
                    </div>
                    <p
                      className="text-xs truncate mt-0.5 text-vj-gray"
                      style={{ fontWeight: 500 }}
                    >
                      {route?.from} → {route?.to} · {route?.duration}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right ml-2 sm:ml-3">
                  <p className="text-xs mb-0.5 font-koho">Từ</p>
                  <p
                    className="text-sm font-black whitespace-nowrap text-primary"
                    style={{ fontWeight: 900 }}
                  >
                    {route?.price}₫
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Promo bento grid */}
      <div className="py-6 sm:py-7" style={{ background: '#F7F7F7' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with parallax drift */}
          <div
            ref={promoHeaderRef}
            className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 reveal-left will-change-transform"
            style={{ transition: 'transform 0.1s linear' }}
          >
            <span className="vj-section-label">Dịch vụ nổi bật</span>
            <h2
              className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-vj-text"
              style={{ fontWeight: 900 }}
            >
              Trải nghiệm bay cùng Vietjet Air
            </h2>
          </div>

          {/* Promo banner cards — staggered reveal + parallax image */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {PROMO_BANNERS?.map((banner, i) => (
              <div
                key={banner?.id}
                style={{
                  transitionDelay: `${i * 110}ms`,
                  transitionDuration: '0.7s',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="reveal-scale group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                {/* Image wrapper — overflow hidden for parallax containment */}
                <div className="relative h-44 sm:h-48 overflow-hidden">
                  <div
                    ref={(el) => {
                      promoBannerImgRefs.current[i] = el;
                    }}
                    className="absolute inset-0 will-change-transform"
                    style={{ transform: 'translateY(0px) scale(1.14)' }}
                  >
                    <AppImage
                      src={banner?.image}
                      alt={banner?.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontWeight: 700,
                    }}
                  >
                    {banner?.label}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight font-body">
                    {banner?.title}
                  </h3>
                  <p className="text-xs mt-0.5 mb-2 sm:mb-3 font-koho">{banner?.subtitle}</p>
                  <span
                    className="inline-block text-xs font-black px-3 py-1.5 rounded-lg text-navy"
                    style={{
                      background:
                        'linear-gradient(26.73deg, rgb(249,165,26) 13.7%, rgb(251,182,18) 29.8%, rgb(255,221,0) 66.81%)',
                      fontWeight: 800,
                    }}
                  >
                    {banner?.cta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
