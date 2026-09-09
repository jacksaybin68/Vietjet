'use client';

import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import Link from 'next/link';
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
    <header className="relative z-30 border-b border-black/5 bg-white shadow-[0_2px_12px_rgba(36,36,36,.08)]">
      {announcementVisible && (
        <div className="bg-[#e30613] text-white" aria-live="polite">
          <div className="mx-auto flex min-h-10 max-w-[1240px] flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold sm:px-4 sm:text-sm">
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

      <div className="mx-auto flex min-h-[68px] max-w-[1240px] items-center gap-3 px-3 py-3 sm:px-4 lg:min-h-[82px] lg:gap-6">
        <Link href="/trang-chu" aria-label="Trang chủ Vietjet Air" className="shrink-0">
          <img src="/logo-vj.svg" alt="Vietjet Air" className="h-8 w-auto sm:h-9 lg:h-11" />
        </Link>
        <div className="ml-auto flex items-center gap-1 text-sm font-bold text-[#333] sm:gap-3">
          <Link
            href="/lien-he"
            className="rounded-sm px-2 py-2 hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31E24]"
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
              className="flex items-center gap-1 rounded-sm px-2 py-2 hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31E24]"
            >
              <HiOutlineUserCircle aria-hidden="true" className="text-xl" />
              <span className="hidden sm:inline">
                {user ? user.fullName || 'Tài khoản' : 'Đăng ký / Đăng nhập'}
              </span>
            </button>
            {accountMenuOpen && (
              <div
                id="account-menu"
                role="menu"
                aria-label="Menu tài khoản"
                className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-md border border-black/10 bg-white py-1 shadow-lg"
              >
                {accountLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-semibold text-[#333] hover:bg-[#fff5f5] hover:text-[#E31E24] focus:bg-[#fff5f5] focus:text-[#E31E24] focus:outline-none"
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
                    className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#333] hover:bg-[#fff5f5] hover:text-[#E31E24] focus:bg-[#fff5f5] focus:text-[#E31E24] focus:outline-none"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="hidden items-center gap-1 rounded-sm px-2 py-2 hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31E24] md:flex"
          >
            <HiOutlineGlobeAlt aria-hidden="true" /> Tiếng Việt
          </button>
        </div>
      </div>

      <nav className="border-t border-black/5" aria-label="Quản lý chuyến bay">
        <div className="mx-auto flex max-w-[1240px] overflow-x-auto px-4 [scrollbar-width:thin]">
          {flightLinks.map(([label, href], index) => (
            <Link
              key={label}
              href={href}
              className={`shrink-0 border-b-2 border-transparent px-4 py-3 text-xs font-extrabold uppercase text-[#333] hover:border-[#E31E24] hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E31E24] sm:text-sm ${
                index === 0 ? 'ml-auto' : ''
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <nav className="border-t border-black/5 bg-[#fafafa]" aria-label="Dịch vụ bổ trợ">
        <div className="mx-auto flex max-w-[1240px] overflow-x-auto px-4 py-2 [scrollbar-width:thin]">
          {serviceLinks.map(([label, href, Icon], index) => (
            <Link
              key={label}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded px-3 py-2 text-xs font-bold text-[#333] hover:bg-white hover:text-[#E31E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E31E24] ${
                index === 0 ? 'ml-auto' : ''
              }`}
            >
              <Icon aria-hidden="true" className="text-lg text-[#E31E24]" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
