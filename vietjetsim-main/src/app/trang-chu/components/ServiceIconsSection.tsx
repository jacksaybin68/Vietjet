'use client';
import React from 'react';
import Link from 'next/link';
import {
  FaPlaneDeparture,
  FaSuitcaseRolling,
  FaUtensils,
  FaChair,
  FaStar,
  FaShoppingBag,
  FaShieldAlt,
  FaGift,
  FaMobileAlt,
  FaPassport,
} from 'react-icons/fa';

/**
 * Quick-access service strip — mirrors vietjetair.com's icon row beneath the
 * hero banner. Ten items in a single centred row (desktop) or horizontally
 * scrollable strip (mobile). Each icon sits in a lightly tinted circle whose
 * colour matches the service category.
 *
 * Design tokens:
 * - Background: white with a thin red bottom border (brand accent).
 * - Icons: 40–44 px circles with 12% opacity tint of the service colour.
 * - Labels: bold 11 px main + 9 px muted English subtitle.
 * - Hover: scale icon, underline bar slides in, background blush.
 */
export const SERVICES = [
  {
    label: 'Đặt vé',
    sub: 'Book Flight',
    href: '/tim-ve',
    Icon: FaPlaneDeparture,
    color: '#EC2029',
  },
  {
    label: 'Mua hành lý',
    sub: 'Baggage',
    href: '/dich-vu?service=baggage',
    Icon: FaSuitcaseRolling,
    color: '#EC2029',
  },
  {
    label: 'Suất ăn',
    sub: 'Meals',
    href: '/dich-vu?service=meal',
    Icon: FaUtensils,
    color: '#EC2029',
  },
  {
    label: 'Chọn chỗ',
    sub: 'Seat',
    href: '/dich-vu?service=seat',
    Icon: FaChair,
    color: '#EC2029',
  },
  {
    label: 'SkyBoss',
    sub: 'Priority',
    href: '/dich-vu?service=priority',
    Icon: FaStar,
    color: '#F9A51A',
  },
  {
    label: 'Duty Free',
    sub: 'Shopping',
    href: '/dich-vu?service=lounge',
    Icon: FaShoppingBag,
    color: '#8075D6',
  },
  {
    label: 'Bảo hiểm',
    sub: 'Insurance',
    href: '/dich-vu?service=insurance',
    Icon: FaShieldAlt,
    color: '#2563D4',
  },
  {
    label: 'SkyJoy',
    sub: 'Rewards',
    href: '/tai-khoan',
    Icon: FaGift,
    color: '#EC2029',
  },
  {
    label: 'E-Sim',
    sub: 'Data SIM',
    href: '/dich-vu?service=meal',
    Icon: FaMobileAlt,
    color: '#10b981',
  },
  {
    label: 'E-Visa',
    sub: 'Visa',
    href: '/dich-vu?service=insurance',
    Icon: FaPassport,
    color: '#F4511E',
  },
];

export default function ServiceIconsSection() {
  return (
    <section
      className="relative z-10 bg-white shadow-sm"
      style={{ borderBottom: '2.5px solid var(--primary)' }}
    >
      <div className="mx-auto max-w-[1240px] px-2 sm:px-4">
        {/* Mobile: horizontal scroll, Desktop: single centred row — matches
            vietjetair.com's quick-access service strip beneath the hero. */}
        <div className="vj-service-strip flex items-stretch overflow-x-auto no-scrollbar sm:justify-center sm:overflow-x-visible">
          {SERVICES.map((s, idx) => {
            const Icon = s.Icon;
            return (
              <Link
                key={s.label}
                href={s.href}
                className="group flex shrink-0 flex-col items-center gap-1 px-2.5 py-3 sm:px-4 sm:py-3.5 transition-all duration-200 hover:bg-[rgba(236,32,41,0.04)] relative"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Icon circle — light tinted bg matching service colour */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110 group-hover:shadow-md sm:h-11 sm:w-11"
                  style={{
                    background: `${s.color}12`,
                    border: `1.5px solid ${s.color}30`,
                  }}
                >
                  <Icon className="text-base sm:text-lg" style={{ color: s.color }} />
                </div>

                {/* Vietnamese label */}
                <span className="whitespace-nowrap text-[10.5px] font-bold leading-tight text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors sm:text-[11.5px]">
                  {s.label}
                </span>

                {/* English subtitle — adds bilingual feel matching vietjetair.com */}
                <span className="whitespace-nowrap text-[8.5px] leading-none text-[var(--foreground-muted)] group-hover:text-[var(--primary-light)] transition-colors sm:text-[9px] -mt-0.5">
                  {s.sub}
                </span>

                {/* Active indicator on hover — red bar at bottom */}
                <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[var(--primary)] transition-all duration-200 group-hover:w-3/4 rounded-full" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
