'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/shared/components/ui/AppIcon';
import AuthShell from '@/features/auth/components/AuthShell';
import AlertBanner from '@/features/auth/components/AlertBanner';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminRole } from '@/lib/roles';

type AuthTab = 'login' | 'register';

const DEMO_OTP = '123456';

/**
 * AuthContext rejects with the parsed API payload attached to the Error, so a
 * caught error can carry `requires2FA` alongside `message`.
 */
function readAuthError(err: unknown, fallback: string): { message: string; requires2FA: boolean } {
  const value = err as { message?: string; requires2FA?: boolean } | null;
  return {
    message: value?.message || fallback,
    requires2FA: value?.requires2FA === true,
  };
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SignUpLoginPageInner() {
  const { signIn, signUp } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const [twoFAToken, setTwoFAToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Deep links from the Header carry ?tab=register; the auth middleware appends
  // ?redirect=<path> after bouncing a signed-out visit.
  useEffect(() => {
    if (searchParams.get('tab') === 'register') setTab('register');
    const target = searchParams.get('redirect');
    if (target && target.startsWith('/')) setRedirectTo(target);
  }, [searchParams]);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchTab = (next: AuthTab) => {
    setTab(next);
    resetMessages();
    setOtpRequested(false);
    setOtpInput('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await signIn(email, password, requires2FA ? twoFAToken : undefined);
      setSuccess('Đăng nhập thành công!');
      setTimeout(() => {
        if (redirectTo) {
          router.push(redirectTo);
          return;
        }
        router.push(isAdminRole(data?.user?.role || 'user') ? '/quan-tri' : '/tai-khoan');
      }, 800);
    } catch (err) {
      // The API answers 401 with requires2FA when the password was right but a
      // second factor is still needed; ask for it instead of failing outright.
      const { message, requires2FA: needs2FA } = readAuthError(
        err,
        'Email hoặc mật khẩu không đúng'
      );
      if (needs2FA) {
        setRequires2FA(true);
        setError('');
        setSuccess('Tài khoản đã bật xác thực hai yếu tố. Nhập mã từ ứng dụng xác thực.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otpRequested) {
      setLoading(true);

      if (!surname.trim() || !givenName.trim() || (!email && !phone) || !password || !agreeTerms) {
        setError(
          !agreeTerms
            ? 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.'
            : 'Vui lòng điền họ tên, mật khẩu và (Email hoặc Số điện thoại).'
        );
        setLoading(false);
        return;
      }

      // Demo OTP step: no mail/SMS transport is wired up, so the code is fixed.
      setTimeout(() => {
        setOtpRequested(true);
        setSuccess('Mã OTP đã được gửi tới ' + (phone || email) + ' (Demo: ' + DEMO_OTP + ')');
        setLoading(false);
      }, 800);
      return;
    }

    setLoading(true);
    if (otpInput !== DEMO_OTP) {
      setError('Mã OTP không chính xác. Vui lòng thử lại (' + DEMO_OTP + ').');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, {
        fullName: (surname.trim() + ' ' + givenName.trim()).trim(),
        phone,
      });
      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => router.push(redirectTo || '/tai-khoan'), 1200);
    } catch (err) {
      setError(readAuthError(err, 'Có lỗi xảy ra khi đăng ký').message);
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isLoginIdentifierValid =
    isEmailValid || phone.replace(/\D/g, '').length >= 9 || email.replace(/\D/g, '').length >= 9;
  const isPasswordValid = password.length >= 6;
  const isNameValid = surname.trim().length >= 1 && givenName.trim().length >= 1;
  const isPhoneValid = phone.replace(/\D/g, '').length >= 9;

  const inputClass = (valid: boolean) =>
    `form-input font-body-vj w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-10 pr-4 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20 ${valid ? 'form-input-valid' : ''}`;

  const submitClass =
    'vj-btn vj-btn-primary vj-btn-pill flex w-full items-center justify-center gap-2 py-3.5 text-base';

  return (
    <AuthShell
      eyebrow="Chào mừng bạn trở lại"
      title="Đăng nhập / Đăng ký tài khoản"
      subtitle="Vui lòng điền thông tin để tiếp tục sử dụng các tiện ích thành viên."
    >
      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] p-1.5">
        {(['login', 'register'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchTab(value)}
            aria-pressed={tab === value}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              tab === value
                ? 'bg-[var(--background)] text-primary shadow-vj-sm'
                : 'text-[var(--foreground-muted)] hover:text-primary'
            }`}
          >
            {value === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        ))}
      </div>

      <AlertBanner message={error} variant="error" />
      <AlertBanner message={success} variant="success" />

      {tab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className={`form-field-float ${email ? 'has-value' : ''}`}>
            <Icon
              name="EnvelopeIcon"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
            />
            <input
              id="login-email"
              name="email"
              type="text"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              className={inputClass(isLoginIdentifierValid)}
              required
            />
            <label className="form-label-float has-icon">Email hoặc Số điện thoại</label>
          </div>

          <div className={`form-field-float ${password ? 'has-value' : ''}`}>
            <Icon
              name="LockClosedIcon"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
            />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              className={`form-input w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-10 pr-12 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20 ${isPasswordValid ? 'form-input-valid' : ''}`}
              required
            />
            <label className="form-label-float has-icon">Mật khẩu</label>
            <button
              type="button"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)]"
            >
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
            </button>
          </div>

          {requires2FA && (
            <div className={`form-field-float ${twoFAToken ? 'has-value' : ''}`}>
              <Icon
                name="ShieldCheckIcon"
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
              />
              <input
                id="login-2fa"
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFAToken}
                onChange={(e) => setTwoFAToken(e.target.value)}
                placeholder=" "
                className={inputClass(false)}
                required
              />
              <label className="form-label-float has-icon">Mã 2FA (hoặc mã dự phòng)</label>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-koho">
              <input
                id="remember-me"
                name="remember"
                type="checkbox"
                className="rounded"
                style={{ accentColor: 'var(--primary)' }}
              />
              Ghi nhớ đăng nhập
            </label>
            <Link
              href="/quen-mat-khau"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <button type="submit" disabled={loading} className={submitClass}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                <Icon name="ArrowRightOnRectangleIcon" size={18} />
                Đăng nhập
              </>
            )}
          </button>
        </form>
      )}

      {tab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          {!otpRequested ? (
            <div className="animate-fade-in-slide space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`form-field-float ${surname ? 'has-value' : ''}`}>
                  <input
                    id="surname"
                    name="surname"
                    type="text"
                    autoComplete="family-name"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder=" "
                    className={`form-input font-body-vj w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-4 pr-4 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20 ${isNameValid ? 'form-input-valid' : ''}`}
                    required
                  />
                  <label className="form-label-float">Họ</label>
                </div>
                <div className={`form-field-float ${givenName ? 'has-value' : ''}`}>
                  <input
                    id="given_name"
                    name="given_name"
                    type="text"
                    autoComplete="given-name"
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                    placeholder=" "
                    className={`form-input font-body-vj w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-4 pr-4 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20 ${isNameValid ? 'form-input-valid' : ''}`}
                    required
                  />
                  <label className="form-label-float">Tên đệm/tên</label>
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-xs text-[var(--foreground-muted)] font-koho"
                >
                  Số điện thoại
                </label>
                <div
                  className={`flex items-center rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] px-3 py-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${isPhoneValid ? 'border-primary/40' : ''}`}
                >
                  <span className="select-none text-sm text-[var(--foreground-muted)] font-koho">
                    (+84)
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="912 345 678"
                    className="font-body-vj ml-2 flex-1 bg-transparent text-sm text-vj-text outline-none placeholder:text-[var(--foreground-subtle)]"
                    required
                  />
                </div>
              </div>

              <div className={`form-field-float ${email ? 'has-value' : ''}`}>
                <Icon
                  name="EnvelopeIcon"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className={`form-input font-body-vj w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-10 pr-4 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20 ${isEmailValid ? 'form-input-valid' : ''}`}
                />
                <label className="form-label-float has-icon">Email (Tùy chọn)</label>
              </div>

              <div className={`form-field-float ${password ? 'has-value' : ''}`}>
                <Icon
                  name="LockClosedIcon"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className={`form-input w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-10 pr-12 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20 ${isPasswordValid ? 'form-input-valid' : ''}`}
                  required
                />
                <label className="form-label-float has-icon">Mật khẩu</label>
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)]"
                >
                  <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
                </button>
              </div>

              <label className="flex cursor-pointer select-none items-start gap-2 text-xs text-[var(--foreground-muted)] font-koho">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded"
                  style={{ accentColor: 'var(--primary)' }}
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

              <button type="submit" disabled={loading} className={submitClass}>
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    <Icon name="ArrowRightIcon" size={18} />
                    Tiếp tục
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-2 animate-fade-in-slide space-y-6">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Icon name="DevicePhoneMobileIcon" size={32} className="text-primary" />
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Xác thực OTP</h3>
                <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                  Vui lòng nhập mã bảo mật 6 số được gửi tới
                  <br />
                  <span className="font-semibold text-primary">{phone || email}</span>
                </p>
              </div>

              <div className={`form-field-float ${otpInput ? 'has-value' : ''}`}>
                <Icon
                  name="ShieldCheckIcon"
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder=" "
                  className="w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-4 pl-12 pr-4 text-center text-xl font-bold tracking-[0.5em] transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20"
                  required
                />
                <label
                  className="form-label-float has-icon w-full text-center"
                  style={{ marginLeft: '-1.5rem', pointerEvents: 'none' }}
                >
                  Mã OTP ({DEMO_OTP})
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || otpInput.length < 6}
                className={submitClass}
              >
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    <Icon name="CheckCircleIcon" size={18} />
                    Xác nhận đăng ký
                  </>
                )}
              </button>

              <button
                type="button"
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1 text-center text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:text-primary"
                onClick={() => {
                  setOtpRequested(false);
                  resetMessages();
                }}
              >
                <Icon name="ArrowLeftIcon" size={14} /> Quay lại chỉnh sửa
              </button>
            </div>
          )}
        </form>
      )}
    </AuthShell>
  );
}

export default function SignUpLoginPage() {
  return (
    <Suspense fallback={null}>
      <SignUpLoginPageInner />
    </Suspense>
  );
}
