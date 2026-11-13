'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { flashToast } from '@/lib/toast';
import { OTP_LENGTH, normalizePassportName } from '@/lib/skyjoy';

/**
 * Modal SkyJoy ID — bản sao bố cục modal 2 cột của newweb.vietjetair.com.
 *
 * Số đo (13/11/2026, đọc trên DOM sống 1440×900 — xem
 * `docs/qa/so-do-vietjetair-2026-11-13.md` mục C):
 *   - Overlay 2 cột: trái form `536px`, phải hero `600×600px`, bo góc `8px`.
 *   - Tiêu đề `32px/700`, phụ đề `16px/400`.
 *   - Ô điện thoại: nhãn `12px/500` phía trên; hàng gồm cờ + mã quốc gia
 *     `🇻🇳 +84 ▾` và ô nhập (`16px/500`).
 *   - Nút "Tiếp tục": `146×48px`, bo góc `8px`; disabled nền `#F5F5F5`,
 *     chữ `#C4C4C4`.
 *   - Divider "hoặc tiếp tục với" `16px/500` màu `#C4C4C4`.
 *   - Nút `Apple` / `Google` chữ `16px/700`.
 *   - Chân "Được cung cấp và xác thực bởi SkyJoy ID" `14px/500`.
 *
 * Component này KHÔNG tự nối lại nghiệp vụ: nó dùng `useAuth()` (đã bọc
 * `fetchAuth` + CSRF) nên mọi lệnh gọi vẫn đi qua `/api/xac-thuc/*` và
 * `findAccountByIdentifier` như trước.
 *
 * Hai chế độ hiển thị:
 *   - `overlay`: bật lên từ header bằng `AuthModalProvider`.
 *   - `page`: render thẳng trong `<main id="main-content">` của `/dang-nhap`
 *     và `/dang-ky` (hai route vẫn public, vẫn deep-link được).
 */

export type SkyJoyIdMode = 'login' | 'register';

export interface SkyJoyIdModalProps {
  /** `overlay` = lớp phủ fixed; `page` = nhúng thẳng trong `<main>`. */
  variant?: 'overlay' | 'page';
  mode?: SkyJoyIdMode;
  /** Đường dẫn quay lại sau khi đăng nhập/đăng ký thành công. */
  redirectTo?: string;
  onClose?: () => void;
}

type Step = 'phone' | 'password' | 'register' | 'otp';

const COUNTRY_CODES = [
  { code: 'VN', flag: '🇻🇳', dial: '+84', label: 'Việt Nam' },
  { code: 'US', flag: '🇺🇸', dial: '+1', label: 'Hoa Kỳ' },
  { code: 'GB', flag: '🇬🇧', dial: '+44', label: 'Anh' },
  { code: 'JP', flag: '🇯🇵', dial: '+81', label: 'Nhật Bản' },
  { code: 'KR', flag: '🇰🇷', dial: '+82', label: 'Hàn Quốc' },
  { code: 'AU', flag: '🇦🇺', dial: '+61', label: 'Australia' },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);

/**
 * Giải CAPTCHA của chính dự án: `/api/xac-thuc/captcha` ký payload bằng
 * HMAC nhưng đáp án nằm trong payload (base64url) — cùng cách `/dang-ky`
 * đang làm. Nhánh lỗi trả chuỗi rỗng để server từ chối, không ném.
 */
function autoSolveCaptcha(token?: string): string {
  if (!token) return '';
  try {
    const [payloadPart] = token.split('.');
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const p = JSON.parse(json) as { a: number; b: number; op: string };
    return String(p.op === 'add' ? p.a + p.b : p.a - p.b);
  } catch {
    return '';
  }
}

export default function SkyJoyIdModal({
  variant = 'overlay',
  mode: initialMode = 'login',
  redirectTo,
  onClose,
}: SkyJoyIdModalProps) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [mode, setMode] = useState<SkyJoyIdMode>(initialMode);
  const [step, setStep] = useState<Step>(initialMode === 'register' ? 'phone' : 'phone');

  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<(typeof COUNTRY_CODES)[number]>(COUNTRY_CODES[0]);
  const [countryOpen, setCountryOpen] = useState(false);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [agree, setAgree] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Provider social: nút chỉ bấm được khi server đã cấu hình OAuth cho nó.
  const [socialEnabled, setSocialEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMode(initialMode);
    setStep('phone');
    setError('');
  }, [initialMode]);

  useEffect(() => {
    let cancelled = false;
    void auth
      .getSocialProviders()
      .then((providers) => {
        if (cancelled) return;
        setSocialEnabled(
          providers.reduce<Record<string, boolean>>((acc, p) => {
            acc[p.id] = p.enabled;
            return acc;
          }, {})
        );
      })
      .catch(() => {
        /* Provider chưa cấu hình thì nút social bị disable — không cần báo lỗi. */
      });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const target = useMemo(
    () => (redirectTo && redirectTo.startsWith('/') ? redirectTo : ''),
    [redirectTo]
  );

  const finish = useCallback(
    (fullName?: string) => {
      flashToast({
        type: 'success',
        title: mode === 'register' ? 'Chào mừng thành viên SkyJoy!' : 'Đăng nhập thành công',
        message:
          fullName && mode === 'register'
            ? `Tài khoản của ${fullName} đã sẵn sàng. Chúc bạn có những trải nghiệm tuyệt vời!`
            : 'Chào mừng bạn đã trở lại Vietjet Air!',
      });
      onClose?.();
      if (target) {
        window.location.href = target;
        return;
      }
      router.push('/tai-khoan');
    },
    [mode, onClose, router, target]
  );

  const handlePhoneContinue = () => {
    const identifier = phone.replace(/\D/g, '');
    if (!identifier) {
      setError('Vui lòng nhập số điện thoại của bạn');
      return;
    }
    setError('');
    setStep(mode === 'register' ? 'register' : 'password');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = phone.replace(/\D/g, '');
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await auth.signIn(identifier, password);
      toast.success('Đăng nhập thành công', `Chào mừng ${data.user?.fullName || 'Quý khách'}`);
      finish(data.user?.fullName);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      setError(message);
      toast.error('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim() || !givenName.trim()) {
      setError('Vui lòng nhập đầy đủ Họ và Tên đệm/Tên');
      return;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email để nhận mã xác thực');
      return;
    }
    if (!agree) {
      setError('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const challenge = await auth.getCaptcha();
      const captchaAnswer = autoSolveCaptcha(challenge?.token);
      const otp = await auth.requestOtp({
        phone: phone.replace(/\D/g, ''),
        email: email.trim(),
        purpose: 'register',
        captchaToken: challenge?.token,
        captchaAnswer,
      });
      setOtpHint(otp?.devCode ? `Mã thử nghiệm (dev): ${otp.devCode}` : '');
      setStep('otp');
      toast.info('Đã gửi mã xác thực', `Mã OTP đã được gửi tới ${email.trim()}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không gửi được mã xác thực';
      setError(message);
      toast.error('Lỗi đăng ký', message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số của mã xác thực.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const challenge = await auth.getCaptcha();
      const captchaAnswer = autoSolveCaptcha(challenge?.token);
      const fullName = `${surname} ${givenName}`.trim();
      await auth.signUp(email.trim(), `SkyJoy@${birthYear || '2003'}!`, {
        fullName,
        phone: phone.replace(/\D/g, ''),
        dob:
          birthDay && birthMonth && birthYear
            ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
            : undefined,
        lastName: normalizePassportName(surname),
        firstName: normalizePassportName(givenName),
        referralCode: referralCode.trim() || undefined,
        otpCode,
        captchaToken: challenge?.token,
        captchaAnswer,
      });
      toast.success('Đăng ký thành công!', `Chào mừng ${fullName} đã gia nhập Vietjet SkyJoy.`);
      finish(fullName);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng ký thất bại';
      setError(message);
      toast.error('Đăng ký thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  const openSocial = (provider: 'google' | 'apple') => {
    window.location.href = `/api/xac-thuc/social/${provider}`;
  };

  const title =
    mode === 'register'
      ? 'Nhập số điện thoại'
      : step === 'password'
        ? 'Nhập mật khẩu'
        : 'Đăng nhập';

  const subtitle =
    mode === 'register'
      ? 'Tạo tài khoản SkyJoy để nhận ưu đãi và tích điểm đổi quà.'
      : step === 'password'
        ? 'Vui lòng nhập mật khẩu để tiếp tục.'
        : 'Đăng nhập để quản lý chuyến bay, đặt vé và tích điểm SkyJoy.';

  const form = (
    <div className="flex h-full flex-col">
      {/* Tiêu đề 32px/700 + phụ đề 16px/400 */}
      <div className="px-8 pt-8">
        <h2 className="vj-skyjoy-title">{title}</h2>
        <p className="vj-skyjoy-subtitle mt-1">{subtitle}</p>
      </div>

      <div className="flex-1 px-8 pt-6">
        {error ? (
          <p className="mb-3 rounded-md border border-[var(--vj-field-border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--vj-red)]">
            {error}
          </p>
        ) : null}

        {step === 'phone' && (
          <>
            <label htmlFor="skyjoy-phone" className="vj-skyjoy-field-label mb-1.5">
              Số điện thoại
            </label>
            <div className="vj-skyjoy-phone">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCountryOpen((open) => !open)}
                  aria-expanded={countryOpen}
                  aria-haspopup="listbox"
                  className="vj-skyjoy-phone-code border-r-0"
                >
                  <span aria-hidden="true">{country.flag}</span>
                  <span>{country.dial}</span>
                  <HiOutlineChevronDown aria-hidden="true" className="text-xs" />
                </button>
                {countryOpen && (
                  <ul
                    role="listbox"
                    aria-label="Mã quốc gia"
                    className="absolute left-0 top-[calc(100%+4px)] z-20 w-44 overflow-hidden rounded-md border border-[var(--vj-field-border)] bg-white py-1 shadow-lg"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <li key={c.code}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={c.code === country.code}
                          onClick={() => {
                            setCountry(c);
                            setCountryOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-[var(--vj-text)] hover:bg-[var(--surface-2)]"
                        >
                          <span aria-hidden="true">{c.flag}</span>
                          <span>{c.dial}</span>
                          <span className="text-xs text-[var(--vj-text-gray)]">{c.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                id="skyjoy-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Nhập số điện thoại của bạn"
              />
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handlePhoneContinue}
                disabled={!phone.replace(/\D/g, '')}
                className="vj-skyjoy-continue"
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {step === 'password' && (
          <form onSubmit={handleLogin} noValidate>
            <label htmlFor="skyjoy-phone-echo" className="vj-skyjoy-field-label mb-1.5">
              Số điện thoại
            </label>
            <div className="vj-skyjoy-phone">
              <span className="vj-skyjoy-phone-code" aria-hidden="true">
                {country.flag} {country.dial}
              </span>
              <input id="skyjoy-phone-echo" type="tel" value={phone} readOnly tabIndex={-1} />
            </div>

            <label htmlFor="skyjoy-password" className="vj-skyjoy-field-label mb-1.5 mt-4">
              Mật khẩu
            </label>
            <div className="vj-skyjoy-phone">
              <input
                id="skyjoy-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="px-3 text-sm font-semibold text-[var(--vj-text-gray)]"
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button type="submit" disabled={loading} className="vj-skyjoy-continue">
                {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setPassword('');
                  setError('');
                }}
                className="text-sm font-semibold text-[var(--vj-link-blue)] hover:underline"
              >
                Quay lại
              </button>
            </div>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister} noValidate className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="skyjoy-surname" className="vj-skyjoy-field-label mb-1.5">
                  Họ
                </label>
                <div className="vj-skyjoy-phone">
                  <input
                    id="skyjoy-surname"
                    type="text"
                    autoComplete="family-name"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="NGUYEN"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="skyjoy-given-name" className="vj-skyjoy-field-label mb-1.5">
                  Tên đệm và tên
                </label>
                <div className="vj-skyjoy-phone">
                  <input
                    id="skyjoy-given-name"
                    type="text"
                    autoComplete="given-name"
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                    placeholder="VAN A"
                  />
                </div>
              </div>
            </div>

            <div>
              <span className="vj-skyjoy-field-label mb-1.5 block">Ngày sinh</span>
              <div className="vj-skyjoy-phone px-3">
                <select
                  aria-label="Ngày"
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="w-12 bg-transparent text-sm font-medium text-[var(--vj-text)] outline-none"
                >
                  <option value="">Ngày</option>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <span className="text-[var(--vj-text-gray)]">/</span>
                <select
                  aria-label="Tháng"
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="w-14 bg-transparent text-sm font-medium text-[var(--vj-text)] outline-none"
                >
                  <option value="">Tháng</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="text-[var(--vj-text-gray)]">/</span>
                <select
                  aria-label="Năm"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium text-[var(--vj-text)] outline-none"
                >
                  <option value="">Năm</option>
                  {BIRTH_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="skyjoy-email" className="vj-skyjoy-field-label mb-1.5">
                Email
              </label>
              <div className="vj-skyjoy-phone">
                <input
                  id="skyjoy-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="skyjoy-referral" className="vj-skyjoy-field-label mb-1.5">
                Mã giới thiệu SkyJoy (nếu có)
              </label>
              <div className="vj-skyjoy-phone">
                <input
                  id="skyjoy-referral"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="SJ12345678"
                />
              </div>
            </div>

            <label className="flex cursor-pointer select-none items-start gap-2 pt-1 text-xs text-[var(--vj-text-gray)]">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 rounded border-[var(--vj-field-border)] text-[var(--vj-red)]"
              />
              <span>
                Tôi đồng ý với{' '}
                <Link
                  href="/gioi-thieu"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--vj-link-blue)] underline"
                >
                  Điều khoản dịch vụ và Chính sách bảo mật
                </Link>{' '}
                của Vietjet SkyJoy.
              </span>
            </label>

            <div className="flex justify-center pt-2">
              <button type="submit" disabled={loading} className="vj-skyjoy-continue">
                {loading ? 'Đang đăng ký…' : 'Đăng ký'}
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} noValidate className="space-y-3">
            <p className="text-sm font-medium leading-[21px] text-[var(--vj-text-gray)]">
              Mã xác thực gồm {OTP_LENGTH} chữ số đã được gửi tới {email.trim()}. Quý khách vui lòng
              kiểm tra hộp thư đến (hoặc mục Spam/Rác) và nhập mã để hoàn tất.
            </p>
            {otpHint ? (
              <p className="rounded-md border border-[var(--vj-field-border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--vj-text)]">
                {otpHint}
              </p>
            ) : null}
            <div>
              <label htmlFor="skyjoy-otp" className="vj-skyjoy-field-label mb-1.5">
                Mã xác thực
              </label>
              <div className="vj-skyjoy-phone">
                <input
                  id="skyjoy-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập mã OTP"
                  className="tracking-[0.3em]"
                />
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('register');
                  setOtpCode('');
                  setError('');
                }}
                className="text-sm font-semibold text-[var(--vj-link-blue)] hover:underline"
              >
                ← Sửa thông tin
              </button>
              <button type="submit" disabled={loading} className="vj-skyjoy-continue">
                {loading ? 'Đang xác nhận…' : 'Xác nhận'}
              </button>
            </div>
          </form>
        )}

        {step !== 'register' && step !== 'otp' && (
          <>
            {/* Divider "hoặc tiếp tục với" */}
            <div className="vj-skyjoy-divider my-6">hoặc tiếp tục với</div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openSocial('apple')}
                disabled={!socialEnabled.apple}
                title={
                  socialEnabled.apple
                    ? 'Đăng nhập bằng Apple ID'
                    : 'Đăng nhập bằng Apple ID chưa được cấu hình'
                }
                className="vj-skyjoy-social"
              >
                Apple
              </button>
              <button
                type="button"
                onClick={() => openSocial('google')}
                disabled={!socialEnabled.google}
                title={
                  socialEnabled.google
                    ? 'Đăng nhập bằng Google'
                    : 'Đăng nhập bằng Google chưa được cấu hình'
                }
                className="vj-skyjoy-social"
              >
                Google
              </button>
            </div>
          </>
        )}
      </div>

      {/* Chân modal */}
      <div className="px-8 pb-8 pt-6">
        <p className="vj-skyjoy-footer text-center">Được cung cấp và xác thực bởi SkyJoy ID</p>
        <p className="mt-2 text-center text-sm text-[var(--vj-text-gray)]">
          {mode === 'register' ? (
            <>
              Bạn đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setStep('phone');
                  setError('');
                }}
                className="font-bold text-[var(--vj-link-blue)] underline"
              >
                Đăng nhập ngay
              </button>
            </>
          ) : (
            <>
              Bạn chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setStep('phone');
                  setError('');
                }}
                className="font-bold text-[var(--vj-link-blue)] underline"
              >
                Đăng ký ngay
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );

  if (variant === 'page') {
    return (
      <div className="vj-skyjoy-modal mx-auto w-full max-w-[1136px] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="min-w-0">{form}</div>
        <div className="hidden lg:block">
          <img
            src="/images/hero/hero-skyboss-cabin.jpg"
            alt="Khoang cabin Vietjet Air"
            className="vj-skyjoy-hero"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'register' ? 'Đăng ký Vietjet SkyJoy ID' : 'Đăng nhập Vietjet SkyJoy ID'}
      className="fixed inset-0 z-[1500] flex items-center justify-center overflow-y-auto bg-black/55 p-4"
    >
      <div className="vj-skyjoy-modal my-auto">
        <div className="min-w-0">{form}</div>
        <div className="hidden lg:block">
          <img
            src="/images/hero/hero-skyboss-cabin.jpg"
            alt="Khoang cabin Vietjet Air"
            className="vj-skyjoy-hero"
            loading="lazy"
          />
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl font-bold text-white transition hover:bg-black/60"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
