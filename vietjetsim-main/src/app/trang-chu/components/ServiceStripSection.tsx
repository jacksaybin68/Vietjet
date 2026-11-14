'use client';

import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

/**
 * Dải thẻ dịch vụ nhỏ ngay dưới dải đặt vé.
 * Site thật (đo 13/11/2026): 4 thẻ 338×136, bo góc 20px, nền
 * rgba(161,117,117,0.07), padding 20px — icon ở trên, tiêu đề 16px/700,
 * mô tả 14px.
 */
const SERVICE_CARDS = [
  {
    title: 'SkyJoy',
    description: 'Tích điểm, đổi thưởng và nhận ưu đãi thành viên Vietjet.',
    href: '/tai-khoan',
    icon: '/images/subservices/skyjoy.png',
  },
  {
    title: 'Swift 247',
    description: 'Gửi hàng nhanh chóng toàn quốc trong 24 giờ.',
    href: '/dich-vu?service=cargo',
    icon: '/images/brand/vietjet-ribbon.png',
  },
  {
    title: 'E-Sim',
    description: 'Mua e-SIM du lịch và kết nối ngay khi hạ cánh.',
    href: '/dich-vu?service=esim',
    icon: '/images/subservices/esim.png',
  },
  {
    title: 'E-Visa',
    description: 'Thủ tục điện tử nhanh chóng cho hành trình của bạn.',
    href: '/dich-vu?service=evisa',
    icon: '/images/subservices/evisa.png',
  },
] as const;

export default function ServiceStripSection() {
  return (
    <section className="bg-white pt-12 pb-12 sm:pt-16 sm:pb-16">
      <div className="vj-section-wide">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {SERVICE_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="vj-service-card flex flex-col transition-transform duration-200 hover:-translate-y-1"
            >
              <AppImage
                src={card.icon}
                alt=""
                className="h-12 w-12 shrink-0 object-contain"
                width={48}
                height={48}
              />
              <span className="mt-3 block text-base font-bold text-[var(--vj-ink)]">
                {card.title}
              </span>
              <span className="mt-1 block text-sm leading-5 text-[var(--vj-muted)]">
                {card.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
