'use client';

import React from 'react';
import { Header } from '@/shared/components/navigation';

interface AuthShellProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  mode?: 'login' | 'register';
  children: React.ReactNode;
}

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  mode = 'login',
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 bg-[url('/images/hero/hero-window-clouds.jpg')] bg-cover bg-center bg-fixed font-body text-[var(--foreground)] relative flex flex-col justify-between overflow-x-hidden">
      <Header
        variant="compact"
        mobileTitle={mode === 'register' ? 'ĐĂNG KÝ' : title || 'ĐĂNG NHẬP'}
      />
      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 pb-28"
      >
        <div className="w-full max-w-[1040px] rounded-3xl bg-white/98 backdrop-blur-md shadow-[0_25px_60px_-15px_rgba(215,25,32,0.18),0_12px_36px_rgba(0,0,0,0.08)] border border-white/80 ring-1 ring-black/5 overflow-hidden grid lg:grid-cols-[1.12fr_0.88fr] my-auto">
          {/* Accent red-gold top bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#D71920] via-[#FFCC00] to-[#D71920] col-span-full" />

          {/* Cột trái: Form đăng nhập / đăng ký */}
          <section className="p-6 sm:p-8 lg:p-10 flex flex-col justify-start bg-white">
            <div>
              {title && (
                <div className="mb-5 text-center">
                  {eyebrow && (
                    <div className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-50 to-amber-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[var(--primary)] border border-red-200/60 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                      {eyebrow}
                    </div>
                  )}
                  <h2 className="font-black text-xl sm:text-2xl uppercase tracking-tight text-gray-900 font-koho">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 font-medium">{subtitle}</p>
                  )}
                </div>
              )}
              {children}
            </div>
          </section>

          {/* Cột phải: Banner tương ứng theo Mode */}
          {mode === 'login' ? (
            /* Banner 1: Poster Ngoại tệ sẵn sàng - Hành trình an tâm khớp 100% Ảnh gốc từ CMS Vietjet */
            <div className="relative hidden lg:flex items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-sky-100/40 via-sky-50/30 to-rose-50/40 border-l border-gray-100 overflow-hidden">
              <a
                href="https://vikkibank.vn/mua-ngoai-te-tren-app-vikki/?utm_source=vietjet&utm_medium=referral&utm_campaign=always_on"
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative w-full h-full max-h-[590px] rounded-2xl overflow-hidden shadow-sm border border-sky-100/80 transition-transform duration-300 hover:scale-[1.01]"
              >
                <img
                  src="/images/hero/banner-chuyenbay-ngoai-te.jpg"
                  alt="Ngoại tệ sẵn sàng - Hành trình an tâm - Vietjet Air"
                  className="w-full h-full object-cover rounded-2xl"
                  loading="lazy"
                />
              </a>
            </div>
          ) : (
            /* Banner 2: Đăng Ký Hội Viên VIETJET SkyJoy (3 Bước) khớp Ảnh chuẩn */
            <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-b from-amber-50 via-amber-100/30 to-orange-50 p-6 sm:p-8 border-l border-amber-100 overflow-hidden">
              <div>
                <div className="text-center pt-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-amber-950 tracking-tight">
                    Đăng Ký Hội Viên
                  </h3>
                  <div className="text-2xl sm:text-3xl font-black mt-0.5 flex items-center justify-center gap-1.5">
                    <span className="text-primary">VIETJET</span>
                    <span className="text-primary">Sky</span>
                    <span className="relative inline-block text-primary">
                      Joy
                      <svg
                        className="absolute -bottom-1 left-0 w-full h-2 text-vjamber"
                        viewBox="0 0 40 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="M 2 2 Q 20 8 38 2" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Khung viền vàng 3 bước */}
                <div className="mt-5 rounded-3xl border-2 border-vjyellow bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  {/* BƯỚC 1 */}
                  <div className="flex items-center gap-4">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-vjamber bg-white text-vjamber flex items-center justify-center shrink-0 shadow-sm">
                      <svg className="w-7 h-7 text-vjamber" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-black text-primary uppercase tracking-wide">
                        BƯỚC 1:
                      </div>
                      <div className="text-base font-bold text-gray-800">Đăng ký tại đây</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200" />

                  {/* BƯỚC 2 */}
                  <div className="flex items-center gap-4">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-vjamber bg-white flex flex-col items-center justify-center shrink-0 shadow-sm p-1">
                      <div className="bg-primary text-white rounded px-1.5 py-0.5 text-center leading-none shadow-xs">
                        <span className="text-4xs font-black block">Sky</span>
                        <span className="text-4xs font-black block">Joy</span>
                      </div>
                      <span className="text-2xs font-black text-vjamber leading-none mt-0.5">
                        ▼
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-primary uppercase tracking-wide">
                        BƯỚC 2:
                      </div>
                      <div className="text-base font-bold text-gray-800 leading-snug">
                        Tải ứng dụng SkyJoy tại
                      </div>
                      <div className="text-base font-bold text-gray-800 leading-snug">
                        App Store/ Google Play Store
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200" />

                  {/* BƯỚC 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-vjamber bg-white text-vjamber flex items-center justify-center shrink-0 shadow-sm">
                      <svg
                        className="w-8 h-8 text-vjamber"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v13m0-13V3.5a2.5 2.5 0 10-5 0V8m5 0V3.5a2.5 2.5 0 115 0V8m-10 0h10a2 2 0 012 2v2H3v-2a2 2 0 012-2zm-2 4h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-black text-primary uppercase tracking-wide">
                        BƯỚC 3:
                      </div>
                      <div className="text-base font-bold text-gray-800">Hưởng Ưu đãi</div>
                      <ul className="mt-1 space-y-0.5 text-xs sm:text-sm text-gray-700 italic">
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary font-black not-italic text-sm">•</span>
                          <span>
                            Tặng ngay{' '}
                            <strong className="not-italic font-black text-gray-900">
                              200 SkyPoint
                            </strong>
                          </span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary font-black not-italic text-sm">•</span>
                          <span>Tích SkyPoint cho các chuyến đã bay (*)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500 italic mt-4">
                (*) Khi đã hoàn thành đăng ký và xác thực tài khoản
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Amy Mascot với tooltip "Xin chào!" khớp ảnh tham chiếu */}
      <div className="fixed right-6 bottom-4 z-40 flex items-end pointer-events-none select-none">
        <div className="relative mb-8 mr-1">
          <div className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-gray-200">
            Xin chào!
          </div>
          <div className="w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45 ml-auto mr-3 -mt-1.5" />
        </div>
        <img
          src="/images/hero/amy-mascot.png"
          alt="Mascot Amy"
          className="w-16 h-auto drop-shadow-md"
          loading="lazy"
        />
      </div>

      {/* Dải sóng cong 3 màu đặc trưng Vietjet: Xanh lá - Vàng - Đỏ ở góc dưới cùng bên phải */}
      <svg
        className="fixed bottom-0 right-0 w-44 h-44 sm:w-52 sm:h-52 pointer-events-none z-30 overflow-hidden"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M 10 200 C 60 195 150 165 200 45 L 200 85 C 145 170 55 196 25 200 Z"
          fill="#84CC16"
        />
        <path
          d="M 25 200 C 70 196 155 170 200 85 L 200 135 C 140 180 65 198 45 200 Z"
          fill="#FFDD00"
        />
        <path d="M 45 200 C 85 198 160 180 200 135 L 200 200 Z" fill="#D71920" />
      </svg>
    </div>
  );
}
