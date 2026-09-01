'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

type AuthTab = 'login' | 'register';

export default function SignUpLoginPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await signIn(email, password);
      setSuccess('Đăng nhập thành công!');
      setTimeout(() => {
        const userRole = data?.user?.role || 'user';
        if (userRole === 'admin' || userRole === 'super_admin' || userRole.startsWith('admin_')) {
          router.push('/quan-tri');
        } else {
          router.push('/tai-khoan');
        }
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpRequested) {
      setLoading(true);
      setError('');

      if (!surname.trim() || !givenName.trim() || (!email && !phone) || !password || !agreeTerms) {
        setError(
          !agreeTerms
            ? 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.'
            : 'Vui lòng điền họ tên, mật khẩu và (Email hoặc Số điện thoại).'
        );
        setLoading(false);
        return;
      }

      // Simulate sending OTP
      setTimeout(() => {
        setOtpRequested(true);
        setSuccess('Mã OTP đã được gửi tới ' + (phone || email) + ' (Demo: 123456)');
        setLoading(false);
      }, 800);
      return;
    }

    // Verify OTP step
    setLoading(true);
    setError('');

    if (otpInput !== '123456') {
      setError('Mã OTP không chính xác. Vui lòng thử lại (123456).');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, {
        fullName: (surname.trim() + ' ' + givenName.trim()).trim(),
        phone: phone,
      });
      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => router.push('/tai-khoan'), 1200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // Make email optional in registration
  const isLoginIdentifierValid =
    isEmailValid || phone.replace(/\D/g, '').length >= 9 || email.replace(/\D/g, '').length >= 9; // Allow email or phone in login
  const isPasswordValid = password.length >= 6;
  const isNameValid = surname.trim().length >= 1 && givenName.trim().length >= 1;
  const isPhoneValid = phone.replace(/\D/g, '').length >= 9;
  const primaryButtonClass =
    'w-full rounded-xl bg-[#EC2029] py-3.5 text-base font-black text-white shadow-[0_4px_14px_rgba(236,32,41,0.3)] transition-all hover:bg-[#D0021B] disabled:cursor-not-allowed disabled:bg-[#C41017] disabled:opacity-60';

  return (
    <div className="min-h-screen bg-[#f5f6f8] font-body">
      <div className="h-1 w-full bg-[#FFD400]" />
      <div className="mx-auto flex min-h-[calc(100vh-4px)] max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#e9eaee] bg-white shadow-[0_12px_40px_rgba(26,41,72,0.12)] lg:grid-cols-[1.1fr_1fr]">
          <div className="relative hidden overflow-hidden bg-gradient-red-vj px-10 py-12 text-white lg:flex lg:flex-col">
            <div className="absolute inset-0 opacity-20">
              <AppImage
                src="/images/hero/banner-2-skyboss.jpg"
                alt="Airplane flying"
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
            <div className="relative z-10 mb-auto">
              <Link href="/trang-chu" className="inline-flex items-center gap-3">
                <AppLogo size={44} />
              </Link>
              <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-[#FFD400]" />
                Bay là thích ngay!
              </p>
              <h1 className="mt-6 text-5xl font-black italic leading-tight">
                Vietjet
                <br />
                <span className="text-[#FFD400]">SkyJoy</span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">
                Trải nghiệm tài khoản hội viên hiện đại, quản lý đặt vé, ưu đãi và lịch sử bay theo
                phong cách nhận diện chính thức của Vietjet Air.
              </p>
            </div>
            <div className="relative z-10 mt-10 space-y-3 border-t border-white/20 pt-8 text-sm">
              {[
                'Đặt vé nhanh với giá ưu đãi',
                'Theo dõi hành trình dễ dàng',
                'Tích điểm và đổi quà SkyJoy',
              ].map((item) => (
                <p key={item} className="flex items-center gap-2 text-white/90">
                  <Icon name="CheckCircleIcon" size={16} className="text-[#FFD400]" />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <Link href="/trang-chu">
                  <AppLogo size={38} />
                </Link>
                <span className="rounded-full bg-[#FFF4CC] px-3 py-1 text-xs font-semibold text-[#B84D00]">
                  Website chính thức Vietjet Air
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#EC2029]">
                Chào mừng bạn trở lại
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#1A2948]">
                Đăng nhập / Đăng ký tài khoản
              </h2>
              <p className="mt-2 text-sm text-[#6D6E71]">
                Vui lòng điền thông tin để tiếp tục sử dụng các tiện ích thành viên.
              </p>

              <div className="mt-8 mb-6 grid grid-cols-2 rounded-2xl bg-[#f3f4f7] p-1.5">
                <button
                  onClick={() => {
                    setTab('login');
                    setError('');
                    setSuccess('');
                    setOtpRequested(false);
                    setOtpInput('');
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                    tab === 'login'
                      ? 'bg-white text-[#EC2029] shadow-vj-sm'
                      : 'text-[#6D6E71] hover:text-[#1A2948]'
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => {
                    setTab('register');
                    setError('');
                    setSuccess('');
                    setOtpRequested(false);
                    setOtpInput('');
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                    tab === 'register'
                      ? 'bg-white text-[#EC2029] shadow-vj-sm'
                      : 'text-[#6D6E71] hover:text-[#1A2948]'
                  }`}
                >
                  Đăng ký
                </button>
              </div>

              {error && (
                <div
                  className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
                  style={{
                    background: '#FFF1F1',
                    borderColor: '#FFC5C6',
                    color: '#C41017',
                  }}
                >
                  <Icon name="ExclamationCircleIcon" size={16} />
                  {error}
                </div>
              )}
              {success && (
                <div
                  className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
                  style={{
                    background: '#f0fdf4',
                    borderColor: '#bbf7d0',
                    color: '#16a34a',
                  }}
                >
                  <Icon name="CheckCircleIcon" size={16} />
                  {success}
                </div>
              )}

              {/* Login Form */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className={`form-field-float ${email ? 'has-value' : ''}`}>
                    <Icon
                      name="EnvelopeIcon"
                      size={18}
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 pointer-events-none text-gray-400"
                    />
                    <input
                      id="login-email"
                      name="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=" "
                      className={`form-input font-body-vj w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${isLoginIdentifierValid ? 'form-input-valid' : ''}`}
                      required
                    />
                    <label className="form-label-float has-icon">Email hoặc Số điện thoại</label>
                  </div>

                  <div className={`form-field-float ${password ? 'has-value' : ''}`}>
                    <Icon
                      name="LockClosedIcon"
                      size={18}
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 pointer-events-none text-gray-400"
                    />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=" "
                      className={`form-input w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-12 text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${isPasswordValid ? 'form-input-valid' : ''}`}
                      required
                    />
                    <label className="form-label-float has-icon">Mật khẩu</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-koho">
                      <input
                        id="remember-me"
                        name="remember"
                        type="checkbox"
                        className="rounded"
                        style={{ accentColor: '#EC2029' }}
                      />
                      Ghi nhớ đăng nhập
                    </label>
                    <span
                      className="cursor-not-allowed text-sm font-semibold text-primary opacity-50"
                      title="Tính năng đang phát triển"
                    >
                      Quên mật khẩu?
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`${primaryButtonClass} flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <>
                        <Icon name="ArrowRightOnRectangleIcon" size={18} />
                        Đăng nhập
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Register Form */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  {!otpRequested ? (
                    <div className="space-y-4 animate-in slide-in-from-left-2 fade-in duration-300">
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`form-field-float ${surname ? 'has-value' : ''}`}>
                          <input
                            id="surname"
                            name="surname"
                            type="text"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            placeholder=" "
                            className={`form-input font-body-vj w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-4 text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${isNameValid ? 'form-input-valid' : ''}`}
                            required
                          />
                          <label className="form-label-float">Họ</label>
                        </div>
                        <div className={`form-field-float ${givenName ? 'has-value' : ''}`}>
                          <input
                            id="given_name"
                            name="given_name"
                            type="text"
                            value={givenName}
                            onChange={(e) => setGivenName(e.target.value)}
                            placeholder=" "
                            className={`form-input font-body-vj w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-4 text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${isNameValid ? 'form-input-valid' : ''}`}
                            required
                          />
                          <label className="form-label-float">Tên đệm/tên</label>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="phone"
                          className="mb-1 block text-xs text-gray-500 font-koho"
                        >
                          Số điện thoại
                        </label>
                        <div
                          className={`flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${isPhoneValid ? 'border-primary/40' : ''}`}
                        >
                          <span className="select-none text-sm text-gray-500 font-koho">(+84)</span>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="912 345 678"
                            className="font-body-vj ml-2 flex-1 bg-transparent text-sm text-vj-text outline-none placeholder:text-gray-400"
                            required
                          />
                        </div>
                      </div>

                      <div className={`form-field-float ${email ? 'has-value' : ''}`}>
                        <Icon
                          name="EnvelopeIcon"
                          size={18}
                          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 pointer-events-none text-gray-400"
                        />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder=" "
                          className={`form-input font-body-vj w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${isEmailValid ? 'form-input-valid' : ''}`}
                        />
                        <label className="form-label-float has-icon">Email (Tùy chọn)</label>
                      </div>

                      <div className={`form-field-float ${password ? 'has-value' : ''}`}>
                        <Icon
                          name="LockClosedIcon"
                          size={18}
                          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 pointer-events-none text-gray-400"
                        />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder=" "
                          className={`form-input w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-12 text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${isPasswordValid ? 'form-input-valid' : ''}`}
                          required
                        />
                        <label className="form-label-float has-icon">Mật khẩu</label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
                        </button>
                      </div>

                      <label className="flex cursor-pointer select-none items-start gap-2 text-xs text-gray-500 font-koho">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-0.5 rounded"
                          style={{ accentColor: '#EC2029' }}
                        />
                        <span>
                          Tôi đồng ý với{' '}
                          <a href="#" className="font-semibold text-primary hover:underline">
                            Điều khoản dịch vụ
                          </a>{' '}
                          và{' '}
                          <a href="#" className="font-semibold text-primary hover:underline">
                            Chính sách bảo mật
                          </a>{' '}
                          của Vietjet Air / SkyJoy.
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={loading}
                        className={`${primaryButtonClass} flex items-center justify-center gap-2`}
                      >
                        {loading ? (
                          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="opacity-25"
                            />
                            <path
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              className="opacity-75"
                            />
                          </svg>
                        ) : (
                          <>
                            <Icon name="ArrowRightIcon" size={18} />
                            Tiếp tục
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                      <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                          <Icon name="DevicePhoneMobileIcon" size={32} className="text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Xác thực OTP</h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Vui lòng nhập mã bảo mật 6 số được gửi tới
                          <br />
                          <span className="font-semibold text-primary">{phone || email}</span>
                        </p>
                      </div>

                      <div className={`form-field-float ${otpInput ? 'has-value' : ''}`}>
                        <Icon
                          name="ShieldCheckIcon"
                          size={18}
                          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 pointer-events-none text-gray-400"
                        />
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder=" "
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-center text-xl font-bold tracking-[0.5em] transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                          required
                        />
                        <label
                          className="form-label-float has-icon w-full text-center"
                          style={{ marginLeft: '-1.5rem', pointerEvents: 'none' }}
                        >
                          Mã OTP (123456)
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otpInput.length < 6}
                        className={`${primaryButtonClass} flex items-center justify-center gap-2`}
                      >
                        {loading ? (
                          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="opacity-25"
                            />
                            <path
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              className="opacity-75"
                            />
                          </svg>
                        ) : (
                          <>
                            <Icon name="CheckCircleIcon" size={18} />
                            Xác nhận đăng ký
                          </>
                        )}
                      </button>

                      <p
                        className="mt-4 flex cursor-pointer items-center justify-center gap-1 text-center text-sm font-medium text-gray-500 transition-colors hover:text-primary"
                        onClick={() => {
                          setOtpRequested(false);
                          setSuccess('');
                          setError('');
                        }}
                      >
                        <Icon name="ArrowLeftIcon" size={14} /> Quay lại chỉnh sửa
                      </p>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
