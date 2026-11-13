'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiOutlineChevronDown, HiOutlineMenu, HiOutlineUserCircle } from 'react-icons/hi';
import { RiHeadphoneLine } from 'react-icons/ri';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/features/auth/components';
import VietjetMobileDrawer from './VietjetMobileDrawer';

/**
 * Header TRẮNG của các trang con (tra cứu chuyến bay, check-in, đăng nhập).
 *
 * Số đo lấy từ DOM sống của vietjetair.com (13/11/2026, 1440×900):
 *   - Nền `#FFFFFF`, viền dưới 2px `#E31E24`, bo góc dưới 16px,
 *     shadow `rgba(0,0,0,0.08) 0 8px 24px`.
 *   - Cao 74px, container 1200px.
 *   - Logo bên trái; nav 17px/500 KoHo màu `#1F1F1F`.
 *   - Cụm phải: "Hỗ trợ" + "Tiếng Việt" (chip 28px, bo tròn 999px),
 *     "Tải ứng dụng" (pill 156×36, nền `#F7F7F7`), "Đăng nhập"
 *     (pill 125×36, gradient `#FFEB63 → #F5D200`, chữ 15px/700).
 *
 * Ở MOBILE, site thật dùng băng ĐỎ toàn chiều rộng với `H1` trắng `16px/700`
 * uppercase — nên `mobileRed` bật băng đỏ + logo đảo màu.
 *
 * Khác `Header` (4 tầng của trang chủ) và `CheckInHeader` (thanh đỏ cũ):
 * đây là lớp chrome riêng cho các route không phải trang chủ.
 */

const NAV_LINKS = [
  { label: 'Chuyến bay của tôi', href: '/chuyen-bay-cua-toi' },
  { label: 'Online Check-in', href: '/lam-thu-tuc' },
  { label: 'Dịch vụ chuyến bay', href: '/dich-vu' },
  { label: 'Dịch vụ khác', href: '/dich-vu#khac' },
] as const;

const ACCOUNT_LINKS = [
  ['Tài khoản của tôi', '/tai-khoan'],
  ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
  ['Ví và thanh toán', '/tai-khoan?tab=wallet'],
  ['Cài đặt bảo mật', '/tai-khoan?tab=security'],
] as const;

/** Hai route xác thực: ở đó nút mở modal sẽ mở chồng lên chính trang đó. */
const AUTH_ROUTES = ['/dang-nhap', '/dang-ky'] as const;

export default function SubpageHeader({
  title,
  showMobileTitle = true,
  mobileRed = false,
}: {
  title?: string;
  showMobileTitle?: boolean;
  /** Bật băng đỏ ở mobile (đo được ở `/vi/my/search-booking` và `/vi/checkin`). */
  mobileRed?: boolean;
}) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const { openAuthModal } = useAuthModal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('Tiếng Việt');

  const isActive = (href: string) =>
    href === '/trang-chu'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  // Đang đứng ở `/dang-nhap`/`/dang-ky` thì nút "Đăng nhập" phải là link thật,
  // không mở modal — nếu không modal sẽ chồng lên chính trang đang xem.
  const onAuthRoute = (AUTH_ROUTES as readonly string[]).includes(pathname);

  // `?redirect=` được đọc lúc bấm chứ không qua `useSearchParams`: hook đó bắt
  // buộc toàn bộ cây phía trên phải nằm trong Suspense khi render tĩnh.
  const readRedirect = () => {
    if (typeof window === 'undefined') return undefined;
    const value = new URLSearchParams(window.location.search).get('redirect');
    return value && value.startsWith('/') ? value : undefined;
  };

  const openLogin = () => openAuthModal('login', { redirectTo: readRedirect() });

  return (
    <>
      <header className="vj-subheader">
        {/* Desktop: logo trái — nav — cụm nút phải */}
        <div className="vj-subheader-nav mx-auto hidden max-w-[1200px] px-4 lg:flex">
          <Link
            href="/trang-chu"
            aria-label="Vietjet Air - Trang chủ"
            className="mr-10 flex shrink-0 items-center transition hover:opacity-95"
          >
            <img src="/images/vj-logo.svg" alt="Vietjet Air" className="h-[46px] w-auto" />
          </Link>

          <nav aria-label="Điều hướng chính" className="flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className="text-lg2 font-medium leading-[23.8px] text-[var(--vj-nav-ink)] whitespace-nowrap transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <a
              href="tel:19001166"
              className="vj-subheader-chip hover:bg-[var(--surface-2)]"
              aria-label="Hỗ trợ 1900 1166"
            >
              <RiHeadphoneLine aria-hidden="true" className="mr-1.5 h-4 w-4" />
              <span>Hỗ trợ</span>
            </a>

            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((open) => !open)}
                aria-expanded={langOpen}
                className="vj-subheader-chip"
              >
                <span>{currentLang}</span>
                <HiOutlineChevronDown aria-hidden="true" className="ml-1 text-xs" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg text-gray-800">
                  {['Tiếng Việt', 'English'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setCurrentLang(lang);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold ${
                        currentLang === lang
                          ? 'bg-red-50 font-bold text-vjred'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{lang}</span>
                      {currentLang === lang ? '✓' : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="/trang-chu#tai-ung-dung" className="vj-subheader-pill">
              Tải ứng dụng
            </a>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  className="vj-subheader-pill gap-1.5 font-semibold"
                >
                  <HiOutlineUserCircle aria-hidden="true" className="h-4 w-4 text-vjred" />
                  <span className="max-w-[120px] truncate">
                    {(user.fullName || user.email)?.replace(/\s*\(CCCD:.*?\)/gi, '')}
                  </span>
                  <HiOutlineChevronDown aria-hidden="true" className="text-xs" />
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
                    <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-2.5">
                      <p className="truncate text-xs font-bold text-gray-900">
                        {(user.fullName || user.email)?.replace(/\s*\(CCCD:.*?\)/gi, '')}
                      </p>
                      <p className="truncate text-xs2 text-gray-500">{user.email}</p>
                    </div>
                    {ACCOUNT_LINKS.map(([label, href]) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-red-50 hover:text-vjred"
                      >
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        void signOut();
                      }}
                      className="block w-full border-t border-gray-100 px-4 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-red-50 hover:text-vjred"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : onAuthRoute ? (
              <Link href="/dang-nhap" className="vj-subheader-pill vj-subheader-pill--gold">
                Đăng nhập
              </Link>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="vj-subheader-pill vj-subheader-pill--gold"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Mobile: logo — tiêu đề — menu. Băng đỏ khi `mobileRed` (đo ở site thật). */}
        <div
          className={`flex h-14 items-center justify-between px-4 lg:hidden ${
            mobileRed ? 'bg-[var(--vj-red)] text-white' : ''
          }`}
        >
          <Link
            href="/trang-chu"
            aria-label="Vietjet Air - Trang chủ"
            className="flex shrink-0 items-center transition hover:opacity-90"
          >
            <img
              src="/images/vj-logo.svg"
              alt="Vietjet Air"
              className={`h-[22px] w-auto ${mobileRed ? 'brightness-0 invert' : ''}`}
            />
          </Link>
          {showMobileTitle ? (
            <h1
              className={`truncate text-center text-base2 font-black uppercase tracking-wide ${
                mobileRed ? 'text-white' : 'text-[var(--vj-nav-ink)]'
              }`}
            >
              {title || 'Vietjet Air'}
            </h1>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className={`-mr-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors active:bg-black/5 ${
              mobileRed ? 'text-white' : 'text-[var(--vj-nav-ink)]'
            }`}
          >
            <HiOutlineMenu className="h-7 w-7" />
          </button>
        </div>
      </header>

      <VietjetMobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
