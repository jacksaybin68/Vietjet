'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';
import {
  RiFlightTakeoffLine,
  RiUserLine,
  RiShoppingBag3Line,
  RiMoneyDollarCircleLine,
} from 'react-icons/ri';

interface ActivityIcon {
  label: string;
  href: string;
  icon: React.ElementType;
}

const ACTIVITY_ICONS: readonly ActivityIcon[] = [
  { label: 'Tìm chuyến bay', href: '/tim-ve', icon: RiFlightTakeoffLine },
  { label: 'Tài khoản', href: '/tai-khoan', icon: RiUserLine },
  { label: 'Giỏ hàng', href: '/dat-ve', icon: RiShoppingBag3Line },
  { label: 'Thanh toán', href: '/thanh-toan', icon: RiMoneyDollarCircleLine },
];

export default function ActivityBar() {
  return (
    <div
      role="region"
      aria-label="Thông tin hành trình"
      className="bg-vjyellow border-b border-black/10 h-[46px] sm:h-[50px]"
    >
      <div className="mx-auto flex max-w-[1240px] items-center justify-center lg:justify-between gap-4 px-4 sm:px-6">
        {/* Thông tin hành khách — chỉ hiển thị từ lg trở lên. */}
        <div className="hidden lg:flex items-center gap-6">
          <Link
            href="/chuyen-bay-cua-toi"
            className="flex items-center gap-1 text-[12px] font-semibold text-black sm:text-[13px]"
            aria-label="Chuyến bay của tôi"
          >
            <Icon name="TicketIcon" size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Chuyến bay của tôi</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">1 Người lớn (mẫu)</span>
          </Link>

          <span className="w-px h-4 bg-black/20" aria-hidden="true" />

          <div className="text-[12px] font-semibold text-black sm:text-[13px]">
            <span className="hidden sm:inline">Điểm khởi hành: </span>
            <span className="font-bold">TP. Hồ Chí Minh (SGN)</span>
            <span className="px-1">→</span>
            <span className="hidden sm:inline">Điểm đến: </span>
            <span className="font-bold">Hà Nội (HAN)</span>
          </div>
        </div>

        {/* Các biểu tượng hành động — luôn hiển thị (cũng là phần duy nhất trên mobile). */}
        <div className="flex shrink-0 items-center gap-2">
          {ACTIVITY_ICONS.map(({ label, href, icon: IconComp }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="flex size-6 shrink-0 place-items-center rounded-full bg-white transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-vjyellow"
            >
              <IconComp aria-hidden="true" className="shrink-0 text-[16px] text-vjred" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
