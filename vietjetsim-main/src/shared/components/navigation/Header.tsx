'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HiOutlineChevronDown,
  HiOutlineGlobeAlt,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineUserCircle,
  HiOutlineX,
} from 'react-icons/hi';
import { RiCalendarEventLine, RiHeadphoneLine } from 'react-icons/ri';
import { useAuth } from '@/contexts/AuthContext';
import AnnouncementBar from './AnnouncementBar';

// Nav theo đúng bốn mục của vietjetair.com (site thật render uppercase qua CSS);
// "Trang chủ" đi qua logo; thao tác đặt vé luôn dẫn về form booking trên trang chủ.
const NAV_LINKS = [
  { label: 'Chuyến bay của tôi', href: '/chuyen-bay-cua-toi' },
  { label: 'Online Check-in', href: '/lam-thu-tuc' },
  { label: 'Dịch vụ chuyến bay', href: '/dich-vu', mega: 'flight' },
  { label: 'Dịch vụ khác', href: '/dich-vu#khac', mega: 'other' },
] as const;

const FLIGHT_SERVICES_ITEMS = [
  {
    title: 'Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa...',
    desc: 'Đặt trước những dịch vụ tiện ích để tận hưởng chuyến bay một cách trọn vẹn',
    href: '/dich-vu#hanh-ly',
    isHot: true,
  },
  {
    title: 'Bảo hiểm',
    desc: 'Thật yên tâm và thoải mái với các chương trình bảo hiểm uy tín đến từ các đối tác bảo hiểm tin cậy của Vietjet',
    href: '/dich-vu#bao-hiem',
    isHot: false,
  },
  {
    title: 'Săn vé giá rẻ',
    desc: 'Nhanh tay săn vé bay Vietjet giá tốt nhất! Tìm kiếm các chặng bay hot nhất!',
    href: '/trang-chu#hero-booking-form',
    isHot: true,
  },
  {
    title: 'Dịch vụ đặc biệt',
    desc: 'Vận chuyển thú cưng, trẻ em đi một mình, hỗ trợ thủ tục tại sân bay và hơn thế nữa!',
    href: '/dich-vu#dac-biet',
    isHot: false,
  },
  {
    title: 'Bản đồ sân bay',
    desc: 'Xem bản đồ sân bay thật tiện lợi với lismaps',
    href: '/dich-vu#san-bay',
    isHot: true,
  },
  {
    title: 'Bản đồ đường bay',
    desc: 'Xem bản đồ đường bay thật tiện lợi với lismaps',
    href: '/dich-vu#duong-bay',
    isHot: true,
  },
];

const OTHER_SERVICES_ITEMS = [
  {
    title: '"Bay trước – Trả sau" MOVI - Vietjet',
    desc: 'Hạn mức bay cho mỗi khách hàng lên đến 10.000.000 đồng. Hỗ trợ đặt vé và thanh toán nhanh chóng chỉ trong 3 phút.',
    href: '/dich-vu#movi',
    isHot: false,
  },
  {
    title: 'Bay trước, thanh toán sau',
    desc: 'Sẵn sàng bay vui, vé để Vietjet lo. Cùng tận hưởng sản phẩm mua vé máy bay trả góp với thời hạn cho vay đến 6 tháng và không cần chứng minh thu nhập.',
    href: '/dich-vu#tra-gop',
    isHot: true,
  },
  {
    title: 'Taxi đón sân bay',
    desc: 'Dễ dàng đặt trước xe taxi Green SM đón tại sân bay với mức giá cước tiết kiệm.',
    href: '/dich-vu#taxi',
    isHot: true,
  },
  {
    title: 'Đặt trước Hàng miễn thuế',
    desc: 'Tận hưởng mua sắm hàng hiệu chỉ với vài click và nhận ngay trên chuyến bay của Quý khách. Nhiều món đồ ưng ý với mức giá ưu đãi đặc biệt đang chờ Quý khách!',
    href: '/dich-vu#duty-free',
    isHot: false,
  },
];

// Quick Services Rail — Dải icon dịch vụ phụ của Vietjet
const QUICK_SERVICES = [
  {
    label: 'Đặt vé',
    href: '/trang-chu#hero-booking-form',
    iconSrc: '/images/subservices/dat-ve.png',
    highlight: true,
  },
  {
    label: 'Skyshop',
    href: '/dich-vu?service=skyshop',
    iconSrc: '/images/subservices/skyshop.png',
    highlight: false,
  },
  {
    label: 'Khách sạn',
    href: '/dich-vu?service=hotel',
    iconSrc: '/images/subservices/hotel.png',
    highlight: false,
  },
  {
    label: 'E-Voucher',
    href: '/dich-vu?service=evoucher',
    iconSrc: '/images/subservices/evoucher.png',
    highlight: false,
  },
  {
    label: 'E-Sim',
    href: '/dich-vu?service=esim',
    iconSrc: '/images/subservices/esim.png',
    highlight: false,
  },
  {
    label: 'E-Visa',
    href: '/dich-vu?service=evisa',
    iconSrc: '/images/subservices/evisa.png',
    highlight: false,
  },
  {
    label: 'Mua ngoại tệ',
    href: '/dich-vu?service=currency',
    iconSrc: '/images/subservices/currency.png',
    highlight: false,
  },
  {
    label: 'Bảo hiểm',
    href: '/dich-vu?service=insurance',
    iconSrc: '/images/subservices/insurance.png',
    highlight: false,
  },
  {
    label: 'SkyJoy',
    href: '/dich-vu?service=skyjoy',
    iconSrc: '/images/subservices/skyjoy.png',
    highlight: false,
  },
] as const;

const isActivePath = (pathname: string, href: string) =>
  href === '/trang-chu' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export default function Header({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const isHomepage = pathname === '/trang-chu';
  // The booking-lookup page mirrors vietjetair.com's single 94px red band:
  // logo + utility row on top, right-aligned primary nav underneath. It shares
  // every dropdown and auth behaviour with the default header, so this is a
  // presentation variant rather than a second component.
  const compactMode = variant === 'compact';
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('Tiếng Việt');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaMenu, setMegaMenu] = useState<'flight' | 'other' | null>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const accountLinks = [
    ['Tài khoản của tôi', '/tai-khoan'],
    ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
    ['Ví và thanh toán', '/tai-khoan?tab=wallet'],
    ['Cài đặt bảo mật', '/tai-khoan?tab=security'],
  ] as const;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
      if (!langMenuRef.current?.contains(event.target as Node)) setLangMenuOpen(false);
      if (!megaMenuRef.current?.contains(event.target as Node)) setMegaMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setLangMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    setLangMenuOpen(false);
  }, [pathname]);

  const transparentMode = isHomepage && !isScrolled;
  // Homepage-transparent and compact-red both live on a dark surface, so the
  // utility controls share one white treatment.
  const lightChrome = transparentMode || compactMode;

  return (
    <>
      {/* Tầng 1: Thanh thông báo tin tức */}
      {!compactMode && <AnnouncementBar />}

      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          compactMode
            ? 'bg-red-700 text-white shadow-[0_2px_10px_rgba(0,0,0,0.18)]'
            : transparentMode
              ? 'bg-gradient-to-b from-slate-400/40 via-slate-400/15 to-transparent text-white shadow-none'
              : 'bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
        }`}
      >
        {/* Tầng 2: Hàng tiện ích (Utility) — Logo Vietjet + Hỗ trợ + Đăng ký/Đăng nhập + Tiếng Việt */}
        <div
          className={`transition-colors ${lightChrome ? 'bg-transparent' : 'border-b border-gray-100 bg-white'}`}
        >
          <div
            className={`mx-auto flex items-center justify-between px-4 sm:px-6 ${
              compactMode
                ? 'h-16 max-w-[1368px] min-[1368px]:px-0 lg:h-[56px]'
                : 'h-14 max-w-[1240px] sm:h-16 lg:px-0'
            }`}
          >
            {/* Logo Vietjet */}
            <Link
              href="/trang-chu"
              aria-label="Vietjet Air - Trang chủ"
              className="flex shrink-0 items-center transition hover:opacity-95"
            >
              <img
                src="/images/vj-logo.svg"
                alt="Vietjet Air"
                className={
                  compactMode
                    ? 'h-[24px] w-auto brightness-0 invert lg:h-[26px]'
                    : 'h-8 sm:h-9 w-auto'
                }
              />
            </Link>

            {/* Cụm tiện ích bên phải trên desktop */}
            <div
              className={`hidden lg:flex items-center font-semibold ${
                compactMode ? 'gap-7 text-lg2' : 'gap-6 text-sm2'
              } ${lightChrome ? 'text-white' : 'text-gray-700'}`}
            >
              {/* 🎧 Hỗ trợ */}
              <a
                href="tel:19001166"
                className={`flex items-center gap-1.5 font-bold transition ${
                  lightChrome ? 'text-white hover:text-vjgold' : 'text-gray-700 hover:text-vjred'
                }`}
              >
                <RiHeadphoneLine
                  aria-hidden="true"
                  className={
                    compactMode
                      ? 'text-lg3'
                      : `text-base ${lightChrome ? 'text-white' : 'text-vjred'}`
                  }
                />
                <span>{compactMode ? 'Hỗ trợ' : 'Hỗ trợ 1900 1166'}</span>
              </a>

              <span
                className={`w-px ${compactMode ? 'h-5' : 'h-4'} ${
                  lightChrome ? 'bg-white/30' : 'bg-gray-200'
                }`}
                aria-hidden="true"
              />

              {/* 👤 Đăng ký | Đăng nhập hoặc Menu Tài khoản */}
              {user ? (
                <div ref={accountMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((open) => !open)}
                    aria-expanded={accountMenuOpen}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition ${
                      lightChrome
                        ? 'border-white/30 bg-black/20 text-white hover:bg-black/30'
                        : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <HiOutlineUserCircle
                      aria-hidden="true"
                      className={`text-base ${lightChrome ? 'text-white' : 'text-vjred'}`}
                    />
                    <span className="max-w-[120px] truncate">{user.fullName || user.email}</span>
                    <HiOutlineChevronDown className="text-xs text-gray-400" />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
                      <div className="border-b border-gray-100 px-4 py-2.5 bg-gray-50/50">
                        <p className="truncate text-xs font-bold text-gray-900">
                          {user.fullName || user.email}
                        </p>
                        <p className="truncate text-xs2 text-gray-500">{user.email}</p>
                      </div>
                      {accountLinks.map(([label, href]) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setAccountMenuOpen(false)}
                          className="block px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-red-50 hover:text-vjred"
                        >
                          {label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-xs font-bold text-vjred transition hover:bg-red-50"
                      >
                        <HiOutlineLogout aria-hidden="true" />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 font-bold ${lightChrome ? 'text-white' : 'text-gray-700'}`}
                >
                  <HiOutlineUserCircle
                    aria-hidden="true"
                    className={`text-base ${lightChrome ? 'text-white' : 'text-gray-400'}`}
                  />
                  <Link
                    href="/dang-nhap?tab=register"
                    className={`transition ${lightChrome ? 'hover:text-vjgold' : 'hover:text-vjred'}`}
                  >
                    Đăng ký
                  </Link>
                  <span className={lightChrome ? 'text-white/40' : 'text-gray-300'}>|</span>
                  <Link
                    href="/dang-nhap"
                    className={`transition ${lightChrome ? 'hover:text-vjgold' : 'hover:text-vjred'}`}
                  >
                    Đăng nhập
                  </Link>
                </div>
              )}

              <span
                className={`h-4 w-px ${lightChrome ? 'bg-white/30' : 'bg-gray-200'}`}
                aria-hidden="true"
              />

              {/* Dropdown Tiếng Việt ▾ */}
              <div ref={langMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen((open) => !open)}
                  aria-expanded={langMenuOpen}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold transition ${
                    compactMode ? 'text-base2' : 'text-xs'
                  } ${
                    lightChrome
                      ? 'border border-white/40 bg-black/10 backdrop-blur-xs text-white hover:border-white'
                      : 'border border-gray-200 bg-gray-50 text-gray-700 hover:text-vjred'
                  }`}
                >
                  <HiOutlineGlobeAlt
                    aria-hidden="true"
                    className={compactMode ? 'text-lg3' : 'text-sm'}
                  />
                  <span>{currentLang}</span>
                  <HiOutlineChevronDown className="text-xs" />
                </button>

                {langMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg text-gray-800">
                    {['Tiếng Việt', 'English'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setCurrentLang(lang);
                          setLangMenuOpen(false);
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
            </div>

            {/* Mobile controls: Hotline icon + hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              <a
                href="tel:19001166"
                aria-label="Gọi hỗ trợ"
                className={`grid h-10 w-10 place-items-center rounded-lg border ${
                  lightChrome
                    ? 'border-white/40 text-white bg-black/20'
                    : 'border-gray-200 text-vjred'
                }`}
              >
                <RiHeadphoneLine className="text-lg" />
              </a>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                className={`grid h-10 w-10 place-items-center rounded-lg border ${
                  lightChrome
                    ? 'border-white/40 text-white bg-black/20'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {mobileMenuOpen ? (
                  <HiOutlineX className={`text-xl ${lightChrome ? 'text-white' : 'text-vjred'}`} />
                ) : (
                  <HiOutlineMenu className="text-xl" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tầng 3: Primary Nav Bar (Đỏ chuẩn Vietjet hoặc trong suốt trên banner) */}
        <div
          className={`hidden lg:block ${
            lightChrome
              ? 'bg-transparent text-white'
              : 'bg-gradient-to-r from-vjred-dark via-vjred to-vjred-dark text-white shadow-inner'
          }`}
        >
          <div
            className={`mx-auto flex items-center justify-end px-4 sm:px-6 ${
              compactMode
                ? 'h-[38px] max-w-[1368px] min-[1368px]:px-0'
                : 'h-9 max-w-[1240px] lg:px-0'
            }`}
          >
            <div ref={megaMenuRef} className="relative" onMouseLeave={() => setMegaMenu(null)}>
              <nav
                aria-label="Điều hướng chính"
                className={`flex items-center ${compactMode ? 'gap-9' : 'gap-6'}`}
              >
                {NAV_LINKS.map((link) => {
                  const active = isActivePath(pathname, link.href);
                  const isMega =
                    'mega' in link && (link.mega === 'flight' || link.mega === 'other');
                  const isCurrentMega = isMega && megaMenu === link.mega;

                  return (
                    <div
                      key={link.href}
                      className="relative"
                      onMouseEnter={() => {
                        if (isMega) setMegaMenu(link.mega as 'flight' | 'other');
                        else setMegaMenu(null);
                      }}
                    >
                      <Link
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => {
                          if (isMega)
                            setMegaMenu((prev) =>
                              prev === link.mega ? null : (link.mega as 'flight' | 'other')
                            );
                        }}
                        className={`relative whitespace-nowrap py-1.5 font-bold uppercase tracking-wider transition-colors duration-200 flex items-center gap-1 ${
                          compactMode ? 'text-base' : 'text-sm'
                        } ${
                          compactMode
                            ? active || isCurrentMega
                              ? 'font-extrabold text-white'
                              : 'text-white/80 hover:text-white'
                            : active || isCurrentMega
                              ? 'text-vjgold'
                              : 'text-white hover:text-vjgold'
                        }`}
                      >
                        <span>{link.label}</span>
                        {isMega && (
                          <HiOutlineChevronDown
                            className={`text-xs transition-transform duration-200 ${isCurrentMega ? 'rotate-180' : ''}`}
                          />
                        )}
                      </Link>
                    </div>
                  );
                })}
              </nav>

              {/* Mega Menu Dropdown */}
              {megaMenu && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-[640px] rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-gray-100 z-50 text-gray-800 animate-fadeIn"
                  onMouseEnter={() => {}}
                >
                  <div className="grid grid-cols-2 gap-5 divide-x divide-gray-100">
                    {/* Cột 1: Hành lý, suất ăn & dịch vụ bổ trợ */}
                    <div className="pr-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary-dark pb-2 mb-2 border-b border-gray-100 font-koho">
                        Hành lý, suất ăn &amp; dịch vụ bổ trợ
                      </h4>
                      <div className="space-y-1.5">
                        {FLIGHT_SERVICES_ITEMS.slice(0, 3).map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            onClick={() => setMegaMenu(null)}
                            className="group block rounded-xl p-2 transition-all hover:bg-red-50/70 border border-transparent hover:border-red-100"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-bold text-gray-900 group-hover:text-vjred transition-colors leading-tight">
                                {item.title}
                              </span>
                              {item.isHot && (
                                <span className="text-3xs bg-red-600 text-white font-black px-1.5 py-0.2 rounded uppercase shrink-0 italic">
                                  HOT
                                </span>
                              )}
                            </div>
                            <p className="text-xs2 text-gray-500 line-clamp-2 leading-snug">
                              {item.desc}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Cột 2: Dịch vụ khác */}
                    <div className="pl-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary-dark pb-2 mb-2 border-b border-gray-100 font-koho">
                        Dịch vụ khác
                      </h4>
                      <div className="space-y-1.5">
                        {OTHER_SERVICES_ITEMS.slice(0, 3).map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            onClick={() => setMegaMenu(null)}
                            className="group block rounded-xl p-2 transition-all hover:bg-red-50/70 border border-transparent hover:border-red-100"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-bold text-gray-900 group-hover:text-vjred transition-colors leading-tight">
                                {item.title}
                              </span>
                              {item.isHot && (
                                <span className="text-3xs bg-red-600 text-white font-black px-1.5 py-0.2 rounded uppercase shrink-0 italic">
                                  HOT
                                </span>
                              )}
                            </div>
                            <p className="text-xs2 text-gray-500 line-clamp-2 leading-snug">
                              {item.desc}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tầng 4: Quick-rail — Dải icon dịch vụ phụ */}
        {!compactMode && (
          <div
            className={`hidden lg:block ${
              transparentMode
                ? 'bg-transparent text-white'
                : 'border-t border-black/15 bg-vjwine text-white'
            }`}
          >
            <div className="mx-auto flex h-9 max-w-[1240px] items-center justify-start gap-6 px-4 sm:px-6 text-sm2 font-semibold">
              {QUICK_SERVICES.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className={`flex items-center gap-1.5 transition-colors duration-200 ${
                    s.highlight ? 'font-bold text-vjgold' : 'text-white hover:text-vjgold'
                  }`}
                >
                  <img src={s.iconSrc} alt="" className="w-4 h-4 object-contain shrink-0" />
                  <span>{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Search Bar khi cuộn trang (scrollY > 600px) */}
        {isScrolled && pathname === '/trang-chu' && (
          <div className="hidden border-b border-gray-200 bg-white py-2.5 shadow-md animate-fade-in-up lg:block">
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
              {/* Trip type */}
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 shrink-0">
                <span className="rounded-md bg-red-50 px-2.5 py-1 text-vjred font-extrabold">
                  Khứ hồi
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500 font-bold">VND</span>
              </div>

              {/* Origin - Destination - Dates */}
              <div className="flex flex-1 items-center gap-2 max-w-2xl">
                <div className="flex flex-1 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-800">
                  <span className="font-semibold text-gray-400 mr-1.5">Từ:</span>
                  <span className="font-bold truncate">TP. Hồ Chí Minh (SGN)</span>
                </div>
                <div className="text-gray-400 text-sm font-bold">⇄</div>
                <div className="flex flex-1 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-800">
                  <span className="font-semibold text-gray-400 mr-1.5">Đến:</span>
                  <span className="font-bold truncate">Hà Nội (HAN)</span>
                </div>
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-800 shrink-0">
                  <RiCalendarEventLine className="text-vjred mr-1.5 text-sm" />
                  <span className="font-bold">20/10/2026 - 25/10/2026</span>
                </div>
              </div>

              {/* CTA button */}
              <Link
                href="/tim-ve?from=SGN&to=HAN"
                className="flex h-9 items-center justify-center rounded-lg bg-vjyellow px-5 text-xs font-black uppercase text-black shadow transition hover:brightness-95 shrink-0"
              >
                Tìm chuyến bay
              </Link>
            </div>
          </div>
        )}

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-gray-200 bg-white shadow-2xl lg:hidden"
          >
            <nav aria-label="Điều hướng chính" className="grid grid-cols-2 gap-px bg-gray-200">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`bg-white px-4 py-3.5 text-xs font-bold uppercase tracking-wider ${
                    isActivePath(pathname, link.href)
                      ? 'text-vjred bg-red-50/50'
                      : 'text-gray-800 hover:text-vjred'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Quick Services trong mobile menu */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
              <p className="mb-2.5 text-xs font-black uppercase tracking-wider text-gray-400">
                Dịch vụ nổi bật
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SERVICES.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    className="flex items-center gap-2 rounded-xl bg-white p-2.5 text-xs font-bold text-gray-700 shadow-2xs transition hover:text-vjred"
                  >
                    <img src={s.iconSrc} alt="" className="w-4 h-4 object-contain" />
                    <span>{s.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* User Auth Links on Mobile */}
            <div className="border-t border-gray-200 bg-white p-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2.5 text-xs font-bold text-gray-800">
                    <HiOutlineUserCircle className="text-lg text-vjred" />
                    <span className="truncate">{user.fullName || user.email}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/tai-khoan"
                      className="rounded-lg border border-gray-200 p-2 text-center text-xs font-semibold text-gray-700"
                    >
                      Tài khoản
                    </Link>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="rounded-lg border border-red-200 p-2 text-center text-xs font-bold text-vjred"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/dang-nhap"
                    className="rounded-lg border border-gray-300 py-2.5 text-center text-xs font-bold text-gray-800"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/dang-nhap?tab=register"
                    className="rounded-lg bg-vjred py-2.5 text-center text-xs font-bold text-white shadow-xs"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <Link
                href="/trang-chu#hero-booking-form"
                className="vj-cta flex min-h-12 items-center justify-center rounded-xl text-xs sm:text-sm font-black shadow-sm"
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
