'use client';

import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
import AnnouncementBar from './AnnouncementBar';

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
  { label: 'Mua ngoại tệ', href: '/dich-vu?service=insurance', Icon: RiMoneyDollarCircleLine },
  { label: 'Bảo hiểm', href: '/dich-vu?service=insurance', Icon: RiShieldCheckLine },
  { label: 'SkyJoy', href: '/tai-khoan', Icon: RiVipCrownLine },
];

const isActivePath = (pathname: string, href: string) =>
  href === '/trang-chu' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export default function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Menu tài khoản chỉ dành cho khách đã đăng nhập. Khách chưa đăng nhập thấy
  // "Đăng nhập" / "Đăng ký" trên hàng tiện ích phía trên, không qua menu này.
  const accountLinks = [
    ['Tài khoản của tôi', '/tai-khoan'],
    ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
    ['Ví và thanh toán', '/tai-khoan?tab=wallet'],
    ['Cài đặt bảo mật', '/tai-khoan?tab=security'],
  ] as const;

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
    <>
      {/* Thanh thông báo nằm *trên* header sticky: nó là anh em của `<header>`
          chứ không nằm trong, nên khi cuộn nó trôi đi và phần điều hướng đỏ vẫn
          bám ở đầu trang. */}
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--vj-red)] shadow-[0_2px_16px_rgba(0,0,0,0.12)]">
        {/* Hàng tiện ích trên cùng: hỗ trợ, đăng ký, đăng nhập, ngôn ngữ — nền đỏ
          Vietjet đồng nhất với hàng chính, chỉ ngăn bằng đường kẻ mảnh. Ẩn dưới
          `lg`: màn nhỏ dùng menu hamburger, nơi đã có Đăng nhập/Đăng ký. */}
        <div className="hidden border-b border-white/10 lg:block">
          <div className="mx-auto flex h-9 max-w-[1240px] items-center justify-end gap-5 px-4 text-xs font-semibold text-white/90">
            <a
              href="tel:19001166"
              className="flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <RiPhoneLine aria-hidden="true" className="text-base" />
              Hỗ trợ 1900 1166
            </a>
            <Link href="/dang-nhap?tab=register" className="transition-colors hover:text-white">
              Đăng ký
            </Link>
            <Link href="/dang-nhap" className="transition-colors hover:text-white">
              Đăng nhập
            </Link>
            <span className="flex items-center gap-1.5">
              <HiOutlineGlobeAlt aria-hidden="true" className="text-base" />
              Tiếng Việt
            </span>
          </div>
        </div>

        {/* Hàng chính: logo bên trái, nhóm nav + tài khoản bên phải, cân đối theo
          trục ngang. Chiều cao 68–70px như thiết kế. */}
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-6 px-3 sm:px-4 lg:h-[70px]">
          <Link href="/trang-chu" aria-label="Vietjet Air - Trang chủ" className="shrink-0">
            <img
              src="/logo-vj.svg"
              alt="Vietjet Air"
              className="h-8 w-auto brightness-0 invert sm:h-9 lg:h-10"
            />
          </Link>

          {/* Nhóm bên phải: menu điều hướng chính cùng dòng với menu tài khoản.
              Bọc ngoài chỉ `flex-1` từ `lg` để đẩy nhóm sang phải; dưới `lg`
              nhóm co lại và nút hamburger vẫn hiện (nếu ẩn cả cụm dưới `lg` thì
              mobile không còn lối vào menu). */}
          <div className="flex items-center gap-6 lg:flex-1 lg:justify-end">
            <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative whitespace-nowrap px-4 py-3 text-[13px] font-bold uppercase tracking-wide transition-colors xl:text-sm ${
                      active ? 'text-vjyellow' : 'text-white/85 hover:text-white'
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute inset-x-4 bottom-0 h-0.5 bg-vjyellow transition-transform ${
                        active ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Đã đăng nhập: menu tài khoản. Chưa đăng nhập: không có gì trên hàng
              chính — "Đăng nhập" / "Đăng ký" đã chuyển lên hàng tiện ích trên cùng. */}
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
              ) : null}
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
        </div>

        {pathname === '/trang-chu' && (
          <nav
            aria-label="Dịch vụ nhanh"
            className="hidden border-t border-b-2 border-t-[var(--border)] border-b-[var(--primary)] bg-[var(--surface)] lg:block"
          >
            <div className="mx-auto flex h-12 max-w-[1240px] items-center justify-center gap-3 px-4">
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
            <nav
              aria-label="Điều hướng chính"
              className="grid grid-cols-2 gap-px bg-[var(--border)]"
            >
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
            {/* Mobile và tablet không thấy hàng tiện ích trên cùng (ẩn dưới `lg`),
              nên menu phải giữ 2 link này để khách chưa đăng nhập vẫn vào được
              màn hình đăng nhập/đăng ký. */}
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
    </>
  );
}
