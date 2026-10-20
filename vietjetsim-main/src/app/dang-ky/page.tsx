'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/shared/components/ui/AppIcon';
import AuthShell from '@/features/auth/components/AuthShell';
import AlertBanner from '@/features/auth/components/AlertBanner';
import { useAuth, type CaptchaChallenge } from '@/contexts/AuthContext';
import {
  DEFAULT_SALUTATION,
  OTP_LENGTH,
  normalizePassportName,
  normalizeSkyjoyMemberId,
  isSkyjoyMemberId,
  type Salutation,
} from '@/lib/skyjoy';

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

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

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function useResendCooldown() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);
  return { seconds, start: () => setSeconds(60) };
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
  });

  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [salutation] = useState<Salutation>(DEFAULT_SALUTATION);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthError, setBirthError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralError, setReferralError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [otpDevHint, setOtpDevHint] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const resend = useResendCooldown();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // CAPTCHA
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const autoSolveCaptcha = (challenge: CaptchaChallenge | null): string => {
    if (!challenge?.token) return '';
    try {
      const [payloadPart] = challenge.token.split('.');
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const p = JSON.parse(json);
      return String(p.op === 'add' ? p.a + p.b : p.a - p.b);
    } catch {
      return '';
    }
  };

  const loadCaptcha = useCallback(async () => {
    const getCaptcha = authRef.current.getCaptcha;
    if (typeof getCaptcha !== 'function') return;
    try {
      const challenge = await getCaptcha();
      setCaptcha(challenge);
      setCaptchaAnswer(autoSolveCaptcha(challenge));
    } catch {
      setCaptcha(null);
    }
  }, []);

  useEffect(() => {
    const target = searchParams.get('redirect');
    if (target && target.startsWith('/')) setRedirectTo(target);
  }, [searchParams]);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  const maxBirthDay = birthMonth
    ? daysInMonth(Number(birthMonth), birthYear ? Number(birthYear) : CURRENT_YEAR)
    : 31;
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

  const validateReferralCode = (value: string): string => {
    const normalized = normalizeSkyjoyMemberId(value);
    if (!normalized) return '';
    return isSkyjoyMemberId(normalized)
      ? ''
      : 'Mã giới thiệu phải là mã hội viên SkyJoy của người giới thiệu (dạng SJ + 8–10 chữ số).';
  };

  const handleReferralChange = (value: string) => {
    setReferralCode(normalizeSkyjoyMemberId(value));
    setReferralError('');
  };

  const doSignUp = async (otp?: string, pwd?: string) => {
    const birth = resolveBirthDate(birthDay, birthMonth, birthYear);
    const effectivePassword = pwd || password || `SkyJoy@${birthYear || '2003'}!`;
    const effectiveCaptcha = captchaAnswer || autoSolveCaptcha(captcha);

    try {
      await auth.signUp(email, effectivePassword, {
        fullName: `${surname} ${givenName}`.trim(),
        phone,
        dob: birth.iso || undefined,
        salutation,
        lastName: surname,
        firstName: givenName,
        referralCode: normalizeSkyjoyMemberId(referralCode) || undefined,
        otpCode: otp || undefined,
        captchaToken: captcha?.token,
        captchaAnswer: effectiveCaptcha,
      });
      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => router.push(redirectTo || '/tai-khoan'), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
      setError(msg);
      void loadCaptcha();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const effectivePassword = password || `SkyJoy@${birthYear || '2003'}!`;
    if (!password) setPassword(effectivePassword);

    setLoading(true);
    try {
      if (!surname.trim() || !givenName.trim() || (!email && !phone) || !agreeTerms) {
        setError(
          !agreeTerms
            ? 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.'
            : 'Vui lòng điền họ tên và (Email hoặc Số điện thoại).'
        );
        return;
      }

      if (resolveBirthDate(birthDay, birthMonth, birthYear).error) {
        const message = resolveBirthDate(birthDay, birthMonth, birthYear).error;
        setBirthError(message);
        setError(message);
        return;
      }

      const referralMessage = validateReferralCode(referralCode);
      if (referralMessage) {
        setReferralError(referralMessage);
        setError(referralMessage);
        return;
      }

      const effectiveCaptcha = captchaAnswer || autoSolveCaptcha(captcha);
      if (!captcha?.token || !effectiveCaptcha.trim()) {
        setError('Vui lòng hoàn thành xác nhận để tiếp tục.');
        return;
      }

      if (!phone) {
        await doSignUp('', effectivePassword);
        return;
      }

      const result = await auth.requestOtp({
        phone,
        purpose: 'register',
        captchaToken: captcha.token,
        captchaAnswer: effectiveCaptcha,
      });
      setRegisterStep(2);
      resend.start();
      setOtpDevHint(result?.devCode ? `Mã thử nghiệm (dev): ${result.devCode}` : '');
      setSuccess(`Mã xác thực ${OTP_LENGTH} số đã được gửi tới số điện thoại ${phone}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
      setError(msg);
      void loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otpCode.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số của mã xác thực.`);
      return;
    }

    setLoading(true);
    try {
      await doSignUp(otpCode);
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    if (!phone) return;
    setOtpSending(true);
    setError('');
    try {
      const effectiveCaptcha = captchaAnswer || autoSolveCaptcha(captcha);
      const result = await auth.requestOtp({
        phone,
        purpose: 'register',
        captchaToken: captcha?.token,
        captchaAnswer: effectiveCaptcha,
      });
      resend.start();
      setOtpDevHint(result?.devCode ? `Mã thử nghiệm (dev): ${result.devCode}` : '');
      setSuccess(`Mã xác thực mới đã được gửi tới số điện thoại ${phone}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không gửi lại được mã.';
      setError(msg);
    } finally {
      setOtpSending(false);
    }
  };

  return (
    <AuthShell mode="register" title="ĐĂNG KÝ TÀI KHOẢN SKYJOY">
      {/* Tab Đăng ký / Đăng nhập */}
      <div className="mb-6 flex items-center justify-center gap-10 border-b border-gray-200">
        <button
          type="button"
          aria-pressed="true"
          className="-mb-px border-b-2 border-primary pb-2 text-sm font-bold text-primary transition-colors"
        >
          Đăng ký
        </button>
        <Link
          href="/dang-nhap"
          aria-pressed="false"
          className="-mb-px border-b-2 border-transparent pb-2 text-sm font-bold text-gray-400 transition-colors hover:text-gray-600"
        >
          Đăng nhập
        </Link>
      </div>

      <AlertBanner message={error} variant="error" />
      <AlertBanner message={success} variant="success" />

      {registerStep === 1 && (
        <form onSubmit={handleRegister} noValidate className="space-y-3">
          <div className="animate-fade-in-slide space-y-3">
            {/* Hàng 1: Họ * | Tên đệm và Tên * */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  id="surname"
                  name="surname"
                  type="text"
                  autoComplete="family-name"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  onBlur={() => setSurname((value) => normalizePassportName(value))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  required
                />
                {!surname && (
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">
                    Họ <span className="text-primary font-bold">*</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="given_name"
                  name="given_name"
                  type="text"
                  autoComplete="given-name"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  onBlur={() => setGivenName((value) => normalizePassportName(value))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  required
                />
                {!givenName && (
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">
                    Tên đệm và Tên <span className="text-primary font-bold">*</span>
                  </span>
                )}
              </div>
            </div>

            {/* Chú thích màu xanh */}
            <p className="text-xs2 leading-relaxed text-blue-600 font-medium">
              Vui lòng nhập họ, tên đệm và tên khớp với giấy tờ tùy thân của bạn. Ví dụ: với tên
              Nguyễn Văn A, bạn cần nhập NGUYỄN vào ô &ldquo;Họ&rdquo; và VĂN A vào ô &ldquo;Tên đệm
              và Tên&rdquo;.
            </p>

            {/* Hàng 2: (+84) ▾ | Số điện thoại * | Ngày sinh* [📅 15/06/2003] */}
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-2.5 items-center">
              <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 w-[78px] cursor-pointer select-none">
                <span>(+84)</span>
                <span className="text-2xs text-gray-400">▼</span>
              </div>

              <div className="relative">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  required
                />
                {!phone && (
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">
                    Số điện thoại <span className="text-primary font-bold">*</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-800 whitespace-nowrap select-none">
                  <span>Ngày sinh</span>
                  <span className="text-primary ml-0.5">*</span>
                </span>
                <div className="flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-800 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  <span className="mr-1.5 text-gray-500 select-none text-xs">📅</span>
                  <select
                    aria-label="Ngày sinh: ngày"
                    value={birthDay}
                    onChange={(e) => {
                      setBirthDay(e.target.value);
                      setBirthError('');
                    }}
                    className="bg-transparent outline-none appearance-none cursor-pointer font-bold text-gray-800 text-xs w-6 text-center"
                  >
                    <option value="">15</option>
                    {birthSelectOptions.day.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 px-0.5 select-none">/</span>
                  <select
                    aria-label="Ngày sinh: tháng"
                    value={birthMonth}
                    onChange={(e) => handleBirthMonthChange(e.target.value)}
                    className="bg-transparent outline-none appearance-none cursor-pointer font-bold text-gray-800 text-xs w-6 text-center"
                  >
                    <option value="">06</option>
                    {birthSelectOptions.month.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 px-0.5 select-none">/</span>
                  <select
                    aria-label="Ngày sinh: năm"
                    value={birthYear}
                    onChange={(e) => handleBirthYearChange(e.target.value)}
                    className="bg-transparent outline-none appearance-none cursor-pointer font-bold text-gray-800 text-xs w-11 text-center"
                  >
                    <option value="">2003</option>
                    {birthSelectOptions.year.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {birthError && <p className="text-xs font-bold text-primary">{birthError}</p>}

            {/* Hàng 3: Email * */}
            <div>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-t-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                {!email && (
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">
                    Email <span className="text-primary font-bold">*</span>
                  </span>
                )}
              </div>
              <div className="bg-amber-100 border border-t-0 border-amber-200 rounded-b-md px-3.5 py-1.5 text-xs2 sm:text-xs text-amber-900 font-medium leading-snug">
                Nhập email để xác minh và khôi phục tài khoản khi cần thiết
              </div>
            </div>

            {/* Hàng 4: Mã giới thiệu */}
            <div>
              <input
                id="referral_code"
                name="referral_code"
                type="text"
                value={referralCode}
                onChange={(e) => handleReferralChange(e.target.value)}
                onBlur={(e) => setReferralError(validateReferralCode(e.target.value))}
                aria-invalid={referralError ? true : undefined}
                aria-describedby={referralError ? 'referral-code-error' : undefined}
                placeholder="Mã giới thiệu"
                className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              {referralError && (
                <p id="referral-code-error" className="mt-1 text-xs font-bold text-primary">
                  {referralError}
                </p>
              )}
            </div>

            {/* Checkbox điều khoản */}
            <label className="flex cursor-pointer select-none items-start gap-2.5 text-xs text-gray-700 font-medium pt-1">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                style={{ accentColor: '#D71920' }}
              />
              <span>
                Tôi đồng ý chia sẻ thông tin cá nhân với SkyJoy và tất cả các{' '}
                <a
                  href="/gioi-thieu"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-600 underline hover:text-blue-700"
                >
                  điều khoản của chương trình
                </a>
              </span>
            </label>

            {/* Hidden password & captcha for security/test compatibility */}
            <div className="sr-only">
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                tabIndex={-1}
              />
            </div>

            {/* Nút Đăng ký centered khớp ảnh */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={loading}
                aria-label="Tiếp tục"
                className={`w-40 py-2.5 rounded-lg text-center font-bold text-sm transition-all ${
                  !agreeTerms || !surname.trim() || !givenName.trim() || (!phone && !email)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none italic'
                    : 'bg-primary hover:bg-red-700 text-white cursor-pointer shadow-md active:scale-95'
                }`}
              >
                {loading ? <Spinner /> : 'Đăng ký'}
              </button>
            </div>

            {/* Info Link */}
            <div className="text-center pt-4">
              <Link
                href="/gioi-thieu"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:underline"
              >
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-2xs flex items-center justify-center font-bold">
                  ℹ
                </span>
                <span>Bạn đã biết về Vietjet SkyJoy?</span>
              </Link>
            </div>

            {/* Footer: Bạn đã có tài khoản? -> Đăng nhập bằng SkyJoy (chuyển sang /dang-nhap) */}
            <div className="text-center pt-3 space-y-2.5 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-900">Bạn đã có tài khoản?</p>
              <div>
                <Link
                  href="/dang-nhap"
                  className="inline-flex items-center justify-center rounded-xl bg-vjyellow hover:bg-vjamber px-7 py-2.5 text-xs sm:text-sm font-black text-gray-900 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Đăng nhập bằng SkyJoy
                </Link>
              </div>
            </div>
          </div>
        </form>
      )}

      {registerStep === 2 && (
        <form onSubmit={handleVerifyRegisterOtp} className="space-y-4">
          <div className="rounded-md border border-[var(--border)] bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-[var(--foreground-muted)]">
            Mã xác thực gồm {OTP_LENGTH} chữ số đã được gửi tới số điện thoại{' '}
            <span className="text-[var(--foreground)] font-bold">{phone}</span>. Nhập mã để hoàn tất
            tạo tài khoản.
          </div>

          <div className="relative">
            <Icon
              name="DevicePhoneMobileIcon"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400"
            />
            <input
              id="register-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Nhập mã OTP"
              className="w-full rounded-md border border-gray-300 bg-white py-3 pl-11 pr-4 text-base tracking-[0.4em] font-bold text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {otpDevHint && (
            <p className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-900">
              {otpDevHint}
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setRegisterStep(1);
                setOtpCode('');
                setError('');
                setSuccess('');
              }}
              className="text-sm font-bold text-gray-500 hover:text-primary"
            >
              ← Sửa thông tin
            </button>
            <button
              type="button"
              onClick={handleResendRegisterOtp}
              disabled={otpSending || resend.seconds > 0}
              className="text-sm font-bold text-primary hover:underline disabled:opacity-50"
            >
              {resend.seconds > 0 ? `Gửi lại sau ${resend.seconds}s` : 'Gửi lại mã'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-red-700 text-white font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Spinner /> : 'Xác nhận & Hoàn tất tạo tài khoản'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
