'use client';

import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HiChevronLeft,
  HiChevronRight,
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

const ANNOUNCEMENTS = [
  'Lưu ý thời gian thay đổi nhà ga và lịch bay trước khi khởi hành.',
  'Hành lý, ghế ngồi và dịch vụ bổ sung có thể được chọn khi đặt vé.',
  'Bạn có thể tra cứu chuyến bay bằng mã đặt chỗ và họ tên hành khách.',
];

// Nav theo đúng bốn mục của vietjetair.com (site thật render uppercase qua CSS);
// "Trang chủ" đi qua logo; thao tác đặt vé luôn dẫn về form booking trên trang chủ.
const NAV_LINKS = [
  { label: 'Chuyến bay của tôi', href: '/chuyen-bay-cua-toi' },
  { label: 'Online Check-in', href: '/lam-thu-tuc' },
  { label: 'Dịch vụ chuyến bay', href: '/dich-vu' },
  { label: 'Dịch vụ khác', href: '/dich-vu#khac' },
] as const;

interface ServiceLink {
  label: string;
  href: string;
  Icon: IconType;
}

const SERVICE_LINKS: ServiceLink[] = [
  { label: 'Đặt vé', href: '/trang-chu#hero-booking-form', Icon: RiFlightTakeoffLine },
  { label: 'Mua sắm', href: '/dich-vu?service=lounge', Icon: RiShoppingBag3Line },
  { label: 'Khách sạn', href: '/dich-vu?service=lounge', Icon: RiHotelLine },
  { label: 'E-Voucher', href: '/dich-vu?service=lounge', Icon: RiGiftLine },
  { label: 'E-Sim', href: '/dich-vu?service=meal', Icon: RiPhoneLine },
  { label: 'E-Visa', href: '/dich-vu?service=insurance', Icon: RiPassportLine },
  { label: 'Ngoại tệ', href: '/dich-vu?service=insurance', Icon: RiMoneyDollarCircleLine },
  { label: 'Bảo hiểm', href: '/dich-vu?service=insurance', Icon: RiShieldCheckLine },
  { label: 'SkyJoy', href: '/tai-khoan', Icon: RiVipCrownLine },
];

const isActivePath = (pathname: string, href: string) =>
  href === '/trang-chu' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export default function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Menu tài khoản chỉ dành cho khách đã đăng nhập. Khách chưa đăng nhập thấy
  // "Đăng nhập" / "Đăng ký" ngay trên thanh header, không qua menu này.
  const accountLinks = [
    ['Tài khoản của tôi', '/tai-khoan'],
    ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
    ['Ví và thanh toán', '/tai-khoan?tab=wallet'],
    ['Cài đặt bảo mật', '/tai-khoan?tab=security'],
  ] as const;

  const shiftAnnouncement = (delta: number) => {
    setAnnouncementIndex((index) => (index + delta + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length);
  };

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

  useEffect(() => setMobileMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--vj-red)] shadow-[0_2px_16px_rgba(0,0,0,0.12)]">
      {announcementVisible && (
        <div className="vj-menubar text-white" aria-live="polite">
          <div className="mx-auto flex min-h-9 max-w-[1240px] items-center gap-1 px-3 sm:px-4">
            <button
              type="button"
              aria-label="Thông báo trước"
              onClick={() => shiftAnnouncement(-1)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/15"
            >
              <HiChevronLeft aria-hidden="true" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-[10px] font-semibold sm:text-xs">
              {ANNOUNCEMENTS[announcementIndex]}
            </p>
            <button
              type="button"
              aria-label="Thông báo tiếp theo"
              onClick={() => shiftAnnouncement(1)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/15"
            >
              <HiChevronRight aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setAnnouncementVisible(false)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/15"
            >
              <HiOutlineX aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-5 px-3 sm:px-4 lg:h-[76px]">
        <Link href="/trang-chu" aria-label="Vietjet Air - Trang chủ" className="shrink-0">
          <img
            src="/logo-vj.svg"
            alt="Vietjet Air"
            className="h-8 w-auto brightness-0 invert sm:h-9 lg:h-10"
          />
        </Link>

        <nav
          aria-label="Điều hướng chính"
          className="hidden flex-1 items-center justify-center gap-1 lg:flex"
        >
          {NAV_LINKS.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative whitespace-nowrap px-3 py-3 text-[13px] font-bold uppercase tracking-wide transition-colors xl:text-sm ${
                  active ? 'text-white' : 'text-white/85 hover:text-white'
                }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-3 bottom-0 h-0.5 bg-white transition-transform ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Đã đăng nhập: menu tài khoản. Chưa đăng nhập: "Đăng nhập" / "Đăng ký"
              nằm thẳng trên thanh header, không chui vào dropdown nữa. */}
          {user ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-expanded={accountMenuOpen}
                className="flex min-h-10 items-center gap-1.5 rounded-lg border border-white/50 bg-transparent px-2.5 text-xs font-bold text-white hover:bg-white/10 sm:px-3"
              >
                <HiOutlineUserCircle aria-hidden="true" className="text-lg" />
                <span className="hidden sm:inline">Tài khoản</span>
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] py-2 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <p className="truncate text-sm font-bold text-[var(--foreground)]">
                      {user.fullName || user.email}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">
                      {user.email}
                    </p>
                  </div>
                  {accountLinks.map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setAccountMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] hover:text-[var(--primary)]"
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-3 text-left text-sm font-semibold text-[var(--primary)] hover:bg-[rgb(var(--primary-rgb))/5]"
                  >
                    <HiOutlineLogout aria-hidden="true" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/dang-nhap"
                className="hidden min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:flex"
              >
                <HiOutlineUserCircle aria-hidden="true" className="text-base" />
                Đăng nhập
              </Link>
              <Link
                href="/dang-nhap?tab=register"
                className="hidden min-h-10 items-center rounded-lg border border-white/70 bg-white px-3.5 text-xs font-black text-[var(--vj-red)] transition-colors hover:bg-white/85 sm:flex"
              >
                Đăng ký
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/50 text-white lg:hidden"
          >
            {mobileMenuOpen ? (
              <HiOutlineX className="text-xl" />
            ) : (
              <HiOutlineMenu className="text-xl" />
            )}
          </button>
        </div>
      </div>

      {pathname === '/trang-chu' && (
        <nav
          aria-label="Dịch vụ nhanh"
          className="hidden border-t border-[var(--border)] bg-[var(--surface)] lg:block"
        >
          <div className="mx-auto flex max-w-[1240px] items-center justify-center gap-3 px-4">
            {SERVICE_LINKS.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-1.5 py-2.5 px-2 text-center text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--primary)]"
              >
                <Icon
                  aria-hidden="true"
                  className="text-lg text-[var(--primary)] transition-transform group-hover:scale-110"
                />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-[var(--border)] bg-[var(--background)] shadow-xl lg:hidden"
        >
          <nav aria-label="Điều hướng chính" className="grid grid-cols-2 gap-px bg-[var(--border)]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`bg-[var(--background)] px-4 py-3.5 text-sm font-bold ${
                  isActivePath(pathname, link.href)
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--foreground)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {/* Mobile không hiện 2 link trên thanh header, nên menu phải giữ chúng
              để khách chưa đăng nhập vẫn vào được màn hình đăng nhập/đăng ký. */}
          {!user && (
            <nav
              aria-label="Đăng nhập và đăng ký"
              className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)]"
            >
              <Link
                href="/dang-nhap"
                className="bg-[var(--background)] px-4 py-3.5 text-center text-sm font-bold text-[var(--foreground)]"
              >
                Đăng nhập
              </Link>
              <Link
                href="/dang-nhap?tab=register"
                className="bg-[var(--background)] px-4 py-3.5 text-center text-sm font-bold text-[var(--primary)]"
              >
                Đăng ký
              </Link>
            </nav>
          )}
          <div className="border-t border-[var(--border)] p-4">
            <Link
              href="/trang-chu#hero-booking-form"
              className="vj-cta flex min-h-12 items-center justify-center font-black"
            >
              Tìm và đặt vé
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
