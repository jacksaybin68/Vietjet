'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { HiOutlineUserCircle } from 'react-icons/hi';
import { RiHeadphoneLine } from 'react-icons/ri';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Header cho trang Check-in: 1 thanh đỏ duy nhất (không AnnouncementBar,
 * không Utility bar riêng, không Quick-rail).
 *
 * - Chiều cao 74px, nền gradient #D91E18 → #C4161C.
 * - Toàn bộ nội dung gom trong khung max-w-[1080px] mx-auto, thẳng hàng với
 *   khung Card check-in bên dưới.
 * - Trái: Logo trắng. Phải: 2 hàng — hàng trên cụm tiện ích, hàng dưới menu
 *   chính 4 mục.
 * - Trên màn hình nhỏ (mobile): gom thành 1 hàng, chỉ hiện hamburger; bấm
 *   hamburger mở drawer nền đỏ chứa menu chính + tiện ích, tránh chồng lấn.
 */
const NAV_LINKS = [
  { label: 'CHUYẾN BAY CỦA TÔI', href: '/chuyen-bay-cua-toi' },
  { label: 'ONLINE CHECK-IN', href: '/lam-thu-tuc' },
  { label: 'DỊCH VỤ CHUYẾN BAY', href: '/dich-vu' },
  { label: 'DỊCH VỤ KHÁC', href: '/dich-vu#khac' },
] as const;

export default function CheckInHeader() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className="sticky top-0 z-40 h-[74px] text-white shadow-[0_2px_10px_rgba(0,0,0,0.20)]"
        style={{
          background: 'linear-gradient(180deg, #D91E18 0%, #C4161C 100%)',
        }}
      >
        <div className="mx-auto max-w-[1080px] h-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between lg:flex-row flex-col gap-3">
            {/* Logo (trái) — trắng nổi trên nền đỏ, cao 40px, giữa dọc */}
            <Link
              href="/trang-chu"
              aria-label="Vietjet Air - Trang chủ"
              className="flex shrink-0 items-center"
            >
              <img
                src="/images/vj-logo.svg"
                alt="Vietjet Air"
                className="h-[40px] w-auto brightness-0 invert"
              />
            </Link>

            {/* Phải: 2 hàng (tiện ích trên, menu dưới) */}
            <div className="flex flex-col items-end justify-between w-full lg:w-auto lg:items-end">
              {/* Hàng trên: Cụm tiện ích — Hỗ trợ | Đăng ký | Đăng nhập | Tiếng Việt */}
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

                {/* Nút Tiếng Việt — khung chữ nhật viền trắng mảnh, không icon địa cầu */}
                <button
                  type="button"
                  className="flex items-center justify-center h-[22px] px-2 rounded-[3px] border border-white/85 bg-transparent text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <span>Tiếng Việt</span>
                  <span>▾</span>
                </button>
              </div>

              {/* Hàng dưới: Thanh Menu chính — 4 mục, đều màu trắng, xóa mũi tên */}
              <nav
                aria-label="Điều hướng chính"
                className={`flex items-center gap-[22px] ${mobileOpen ? 'hidden' : ''}`}
              >
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`relative text-[13px] font-semibold uppercase text-white transition-colors ${
                        active ? 'font-extrabold' : 'hover:text-vjyellow'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Hamburger chỉ hiện trên mobile */}
              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
                className={`lg:hidden grid h-10 w-10 place-items-center rounded-lg border border-white/40 text-white bg-black/20 hover:bg-white/10 transition-colors`}
              >
                {mobileOpen ? (
                  <HiOutlineX className="text-xl text-white" />
                ) : (
                  <HiOutlineMenu className="text-xl text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer — nền đỏ gradient, chứa menu chính + tiện ích */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#C4161C] text-white"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute top-0 right-0 p-4 z-10" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              <HiOutlineX className="text-xl text-white" />
            </button>
          </div>
          <div className="mt-[74px] px-6 py-8 space-y-6">
            <nav aria-label="Điều hướng chính trên mobile">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`block px-4 py-3 text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                      active
                        ? 'bg-white/10 text-white font-extrabold border-l-4 border-white'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 pt-6 space-y-3">
              <a
                href="tel:19001166"
                className="block px-4 py-2 flex items-center gap-2 text-[12.5px] font-semibold text-white hover:text-vjyellow transition-colors"
              >
                <RiHeadphoneLine aria-hidden="true" className="h-3.5 w-3.5 text-white" />
                Hỗ trợ
              </a>
              {!user && (
                <div className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold text-white">
                  <Link
                    href="/dang-ky"
                    className="text-white hover:text-vjyellow transition-colors"
                  >
                    Đăng ký
                  </Link>
                  <span className="text-white/60">|</span>
                  <Link
                    href="/dang-nhap"
                    className="text-white hover:text-vjyellow transition-colors"
                  >
                    Đăng nhập
                  </Link>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  // Nút Tiếng Việt trên mobile giữ nguyên (không có dropdown drawer phức tạp)
                }}
                className="flex items-center gap-2 px-4 py-2 text-[12.5px] font-semibold text-white hover:text-vjyellow transition-colors"
              >
                <span>Tiếng Việt</span>
                <span>▾</span>
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[12.5px] font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <HiOutlineUserCircle aria-hidden="true" className="h-4 w-4 text-white" />
                  Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
