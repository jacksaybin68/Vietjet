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
    color: '#EC2029',
  },
  {
    label: 'DutyFree',
    sub: 'Mua sắm',
    href: '/dich-vu?service=lounge',
    Icon: FaShoppingBag,
    color: '#EC2029',
  },
  {
    label: 'Bảo hiểm',
    sub: 'Insurance',
    href: '/dich-vu?service=insurance',
    Icon: FaShieldAlt,
    color: '#EC2029',
  },
  {
    label: 'SkyJoy',
    sub: 'Thưởng',
    href: '/tai-khoan',
    Icon: FaGift,
    color: '#EC2029',
  },
  {
    label: 'E-Sim',
    sub: 'Sim data',
    href: '/dich-vu?service=meal',
    Icon: FaMobileAlt,
    color: '#EC2029',
  },
  {
    label: 'E-Visa',
    sub: 'Visa',
    href: '/dich-vu?service=insurance',
    Icon: FaPassport,
    color: '#EC2029',
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
