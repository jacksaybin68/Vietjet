'use client';

import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HiChevronLeft,
  HiChevronRight,
  HiOutlineGlobeAlt,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineUserCircle,
  HiOutlineX,
} from 'react-icons/hi';
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

const ANNOUNCEMENTS = [
  'Từ ngày 17/8/2026 (GMT+7), các chuyến bay đi và đến Jakarta của Vietjet sẽ được chuyển về nhà ga T3 Ultimate (CGK).',
  '[THÔNG BÁO] Quy định an toàn mới về việc mang theo Pin sạc dự phòng khi bay cùng Vietjet.',
  'Cập nhật thông tin vận hành quan trọng (chuyển đổi nhà ga tại sân bay Hong Kong).',
];

const FLIGHT_LINKS: Array<[string, string]> = [
  ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
  ['Check-in Online', '/lam-thu-tuc'],
  ['Dịch vụ chuyến bay', '/dich-vu'],
  ['Săn vé giá rẻ', '/tim-ve?uu-dai=1'],
];

interface ServiceLink {
  label: string;
  href: string;
  Icon: IconType;
}

const SERVICE_LINKS: ServiceLink[] = [
  { label: 'Đặt vé', href: '/tim-ve', Icon: RiFlightTakeoffLine },
  { label: 'Skyshop', href: '/dich-vu?service=lounge', Icon: RiShoppingBag3Line },
  { label: 'Khách sạn', href: '/dich-vu?service=lounge', Icon: RiHotelLine },
  { label: 'E-Voucher', href: '/dich-vu?service=lounge', Icon: RiGiftLine },
  { label: 'E-Sim', href: '/dich-vu?service=meal', Icon: RiPhoneLine },
  { label: 'E-Visa', href: '/dich-vu?service=insurance', Icon: RiPassportLine },
  { label: 'Mua ngoại tệ', href: '/dich-vu?service=insurance', Icon: RiMoneyDollarCircleLine },
  { label: 'Bảo hiểm', href: '/dich-vu?service=insurance', Icon: RiShieldCheckLine },
  { label: 'SkyJoy', href: '/tai-khoan', Icon: RiVipCrownLine },
];

export default function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const shiftAnnouncement = (delta: number) =>
    setAnnouncementIndex((index) => (index + delta + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="relative z-30 bg-white shadow-[0_2px_12px_rgba(51,51,51,.08)] dark:bg-navy-dark dark:shadow-[0_2px_12px_rgba(0,0,0,.4)]">
      {announcementVisible && (
        <div className="bg-vj-red text-white dark:bg-vj-red-deep" aria-live="polite">
          <div className="mx-auto flex min-h-10 max-w-[1240px] items-center gap-2 px-3 py-2 sm:px-4">
            <button
              type="button"
              aria-label="Thông báo trước"
              onClick={() => shiftAnnouncement(-1)}
              className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <HiChevronLeft aria-hidden="true" className="text-base" />
            </button>
            <p className="min-w-0 flex-1 text-center text-[11px] font-semibold leading-relaxed sm:text-xs lg:text-sm">
              {ANNOUNCEMENTS[announcementIndex]}
            </p>
            <button
              type="button"
              aria-label="Thông báo tiếp theo"
              onClick={() => shiftAnnouncement(1)}
              className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <HiChevronRight aria-hidden="true" className="text-base" />
            </button>
            <button
              type="button"
              aria-label="Đóng thông báo vận hành"
              onClick={() => setAnnouncementVisible(false)}
              className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <HiOutlineX aria-hidden="true" className="text-lg" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-[56px] max-w-[1240px] items-center gap-2 px-3 py-2 sm:px-4 md:min-h-[68px] md:gap-3 md:py-3 lg:min-h-[76px] lg:gap-6">
        <Link href="/trang-chu" aria-label="Trang chủ Vietjet Air" className="shrink-0">
          <img src="/logo-vj.svg" alt="Vietjet Air" className="h-6 w-auto sm:h-9 md:h-8 lg:h-10" />
        </Link>

        <nav
          aria-label="Liên kết nhanh"
          className="ml-auto hidden items-center gap-4 text-xs font-bold text-vj-text dark:text-white/80 lg:flex"
        >
          <Link
            href="/lien-he"
            className="rounded-sm px-2 py-2 transition-colors hover:text-vj-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vj-red dark:hover:text-vj-yellow"
          >
            Hỗ trợ
          </Link>
          <Link
            href="/chuyen-bay-cua-toi"
            className="rounded-sm px-2 py-2 transition-colors hover:text-vj-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vj-red dark:hover:text-vj-yellow"
          >
            Chuyến bay của tôi
          </Link>
          <Link
            href="/lam-thu-tuc"
            className="rounded-sm px-2 py-2 transition-colors hover:text-vj-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vj-red dark:hover:text-vj-yellow"
          >
            Online Check-in
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:gap-2 lg:ml-0">
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              aria-label={user ? 'Mở menu tài khoản' : 'Mở menu đăng ký và đăng nhập'}
              aria-expanded={accountMenuOpen}
              aria-controls="account-menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-1 rounded-sm px-1.5 py-1.5 text-xs font-bold text-vj-text transition-colors hover:text-vj-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vj-red dark:text-white/80 dark:hover:text-vj-yellow md:px-2 md:py-2 lg:text-sm"
            >
              <HiOutlineUserCircle aria-hidden="true" className="text-lg md:text-xl" />
              <span className="hidden md:inline">
                {user ? user.fullName || 'Tài khoản' : 'Đăng ký | Đăng nhập'}
              </span>
            </button>
            {accountMenuOpen && (
              <div
                id="account-menu"
                role="menu"
                aria-label="Menu tài khoản"
                className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-[10px] border border-vj-border bg-white py-1 shadow-lg dark:border-white/10 dark:bg-navy-dark dark:shadow-xl"
              >
                {accountLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-semibold text-vj-text transition-colors hover:bg-[#fff5f5] hover:text-vj-red focus:bg-[#fff5f5] focus:text-vj-red focus:outline-none dark:text-white/80 dark:hover:bg-white/5 dark:hover:text-vj-yellow"
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
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-vj-text transition-colors hover:bg-[#fff5f5] hover:text-vj-red focus:bg-[#fff5f5] focus:text-vj-red focus:outline-none dark:text-white/80 dark:hover:bg-white/5 dark:hover:text-vj-yellow"
                  >
                    <HiOutlineLogout aria-hidden="true" className="text-base" />
                    Đăng xuất
                  </button>
                )}
                <div className="mt-1 border-t border-vj-border px-4 py-3 dark:border-white/10">
                  <ThemeToggle />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Chọn ngôn ngữ"
            className="hidden items-center gap-1 rounded-sm px-1.5 py-1.5 text-xs font-bold text-vj-text transition-colors hover:text-vj-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vj-red dark:text-white/80 dark:hover:text-vj-yellow md:px-2 md:py-2 lg:flex lg:text-sm"
          >
            <HiOutlineGlobeAlt aria-hidden="true" className="text-base" />
            Tiếng Việt
          </button>

          <button
            type="button"
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-sm p-1.5 text-xl text-vj-text transition-colors hover:text-vj-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vj-red dark:text-white/80 lg:hidden"
          >
            {mobileMenuOpen ? (
              <HiOutlineX aria-hidden="true" />
            ) : (
              <HiOutlineMenu aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <nav className="vj-menubar" aria-label="Quản lý chuyến bay">
        <div className="mx-auto flex max-w-[1240px] items-stretch gap-1 overflow-x-auto px-3 md:px-4">
          {FLIGHT_LINKS.map(([label, href]) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={label}
                href={href}
                className={`flex h-12 shrink-0 items-center border-b-[3px] px-3 text-[11px] font-extrabold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white md:px-4 md:text-xs ${
                  isActive
                    ? 'border-vj-yellow text-vj-yellow'
                    : 'border-transparent text-white hover:border-white/60 hover:text-white/90'
                }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/tra-cuu"
            className="ml-auto hidden h-12 shrink-0 items-center gap-1.5 px-3 text-[11px] font-bold text-white transition-colors hover:text-vj-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white md:px-4 md:text-xs lg:flex"
          >
            <HiOutlineGlobeAlt aria-hidden="true" className="text-base" />
            Tra cứu đặt chỗ
          </Link>
        </div>
      </nav>

      <nav
        aria-label="Dịch vụ bổ trợ"
        className="hidden border-b border-vj-border bg-[#f7f7f7] dark:border-white/5 dark:bg-navy-dark/50 lg:block"
      >
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-2 px-3 py-2 md:px-4">
          {SERVICE_LINKS.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-1 shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-vj-red dark:hover:bg-white/5"
            >
              <Icon
                aria-hidden="true"
                className="text-xl text-vj-red transition-transform group-hover:scale-110"
              />
              <span className="text-[11px] font-bold text-vj-text dark:text-white/80">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-40 max-h-[80vh] overflow-y-auto border-t border-vj-border bg-white shadow-xl dark:border-white/10 dark:bg-navy-dark lg:hidden"
        >
          <nav aria-label="Chuyến bay" className="border-b border-vj-border dark:border-white/10">
            {FLIGHT_LINKS.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="block px-4 py-3 text-sm font-bold text-vj-text transition-colors hover:bg-[#f7f7f7] hover:text-vj-red dark:text-white/80 dark:hover:bg-white/5"
              >
                {label}
              </Link>
            ))}
          </nav>

          <nav
            aria-label="Dịch vụ bổ trợ"
            className="grid grid-cols-3 gap-1 border-b border-vj-border p-3 dark:border-white/10"
          >
            {SERVICE_LINKS.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-center transition-colors hover:bg-[#f7f7f7] dark:hover:bg-white/5"
              >
                <Icon aria-hidden="true" className="text-xl text-vj-red" />
                <span className="text-[11px] font-bold text-vj-text dark:text-white/80">
                  {label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="p-3">
            <Link
              href="/lien-he"
              className="block rounded-lg px-4 py-3 text-sm font-bold text-vj-text transition-colors hover:bg-[#f7f7f7] hover:text-vj-red dark:text-white/80 dark:hover:bg-white/5"
            >
              Hỗ trợ
            </Link>
            <Link
              href="/tra-cuu"
              className="block rounded-lg px-4 py-3 text-sm font-bold text-vj-text transition-colors hover:bg-[#f7f7f7] hover:text-vj-red dark:text-white/80 dark:hover:bg-white/5"
            >
              Tra cứu đặt chỗ
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
