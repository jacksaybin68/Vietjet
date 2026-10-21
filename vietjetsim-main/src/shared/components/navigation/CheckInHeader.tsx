'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { HiOutlineUserCircle } from 'react-icons/hi';
import { RiHeadphoneLine } from 'react-icons/ri';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';

import VietjetMobileDrawer from './VietjetMobileDrawer';

/**
 * Header cho trang Check-in: 1 thanh đỏ duy nhất (không AnnouncementBar,
 * không Utility bar riêng, không Quick-rail).
 *
 * - Chiều cao 74px trên desktop, 54px trên mobile, nền gradient #D91E18 → #C4161C.
 * - Trên mobile: hiện thanh đỏ với tiêu đề "CHECK-IN" ở giữa, nút hamburger ở phải.
 * - Bấm hamburger mở VietjetMobileDrawer đúng chuẩn ảnh tham chiếu.
 */
const NAV_LINKS = [
  { label: 'CHUYẾN BAY CỦA TÔI', href: '/chuyen-bay-cua-toi' },
  { label: 'ONLINE CHECK-IN', href: '/lam-thu-tuc' },
  { label: 'DỊCH VỤ CHUYẾN BAY', href: '/dich-vu' },
  { label: 'DỊCH VỤ KHÁC', href: '/dich-vu#khac' },
] as const;

export default function CheckInHeader({ title = 'CHECK-IN' }: { title?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className="sticky top-0 z-40 h-[54px] lg:h-[70px] text-white shadow-[0_2px_10px_rgba(0,0,0,0.20)]"
        style={{
          background: 'linear-gradient(180deg, #D91E18 0%, #C4161C 100%)',
        }}
      >
        {/* Mobile Header (< lg) matching Screenshot 1 */}
        <div className="flex lg:hidden h-full items-center justify-between px-4">
          <Link
            href="/trang-chu"
            aria-label="Vietjet Air - Trang chủ"
            className="flex shrink-0 items-center transition hover:opacity-90"
          >
            <img
              src="/images/vj-logo.svg"
              alt="Vietjet Air"
              className="h-[22px] w-auto brightness-0 invert"
            />
          </Link>
          <h1 className="font-sans font-black italic tracking-wider text-lg sm:text-xl uppercase text-white text-center">
            {title}
          </h1>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="flex h-8 w-8 items-center justify-center text-white"
          >
            <HiOutlineMenu className="h-7 w-7 text-white" />
          </button>
        </div>

        {/* Desktop Header (>= lg) */}
        <div className="hidden lg:block mx-auto max-w-[1080px] h-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between">
            {/* Logo (trái) */}
            <Link
              href="/trang-chu"
              aria-label="Vietjet Air - Trang chủ"
              className="flex shrink-0 items-center transition hover:opacity-90"
            >
              <img
                src="/images/vj-logo.svg"
                alt="Vietjet Air"
                className="h-[28px] sm:h-[30px] w-auto brightness-0 invert"
              />
            </Link>

            {/* Phải: 2 hàng (tiện ích trên, menu dưới) */}
            <div className="flex flex-col items-end justify-between">
              {/* Hàng trên: Cụm tiện ích */}
              <div className="flex items-center gap-[10px] text-[12.5px] font-semibold text-white">
                <a
                  href="tel:19001166"
                  className="flex items-center gap-1.5 text-white hover:text-vjyellow transition-colors"
                >
                  <RiHeadphoneLine aria-hidden="true" className="h-3.5 w-3.5 text-white" />
                  <span>Hỗ trợ</span>
                </a>

                {user ? (
                  <span className="flex items-center gap-1.5 text-white">
                    <HiOutlineUserCircle aria-hidden="true" className="h-4 w-4 text-white" />
                    <span>{(user.fullName || user.email)?.replace(/\s*\(CCCD:.*?\)/gi, '')}</span>
                  </span>
                ) : (
                  <>
                    <Link
                      href="/dang-ky"
                      className="text-white hover:text-vjyellow transition-colors"
                    >
                      Đăng ký
                    </Link>
                    <span className="text-white/80">|</span>
                    <Link
                      href="/dang-nhap"
                      className="text-white hover:text-vjyellow transition-colors"
                    >
                      Đăng nhập
                    </Link>
                  </>
                )}

                <button
                  type="button"
                  className="flex items-center justify-center h-[22px] px-2 rounded-[3px] border border-white/85 bg-transparent text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <span>Tiếng Việt</span>
                  <span>▾</span>
                </button>
              </div>

              {/* Hàng dưới: Thanh Menu chính */}
              <nav aria-label="Điều hướng chính" className="flex items-center gap-[22px]">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative text-[13px] font-semibold uppercase text-white transition-colors ${
                        active ? 'font-extrabold' : 'hover:text-vjyellow'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Vietjet Mobile Drawer matching Screenshot 6 */}
      <VietjetMobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
