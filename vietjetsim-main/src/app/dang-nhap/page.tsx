'use client';

import React from 'react';
import Link from 'next/link';
import { CheckInHeader } from '@/shared/components/navigation';
import { useToast } from '@/hooks/useToast';
import { useSearchParams } from 'next/navigation';

const TABS = [
  { key: 'register' as const, label: 'Đăng ký' },
  { key: 'login' as const, label: 'Đăng nhập' },
] as const;

/** Banner ưu đãi ngoại tệ thật của Vietjet (thay khối gradient tạm trước đây). */
const PROMO_BANNER = '/images/hero/banner-chuyenbay-ngoai-te.jpg';
const PROMO_LINK =
  'https://vikkibank.vn/mua-ngoai-te-tren-app-vikki/?utm_source=vietjet&utm_medium=referral&utm_campaign=always_on';

export default function LoginPage() {
  const [activeKey, setActiveKey] = React.useState<'register' | 'login'>('login');
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const searchParams = useSearchParams();
  const toast = useToast();

  // Mở tab Đăng ký nếu deep link ?tab=register
  React.useEffect(() => {
    if (searchParams.get('tab') === 'register') setActiveKey('register');
  }, [searchParams]);

  // NOTE: /api/xac-thuc/dang-nhap-otp yêu cầu {identifier, code} (xác thực OTP
  // đầy đủ), không phải chỉ gửi mã; và không có route /dang-nhap-otp để nhận
  // mã gửi lại. Spec H1 chỉ yêu cầu giao diện đơn giản hóa, nên form submit
  // chỉ mô phỏng gửi mã (toast) mà không gọi API thật để tránh gọi sai endpoint.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Đã gửi mã OTP', 'Vui lòng nhập mã xác thực gửi đến số điện thoại của bạn.');
    }, 600);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#fdeff5] bg-[url('/sky-clouds.svg')] bg-cover bg-top bg-no-repeat font-body text-[#222222]">
      {/* 1. Header đỏ duy nhất — cao 74px, khung max-w-[1080px] */}
      <CheckInHeader />

      {/* 2. Nền trời + mây phủ toàn trang, card auth canh giữa */}
      <main
        id="main-content"
        className="relative flex flex-1 items-center justify-center px-4 py-8 pb-28 sm:px-6 lg:px-8"
      >
        {/* Khung auth kiểu vietjetair.com: card trắng bo 24px, 2 cột 1.12fr / 0.88fr */}
        <div className="my-auto grid w-full max-w-[1040px] overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-sm lg:grid-cols-[1.12fr_0.88fr]">
          {/* 3. Cột trái — khối tiêu đề, tab, form đăng nhập */}
          <section className="flex flex-col justify-start bg-white p-6 sm:p-8 lg:p-10">
            <div className="mb-5">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--primary)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
                SkyJoy Member
              </div>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-gray-900 sm:text-xl">
                Đăng nhập tài khoản
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Đăng nhập để quản lý chuyến bay, đặt vé và tích điểm SkyJoy.
              </p>
            </div>

            {/* Tab Đăng ký / Đăng nhập — gạch chân đỏ cho tab đang chọn */}
            <div className="mb-6 flex items-center justify-center gap-10 border-b border-gray-200">
              {TABS.map((tab) => {
                const active = activeKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveKey(tab.key)}
                    aria-pressed={active}
                    className={`-mb-px border-b-2 pb-2 text-[15px] font-bold transition-colors ${
                      active
                        ? 'border-[var(--primary)] text-[var(--primary)]'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                {/* Country code box (+84) ▾ */}
                <div className="flex h-12 w-[78px] shrink-0 items-center justify-between rounded-[4px] border border-[#d8dade] bg-white px-3 text-[15px] font-bold text-[#333]">
                  <span>(+84)</span>
                  <span className="text-[10px]">▾</span>
                </div>
                {/* Phone number input */}
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="vj-auth-input h-12 w-full rounded-[4px] border border-[#d8dade] bg-white px-4 text-[15px] text-[#333] outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="vj-auth-submit w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Đang gửi…' : 'Gửi mã OTP'}
              </button>
            </form>

            <p className="mt-4 text-center text-[12.5px] leading-relaxed">
              Bạn chưa có tài khoản?{' '}
              <Link
                href="/dang-ky"
                className="font-semibold text-[#1967D2] underline hover:text-[#1553a8]"
              >
                Đăng ký ngay
              </Link>
            </p>

            {/* SkyJoy ID footer integration */}
            <div className="mt-10 flex flex-col items-center">
              <p className="text-center text-[10.5px] text-[#666666]">
                Được cung cấp và xác thực bởi SkyJoy ID
              </p>
              <div className="mt-3 flex items-center gap-[12px]">
                <img
                  src="/images/subservices/skyjoy.png"
                  alt="SkyJoy"
                  className="h-[14px] w-auto"
                />
                <img
                  src="/images/vj-logo.svg"
                  alt="Vietjet Air"
                  className="h-[14px] w-auto brightness-0 invert"
                />
                <span className="flex h-[14px] items-center text-[13px] font-bold text-[#1967D2]">
                  SkyPay
                </span>
              </div>
              <p className="mt-[8px] text-center">
                <span className="inline-flex items-center gap-1 font-semibold text-[#1967D2] underline">
                  <span role="img" aria-label="info">
                    ℹ
                  </span>
                  Bạn đã biết về Vietjet SkyJoy?
                </span>
              </p>
            </div>
          </section>

          {/* 4. Cột phải — banner ngoại tệ thật (ảnh chiến dịch Vietjet) */}
          <div className="relative hidden items-center justify-center overflow-hidden border-l border-gray-100 bg-gradient-to-b from-[#e0f2fe]/40 via-[#f0f9ff]/30 to-[#fff1f2]/40 p-3 sm:p-4 lg:flex">
            <a
              href={PROMO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block h-full max-h-[590px] w-full overflow-hidden rounded-2xl border border-sky-100/80 shadow-sm transition-transform duration-300 hover:scale-[1.01]"
            >
              <img
                src={PROMO_BANNER}
                alt="Ngoại tệ sẵn sàng - Hành trình an tâm - Vietjet Air"
                className="h-full w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </main>

      {/* 5. Floating chatbot mascot */}
      <div className="fixed right-[25px] bottom-[165px] z-40 flex flex-col items-end pointer-events-auto">
        <div className="relative mb-2">
          <div className="inline-block rounded-[10px] bg-gradient-to-b from-[#FFFFFF] to-[#E2E2E2] px-[12px] py-[5px] text-[11px] font-bold whitespace-nowrap text-[#222222] shadow-[0_3px_6px_rgba(0,0,0,0.2)]">
            Xin chào!
          </div>
        </div>
        <img
          src="/images/hero/amy-mascot.png"
          alt="Mascot Amy"
          className="h-auto w-[44px] drop-shadow-md"
          loading="lazy"
        />
      </div>

      {/* 6. Dải sóng cong 3 màu đặc trưng Vietjet ở góc dưới cùng bên phải */}
      <svg
        className="pointer-events-none fixed -right-1 -bottom-1 z-30 h-28 w-36 sm:h-40 sm:w-52"
        width="140"
        height="110"
        viewBox="0 0 140 110"
        fill="none"
      >
        <path d="M 0 110 Q 70 95 140 110 L 140 0 Q 70 25 0 0 Z" fill="#E51F28" />
        <path d="M 0 70 Q 70 55 140 70 L 140 40 Q 70 15 0 40 Z" fill="#FFD700" />
        <path d="M 0 35 Q 70 20 140 35 L 140 5 Q 70 -10 0 5 Z" fill="#76BC21" />
      </svg>
    </div>
  );
}
