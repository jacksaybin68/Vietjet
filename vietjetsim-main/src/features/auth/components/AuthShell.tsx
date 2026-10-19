'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/shared/components/navigation';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Page frame for the auth screens, laid out like vietjetair.com/vi/signin:
 * site header on top, then a two-column grid — white form card on the left,
 * promo banner on the right, everything on a soft sky background.
 *
 * The submit buttons inside use `.vj-auth-submit`, which mirrors the real
 * SkyID (skyjoy-authen) gold theme rather than the red `.vj-btn-primary`.
 */
export default function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--vj-purple-light)] bg-[url('/images/hero/hero-window-clouds.jpg')] bg-cover bg-center bg-fixed font-body text-[var(--foreground)] relative flex flex-col justify-between">
      <Header />
      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 pb-32"
      >
        <div className="w-full max-w-[1020px] rounded-3xl bg-white shadow-[0_24px_64px_rgba(30,41,59,0.18)] border border-white/80 overflow-hidden grid lg:grid-cols-2 my-auto">
          {/* Cột trái: Form đăng nhập/đăng ký */}
          <section className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
            <div>
              <Link href="/trang-chu" className="mb-4 inline-flex lg:hidden">
                <img src="/logo-internal.svg" alt="Vietjet Air" className="h-7 w-auto" />
              </Link>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--primary)]">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                {eyebrow}
              </div>
              <h2 className="font-[Be_Vietnam_Pro,sans-serif] text-2xl sm:text-3xl2 font-extrabold leading-[1.2] tracking-tight text-[var(--vj-navy)]">
                {title}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm font-medium leading-relaxed text-[var(--foreground-muted)]">
                {subtitle}
              </p>
              <div className="mt-6">{children}</div>
            </div>
            <p className="mt-8 border-t border-gray-200 pt-4 text-xs font-medium text-[var(--foreground-muted)]">
              * Tìm hiểu thêm về quyền lợi{' '}
              <Link href="/gioi-thieu" className="font-bold text-[var(--primary)] hover:underline">
                Vietjet SkyJoy
              </Link>
              ?
            </p>
          </section>

          {/* Cột phải: Poster Ngoại tệ sẵn sàng - Hành trình an tâm khớp 100% ảnh tham chiếu */}
          <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-b from-sky-100 via-sky-50 to-rose-50 p-6 sm:p-8 border-l border-gray-100 overflow-hidden">
            <a
              href="https://vikkibank.vn/mua-ngoai-te-tren-app-vikki/?utm_source=vietjet&utm_medium=referral&utm_campaign=always_on"
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative h-full flex flex-col justify-between"
            >
              {/* Top tag & Plane */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="bg-primary-dark text-white px-2.5 py-1 rounded-sm text-xs2 font-black italic tracking-tight shadow-sm inline-block">
                    vietjetAir.com
                  </div>
                  {/* Small plane flying */}
                  <span className="text-2xl transform -rotate-12">✈️</span>
                </div>

                <div className="mt-5 text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-primary-dark uppercase tracking-tight leading-tight">
                    NGOẠI TỆ SẴN SÀNG
                  </h3>
                  <h3 className="text-xl sm:text-2xl font-black text-primary-dark uppercase tracking-tight leading-tight mt-0.5">
                    HÀNH TRÌNH AN TÂM
                  </h3>
                  <p className="text-sm font-bold text-gray-800 mt-2">
                    Mua ngoại tệ dễ dàng khi đặt vé
                  </p>

                  <div className="mt-4 inline-flex flex-col items-start gap-1.5 text-xs font-bold text-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-dark font-black text-sm">✓</span>
                      <span>Nhận trong ngày</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary-dark font-black text-sm">✓</span>
                      <span>Tỷ giá ưu đãi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary-dark font-black text-sm">✓</span>
                      <span>Hỗ trợ toàn quốc</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphic illustration with landmark, travelers, currency symbols */}
              <div className="relative mt-4 rounded-xl overflow-hidden bg-white/60 shadow-sm border border-sky-100">
                <img
                  src="/images/hero/hero-airport-exchange.jpg"
                  alt="Ngoại tệ sẵn sàng - Hành trình an tâm"
                  className="w-full h-auto object-cover max-h-[260px] group-hover:scale-105 transition-transform duration-300"
                />
                {/* Floating currency badges */}
                <div className="absolute top-2 left-2 bg-amber-400 text-yellow-950 text-2xs font-black px-2 py-0.5 rounded-full shadow-sm">
                  $ USD
                </div>
                <div className="absolute top-2 right-2 bg-amber-400 text-yellow-950 text-2xs font-black px-2 py-0.5 rounded-full shadow-sm">
                  € EUR
                </div>
                <div className="absolute bottom-2 left-2 bg-amber-400 text-yellow-950 text-2xs font-black px-2 py-0.5 rounded-full shadow-sm">
                  ¥ JPY
                </div>
              </div>
            </a>
          </div>
        </div>
      </main>

      {/* Amy Mascot with "Xin chào!" tooltip matching reference screenshot */}
      <div className="fixed right-6 bottom-6 z-40 flex items-end pointer-events-none select-none">
        <div className="relative mb-12 -mr-1 animate-bounce duration-1000">
          <div className="bg-white text-gray-800 text-2xs font-bold px-2.5 py-1 rounded-full shadow-lg border border-gray-200">
            Xin chào!
          </div>
          <div className="w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 mx-auto -mt-1" />
        </div>
        <img
          src="/images/hero/amy-mascot.png"
          alt="Mascot Amy"
          className="w-14 h-auto drop-shadow-lg"
          loading="lazy"
        />
      </div>
    </div>
  );
}
