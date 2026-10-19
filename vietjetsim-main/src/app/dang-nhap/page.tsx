'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/shared/components/ui/AppIcon';
import AuthShell from '@/features/auth/components/AuthShell';
import AlertBanner from '@/features/auth/components/AlertBanner';
import { useAuth, type CaptchaChallenge, type SocialProviderConfig } from '@/contexts/AuthContext';
import { isAdminRole } from '@/lib/roles';
import {
  DEFAULT_SALUTATION,
  OTP_LENGTH,
  SALUTATIONS,
  isSalutation,
  isSkyjoyMemberId,
  normalizePassportName,
  normalizeSkyjoyMemberId,
  type Salutation,
} from '@/lib/skyjoy';

type AuthTab = 'login' | 'register';
/** Đăng nhập bằng mật khẩu, hay bằng OTP SMS không cần mật khẩu. */
type LoginMode = 'password' | 'otp';

const CURRENT_YEAR = new Date().getFullYear();

/** Năm sinh hợp lệ: 1900 → năm nay (mảng giảm dần để năm gần nhất ở trên cùng). */
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Số giây chờ trước khi cho gửi lại OTP. */
const OTP_RESEND_COOLDOWN_SECONDS = 60;

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
  const isEmpty = value === '';

  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full appearance-none bg-transparent px-3 py-3 pr-8 font-body-vj text-base outline-none sm:text-[15px] ${
          isEmpty
            ? 'font-medium text-[var(--foreground-muted)]'
            : 'font-bold text-[var(--foreground)]'
        }`}
      >
        <option value="" className="font-medium text-[var(--foreground-muted)]">
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="font-bold text-[var(--foreground)]"
          >
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="ChevronDownIcon"
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
      />
    </div>
  );
}

/**
 * Ô chọn một giá trị (Danh xưng) trong khung giống các ô nhập còn lại. Nhãn đặt
 * tĩnh ở trên vì select không dùng được floating label.
 */
function FieldSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]"
      >
        {label} <span className="text-[var(--primary)]">*</span>
      </label>
      <div className="relative overflow-hidden rounded-md border border-[var(--border)] bg-white transition-all focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[rgb(var(--primary-rgb))]/10">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none bg-transparent px-3 py-3 pr-8 font-body-vj text-base font-bold text-[var(--foreground)] outline-none sm:text-[15px]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="ChevronDownIcon"
          size={16}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
        />
      </div>
    </div>
  );
}

/**
 * AuthContext rejects with the parsed API payload attached to the Error, so a
 * caught error can carry `requires2FA` alongside `message`.
 */
function readAuthError(
  err: unknown,
  fallback: string
): { message: string; requires2FA: boolean; captchaRequired: boolean } {
  const value = err as {
    message?: string;
    requires2FA?: boolean;
    captchaRequired?: boolean;
  } | null;
  return {
    message: value?.message || fallback,
    requires2FA: value?.requires2FA === true,
    captchaRequired: value?.captchaRequired === true,
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

/** Đồng hồ đếm ngược cho nút "Gửi lại mã". */
function useResendCooldown(): { seconds: number; start: () => void } {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const start = useCallback(() => setSeconds(OTP_RESEND_COOLDOWN_SECONDS), []);
  return { seconds, start };
}

/** Logo thương hiệu cho nút Social Login (heroicons không có logo hãng). */
function BrandMark({ provider }: { provider: string }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.2h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.7z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.6 2.8-.05.13C3.5 21.3 7.5 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.3 14.4a7.3 7.3 0 010-4.7l-.01-.16-3.6-2.8-.12.06a12 12 0 000 10.5l3.7-2.9z"
        />
        <path
          fill="#EA4335"
          d="M12 4.7c2.2 0 3.7.9 4.6 1.7l3.3-3.2C17.9 1.2 15.2 0 12 0 7.5 0 3.5 2.7 1.5 6.6l3.8 2.9C6.2 6.8 8.9 4.7 12 4.7z"
        />
      </svg>
    );
  }
  if (provider === 'apple') {
    return (
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" fill="#000">
        <path d="M16.4 12.8c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.9-3.6 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.7.7 1.1 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.6zM14.3 6c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" fill="#1877F2">
      <path d="M24 12a12 12 0 10-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0024 12z" />
    </svg>
  );
}

interface CaptchaFieldProps {
  challenge: CaptchaChallenge | null;
  answer: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  /** Hiện viền đỏ khi lần gửi trước bị từ chối vì CAPTCHA. */
  invalid: boolean;
}

/**
 * Widget CAPTCHA mô phỏng: câu hỏi cộng/trừ do server phát kèm chữ ký HMAC.
 * Điền số vào ô, không dùng checkbox — một checkbox "không phải robot" chỉ là
 * trang trí, còn câu trả lời ở đây được server kiểm thật.
 */
function CaptchaField({ challenge, answer, onChange, onRefresh, invalid }: CaptchaFieldProps) {
  return (
    <div
      className={`rounded-md border bg-white px-3.5 py-3 transition-all ${
        invalid ? 'border-[#dc2626]' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
          <Icon name="ShieldCheckIcon" size={15} className="text-[var(--primary)]" />
          Xác nhận không phải robot
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          Đổi câu hỏi
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span
          aria-live="polite"
          className="select-none rounded bg-[#f3f4f6] px-3 py-1.5 font-mono text-[15px] font-bold tracking-wide text-[var(--foreground)]"
        >
          {challenge?.question ?? '…'}
        </span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Câu trả lời CAPTCHA"
          value={answer}
          onChange={(event) => onChange(event.target.value.replace(/[^\d-]/g, ''))}
          placeholder="Kết quả"
          className="w-24 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 font-body-vj text-base font-bold text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        />
      </div>
    </div>
  );
}

interface SocialButtonsProps {
  providers: SocialProviderConfig[];
  onUnavailable: (label: string) => void;
}

/** Nút Social Login kiểu SkyJoy SSO, kèm dải phân cách "hoặc". */
function SocialButtons({ providers, onUnavailable }: SocialButtonsProps) {
  if (providers.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#d8dade]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
          hoặc tiếp tục với
        </span>
        <span className="h-px flex-1 bg-[#d8dade]" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            aria-label={`Đăng nhập bằng ${provider.label}`}
            onClick={() => {
              if (!provider.enabled) {
                onUnavailable(provider.label);
                return;
              }
              window.location.href = `/api/xac-thuc/social/${provider.id}`;
            }}
            className={`flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white text-sm font-bold text-[var(--foreground)] transition-colors hover:border-[var(--border)] hover:bg-[#fafafa] ${
              provider.enabled ? '' : 'opacity-60'
            }`}
          >
            <BrandMark provider={provider.id} />
            <span className="hidden sm:inline">{provider.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SignUpLoginPageInner() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // `AuthContext`'s provider value is rebuilt on every render, so `auth` is a new
  // object each time. Effects that depend on it would re-run on every render and
  // turn a one-off CAPTCHA/social fetch into a loop; the ref lets the mount-time
  // effects read the latest methods without listing `auth` as a dependency.
  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
  });

  const [tab, setTab] = useState<AuthTab>('login');
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [salutation, setSalutation] = useState<Salutation>(DEFAULT_SALUTATION);
  const [referralCode, setReferralCode] = useState('');
  const [referralError, setReferralError] = useState('');
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
  const [twoFAToken, setTwoFAToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // OTP: dùng chung cho đăng nhập không mật khẩu và cho bước 2 của đăng ký.
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDevHint, setOtpDevHint] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const resend = useResendCooldown();

  // CAPTCHA + Social Login.
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaInvalid, setCaptchaInvalid] = useState(false);
  const [socialProviders, setSocialProviders] = useState<SocialProviderConfig[]>([]);
  const [socialNotice, setSocialNotice] = useState('');

  const loadCaptcha = useCallback(async () => {
    const getCaptcha = authRef.current.getCaptcha;
    if (typeof getCaptcha !== 'function') return;
    try {
      const challenge = await getCaptcha();
      setCaptcha(challenge);
      setCaptchaAnswer('');
      setCaptchaInvalid(false);
    } catch {
      // CAPTCHA là bước phụ trên form; nếu không tải được, để server từ chối ở
      // lần gửi và người dùng bấm "Đổi câu hỏi" thử lại.
      setCaptcha(null);
    }
  }, []);

  // Deep links from the Header carry ?tab=register; the auth middleware appends
  // ?redirect=<path> after bouncing a signed-out visit.
  useEffect(() => {
    if (searchParams.get('tab') === 'register') setTab('register');
    const target = searchParams.get('redirect');
    if (target && target.startsWith('/')) setRedirectTo(target);
  }, [searchParams]);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  useEffect(() => {
    const getSocialProviders = authRef.current.getSocialProviders;
    if (typeof getSocialProviders !== 'function') return;
    getSocialProviders()
      .then(setSocialProviders)
      .catch(() => setSocialProviders([]));
  }, []);

  const resetMessages = () => {
    setError('');
    setSuccess('');
    setSocialNotice('');
  };

  const switchTab = (next: AuthTab) => {
    setTab(next);
    resetMessages();
    setBirthError('');
    setReferralError('');
  };

  const goToDashboard = (data: { user?: { role?: string } }) => {
    if (redirectTo) {
      router.push(redirectTo);
      return;
    }
    router.push(isAdminRole(data?.user?.role || 'user') ? '/quan-tri' : '/tai-khoan');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await auth.signIn(email, password, requires2FA ? twoFAToken : undefined, {
        token: captcha?.token,
        answer: captchaAnswer,
      });
      setSuccess('Đăng nhập thành công!');
      setTimeout(() => goToDashboard(data), 800);
    } catch (err) {
      // The API answers 401 with requires2FA when the password was right but a
      // second factor is still needed; ask for it instead of failing outright.
      const {
        message,
        requires2FA: needs2FA,
        captchaRequired,
      } = readAuthError(err, 'Email hoặc mật khẩu không đúng');
      if (needs2FA) {
        setRequires2FA(true);
        setError('');
        setSuccess('Tài khoản đã bật xác thực hai yếu tố. Nhập mã từ ứng dụng xác thực.');
      } else {
        setError(message);
        if (captchaRequired) {
          setCaptchaInvalid(true);
          void loadCaptcha();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  /** Gửi OTP cho đăng nhập không mật khẩu. */
  const handleSendLoginOtp = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập Email, Số điện thoại hoặc Mã hội viên SkyJoy.');
      return;
    }
    setOtpSending(true);
    setError('');
    try {
      const result = await auth.requestOtp({
        identifier: email.trim(),
        purpose: 'login',
        captchaToken: captcha?.token,
        captchaAnswer,
      });
      setOtpSent(true);
      resend.start();
      setOtpDevHint(result?.devCode ? `Mã thử nghiệm (dev): ${result.devCode}` : '');
      setSuccess(result?.message || 'Nếu tài khoản tồn tại, mã OTP đã được gửi.');
      void loadCaptcha();
    } catch (err) {
      const { message, captchaRequired } = readAuthError(err, 'Không gửi được mã OTP.');
      setError(message);
      if (captchaRequired) {
        setCaptchaInvalid(true);
        void loadCaptcha();
      }
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await auth.signInWithOtp(email.trim(), otpCode);
      setSuccess('Đăng nhập thành công!');
      setTimeout(() => goToDashboard(data), 800);
    } catch (err) {
      setError(readAuthError(err, 'Mã OTP không đúng hoặc đã hết hạn.').message);
    } finally {
      setLoading(false);
    }
  };

  const doSignUp = async (otp: string) => {
    const birth = resolveBirthDate(birthDay, birthMonth, birthYear);
    if (birth.error) {
      setBirthError(birth.error);
      setError(birth.error);
      return;
    }

    try {
      await auth.signUp(email, password, {
        fullName: `${surname} ${givenName}`.trim(),
        phone,
        dob: birth.iso || undefined,
        salutation,
        lastName: surname,
        firstName: givenName,
        referralCode: normalizeSkyjoyMemberId(referralCode) || undefined,
        otpCode: otp || undefined,
        captchaToken: captcha?.token,
        captchaAnswer,
      });
      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => router.push(redirectTo || '/tai-khoan'), 1200);
    } catch (err) {
      const { message, captchaRequired } = readAuthError(err, 'Có lỗi xảy ra khi đăng ký');
      setError(message);
      if (captchaRequired) {
        setCaptchaInvalid(true);
        void loadCaptcha();
      }
    }
  };

  // Bước 1: kiểm tra dữ liệu; nếu đăng ký bằng số điện thoại thì gửi OTP rồi
  // mới sang bước 2. Email-only (không số điện thoại) tạo tài khoản ngay.
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      if (!surname.trim() || !givenName.trim() || (!email && !phone) || !password || !agreeTerms) {
        setError(
          !agreeTerms
            ? 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.'
            : 'Vui lòng điền họ tên, mật khẩu và (Email hoặc Số điện thoại).'
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

      if (!captcha?.token || !captchaAnswer.trim()) {
        setCaptchaInvalid(true);
        setError('Vui lòng trả lời câu hỏi xác nhận để tiếp tục.');
        return;
      }

      if (!phone) {
        await doSignUp('');
        return;
      }

      const result = await auth.requestOtp({
        phone,
        purpose: 'register',
        captchaToken: captcha.token,
        captchaAnswer,
      });
      setOtpSent(true);
      setRegisterStep(2);
      resend.start();
      setOtpDevHint(result?.devCode ? `Mã thử nghiệm (dev): ${result.devCode}` : '');
      setSuccess(`Mã xác thực ${OTP_LENGTH} số đã được gửi tới số điện thoại ${phone}.`);
    } catch (err) {
      const { message, captchaRequired } = readAuthError(err, 'Có lỗi xảy ra khi đăng ký');
      setError(message);
      if (captchaRequired) {
        setCaptchaInvalid(true);
        void loadCaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otpCode.trim().length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số của mã xác thực.`);
      return;
    }
    // The CAPTCHA answered at step 1 is reused here, so by the time the OTP is
    // typed it may have expired. Re-check it locally first; on a real expiry the
    // server answers `captchaRequired` and the field below shows a new question.
    if (!captcha?.token || !captchaAnswer.trim()) {
      setCaptchaInvalid(true);
      setError('Vui lòng trả lời câu hỏi xác nhận để tiếp tục.');
      return;
    }
    setLoading(true);
    try {
      await doSignUp(otpCode.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    setOtpSending(true);
    setError('');
    try {
      const result = await auth.requestOtp({
        phone,
        purpose: 'register',
        captchaToken: captcha?.token,
        captchaAnswer,
      });
      resend.start();
      setOtpDevHint(result?.devCode ? `Mã thử nghiệm (dev): ${result.devCode}` : '');
      setSuccess(`Đã gửi lại mã tới ${phone}.`);
    } catch (err) {
      const { message, captchaRequired } = readAuthError(err, 'Không gửi lại được mã.');
      setError(message);
      if (captchaRequired) {
        setCaptchaInvalid(true);
        void loadCaptcha();
      }
    } finally {
      setOtpSending(false);
    }
  };

  const backToRegisterStep1 = () => {
    setRegisterStep(1);
    setOtpCode('');
    resetMessages();
  };

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

  /**
   * Mã giới thiệu là mã hội viên SkyJoy của người giới thiệu. Bỏ trống thì hợp lệ
   * (trường tùy chọn); chỉ báo lỗi khi đã gõ mà sai định dạng — server bỏ qua mã
   * sai một cách im lặng, nên nếu không kiểm ở đây thì khách điền sai vẫn thấy
   * "đăng ký thành công" mà không nhận được điểm thưởng nào.
   */
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

  // Form đăng nhập/đăng ký không dùng trạng thái "form-input-valid" (khung viền
  // xanh + dấu tích): trạng thái hợp lệ lúc đang gõ hiện cả khi ô còn trống và
  // không khớp với hệ màu đỏ của Vietjet. Viền chỉ đổi sang đỏ khi focus.
  const inputClass =
    'form-input vj-auth-input font-body-vj w-full rounded-md border border-[var(--border)] bg-white py-3 pl-11 pr-4 text-base sm:text-[15px] text-[var(--foreground)] outline-none transition-all placeholder:text-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10';

  const plainInputClass =
    'form-input vj-auth-input font-body-vj w-full rounded-md border border-[var(--border)] bg-white py-3 pl-4 pr-4 text-base sm:text-[15px] text-[var(--foreground)] outline-none transition-all placeholder:text-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10';

  const submitClass =
    'vj-auth-submit flex min-h-11 w-full items-center justify-center gap-2 rounded-md';

  // Cả hai chế độ đăng nhập đều nhận mã hội viên SkyJoy — server tra định danh
  // qua `findAccountByIdentifier`, không phân biệt chế độ — nên nhãn nói đủ ba
  // loại thay vì chỉ "Email hoặc Số điện thoại".
  const identifierLabel = 'Email / SĐT / Mã hội viên';

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
      <div className="vj-auth-tabs mb-7 grid grid-cols-2 border-b border-[var(--border)]">
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
                : 'text-[var(--foreground-muted)] after:scale-x-0 after:bg-[var(--primary)] hover:text-[var(--primary)]'
            }`}
          >
            {value === 'register' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        ))}
      </div>

      <AlertBanner message={error} variant="error" />
      <AlertBanner message={success} variant="success" />

      {socialNotice && (
        <div className="mb-4 rounded-md border border-[#ffe08a] bg-[#fffbe6] px-4 py-2.5 text-xs font-bold leading-5 text-[#7a6a00]">
          {socialNotice}
        </div>
      )}

      {tab === 'login' && (
        <>
          {/* Chọn cách đăng nhập: mật khẩu, hay OTP SMS không cần mật khẩu. */}
          <div
            role="tablist"
            aria-label="Cách đăng nhập"
            className="mb-4 flex gap-2 rounded-md bg-[#eef1f5] p-1"
          >
            {(
              [
                ['password', 'Mật khẩu'],
                ['otp', 'OTP SMS'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={loginMode === value}
                onClick={() => {
                  setLoginMode(value);
                  setRequires2FA(false);
                  resetMessages();
                }}
                className={`flex-1 rounded px-3 py-2 text-sm font-extrabold transition-colors ${
                  loginMode === value
                    ? 'bg-white text-[var(--primary)] shadow-sm'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form
            onSubmit={loginMode === 'password' ? handleLogin : handleOtpLogin}
            className="space-y-3"
          >
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
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className={inputClass}
                required
              />
              <label className="form-label-float has-icon">{identifierLabel}</label>
            </div>

            {loginMode === 'password' && (
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
                  className={`form-input vj-auth-input w-full rounded-md border border-[var(--border)] bg-white py-3 pl-11 pr-12 text-base sm:text-[15px] text-[var(--foreground)] outline-none transition-all placeholder:text-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10`}
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
            )}

            {loginMode === 'password' && requires2FA && (
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
                  className={inputClass}
                  required
                />
                <label className="form-label-float has-icon">Mã 2FA (hoặc mã dự phòng)</label>
              </div>
            )}

            {loginMode === 'otp' && otpSent && (
              <div className={`form-field-float ${otpCode ? 'has-value' : ''}`}>
                <Icon
                  name="DevicePhoneMobileIcon"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  id="login-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder=" "
                  className={inputClass}
                  required
                />
                <label className="form-label-float has-icon">Mã OTP ({OTP_LENGTH} số)</label>
              </div>
            )}

            {otpDevHint && (
              <p className="rounded bg-[#f3f4f6] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
                {otpDevHint}
              </p>
            )}

            {loginMode === 'password' && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[var(--foreground-muted)]">
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
                  className="text-sm font-bold text-[var(--primary)] hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}

            {loginMode === 'otp' && (
              <button
                type="button"
                onClick={handleSendLoginOtp}
                disabled={otpSending || resend.seconds > 0}
                className="w-full rounded-md border border-[var(--primary)] px-3 py-2.5 text-sm font-extrabold text-[var(--primary)] transition-colors hover:bg-[rgb(var(--primary-rgb))]/5 disabled:opacity-50"
              >
                {otpSending
                  ? 'Đang gửi mã…'
                  : resend.seconds > 0
                    ? `Gửi lại mã sau ${resend.seconds}s`
                    : otpSent
                      ? 'Gửi lại mã OTP'
                      : 'Gửi mã OTP'}
              </button>
            )}

            <CaptchaField
              challenge={captcha}
              answer={captchaAnswer}
              onChange={setCaptchaAnswer}
              onRefresh={loadCaptcha}
              invalid={captchaInvalid}
            />

            <button type="submit" disabled={loading} className={submitClass}>
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <Icon name="ArrowRightOnRectangleIcon" size={18} />
                  {loginMode === 'otp' ? 'Đăng nhập bằng OTP' : 'Đăng nhập'}
                </>
              )}
            </button>
          </form>

          <SocialButtons
            providers={socialProviders}
            onUnavailable={(label) =>
              setSocialNotice(
                `Đăng nhập bằng ${label} sẽ sớm khả dụng. Vui lòng dùng email, số điện thoại hoặc mã hội viên.`
              )
            }
          />
        </>
      )}

      {tab === 'register' && registerStep === 1 && (
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="animate-fade-in-slide space-y-3">
            <FieldSelect
              id="salutation"
              label="Danh xưng"
              value={salutation}
              options={SALUTATIONS.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(value) => setSalutation(isSalutation(value) ? value : DEFAULT_SALUTATION)}
            />

            {/* Tên tách Họ và Tên đệm & Tên, lưu IN HOA không dấu theo hộ chiếu /
                CCCD (server chuẩn hoá lại lần nữa). */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`form-field-float ${surname ? 'has-value' : ''}`}>
                <input
                  id="surname"
                  name="surname"
                  type="text"
                  autoComplete="family-name"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  onBlur={() => setSurname((value) => normalizePassportName(value))}
                  placeholder=" "
                  className={plainInputClass}
                  required
                />
                <label className="form-label-float">Họ (IN HOA, không dấu)</label>
              </div>
              <div className={`form-field-float ${givenName ? 'has-value' : ''}`}>
                <input
                  id="given_name"
                  name="given_name"
                  type="text"
                  autoComplete="given-name"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  onBlur={() => setGivenName((value) => normalizePassportName(value))}
                  placeholder=" "
                  className={plainInputClass}
                  required
                />
                <label className="form-label-float">Tên đệm/Tên (IN HOA, không dấu)</label>
              </div>
            </div>

            {/* Ngày sinh: ba select Ngày / Tháng / Năm trong một khung, dùng đúng
                  viền / bo góc / nền của các ô nhập còn lại. Nhãn đặt tĩnh ở trên
                  vì select không dùng được kiểu floating label của input. */}
            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
                Ngày sinh <span className="text-[var(--primary)]">*</span>
              </span>
              <div className="grid grid-cols-3 divide-x divide-[#d8dade] overflow-hidden rounded-md border border-[var(--border)] bg-white transition-all focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[rgb(var(--primary-rgb))]/10">
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
                <p className="mt-1.5 text-xs font-bold text-[var(--primary-dark)]">{birthError}</p>
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
                className={inputClass}
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
                className={inputClass}
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
                className={`form-input vj-auth-input w-full rounded-md border border-[var(--border)] bg-white py-3 pl-11 pr-12 text-base sm:text-[15px] text-[var(--foreground)] outline-none transition-all placeholder:text-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10`}
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

            {/* Mã giới thiệu: mã hội viên SkyJoy của người giới thiệu, thưởng điểm
                cho cả hai bên nếu hợp lệ. Sai định dạng bị báo tại chỗ thay vì
                để server bỏ qua im lặng. */}
            <div>
              <div className={`form-field-float ${referralCode ? 'has-value' : ''}`}>
                <Icon
                  name="GiftIcon"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  id="referral_code"
                  name="referral_code"
                  type="text"
                  value={referralCode}
                  onChange={(e) => handleReferralChange(e.target.value)}
                  onBlur={(e) => setReferralError(validateReferralCode(e.target.value))}
                  aria-invalid={referralError ? true : undefined}
                  aria-describedby={referralError ? 'referral-code-error' : undefined}
                  placeholder=" "
                  className={inputClass}
                />
                <label className="form-label-float has-icon">Mã giới thiệu SkyJoy (Tùy chọn)</label>
              </div>
              {referralError && (
                <p
                  id="referral-code-error"
                  className="mt-1.5 text-xs font-bold text-[var(--primary-dark)]"
                >
                  {referralError}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer select-none items-start gap-2.5 text-xs font-bold leading-5 text-[var(--foreground-muted)]">
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
                  className="font-bold text-primary hover:underline"
                >
                  Điều khoản dịch vụ
                </a>{' '}
                và{' '}
                <a
                  href="/gioi-thieu"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  Chính sách bảo mật
                </a>{' '}
                của Vietjet Air / SkyJoy.
              </span>
            </label>

            <CaptchaField
              challenge={captcha}
              answer={captchaAnswer}
              onChange={setCaptchaAnswer}
              onRefresh={loadCaptcha}
              invalid={captchaInvalid}
            />

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
        </form>
      )}

      {tab === 'register' && registerStep === 2 && (
        <form onSubmit={handleVerifyRegisterOtp} className="space-y-4">
          <div className="rounded-md border border-[var(--border)] bg-[#f8fafc] px-4 py-3 text-xs font-bold leading-5 text-[var(--foreground-muted)]">
            Mã xác thực gồm {OTP_LENGTH} chữ số đã được gửi tới số điện thoại{' '}
            <span className="text-[var(--foreground)]">{phone}</span>. Nhập mã để hoàn tất tạo tài
            khoản.
          </div>

          <div className={`form-field-float ${otpCode ? 'has-value' : ''}`}>
            <Icon
              name="DevicePhoneMobileIcon"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
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
              placeholder=" "
              className={`form-input vj-auth-input font-body-vj w-full rounded-md border border-[var(--border)] bg-white py-3 pl-11 pr-4 text-base tracking-[0.4em] sm:text-[15px] text-[var(--foreground)] outline-none transition-all placeholder:text-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[rgb(var(--primary-rgb))]/10`}
              required
            />
            <label className="form-label-float has-icon">Mã xác thực OTP</label>
          </div>

          {otpDevHint && (
            <p className="rounded bg-[#f3f4f6] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
              {otpDevHint}
            </p>
          )}

          {/* Cùng challenge đã trả lời ở bước 1, hiển thị lại ở đây để còn chỗ
              đổi câu hỏi nếu token hết hạn trong lúc nhập OTP. */}
          <CaptchaField
            challenge={captcha}
            answer={captchaAnswer}
            onChange={setCaptchaAnswer}
            onRefresh={loadCaptcha}
            invalid={captchaInvalid}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={backToRegisterStep1}
              className="text-sm font-bold text-[var(--foreground-muted)] hover:text-[var(--primary)]"
            >
              ← Sửa thông tin
            </button>
            <button
              type="button"
              onClick={handleResendRegisterOtp}
              disabled={otpSending || resend.seconds > 0}
              className="text-sm font-bold text-[var(--primary)] hover:underline disabled:opacity-50"
            >
              {resend.seconds > 0 ? `Gửi lại sau ${resend.seconds}s` : 'Gửi lại mã'}
            </button>
          </div>

          <button type="submit" disabled={loading} className={submitClass}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                <Icon name="ShieldCheckIcon" size={18} />
                Xác nhận &amp; tạo tài khoản
              </>
            )}
          </button>
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
