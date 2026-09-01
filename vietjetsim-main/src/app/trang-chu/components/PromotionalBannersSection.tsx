'use client';
import React from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';

const PROMO_DATA = [
  {
    title: 'Sky Space',
    subtitle: 'Premium Lounge',
    description: 'Trải nghiệm phòng chờ hạng sang với tiện nghi đẳng cấp quốc tế',
    image: '/assets/images/banners/sky_space.png',
    accent: '#38BDF8',
    gradient: 'from-sky-500/90 to-cyan-600/90',
    link: '/dich-vu',
    badge: 'VIP',
  },
  {
    title: 'Bảo hiểm Du lịch',
    subtitle: 'Travel Protection',
    description: 'Bảo vệ toàn diện cho mọi chuyến đi với quyền lợi vượt trội',
    image: '/images/hero/download-1.jpg',
    accent: '#22D3EE',
    gradient: 'from-cyan-500/90 to-teal-600/90',
    link: '/dich-vu',
    badge: 'SAFE',
  },
  {
    title: 'Kết nối E-Sim',
    subtitle: 'Global Connection',
    description: 'Kết nối liền mạch tại 150+ quốc gia không cần đổi SIM',
    image: '/images/hero/download-2.jpg',
    accent: '#4FD1C5',
    gradient: 'from-teal-500/90 to-emerald-600/90',
    link: '/dich-vu',
    badge: 'TECH',
  },
];

export default function PromotionalBannersSection() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-[#0B0E14] via-[#0F172A] to-[#111827] overflow-hidden">
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#F8FAFC 1px, transparent 1px), linear-gradient(90deg, #F8FAFC 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#38BDF8]" />
            <span className="text-xs font-bold text-[#38BDF8] tracking-[0.2em] uppercase">
              Premium Services
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#38BDF8]" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-[#F8FAFC] mb-4 tracking-tight">
            Dịch vụ cao cấp
          </h2>
          <p className="text-[#94A3B8] max-w-2xl mx-auto text-sm sm:text-base">
            Nâng tầm trải nghiệm bay với các dịch vụ đẳng cấp được thiết kế riêng cho bạn
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 justify-items-end">
          {PROMO_DATA.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className="group block relative h-[480px] rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2"
              style={{
                boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(248,250,252,0.08)',
              }}
            >
              {/* Image Layer */}
              <AppImage
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 33vw"
              />

              {/* Gradient Overlay */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} mix-blend-multiply transition-opacity duration-500 opacity-60 group-hover:opacity-80`}
              />
              
              {/* Dark gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/40 to-transparent" />

              {/* Accent line */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 transition-all duration-500 group-hover:h-2"
                style={{ background: item.accent }}
              />

              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                {/* Badge */}
                <div className="flex justify-end">
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider backdrop-blur-sm border"
                    style={{ 
                      background: `${item.accent}20`,
                      borderColor: `${item.accent}40`,
                      color: item.accent,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.accent }} />
                    {item.badge}
                  </span>
                </div>

                {/* Text Content */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold tracking-wider uppercase" style={{ color: item.accent }}>
                      {item.subtitle}
                    </p>
                    <h3 className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-tight">
                      {item.title}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-[#CBD5E1] leading-relaxed max-w-[280px]">
                    {item.description}
                  </p>

                  {/* CTA */}
                  <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 translate-x-[-8px] group-hover:translate-x-0 transition-all duration-500">
                    <span className="text-sm font-bold text-[#F8FAFC]">
                      Khám phá ngay
                    </span>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <path 
                        d="M6 3L11 8L6 13" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ stroke: item.accent }}
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Hover border glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 0 1px ${item.accent}40, 0 0 32px ${item.accent}30`,
                }}
              />
            </Link>
          ))}
        </div>

        {/* Bottom decoration */}
        <div className="mt-16 flex justify-center gap-2">
          {PROMO_DATA.map((item, idx) => (
            <div 
              key={idx}
              className="h-1 w-16 rounded-full transition-all duration-300"
              style={{ background: `${item.accent}30` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
