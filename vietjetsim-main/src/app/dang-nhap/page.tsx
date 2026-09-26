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

const CURRENT_YEAR = new Date().getFullYear();

/** Năm sinh hợp lệ: 1900 → năm nay (mảng giảm dần để năm gần nhất ở trên cùng). */
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Số ngày của tháng (thang 1-12), có xét năm nhuận. */
function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Gom ba ô Ngày / Tháng / Năm thành chuỗi ISO `YYYY-MM-DD` khớp cột
 * `user_profiles.dob` (DATE) mà `POST /api/xac-thuc/dang-ky` đã nhận sẵn.
 * Trả về thông báo tiếng Việt để hiển thị tại chỗ thay vì lỗi trình duyệt.
 */
function resolveBirthDate(
  day: string,
  month: string,
  year: string
): { iso: string; error: string } {
  if (!day || !month || !year) {
    return { iso: '', error: 'Vui lòng nhập Ngày / Tháng / Năm sinh.' };
  }

  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const invalid = { iso: '', error: 'Ngày sinh không hợp lệ.' };

  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return invalid;
  if (m < 1 || m > 12 || y < 1900 || y > CURRENT_YEAR) return invalid;
  if (d < 1 || d > daysInMonth(m, y)) return invalid;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(y, m - 1, d) > today) {
    return { iso: '', error: 'Ngày sinh không được ở trong tương lai.' };
  }

  return { iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, error: '' };
}

interface BirthSelectProps {
  /** Nhãn tiếng Việt cho screen reader, ví dụ "Ngày sinh: ngày". */
  label: string;
  placeholder: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

/**
 * Một ô chọn trong khung Ngày sinh. Select không dùng được kiểu floating label
 * của input nên nhãn đặt tĩnh ở trên khung chung; mũi tên được vẽ lại vì
 * `appearance-none` đã bỏ mũi tên mặc định của trình duyệt.
 */
function BirthSelect({ label, placeholder, value, options, onChange }: BirthSelectProps) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full appearance-none bg-transparent px-3 py-3 pr-8 text-[15px] font-bold text-black outline-none ${value ? '' : 'placeholder:font-bold'}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="ChevronDownIcon"
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#939598]"
      />
    </div>
  );
}

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
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthError, setBirthError] = useState('');
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
    setBirthError('');
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

    const birth = resolveBirthDate(birthDay, birthMonth, birthYear);

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

      if (birth.error) {
        setBirthError(birth.error);
        setError(birth.error);
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
        dob: birth.iso || undefined,
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

  // Số ngày của tháng phụ thuộc tháng và năm (tháng 2 có 28–29 ngày), nên danh sách
  // ngày được giới hạn lại và ngày đang chọn bị bỏ nếu vượt số ngày mới.
  const maxBirthDay = birthMonth
    ? daysInMonth(Number(birthMonth), birthYear ? Number(birthYear) : CURRENT_YEAR)
    : 31;
  // Ngày và Tháng đều dùng value là số không pad; phần hiển thị mới pad 2 chữ số
  // (01, 02…) để đọc như dd/mm/yyyy và khớp với giá trị gửi lên API.
  const birthDayOptions = Array.from({ length: maxBirthDay }, (_, i) => i + 1);

  const birthSelectOptions = {
    day: birthDayOptions.map((day) => ({
      value: String(day),
      label: String(day).padStart(2, '0'),
    })),
    month: MONTH_NUMBERS.map((month) => ({
      value: String(month),
      label: String(month).padStart(2, '0'),
    })),
    year: BIRTH_YEARS.map((year) => ({ value: String(year), label: String(year) })),
  };

  const handleBirthMonthChange = (value: string) => {
    setBirthMonth(value);
    setBirthError('');
    const limit = daysInMonth(Number(value) || 1, birthYear ? Number(birthYear) : CURRENT_YEAR);
    if (Number(birthDay) > limit) setBirthDay('');
  };

  const handleBirthYearChange = (value: string) => {
    setBirthYear(value);
    setBirthError('');
    const limit = daysInMonth(birthMonth ? Number(birthMonth) : 1, Number(value) || CURRENT_YEAR);
    if (Number(birthDay) > limit) setBirthDay('');
  };

  const inputClass = (valid: boolean) =>
    `form-input vj-auth-input font-body-vj w-full rounded-md border border-[#d8dade] bg-white py-3 pl-11 pr-4 text-[15px] text-[#333] outline-none transition-all placeholder:text-transparent hover:border-[#b8bbc1] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10 ${valid ? 'form-input-valid' : ''}`;

  const submitClass =
    'vj-auth-submit flex min-h-11 w-full items-center justify-center gap-2 rounded-md';

  return (
    <AuthShell
      eyebrow={tab === 'login' ? 'SkyJoy Member' : 'Chào mừng đến với Vietjet'}
      title={tab === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản Vietjet'}
      subtitle={
        tab === 'login'
          ? 'Đăng nhập để quản lý chuyến bay, đặt vé và tích điểm SkyJoy.'
          : 'Đăng ký miễn phí để nhận ưu đãi và quản lý hành trình của bạn.'
      }
    >
      <div className="vj-auth-tabs mb-7 grid grid-cols-2 border-b border-[#d8dade]">
        {/* VietjetAir's SkyID modal lists "Đăng ký" before "Đăng nhập"; the
            order is presentational only — the default tab stays login unless
            `?tab=register` deep-links registration. */}
        {(['register', 'login'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchTab(value)}
            aria-pressed={tab === value}
            className={`relative min-h-12 px-3 pb-3 pt-2 text-base font-extrabold transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:transition-transform ${
              tab === value
                ? 'text-[var(--primary)] after:scale-x-100 after:bg-[var(--primary)]'
                : 'text-[#6c6f76] after:scale-x-0 after:bg-[var(--primary)] hover:text-[var(--primary)]'
            }`}
          >
            {value === 'register' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        ))}
      </div>

      <AlertBanner message={error} variant="error" />
      <AlertBanner message={success} variant="success" />

      {tab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-3">
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
              className={`form-input vj-auth-input w-full rounded-md border border-[#d8dade] bg-white py-3 pl-11 pr-12 text-[15px] text-[#333] outline-none transition-all placeholder:text-transparent hover:border-[#b8bbc1] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10 ${isPasswordValid ? 'form-input-valid' : ''}`}
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
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#555960]">
              <input
                id="remember-me"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded-sm border-[#b9bcc1] accent-[var(--primary)]"
              />
              Ghi nhớ đăng nhập
            </label>
            <Link
              href="/quen-mat-khau"
              className="text-sm font-semibold text-[var(--primary)] hover:underline"
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
        <form onSubmit={handleRegister} className="space-y-3">
          {!otpRequested ? (
            <div className="animate-fade-in-slide space-y-3">
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
                    className={`form-input vj-auth-input font-body-vj w-full rounded-md border border-[#d8dade] bg-white py-3 pl-4 pr-4 text-[15px] text-[#333] outline-none transition-all placeholder:text-transparent hover:border-[#b8bbc1] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10 ${isNameValid ? 'form-input-valid' : ''}`}
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
                    className={`form-input vj-auth-input font-body-vj w-full rounded-md border border-[#d8dade] bg-white py-3 pl-4 pr-4 text-[15px] text-[#333] outline-none transition-all placeholder:text-transparent hover:border-[#b8bbc1] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10 ${isNameValid ? 'form-input-valid' : ''}`}
                    required
                  />
                  <label className="form-label-float">Tên đệm/tên</label>
                </div>
              </div>

              {/* Ngày sinh: ba select Ngày / Tháng / Năm trong một khung, dùng đúng
                  viền / bo góc / nền của các ô nhập còn lại. Nhãn đặt tĩnh ở trên
                  vì select không dùng được kiểu floating label của input. */}
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6c6f76]">
                  Ngày sinh <span className="text-[var(--primary)]">*</span>
                </span>
                <div className="grid grid-cols-3 divide-x divide-[#d8dade] overflow-hidden rounded-md border border-[#d8dade] bg-white transition-all focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[rgb(var(--primary-rgb))]/10">
                  <BirthSelect
                    label="Ngày sinh: ngày"
                    placeholder="Ngày"
                    value={birthDay}
                    options={birthSelectOptions.day}
                    onChange={(value) => {
                      setBirthDay(value);
                      setBirthError('');
                    }}
                  />
                  <BirthSelect
                    label="Ngày sinh: tháng"
                    placeholder="Tháng"
                    value={birthMonth}
                    options={birthSelectOptions.month}
                    onChange={handleBirthMonthChange}
                  />
                  <BirthSelect
                    label="Ngày sinh: năm"
                    placeholder="Năm"
                    value={birthYear}
                    options={birthSelectOptions.year}
                    onChange={handleBirthYearChange}
                  />
                </div>
                {birthError && (
                  <p className="mt-1.5 text-xs font-medium text-[#dc2626]">{birthError}</p>
                )}
              </div>

              {/* Cùng kiểu floating label với các ô còn lại; mã quốc gia (+84) nằm
                  trong nhãn để không phải tách thêm một control phụ. */}
              <div className={`form-field-float ${phone ? 'has-value' : ''}`}>
                <Icon
                  name="PhoneIcon"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder=" "
                  className={inputClass(false)}
                  required
                />
                <label className="form-label-float has-icon">Số điện thoại (+84)</label>
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
                  className={`form-input vj-auth-input font-body-vj w-full rounded-md border border-[#d8dade] bg-white py-3 pl-11 pr-4 text-[15px] text-[#333] outline-none transition-all placeholder:text-transparent hover:border-[#b8bbc1] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10 ${isEmailValid ? 'form-input-valid' : ''}`}
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
                  className={`form-input vj-auth-input w-full rounded-md border border-[#d8dade] bg-white py-3 pl-11 pr-12 text-[15px] text-[#333] outline-none transition-all placeholder:text-transparent hover:border-[#b8bbc1] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10 ${isPasswordValid ? 'form-input-valid' : ''}`}
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

              <label className="flex cursor-pointer select-none items-start gap-2.5 text-xs leading-5 text-[#6c6f76]">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded"
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span>
                  Tôi đồng ý với{' '}
                  <a
                    href="/gioi-thieu"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    Điều khoản dịch vụ
                  </a>{' '}
                  và{' '}
                  <a
                    href="/gioi-thieu"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
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
                  className="w-full rounded-xl border border-[var(--border)]bg-[var(--surface-2)]py-4 pl-12 pr-4 text-center text-xl font-bold tracking-[0.5em] transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20"
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
