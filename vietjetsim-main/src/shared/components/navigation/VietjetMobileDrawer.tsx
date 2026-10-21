'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HiOutlineHome,
  HiOutlineTicket,
  HiOutlineCheckCircle,
  HiOutlineBriefcase,
  HiOutlineShoppingBag,
  HiOutlineUserCircle,
  HiOutlineX,
  HiChevronRight,
} from 'react-icons/hi';
import {
  RiMoneyDollarCircleLine,
  RiHotelBedLine,
  RiCoupon2Line,
  RiSimCardLine,
  RiPassportLine,
  RiExchangeDollarLine,
  RiShieldCheckLine,
  RiStarSmileLine,
} from 'react-icons/ri';
import { MdFlightTakeoff } from 'react-icons/md';
import { useAuth } from '@/contexts/AuthContext';

interface VietjetMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { label: 'Trang chủ', href: '/trang-chu', icon: HiOutlineHome },
  { label: 'Chuyến bay của tôi', href: '/chuyen-bay-cua-toi', icon: MdFlightTakeoff },
  { label: 'Online Check-in', href: '/lam-thu-tuc', icon: HiOutlineCheckCircle },
  { label: 'Dịch vụ chuyến bay', href: '/dich-vu', icon: HiOutlineBriefcase, hasChevron: true },
  { label: 'Dịch vụ khác', href: '/dich-vu#khac', icon: RiMoneyDollarCircleLine, hasChevron: true },
  { label: 'Đặt vé', href: '/trang-chu#hero-booking-form', icon: HiOutlineTicket },
  { label: 'Skyshop', href: '/dich-vu?service=skyshop', icon: HiOutlineShoppingBag },
  { label: 'Khách sạn', href: '/dich-vu?service=hotel', icon: RiHotelBedLine },
  { label: 'E-Voucher', href: '/dich-vu?service=evoucher', icon: RiCoupon2Line },
  { label: 'E-Sim', href: '/dich-vu?service=esim', icon: RiSimCardLine },
  { label: 'E-Visa', href: '/dich-vu?service=evisa', icon: RiPassportLine },
  { label: 'Mua ngoại tệ', href: '/dich-vu?service=currency', icon: RiExchangeDollarLine },
  { label: 'Bảo hiểm', href: '/dich-vu?service=insurance', icon: RiShieldCheckLine },
  { label: 'SkyJoy', href: '/dich-vu?service=skyjoy', icon: RiStarSmileLine },
];

export default function VietjetMobileDrawer({ isOpen, onClose }: VietjetMobileDrawerProps) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end lg:hidden" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <div
        className="relative z-10 flex h-full w-[85%] max-w-[340px] flex-col overflow-hidden text-white shadow-2xl animate-in slide-in-from-right duration-300"
        style={{
          background: 'linear-gradient(180deg, #A80F16 0%, #880A0F 60%, #680509 100%)',
        }}
      >
        {/* Close Button top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng menu"
          className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/90 hover:bg-black/40 hover:text-white"
        >
          <HiOutlineX className="h-5 w-5" />
        </button>

        {/* User Profile Header */}
        <div className="border-b border-white/20 px-5 pt-6 pb-4">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <HiOutlineUserCircle className="h-8 w-8 text-vjyellow shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">
                    {(user.fullName || user.email)?.replace(/\s*\(CCCD:.*?\)/gi, '')}
                  </div>
                  <div className="text-3xs text-white/70">Thành viên Vietjet</div>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 text-xs">
                <Link
                  href="/tai-khoan"
                  onClick={onClose}
                  className="rounded px-2.5 py-1 bg-white/15 text-white font-semibold hover:bg-white/25"
                >
                  Tài khoản
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                    onClose();
                  }}
                  className="text-white/80 hover:text-white underline text-xs cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/dang-nhap"
              onClick={onClose}
              className="flex items-center gap-3 text-base font-bold text-white hover:text-vjyellow transition-colors"
            >
              <HiOutlineUserCircle className="h-7 w-7 text-white" />
              <span>Đăng ký/Đăng nhập</span>
            </Link>
          )}
        </div>

        {/* Menu list */}
        <div className="relative flex-1 overflow-y-auto px-2 py-3 divide-y divide-white/10">
          <nav aria-label="Menu di động" className="space-y-0.5 pb-20">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/trang-chu'
                  ? pathname === '/trang-chu'
                  : pathname === item.href || pathname.startsWith(`${item.href.split('#')[0]}?`);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-white/95 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-5 w-5 shrink-0 text-white" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.hasChevron && (
                    <HiChevronRight className="h-4 w-4 text-white/70 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Vietjet Swoosh tail decoration at bottom right (Screenshot 6) */}
          <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 overflow-hidden">
            <svg
              className="absolute -bottom-4 -right-4 h-40 w-40 opacity-90"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 20 C 70 45, 30 75, 0 100 L 100 100 Z"
                fill="#2E7D32"
              />
              <path
                d="M100 40 C 75 58, 45 80, 20 100 L 100 100 Z"
                fill="#FBB612"
              />
              <path
                d="M100 60 C 85 72, 65 88, 42 100 L 100 100 Z"
                fill="#ED1C24"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
