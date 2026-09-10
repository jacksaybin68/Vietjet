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

const SERVICES = [
  {
    label: 'Đặt vé',
    sub: 'Book flight',
    href: '/tim-ve',
    Icon: FaPlaneDeparture,
    color: '#ED1D23',
  },
  {
    label: 'Mua hành lý',
    sub: 'Baggage',
    href: '/dich-vu/hanh-ly',
    Icon: FaSuitcaseRolling,
    color: '#F9A51A',
  },
  {
    label: 'Suất ăn',
    sub: 'Meals',
    href: '/dich-vu/suat-an',
    Icon: FaUtensils,
    color: '#FFDD00',
  },
  {
    label: 'Chọn chỗ',
    sub: 'Seat',
    href: '/dich-vu/cho-ngoi',
    Icon: FaChair,
    color: '#14213D',
  },
  {
    label: 'SkyBoss',
    sub: 'Priority',
    href: '/dich-vu/skyboss',
    Icon: FaStar,
    color: '#FFD700',
  },
  {
    label: 'DutyFree',
    sub: 'Mua sắm',
    href: '/dich-vu/duty-free',
    Icon: FaShoppingBag,
    color: '#E91E63',
  },
  {
    label: 'Bảo hiểm',
    sub: 'Insurance',
    href: '/dich-vu/bao-hiem',
    Icon: FaShieldAlt,
    color: '#4CAF50',
  },
  {
    label: 'SkyJoy',
    sub: 'Thưởng',
    href: '/dich-vu/skyjoy',
    Icon: FaGift,
    color: '#ED1D23',
  },
  {
    label: 'E-Sim',
    sub: 'Sim data',
    href: '/dich-vu/e-sim',
    Icon: FaMobileAlt,
    color: '#00BCD4',
  },
  {
    label: 'E-Visa',
    sub: 'Visa',
    href: '/dich-vu/e-visa',
    Icon: FaPassport,
    color: '#9C27B0',
  },
];

export default function ServiceIconsSection() {
  return (
    <section className="bg-white py-6 sm:py-8 border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3 sm:gap-4">
          {SERVICES.map((s) => {
            const Icon = s.Icon;
            return (
              <Link
                key={s.label}
                href={s.href}
                className="group flex flex-col items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-3 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gradient-to-b hover:from-red-50 hover:to-white"
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg relative"
                  style={{
                    background: `linear-gradient(135deg, ${s.color}15 0%, ${s.color}25 100%)`,
                    border: `1.5px solid ${s.color}40`,
                  }}
                >
                  <Icon className="text-lg sm:text-xl" style={{ color: s.color }} />
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: s.color }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[11px] sm:text-xs font-black text-navy leading-tight uppercase group-hover:text-primary transition-colors">
                    {s.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-vj-gray font-medium leading-tight hidden sm:block">
                    {s.sub}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
