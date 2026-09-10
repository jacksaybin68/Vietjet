'use client';

import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiChevronDown, HiOutlineGlobeAlt, HiOutlineUserCircle, HiOutlineX } from 'react-icons/hi';
import {
  RiFlightTakeoffLine,
  RiGiftLine,
  RiHotelLine,
  RiMoneyDollarCircleLine,
  RiPassportLine,
  RiPhoneLine,
  RiShoppingBag3Line,
  RiShieldCheckLine,
  RiVipCrownLine,
} from 'react-icons/ri';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/shared/components/ui';

const flightLinks = [
  ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
  ['Check-in Online', '/lam-thu-tuc'],
  ['Dịch vụ chuyến bay', '/dich-vu'],
  ['Dịch vụ khác', '/dich-vu'],
];

const serviceLinks: Array<[string, string, IconType]> = [
  ['Đặt vé', '/tim-ve', RiFlightTakeoffLine],
  ['Skyshop', '/dich-vu', RiShoppingBag3Line],
  ['Khách sạn', '/dich-vu', RiHotelLine],
  ['E-Voucher', '/dich-vu', RiGiftLine],
  ['E-Sim', '/dich-vu', RiPhoneLine],
  ['E-Visa', '/dich-vu', RiPassportLine],
  ['Mua ngoại tệ', '/dich-vu', RiMoneyDollarCircleLine],
  ['Bảo hiểm', '/dich-vu', RiShieldCheckLine],
  ['SkyJoy', '/tai-khoan', RiVipCrownLine],
];

export default function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountLinks = user
    ? [
        ['Tài khoản', '/tai-khoan'],
        ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
      ]
    : [
        ['Đăng nhập', '/dang-nhap'],
        ['Đăng ký', '/dang-nhap?tab=register'],
        ['Tra cứu đặt chỗ', '/tra-cuu'],
      ];

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };

    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="relative z-30 border-b border-black/5 bg-white dark:bg-navy-dark dark:border-white/5 shadow-[0_2px_12px_rgba(36,36,36,.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,.4)]">
      {announcementVisible && (
        <div className="bg-[#e30613] dark:bg-[#b91c1c] text-white" aria-live="polite">
          <div className="mx-auto flex min-h-10 max-w-[1240px] flex-wrap items-center justify-between gap-2 px-3 py-2 text-[10px] font-semibold sm:px-4 sm:text-[11px] lg:text-sm">
            <p className="flex-1 min-w-0 text-left leading-relaxed">
              Cập nhật thông tin vận hành quan trọng (chuyển đổi nhà ga tại sân bay Hong Kong).
            </p>
            <button
              type="button"
              aria-label="Đóng thông báo vận hành"
              onClick={() => setAnnouncementVisible(false)}
              className="shrink-0 rounded p-1 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <HiOutlineX aria-hidden="true" className="text-lg" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-[56px] md:min-h-[68px] max-w-[1240px] items-center gap-2 md:gap-3 px-3 py-2 md:py-3 sm:px-4 lg:min-h-[82px] lg:gap-6">
        <Link href="/trang-chu" aria-label="Trang chủ Vietjet Air" className="shrink-0">
          <img src="/logo-vj.svg" alt="Vietjet Air" className="h-6 w-auto md:h-8 sm:h-9 lg:h-11" />
        </Link>
        <div className="ml-auto flex items-center gap-1 text-[11px] md:text-sm font-bold text-[#333] dark:text-white/90 md:gap-1 sm:gap-3">
          <Link
            href="/lien-he"
            className="rounded-sm px-1.5 md:px-2 py-1.5 md:py-2 hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31E24] text-[11px] md:text-sm dark:text-white/80 dark:hover:text-[#FFC400]"
          >
            Hỗ trợ
          </Link>
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              aria-label={user ? 'Mở menu tài khoản' : 'Mở menu đăng ký và đăng nhập'}
              aria-expanded={accountMenuOpen}
              aria-controls="account-menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-1 rounded-sm px-1.5 md:px-2 py-1.5 md:py-2 hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31E24] dark:text-white/80 dark:hover:text-[#FFC400]"
            >
              <HiOutlineUserCircle aria-hidden="true" className="text-lg md:text-xl" />
              <span className="hidden md:inline text-[11px] md:text-sm">
                {user ? user.fullName || 'Tài khoản' : 'Đăng ký / Đăng nhập'}
              </span>
            </button>
            {accountMenuOpen && (
              <div
                id="account-menu"
                role="menu"
                aria-label="Menu tài khoản"
                className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-md border border-black/10 bg-white dark:bg-navy-dark dark:border-white/10 py-1 shadow-lg dark:shadow-xl"
              >
                {accountLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-semibold text-[#333] dark:text-white/80 hover:bg-[#fff5f5] dark:hover:bg-white/5 hover:text-[#E31E24] focus:bg-[#fff5f5] dark:focus:bg-white/5 focus:text-[#E31E24] focus:outline-none"
                  >
                    {label}
                  </Link>
                ))}
                {user && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      signOut();
                    }}
                    className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#333] dark:text-white/80 hover:bg-[#fff5f5] dark:hover:bg-white/5 hover:text-[#E31E24] focus:bg-[#fff5f5] dark:focus:bg-white/5 focus:text-[#E31E24] focus:outline-none"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="hidden items-center gap-1 rounded-sm px-1.5 md:px-2 py-1.5 md:py-2 hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31E24] lg:flex text-[11px] md:text-sm"
            >
              <HiOutlineGlobeAlt aria-hidden="true" /> Tiếng Việt
            </button>
          </div>
        </div>
      </div>

      <nav className="border-t border-black/5 dark:border-white/5" aria-label="Quản lý chuyến bay">
        <div className="mx-auto flex max-w-[1240px] overflow-x-auto px-3 md:px-4 [scrollbar-width:thin]">
          {flightLinks.map(([label, href], index) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={label}
                href={href}
                className={`shrink-0 border-b-2 px-3 md:px-4 py-2 md:py-3 text-[11px] md:text-xs font-extrabold uppercase sm:text-sm ${
                  isActive
                    ? 'border-[#E31E24] text-[#E31E24] dark:text-[#E31E24]'
                    : 'border-transparent text-[#333] dark:text-white/80 hover:border-[#E31E24] hover:text-[#E31E24]'
                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E31E24] ${
                  index === 0 ? 'ml-auto' : ''
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="border-t border-black/5 dark:border-white/5 bg-[#fafafa] dark:bg-navy-dark/50 hidden lg:block" aria-label="Dịch vụ bổ trợ">
        <div className="mx-auto flex max-w-[1240px] overflow-x-auto px-3 md:px-4 py-1.5 md:py-2 [scrollbar-width:thin]">
          {serviceLinks.map(([label, href, Icon], index) => (
            <Link
              key={label}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 md:gap-2 rounded px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-xs font-bold text-[#333] dark:text-white/80 hover:bg-white dark:hover:bg-white/5 hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E31E24] ${
                index === 0 ? 'ml-auto' : ''
              }`}
            >
              <Icon aria-hidden="true" className="text-md md:text-lg text-[#E31E24]" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
