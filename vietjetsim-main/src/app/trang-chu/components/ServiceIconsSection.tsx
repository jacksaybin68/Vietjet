'use client';

import Link from 'next/link';
import {
  FlightPlaneIcon,
  BaggageLuggageIcon,
  SeatArmchairIcon,
  HotMealIcon,
  OnlineCheckinIcon,
  SkyCareInsuranceIcon,
  SkyJoyStarIcon,
  DutyFreeBagIcon,
  AirportTaxiIcon,
  EvoucherGiftIcon,
} from '@/shared/components/ui/RealisticServiceIcons';

/* 10 khối dịch vụ nhanh dạng "squircle" 3D với icon thực tế theo chuẩn Vietjet Air. */
const SERVICES = [
  {
    label: 'Đặt chuyến bay',
    sub: 'Book Flight',
    href: '/tim-ve',
    Icon: FlightPlaneIcon,
    color: '#EC2029', // Đỏ Vietjet
    badge: 'Ưu đãi',
  },
  {
    label: 'Mua hành lý/chỗ',
    sub: 'Baggage & Seat',
    href: '/dich-vu?service=baggage',
    Icon: BaggageLuggageIcon,
    color: '#DC2626', // Đỏ hành lý Vietjet
    badge: 'Tiết kiệm 20%',
  },
  {
    label: 'Chọn chỗ ngồi',
    sub: 'Seat Selection',
    href: '/dich-vu?service=seat',
    Icon: SeatArmchairIcon,
    color: '#D97706', // Vàng hổ phách tựa đầu đỏ
  },
  {
    label: 'Suất ăn & Đồ uống',
    sub: 'Hot Meals & Drinks',
    href: '/dich-vu?service=meal',
    Icon: HotMealIcon,
    color: '#EA580C', // Cam nóng Jet Café
    badge: 'Jet Café',
  },
  {
    label: 'Online Check-in',
    sub: 'Thủ tục trực tuyến',
    href: '/lam-thu-tuc',
    Icon: OnlineCheckinIcon,
    color: '#0284C7', // Xanh công nghệ
    badge: 'Nhanh chóng',
  },
  {
    label: 'Bảo hiểm Sky Care',
    sub: 'Travel Insurance',
    href: '/dich-vu?service=insurance',
    Icon: SkyCareInsuranceIcon,
    color: '#EC2029', // Đỏ Vietjet Sky Care
    badge: 'Sky Care',
  },
  {
    label: 'Hàng miễn thuế',
    sub: 'Duty Free Sky Shop',
    href: '/dich-vu?service=dutyfree',
    Icon: DutyFreeBagIcon,
    color: '#B91C1C', // Đỏ Sky Shop
  },
  {
    label: 'Đổi thưởng SkyJoy',
    sub: 'Loyalty Rewards',
    href: '/tai-khoan',
    Icon: SkyJoyStarIcon,
    color: '#EAB308', // Vàng hoàng kim
    badge: 'SkyJoy',
  },
  {
    label: 'Taxi đón sân bay',
    sub: 'Airport Transfer',
    href: '/dich-vu?service=taxi',
    Icon: AirportTaxiIcon,
    color: '#059669', // Xanh Green SM taxi điện
    badge: 'Green SM',
  },
  {
    label: 'Vietjet e-Voucher',
    sub: 'Gift Voucher',
    href: '/dich-vu?service=voucher',
    Icon: EvoucherGiftIcon,
    color: '#EC2029', // Đỏ Vietjet e-Voucher
    badge: 'Quà tặng',
  },
] as const;

export default function ServiceIconsSection() {
  return (
    <section className="bg-[var(--surface)] py-10 sm:py-14 border-y border-[#ececec]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">
            Dịch vụ hàng không thực tế
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight">
            Tất cả dịch vụ trong một lần chạm
          </h2>
          <p className="text-xs sm:text-sm text-[var(--foreground-muted)] max-w-xl mx-auto mt-2">
            Trải nghiệm bay trọn vẹn cùng hệ sinh thái dịch vụ tiện ích, tiện lợi và tiết kiệm từ Vietjet Air
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {SERVICES.map((service) => {
            const Icon = service.Icon;
            return (
              <Link
                key={service.label}
                href={service.href}
                className="group relative flex flex-col justify-between rounded-[20px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-white bg-white/90 transition-all duration-300 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-[rgb(var(--primary-rgb))]/30"
              >
                {/* Badge if present */}
                {'badge' in service && service.badge && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                    {service.badge}
                  </span>
                )}

                <div>
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-[14px] shadow-sm mb-3 transition-all duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: `${service.color}18`,
                      border: `1.5px solid ${service.color}33`,
                    }}
                  >
                    <Icon size={32} />
                  </div>
                  <span className="block font-black text-[var(--foreground)] text-xs sm:text-sm leading-tight line-clamp-1">
                    {service.label}
                  </span>
                  <span className="block mt-0.5 text-[10px] sm:text-xs text-[var(--foreground-muted)] font-medium truncate">
                    {service.sub}
                  </span>
                </div>

                {/* Subtle indicator bar */}
                <div
                  className="mt-3 h-1 w-8 rounded-full transition-all duration-300 group-hover:w-full"
                  style={{ backgroundColor: service.color, opacity: 0.6 }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
