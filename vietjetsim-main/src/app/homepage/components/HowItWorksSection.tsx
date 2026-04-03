'use client';
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';

const DESTINATIONS = [
  {
    name: 'Hà Nội',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_16ef498fe-1773722432120.png',
    alt: 'Ha Noi - Thu do ngan nam van hien voi Ho Hoan Kiem',
    code: 'HAN',
  },
  {
    name: 'TP. Hồ Chí Minh',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_14bf0c4cc-1773722431404.png',
    alt: 'TP. Ho Chi Minh - Thanh pho nang dong nhat Viet Nam',
    code: 'SGN',
  },
  {
    name: 'Phú Quốc',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_107571e1a-1773695589380.png',
    alt: 'Phu Quoc - Dao ngoc nhiet doi voi bai bien xanh trong',
    code: 'PQC',
  },
  {
    name: 'Đà Nẵng',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_104ff72bb-1773722430753.png',
    alt: 'Da Nang - Thanh pho bien dang song voi Cau Rong',
    code: 'DAD',
  },
  {
    name: 'Nha Trang',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1d9901b99-1773722428997.png',
    alt: 'Nha Trang - Vinh bien xanh trong noi tieng mien Trung',
    code: 'CXR',
  },
  {
    name: 'Huế',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_12736a988-1773722431348.png',
    alt: 'Hue - Co do lich su voi Dai Noi va lang tam trieu Nguyen',
    code: 'HUI',
  },
];

const SearchIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const TicketIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2zm-4.42 4.8L12 14.5l-3.58 2.3 1.08-4.12-3.29-2.69 4.24-.25L12 5.8l1.54 3.95 4.24.25-3.29 2.69 1.09 4.11z" />
  </svg>
);

const PlaneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

const HOW_STEPS = [
  {
    num: '01',
    title: 'Tìm chuyến bay',
    desc: 'Nhập điểm đi, điểm đến và ngày bay. Hệ thống hiển thị tất cả chuyến bay phù hợp.',
    Icon: SearchIcon,
    color: '#EC2029',
  },
  {
    num: '02',
    title: 'Chọn ghế & đặt vé',
    desc: 'Lựa chọn ghế ngồi yêu thích. Điền thông tin hành khách nhanh chóng.',
    Icon: TicketIcon,
    color: '#1A2948',
  },
  {
    num: '03',
    title: 'Thanh toán & Bay',
    desc: 'Thanh toán an toàn qua thẻ hoặc ví điện tử. Nhận vé điện tử ngay lập tức.',
    Icon: PlaneIcon,
    color: '#EC2029',
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.08 }
    );
    sectionRef?.current
      ?.querySelectorAll('.reveal-up, .reveal-scale, .reveal-left')
      ?.forEach((el) => observer?.observe(el));
    return () => observer?.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white">
      {/* Attractive Destinations */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-5 reveal-left">
            <span className="vj-section-label">Điểm đến hấp dẫn</span>
            <h2
              className="text-lg sm:text-xl font-black tracking-tight text-vj-text"
              style={{ fontWeight: 900 }}
            >
              Khám phá Việt Nam
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {DESTINATIONS?.map((dest, i) => (
              <Link
                key={dest?.code}
                href={`/flight-booking?to=${dest?.code}`}
                style={{ transitionDelay: `${i * 80}ms` }}
                className="vj-dest-card reveal-scale"
              >
                <div className="relative h-40 sm:h-48">
                  <AppImage
                    src={dest?.image}
                    alt={dest?.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                    <h3
                      className="text-white font-black text-sm leading-tight"
                      style={{
                        fontWeight: 900,
                      }}
                    >
                      {dest?.name}
                    </h3>
                    <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase mt-0.5 font-koho-bold">
                      {dest?.code}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* How it works - 3 steps */}
      <div className="py-10 border-t border-gray-100" style={{ background: '#F7F7F7' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 reveal-up">
            <span className="vj-section-label">Đơn giản &amp; Nhanh chóng</span>
            <h2
              className="text-2xl sm:text-3xl font-black mt-3 tracking-tight text-vj-text"
              style={{ fontWeight: 900 }}
            >
              Đặt vé chỉ trong <span className="text-primary">3 bước</span>
            </h2>
            <p className="mt-2 text-sm max-w-md mx-auto leading-relaxed text-vj-gray">
              Quy trình đặt vé được tối ưu hóa để bạn hoàn tất trong vòng 5 phút.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
            <div className="hidden sm:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gray-200 z-0" />

            {HOW_STEPS?.map((step, i) => (
              <div
                key={step?.num}
                style={{ transitionDelay: `${i * 150}ms` }}
                className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 reveal-up z-10 cursor-default"
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(236,32,41,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgb(243,244,246)')}
              >
                <div
                  className="absolute top-4 right-4 text-5xl font-black leading-none select-none"
                  style={{
                    color: '#F0F0F0',
                    fontWeight: 900,
                  }}
                >
                  {step?.num}
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm mb-4"
                  style={{ background: step.color }}
                >
                  <step.Icon className="w-6 h-6 text-white" />
                </div>
                <h3
                  className="font-black text-base mb-2 tracking-tight text-vj-text"
                  style={{ fontWeight: 900 }}
                >
                  {step?.title}
                </h3>
                <p className="text-sm leading-relaxed text-vj-gray">{step?.desc}</p>
                <div className="mt-4 h-0.5 w-8 rounded-full bg-primary-solid" />
              </div>
            ))}
          </div>

          <div className="text-center mt-8 reveal-up" style={{ transitionDelay: '450ms' }}>
            <Link href="/flight-booking" className="vj-btn vj-btn-primary vj-btn-lg inline-flex">
              Đặt vé ngay
              <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
