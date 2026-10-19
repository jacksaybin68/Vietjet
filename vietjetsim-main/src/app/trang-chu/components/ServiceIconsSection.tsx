'use client';

import Link from 'next/link';
import {
  FaPlaneDeparture,
  FaSuitcaseRolling,
  FaChair,
  FaUserShield,
  FaShieldAlt,
  FaTag,
} from 'react-icons/fa';

/* 6 khối dịch vụ nhanh dạng "squircle" 3D, màu sắc theo spec. */
const SERVICES = [
  {
    label: 'Đặt chuyến bay',
    sub: 'Book Flight',
    href: '/tim-ve',
    Icon: FaPlaneDeparture,
    color: '#EC2029', // Đỏ
  },
  {
    label: 'Mua hành lý/chỗ',
    sub: 'Baggage & Seat',
    href: '/dich-vu?service=baggage',
    Icon: FaSuitcaseRolling,
    color: '#22C55E', // Xanh lá
  },
  {
    label: 'Ưu tiên làm thủ tục',
    sub: 'Priority Check-in',
    href: '/dich-vu?service=priority',
    Icon: FaChair,
    color: '#2563D4', // Xanh dương
  },
  {
    label: 'Hàng miễn thuế',
    sub: 'Duty Free',
    href: '/dich-vu?service=dutyfree',
    Icon: FaUserShield,
    color: '#9D174D', // Đỏ mận
  },
  {
    label: 'Bảo hiểm',
    sub: 'Insurance',
    href: '/dich-vu?service=insurance',
    Icon: FaShieldAlt,
    color: '#06B6D4', // Cyan
  },
  {
    label: 'Vietjet e-Voucher',
    sub: 'e-Voucher',
    href: '/dich-vu?service=voucher',
    Icon: FaTag,
    color: '#8B5CF6', // Tím
  },
] as const;

export default function ServiceIconsSection() {
  return (
    <section className="bg-[var(--surface)] py-10 sm:py-14 border-y border-[#ececec]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">
            Dịch vụ nhanh
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight">
            Tất cả trong một lần chạm
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5">
          {SERVICES.map((service) => {
            const Icon = service.Icon;
            return (
              <Link
                key={service.label}
                href={service.href}
                className="group relative block rounded-[20px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-[rgb(var(--primary-rgb))]/30"
                style={{ backgroundColor: `${service.color}12` }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-[12px] shadow-lg mb-3.5 sm:mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: service.color,
                    boxShadow: `0 4px 12px ${service.color}4d`,
                  }}
                >
                  <Icon className="text-xl sm:text-2xl text-white" />
                </div>
                <span className="block font-black text-[var(--foreground)] text-sm sm:text-base leading-tight">
                  {service.label}
                </span>
                <span className="block mt-1 text-[10px] sm:text-xs text-[var(--foreground-muted)] font-semibold">
                  {service.sub}
                </span>
                {/* Nếp nổi 3D phía dưới */}
                <span
                  className="absolute bottom-0 left-1/2 w-1 h-1 -translate-y-1/2 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: service.color, opacity: 0.35 }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
