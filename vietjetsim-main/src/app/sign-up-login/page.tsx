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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      setSuccess('Đăng nhập thành công!');
      setTimeout(() => {
        router.push('/user-dashboard');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 800));
    if (!name || !email || !password || !phone) {
      setError('Vui lòng điền đầy đủ thông tin.');
      setLoading(false);
      return;
    }
    setSuccess('Đăng ký thành công! Đang chuyển hướng...');
    setTimeout(() => router.push('/user-dashboard'), 1200);
    setLoading(false);
  };

  const isEmailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isNameValid = name.trim().length >= 2;
  const isPhoneValid = phone.replace(/\D/g, '').length >= 9;

  return (
    <div
      className="min-h-screen flex font-body"
    >
      {/* Left Panel - VietJet red brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col"
        style={{
          background: 'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="absolute inset-0">
          <AppImage
            src="https://images.unsplash.com/photo-1614412445093-05b0f1b1e457"
            alt="Airplane flying"
            fill
            className="object-cover mix-blend-overlay opacity-30"
            sizes="50vw"
          />
        </div>

        {/* Decorative airplane */}
        <div className="absolute bottom-20 right-8 opacity-20 animate-vj-float">
          <svg className="w-40 h-40 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col h-full p-12">
          <Link href="/homepage" className="flex items-center gap-3 mb-auto">
            <AppLogo size={44} />
          </Link>
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6"
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.20)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#FFD400' }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 600
                }}
              >
                Nền tảng mô phỏng
              </span>
            </div>
            <h1
              className="text-5xl font-black text-white leading-tight tracking-tight mb-4"
              style={{
                fontStyle: 'italic',
                fontWeight: 900
              }}
            >
              Bay khắp
              <br />
              <span style={{ color: '#FFD400' }}>Việt Nam</span>
              <br />
              mọi lúc
            </h1>
            <p
              className="text-base leading-relaxed max-w-sm"
              style={{
                color: 'rgba(255,255,255,0.70)',
                fontWeight: 500
              }}
            >
              Trải nghiệm đặt vé máy bay hoàn chỉnh với hệ thống quản lý chuyến bay chuyên nghiệp.
            </p>
          </div>
          <div
            className="flex gap-8 mt-10 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.20)' }}
          >
            {[
              ['50+', 'Đường bay'],
              ['2M+', 'Hành khách'],
              ['98%', 'Đúng giờ'],
            ].map(([val, label]) => (
              <div key={label}>
                <div
                  className="text-2xl font-black"
                  style={{
                    color: '#FFD400',
                    fontWeight: 900
                  }}
                >
                  {val}
                </div>
                <div
                  className="text-xs mt-0.5 font-koho"
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <AppLogo size={32} />
            <span
              className="font-black text-primary"
              style={{
                fontWeight: 900
              }}
            >
              VietjetSim
            </span>
          </div>

          {/* VietJet-style tabs */}
          <div className="flex border-b-2 border-gray-200 mb-8">
            <button
              onClick={() => {
                setTab('login');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 pb-3 text-sm font-bold transition-all ${
                tab === 'login' ? 'border-b-2 -mb-0.5' : 'hover:text-gray-600'
              }`}
              style={{
                color: tab === 'login' ? '#EC2029' : '#939598',
                borderColor: tab === 'login' ? '#EC2029' : 'transparent',
                fontWeight: 700
              }}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => {
                setTab('register');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 pb-3 text-sm font-bold transition-all ${
                tab === 'register' ? 'border-b-2 -mb-0.5' : 'hover:text-gray-600'
              }`}
              style={{
                color: tab === 'register' ? '#EC2029' : '#939598',
                borderColor: tab === 'register' ? '#EC2029' : 'transparent',
                fontWeight: 700
              }}
            >
              Đăng ký
            </button>
          </div>

          {/* Demo credentials */}
          <div
            className="rounded-xl p-4 mb-6 text-xs bg-primary-50"
            style={{ border: '1px solid #FFE0E0' }}
          >
            <div
              className="font-bold mb-2 flex items-center gap-1.5 text-primary"
            >
              <Icon name="InformationCircleIcon" size={14} className="text-primary" />
              Tài khoản demo:
            </div>
            <div
              className="space-y-1 font-koho"
            >
              <div>
                <span className="font-semibold text-vj-text">
                  User:
                </span>{' '}
                user@vietjetsim.vn / user123
              </div>
              <div>
                <span className="font-semibold text-vj-text">
                  Admin:
                </span>{' '}
                admin@vietjetsim.vn / admin123
              </div>
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
              style={{
                background: '#FFF1F1',
                border: '1px solid #FFC5C6',
                color: '#C41017'
              }}
            >
              <Icon name="ExclamationCircleIcon" size={16} />
              {error}
            </div>
          )}
          {success && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a'
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm form-input ${isEmailValid ? 'form-input-valid' : ''} font-body-vj`}
                  required
                />
                <label className="form-label-float has-icon">Email</label>
              </div>

              <div className={`form-field-float ${password ? 'has-value' : ''}`}>
                <Icon
                  name="LockClosedIcon"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm form-input ${isPasswordValid ? 'form-input-valid' : ''}`}
                  style={
                    isPasswordValid
                      ? {
                          paddingRight: '2.5rem',
                          color: '#333333',
                        }
                      : { color: '#333333' }
                  }
                  required
                />
                <label className="form-label-float has-icon">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                  <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label
                  className="flex items-center gap-2 text-sm cursor-pointer font-koho"
                >
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
                  className="text-sm font-semibold opacity-50 cursor-not-allowed text-primary"
                  title="Tính năng đang phát triển"
                >
                  Quên mật khẩu?
                </span>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-base"
                style={{
                  background: loading ? '#C41017' : '#EC2029',
                  boxShadow: '0 2px 8px rgba(236,32,41,0.28)',
                  fontWeight: 900
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#D0021B')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#EC2029')}
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
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
              <div className={`form-field-float ${name ? 'has-value' : ''}`}>
                <Icon
                  name="UserIcon"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=" "
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm form-input ${isNameValid ? 'form-input-valid' : ''} font-body-vj`}
                  required
                />
                <label className="form-label-float has-icon">Họ và tên</label>
              </div>

              <div className={`form-field-float ${email ? 'has-value' : ''}`}>
                <Icon
                  name="EnvelopeIcon"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm form-input ${isEmailValid ? 'form-input-valid' : ''} font-body-vj`}
                  required
                />
                <label className="form-label-float has-icon">Email</label>
              </div>

              <div className={`form-field-float ${phone ? 'has-value' : ''}`}>
                <Icon
                  name="PhoneIcon"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder=" "
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm form-input ${isPhoneValid ? 'form-input-valid' : ''} font-body-vj`}
                  required
                />
                <label className="form-label-float has-icon">Số điện thoại</label>
              </div>

              <div className={`form-field-float ${password ? 'has-value' : ''}`}>
                <Icon
                  name="LockClosedIcon"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm form-input ${isPasswordValid ? 'form-input-valid' : ''}`}
                  style={
                    isPasswordValid
                      ? {
                          paddingRight: '2.5rem',
                          color: '#333333',
                        }
                      : { color: '#333333' }
                  }
                  required
                />
                <label className="form-label-float has-icon">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                  <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-base"
                style={{
                  background: loading ? '#C41017' : '#EC2029',
                  boxShadow: '0 2px 8px rgba(236,32,41,0.28)',
                  fontWeight: 900
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#D0021B')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#EC2029')}
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
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
                    <Icon name="UserPlusIcon" size={18} />
                    Đăng ký
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
