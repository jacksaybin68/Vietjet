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

function LoginPageInner() {
  const [activeKey, setActiveKey] = React.useState<'register' | 'login'>('login');
  const [phone, setPhone] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [showPasswordText, setShowPasswordText] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const toast = useToast();

  const [regSurname, setRegSurname] = React.useState('');
  const [regGivenName, setRegGivenName] = React.useState('');
  const [regPhone, setRegPhone] = React.useState('');
  const [regBirthDay, setRegBirthDay] = React.useState('');
  const [regBirthMonth, setRegBirthMonth] = React.useState('');
  const [regBirthYear, setRegBirthYear] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regReferral, setRegReferral] = React.useState('');
  const [regAgree, setRegAgree] = React.useState(false);
  const [regLoading, setRegLoading] = React.useState(false);

  // Mở tab Đăng ký nếu deep link ?tab=register
  React.useEffect(() => {
    if (searchParams?.get('tab') === 'register') setActiveKey('register');
  }, [searchParams]);

  const handleTabChange = (key: 'register' | 'login') => {
    setActiveKey(key);
    if (key === 'register') {
      setShowPassword(false);
      setPassword('');
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (key === 'register') {
        url.searchParams.set('tab', 'register');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = phone.trim();
    if (!identifier) {
      toast.error('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    // Bước 1: Nếu chưa hiện trường mật khẩu, hiển thị trường mật khẩu và focus
    if (!showPassword) {
      setShowPassword(true);
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 50);
      return;
    }

    // Bước 2: Đã hiện trường mật khẩu, kiểm tra mật khẩu
    if (!password) {
      toast.error('Lỗi', 'Vui lòng nhập mật khẩu');
      passwordInputRef.current?.focus();
      return;
    }

    // Thực hiện đăng nhập qua API xác thực
    setLoading(true);
    try {
      const res = await fetch('/api/xac-thuc/dang-nhap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoading(false);
        toast.error(
          'Đăng nhập thất bại',
          data.error || 'Số điện thoại hoặc mật khẩu không chính xác'
        );
        return;
      }

      toast.success(
        'Đăng nhập thành công',
        `Chào mừng ${data.user?.full_name || 'bạn'} đã đăng nhập thành công!`
      );

      const redirectParam = searchParams?.get('redirect');
      const targetUrl = redirectParam || (data.user?.role === 'admin' ? '/quan-tri' : '/trang-chu');

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500);
    } catch {
      setLoading(false);
      toast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSurname.trim() || !regGivenName.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập đầy đủ Họ và Tên đệm/Tên');
      return;
    }
    if (!regPhone.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    if (!regAgree) {
      toast.error('Lỗi', 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật');
      return;
    }
    setRegLoading(true);
    setTimeout(() => {
      setRegLoading(false);
      toast.success(
        'Đăng ký thành công',
        'Mã xác thực đã được gửi tới số điện thoại của bạn để hoàn tất kích hoạt hội viên SkyJoy.'
      );
    }, 700);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-rose-50 bg-[url('/sky-clouds.svg')] bg-cover bg-top bg-no-repeat font-body text-gray-900">
      {/* 1. Header đỏ duy nhất — cao 74px, khung max-w-[1080px] */}
      <CheckInHeader />

      {/* 2. Nền trời + mây phủ toàn trang, card auth canh giữa */}
      <main
        id="main-content"
        className="relative flex flex-1 items-center justify-center px-4 py-8 pb-28 sm:px-6 lg:px-8"
      >
        {/* Khung auth kiểu vietjetair.com: card trắng bo 24px, 2 cột 1.12fr / 0.88fr */}
        <div className="my-auto grid w-full max-w-[1040px] overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-sm lg:grid-cols-[1.12fr_0.88fr]">
          {/* 3. Cột trái — khối tiêu đề, tab, form đăng nhập / đăng ký */}
          <section className="flex flex-col justify-start bg-white p-6 sm:p-8 lg:p-10">
            <div className="mb-5">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--primary)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
                SkyJoy Member
              </div>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-gray-900 sm:text-xl">
                {activeKey === 'register' ? 'Đăng ký tài khoản' : 'Đăng nhập tài khoản'}
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {activeKey === 'register'
                  ? 'Đăng ký thành viên SkyJoy để nhận vô vàn ưu đãi và tích điểm đổi quà.'
                  : 'Đăng nhập để quản lý chuyến bay, đặt vé và tích điểm SkyJoy.'}
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
                    data-testid={`tab-${tab.key}`}
                    onClick={() => handleTabChange(tab.key)}
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

            {activeKey === 'login' ? (
              <>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    {/* Country code box (+84) ▾ */}
                    <div className="flex h-12 w-[78px] shrink-0 items-center justify-between rounded-[4px] border border-gray-300 bg-white px-3 text-[15px] font-bold text-gray-800">
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
                      className="vj-auth-input h-12 w-full rounded-[4px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 outline-none transition-colors focus:border-[var(--primary)]"
                    />
                  </div>

                  {showPassword && (
                    <div className="flex flex-col gap-1.5">
                      <div className="relative flex items-center">
                        <input
                          ref={passwordInputRef}
                          type={showPasswordText ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mật khẩu"
                          autoComplete="current-password"
                          className="vj-auth-input h-12 w-full rounded-[4px] border border-gray-300 bg-white px-4 pr-11 text-sm text-gray-800 outline-none transition-colors focus:border-[var(--primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordText(!showPasswordText)}
                          className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label={showPasswordText ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showPasswordText ? (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <Link
                          href="/quen-mat-khau"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Quên mật khẩu?
                        </Link>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    data-testid="login-submit-btn"
                    disabled={loading}
                    className="vj-auth-submit w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
                  </button>
                </form>

                <p className="mt-4 text-center text-[12.5px] leading-relaxed">
                  Bạn chưa có tài khoản?{' '}
                  <Link
                    href="/dang-ky"
                    onClick={(e) => {
                      e.preventDefault();
                      handleTabChange('register');
                    }}
                    className="font-semibold text-blue-600 underline hover:text-blue-700"
                  >
                    Đăng ký ngay
                  </Link>
                </p>
              </>
            ) : (
              <>
                <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={regSurname}
                      onChange={(e) => setRegSurname(e.target.value)}
                      placeholder="Họ *"
                      className="vj-auth-input h-11 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-primary"
                      required
                    />
                    <input
                      type="text"
                      value={regGivenName}
                      onChange={(e) => setRegGivenName(e.target.value)}
                      placeholder="Tên đệm & Tên *"
                      className="vj-auth-input h-11 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-primary"
                      required
                    />
                  </div>
                  <p className="text-xs font-medium text-blue-600">
                    Nhập họ tên in hoa không dấu khớp giấy tờ tùy thân (ví dụ: NGUYEN VAN A).
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="flex h-11 w-20 shrink-0 items-center justify-between rounded border border-gray-300 bg-white px-2.5 text-xs font-bold text-gray-800">
                      <span>(+84)</span>
                      <span className="text-xs text-gray-400">▾</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Số điện thoại *"
                      className="vj-auth-input h-11 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-primary"
                      required
                    />
                  </div>

                  <div className="flex h-11 w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 transition-colors focus-within:border-primary">
                    <span className="font-medium whitespace-nowrap text-gray-700">Ngày sinh:</span>
                    <div className="flex items-center gap-1 font-semibold text-sm">
                      <select
                        aria-label="Ngày"
                        value={regBirthDay}
                        onChange={(e) => setRegBirthDay(e.target.value)}
                        className="cursor-pointer bg-transparent text-sm font-semibold text-gray-800 outline-none"
                      >
                        <option value="">Ngày</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          )
                        )}
                      </select>
                      <span className="text-gray-400">/</span>
                      <select
                        aria-label="Tháng"
                        value={regBirthMonth}
                        onChange={(e) => setRegBirthMonth(e.target.value)}
                        className="cursor-pointer bg-transparent text-sm font-semibold text-gray-800 outline-none"
                      >
                        <option value="">Tháng</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(
                          (m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          )
                        )}
                      </select>
                      <span className="text-gray-400">/</span>
                      <select
                        aria-label="Năm"
                        value={regBirthYear}
                        onChange={(e) => setRegBirthYear(e.target.value)}
                        className="cursor-pointer bg-transparent text-sm font-semibold text-gray-800 outline-none"
                      >
                        <option value="">Năm</option>
                        {Array.from({ length: 80 }, (_, i) => String(2024 - i)).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email (xác nhận đặt vé & đổi thưởng)"
                      className="vj-auth-input h-11 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-primary"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={regReferral}
                      onChange={(e) => setRegReferral(e.target.value)}
                      placeholder="Mã giới thiệu SkyJoy (nếu có)"
                      className="vj-auth-input h-11 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-primary"
                    />
                  </div>

                  <label className="flex cursor-pointer select-none items-start gap-2 pt-1 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={regAgree}
                      onChange={(e) => setRegAgree(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-primary"
                    />
                    <span>
                      Tôi đồng ý với{' '}
                      <a
                        href="/gioi-thieu"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 underline"
                      >
                        Điều khoản dịch vụ &amp; Chính sách bảo mật
                      </a>{' '}
                      của Vietjet SkyJoy.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="vj-auth-submit mt-1 w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {regLoading ? 'Đang đăng ký…' : 'Đăng ký tài khoản SkyJoy'}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs leading-relaxed text-gray-600">
                  Bạn đã có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="font-bold text-blue-600 underline hover:text-blue-700"
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              </>
            )}

            {/* SkyJoy ID footer integration */}
            <div className="mt-10 flex flex-col items-center">
              <p className="text-center text-[10.5px] text-gray-600">
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
                <span className="flex h-[14px] items-center text-[13px] font-bold text-blue-600">
                  SkyPay
                </span>
              </div>
              <p className="mt-[8px] text-center">
                <span className="inline-flex items-center gap-1 font-semibold text-blue-600 underline">
                  <span role="img" aria-label="info">
                    ℹ
                  </span>
                  Bạn đã biết về Vietjet SkyJoy?
                </span>
              </p>
            </div>
          </section>

          {/* 4. Cột phải — banner ngoại tệ thật (ảnh chiến dịch Vietjet) */}
          <div className="relative hidden items-center justify-center overflow-hidden border-l border-gray-100 bg-gradient-to-b from-sky-100/40 via-sky-50/30 to-rose-50/40 p-3 sm:p-4 lg:flex">
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

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageInner />
    </React.Suspense>
  );
}
