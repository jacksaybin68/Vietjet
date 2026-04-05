'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

const MAIN_NAV = [
  { label: 'CHUYẾN BAY CỦA TÔI', href: '/user-dashboard' },
  { label: 'ONLINE CHECK-IN', href: '/check-in' },
  { label: 'DỊCH VỤ CHUYẾN BAY', href: '/services' },
  { label: 'DỊCH VỤ KHÁC', href: '/homepage' },
];

const SERVICE_TABS = [
  {
    label: 'Đặt vé',
    href: '/flight-booking',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    ),
    active: true,
  },
  {
    label: 'Skyshop',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.25 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Khách sạn',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" />
      </svg>
    ),
  },
  {
    label: 'E-Voucher',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2zm-4.42 4.8L12 14.5l-3.58 2.3 1.08-4.12-3.29-2.69 4.24-.25L12 5.8l1.54 3.95 4.24.25-3.29 2.69 1.09 4.11z" />
      </svg>
    ),
  },
  {
    label: 'E-Sim',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
      </svg>
    ),
  },
  {
    label: 'E-Visa',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>
    ),
  },
  {
    label: 'Mua ngoại tệ',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>
    ),
  },
  {
    label: 'Bảo hiểm',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
  },
  {
    label: 'SkyJoy',
    href: '/homepage',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ),
  },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcement] = useState(
    '[THÔNG BÁO] Giao thông từ Denpasar ngày 18/03/2026 (Lễ Im lặng Ogoh - Ogoh) có thể ùn tắc. Quý khách lưu ý thời gian di chuyển phù hợp...'
  );
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) =>
    href === '/homepage' ? pathname === href || pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? 'shadow-[0_2px_16px_rgba(0,0,0,0.12)]' : 'shadow-sm'
        } font-body`}
      >
        {/* Tier 1: Announcement ticker bar */}
        {announcementVisible && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-[1400px] mx-auto px-4">
              <div className="flex items-center h-8 gap-2">
                <span className="text-sm flex-shrink-0 text-primary">
                  🔔
                </span>
                <p
                  className="text-[11px] text-[#333333] flex-1 min-w-0 truncate font-medium font-koho-medium"
                >
                  {announcement}
                </p>
                <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                  <button className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors border border-gray-300 rounded-sm">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                  </button>
                  <button className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors border border-gray-300 rounded-sm">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setAnnouncementVisible(false)}
                    className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors ml-0.5"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tier 2: Logo + utility links + main nav — VietJet RED bar */}
        <div
          className="border-b"
          style={{
            background:
              'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
            borderColor: 'rgba(0,0,0,0.15)',
          }}
        >
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center h-14">
              {/* Left: Navigation links */}
              <div className="hidden lg:flex items-center gap-0">
                {MAIN_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 h-full flex items-center text-[12px] font-bold whitespace-nowrap transition-all duration-200 border-b-2 ${
                      isActive(item.href)
                        ? 'text-yellow-300 border-yellow-300'
                        : 'text-white/90 hover:text-yellow-300 border-transparent hover:border-yellow-300/50'
                    }`}
                    style={{ fontWeight: 700, letterSpacing: '0.04em' }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Logo — centered with some margin */}
              <Link href="/homepage" className="flex items-center flex-shrink-0 mx-auto lg:mx-0">
                <AppLogo size={30} />
              </Link>

              {/* Spacer — pushes utility links to the right */}
              <div className="flex-1 hidden lg:block" />

              {/* Utility links — desktop */}
              <div className="hidden lg:flex items-center gap-0">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/10 rounded-full pl-1 pr-3 py-1 border border-white/10 hover:bg-white/15 transition-all">
                      <Link
                        href="/user-dashboard"
                        className="flex items-center gap-2 text-[11px] font-bold text-white group"
                      >
                        <span className="w-6 h-6 rounded-full bg-yellow-400 text-navy flex items-center justify-center text-[10px] font-black ring-2 ring-white/10 group-hover:scale-105 transition-transform flex-shrink-0">
                          {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                        <span className="max-w-[120px] truncate font-koho-bold">
                          {user.fullName || user.email}
                        </span>
                      </Link>
                      <span className="text-white/20 text-[10px] mx-1 selection:hidden">|</span>
                      <button
                        onClick={() => signOut()}
                        className="text-[10px] font-black text-white/70 hover:text-yellow-300 transition-colors uppercase tracking-tight"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-white/10 rounded-full px-4 py-1.5 border border-white/10">
                    <Link
                      href="/sign-up-login"
                      className="text-[11px] font-bold text-white hover:text-yellow-300 transition-colors"
                    >
                      Đăng ký
                    </Link>
                    <span className="text-white/30 text-[10px] mx-1">|</span>
                    <Link
                      href="/sign-up-login"
                      className="text-[11px] font-bold text-white hover:text-yellow-300 transition-colors"
                    >
                      Đăng nhập
                    </Link>
                  </div>
                )}
                <span className="text-white/20 text-xs mx-3">|</span>
                {/* Language Pillar */}
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-white bg-white/5 border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40 transition-all uppercase tracking-wider"
                >
                  <span className="text-xs grayscale-[0.5] group-hover:grayscale-0 transition-all">🇻🇳</span>
                  <span>Tiếng Việt</span>
                  <Icon name="ChevronDownIcon" size={12} className="text-white/60" />
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-1.5 rounded text-white hover:bg-white/20 transition-colors ml-2"
                aria-label="Toggle menu"
              >
                <Icon name={mobileOpen ? 'XMarkIcon' : 'Bars3Icon'} size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tier 3: Service tabs row — white background, VietJet style */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center overflow-x-auto no-scrollbar">
              {SERVICE_TABS.map((tab, i) => {
                const isTabActive = i === 0 || isActive(tab.href);
                return (
                  <Link
                    key={tab.label}
                    href={tab.href}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                      isTabActive
                        ? 'border-[#EC2029] text-[#EC2029]'
                        : 'border-transparent text-[#6D6E71] hover:text-[#EC2029] hover:border-[#EC2029]/40'
                    } font-body`}
                  >
                    <span style={{ color: isTabActive ? '#EC2029' : '#939598' }}>{tab.svg}</span>
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-4 space-y-1">
              {/* Service tabs mobile */}
              <div className="grid grid-cols-4 gap-2 pb-3 border-b border-gray-100">
                {SERVICE_TABS.map((tab) => (
                  <Link
                    key={tab.label}
                    href={tab.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <span className="text-primary">{tab.svg}</span>
                    <span
                      className="text-[10px] font-semibold text-center leading-tight font-koho"
                    >
                      {tab.label}
                    </span>
                  </Link>
                ))}
              </div>
              {/* Main nav mobile */}
              {MAIN_NAV.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-semibold hover:bg-red-50 rounded-lg transition-colors text-vj-text"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link
                      href="/user-dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 text-sm font-bold text-[#EC2029]"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#EC2029] text-white flex items-center justify-center text-xs font-black">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                      {user.fullName || user.email}
                    </Link>
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      className="block px-3 py-2.5 text-sm font-bold text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-center"
                    >
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <Link
                    href="/sign-up-login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm font-bold text-white rounded-lg transition-colors text-center"
                    style={{
                      background:
                        'linear-gradient(20.12deg, rgba(217,26,33,0.9) 19.6%, rgba(111,0,0,0.9) 93.86%)',
                      fontWeight: 700
                    }}
                  >
                    Đăng nhập / Đăng ký
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
