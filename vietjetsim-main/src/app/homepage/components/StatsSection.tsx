'use client';
import React, { useEffect, useRef, useState } from 'react';

const PlaneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

const PeopleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </svg>
);

const TagIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
  </svg>
);

const STATS = [
  {
    value: 50,
    suffix: '+',
    label: 'Đường bay nội địa',
    Icon: PlaneIcon,
    desc: 'Kết nối toàn quốc',
  },
  {
    value: 2,
    suffix: 'M+',
    label: 'Hành khách mỗi năm',
    Icon: PeopleIcon,
    desc: 'Tin tưởng lựa chọn',
  },
  {
    value: 98,
    suffix: '%',
    label: 'Tỷ lệ đúng giờ',
    Icon: ClockIcon,
    desc: 'Cam kết chất lượng',
  },
  {
    value: 99,
    suffix: 'K₫',
    label: 'Giá vé thấp nhất',
    Icon: TagIcon,
    desc: 'Bay giá siêu rẻ',
  },
];

function CountUp({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [active, target]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActive(true);
          entries[0].target
            .querySelectorAll('.reveal-up')
            .forEach((el) => el.classList.add('visible'));
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
      }}
    >
      {/* Top accent stripe */}
      <div
        className="absolute left-0 top-0 w-full h-1"
        style={{ background: 'linear-gradient(90deg, #FFD400, #F9A51A, #FFD400)' }}
      />

      {/* Decorative plane watermark */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
        <PlaneIcon className="w-64 h-64 text-white" />
      </div>

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 reveal-up">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 700
            }}
          >
            Tại sao chọn chúng tôi
          </p>
          <h2
            className="text-xl sm:text-2xl font-black tracking-tight"
            style={{
              color: 'white',
              fontWeight: 900
            }}
          >
            Vì sao chọn <span style={{ color: '#FFD400' }}>VietjetSim</span>?
          </h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                transitionDelay: `${i * 120}ms`,
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(8px)',
              }}
              className="group text-center rounded-2xl p-5 border border-white/15 hover:border-white/30 hover:-translate-y-2 hover:shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition-all duration-300 cursor-default reveal-up"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
            >
              {/* Icon */}
              <div className="flex justify-center mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <stat.Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              {/* Value */}
              <div
                className="text-3xl sm:text-4xl font-black text-white mb-1 leading-none font-body"
              >
                <CountUp target={stat.value} suffix={stat.suffix} active={active} />
              </div>
              {/* Label */}
              <div
                className="text-xs font-bold mb-0.5 tracking-tight"
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 700
                }}
              >
                {stat.label}
              </div>
              {/* Sub-desc */}
              <div
                className="text-[10px] font-medium font-koho"
                style={{ color: 'rgba(255,212,0,0.7)' }}
              >
                {stat.desc}
              </div>
              {/* Bottom accent on hover */}
              <div
                className="mt-3 h-0.5 w-0 group-hover:w-10 rounded-full mx-auto transition-all duration-300"
                style={{ background: '#FFD400' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
