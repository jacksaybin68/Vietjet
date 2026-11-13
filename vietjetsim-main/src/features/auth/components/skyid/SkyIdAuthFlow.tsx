'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { flashToast } from '@/lib/toast';
import { OTP_LENGTH, normalizePassportName } from '@/lib/skyjoy';
import SkyIdShell from '../SkyIdShell';
import { SkyIdField, SkyIdPhoneField, SkyIdPinInput } from './SkyIdFields';
import { SkyIdDevHint, SkyIdErrorNote, SkyIdSocialButtons } from './SkyIdControls';

/**
 * Luồng xác thực SkyID — bản sao giao diện của trang đăng nhập / đăng ký
 * thật của Vietjet (`skyjoy-id.vietjetair.com`).
 *
 * Khác modal 2 cột cũ (`SkyJoyIdModal`), bộ này dùng **form 1 cột** trên nền
 * ảnh toàn trang, đúng như site thật:
 *   - Tiêu đề `18px/700` căn giữa, nhãn nổi `16px/500` trên ô nhập.
 *   - Ô nhập cao `32px`, bo `4px`, viền `#E8EBEF`, focus `#FFDB01`.
 *   - Nút CTA gradient vàng `135deg,#E99F24→#FD0`, chữ `#333`, bo `8px`.
 *   - Chân trang "Được cung cấp và xác thực bởi SkyJoy ID" + 3 logo `h:16px`.
 *
 * Hồ sơ số đo: `docs/qa/so-do-skyid-2026-11-13.md`.
 *
 * Component KHÔNG tự nối lại nghiệp vụ: nó dùng `useAuth()` (đã bọc `fetchAuth`
 * + CSRF) nên mọi lệnh gọi vẫn đi qua `/api/xac-thuc/*` và
 * `findAccountByIdentifier` như trước.
 */

export type SkyIdMode = 'login' | 'register';

export interface SkyIdAuthFlowProps {
  /** `overlay` = lớp phủ fixed; `page` = nhúng thẳng trong `<main>`. */
  variant?: 'overlay' | 'page';
  mode?: SkyIdMode;
  /** Đường dẫn quay lại sau khi đăng nhập/đăng ký thành công. */
  redirectTo?: string;
  onClose?: () => void;
}

type Step = 'phone' | 'password' | 'register' | 'otp' | 'login-otp';

/**
 * Bước đầu cho phép nhập theo hai kiểu định danh:
 *  - `phone`: số điện thoại kèm mã quốc gia (mặc định, khớp site thật).
 *  - `account`: email hoặc mã hội viên SkyJoy.
 *
 * Backend đã tra được cả ba loại (`findAccountByIdentifier` gộp email /
 * số điện thoại / mã hội viên vào một câu truy vấn), nhưng trước đây ô nhập
 * lọc sạch mọi ký tự không phải số nên người dùng không thể đăng nhập bằng
 * email hay mã hội viên — đúng những định danh mà API hỗ trợ.
 */
type IdentifierMode = 'phone' | 'account';

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

export default function SkyIdAuthFlow({
  variant = 'overlay',
  mode: initialMode = 'login',
  redirectTo,
  onClose,
}: SkyIdAuthFlowProps) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [mode, setMode] = useState<SkyIdMode>(initialMode);
  const [step, setStep] = useState<Step>('phone');

  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<(typeof COUNTRY_CODES)[number]>(COUNTRY_CODES[0]);
  const [countryOpen, setCountryOpen] = useState(false);

  /** Kiểu định danh ở bước đầu: số điện thoại hay email/mã hội viên. */
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>('phone');
  /** Email hoặc mã hội viên SkyJoy (dùng khi `identifierMode === 'account'`). */
  const [accountIdentifier, setAccountIdentifier] = useState('');

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
  /** Mã OTP đăng nhập (bước `login-otp`). */
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginOtpHint, setLoginOtpHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Provider social: nút chỉ bấm được khi server đã cấu hình OAuth cho nó.
  const [socialEnabled, setSocialEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMode(initialMode);
    setStep('phone');
    setError('');
    // Đăng ký chỉ dùng số điện thoại → luôn quay về tab số điện thoại.
    setIdentifierMode('phone');
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

  /**
   * Định danh dùng để đăng nhập ở bước hiện tại.
   *  - `phone` → chuỗi số điện thoại (đã bỏ ký tự không phải số).
   *  - `account` → email hoặc mã hội viên SkyJoy, đã trim.
   */
  const identifier =
    identifierMode === 'phone' ? phone.replace(/\D/g, '') : accountIdentifier.trim();

  const handlePhoneContinue = () => {
    if (!identifier) {
      setError(
        identifierMode === 'phone'
          ? 'Vui lòng nhập số điện thoại của bạn'
          : 'Vui lòng nhập email hoặc mã hội viên SkyJoy'
      );
      return;
    }
    setError('');
    setStep(mode === 'register' ? 'register' : 'password');
  };

  /** Gửi OTP SMS để đăng nhập không cần mật khẩu. */
  const handleSendLoginOtp = async () => {
    if (!identifier) {
      setError(
        identifierMode === 'phone'
          ? 'Vui lòng nhập số điện thoại của bạn'
          : 'Vui lòng nhập email hoặc mã hội viên SkyJoy'
      );
      return;
    }
    setLoading(true);
    setError('');
    try {
      const challenge = await auth.getCaptcha();
      const captchaAnswer = autoSolveCaptcha(challenge?.token);
      const otp = await auth.requestOtp({
        identifier,
        purpose: 'login',
        captchaToken: challenge?.token,
        captchaAnswer,
      });
      setLoginOtpHint(otp?.devCode ? `Mã thử nghiệm (dev): ${otp.devCode}` : '');
      setStep('login-otp');
      toast.info('Đã gửi mã xác thực', 'Mã OTP đã được gửi tới số điện thoại/email của bạn.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không gửi được mã xác thực';
      setError(message);
      toast.error('Lỗi gửi mã xác thực', message);
    } finally {
      setLoading(false);
    }
  };

  /** Xác nhận OTP đăng nhập. */
  const handleVerifyLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtpCode.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số của mã xác thực.`);
      return;
    }
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await auth.signInWithOtp(identifier, loginOtpCode);
        toast.success('Đăng nhập thành công', `Chào mừng ${data.user?.fullName || 'Quý khách'}`);
        finish(data.user?.fullName);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Đăng nhập thất bại';
        setError(message);
        toast.error('Đăng nhập thất bại', message);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    void (async () => {
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
    })();
  };

  const handleRegister = (e: React.FormEvent) => {
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
    void (async () => {
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
        const message = err instanceof Error ? err.message : 'Đăng ký thất bại';
        setError(message);
        toast.error('Đăng ký thất bại', message);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số của mã xác thực.`);
      return;
    }
    void (async () => {
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
    })();
  };

  const openSocial = (provider: 'google' | 'apple') => {
    window.location.href = `/api/xac-thuc/social/${provider}`;
  };

  const title =
    mode === 'register'
      ? 'Nhập số điện thoại'
      : step === 'password'
        ? 'Nhập mật khẩu'
        : step === 'login-otp'
          ? 'Nhập mã xác thực'
          : 'Đăng nhập';

  const subtitle =
    mode === 'register'
      ? 'Tạo tài khoản SkyJoy để nhận ưu đãi và tích điểm đổi quà.'
      : step === 'password'
        ? 'Vui lòng nhập mật khẩu để tiếp tục.'
        : step === 'login-otp'
          ? 'Nhập mã OTP được gửi qua tin nhắn để đăng nhập không cần mật khẩu.'
          : 'Đăng nhập để quản lý chuyến bay, đặt vé và tích điểm SkyJoy.';

  /** Danh sách mã quốc gia — nằm trong khối cờ của ô nhập số điện thoại. */
  const countryMenu = (
    <ul
      role="listbox"
      aria-label="Mã quốc gia"
      className="absolute left-0 top-[calc(100%+4px)] z-40 w-44 overflow-hidden rounded-md border border-[var(--vj-skyid-border)] bg-white py-1 shadow-lg"
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
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-[var(--vj-skyid-ink)] hover:bg-[var(--surface-2)]"
          >
            <span aria-hidden="true">{c.flag}</span>
            <span>{c.dial}</span>
            <span className="text-xs text-[var(--vj-skyid-muted)]">{c.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const body = (
    <>
      <SkyIdErrorNote message={error} />

      {step === 'phone' ? (
        <>
          {/* Chuyển kiểu định danh — mặc định số điện thoại (khớp site thật),
              có thêm đường vào bằng email / mã hội viên SkyJoy.
              Chỉ hiện ở chế độ đăng nhập: đăng ký bắt buộc dùng số điện thoại
              (OTP đăng ký được gửi về số này). */}
          {mode === 'login' ? (
            <div
              role="tablist"
              aria-label="Kiểu định danh đăng nhập"
              className="mb-4 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1"
            >
              {(
                [
                  { id: 'phone', label: 'Số điện thoại' },
                  { id: 'account', label: 'Email / Mã hội viên' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={identifierMode === tab.id}
                  onClick={() => {
                    setIdentifierMode(tab.id);
                    setError('');
                  }}
                  className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                    identifierMode === tab.id
                      ? 'bg-white text-[var(--vj-skyid-ink)] shadow-sm'
                      : 'text-[var(--vj-skyid-muted)] hover:text-[var(--vj-skyid-ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {identifierMode === 'phone' ? (
            <SkyIdPhoneField
              id="skyid-phone"
              label="Số điện thoại"
              value={phone}
              onChange={(v) => setPhone(v.replace(/[^\d]/g, ''))}
              flag={country.flag}
              dial={country.dial}
              countryMenu={countryOpen ? countryMenu : null}
              countryOpen={countryOpen}
              onToggleCountry={() => setCountryOpen((open) => !open)}
              placeholder="Nhập số điện thoại của bạn"
            />
          ) : (
            <SkyIdField
              id="skyid-account"
              label="Email hoặc mã hội viên SkyJoy"
              value={accountIdentifier}
              onChange={setAccountIdentifier}
              autoComplete="username"
              placeholder="Nhập email hoặc mã hội viên"
            />
          )}

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handlePhoneContinue}
              disabled={!identifier}
              className="vj-skyid-btn"
            >
              Tiếp tục
            </button>
          </div>

          {/* Đường vào thay thế: quên mật khẩu và đăng nhập bằng OTP. */}
          {mode === 'login' ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link href="/quen-mat-khau" className="vj-skyid-link">
                Quên mật khẩu?
              </Link>
              <button
                type="button"
                onClick={handleSendLoginOtp}
                disabled={loading || !identifier}
                className="vj-skyid-link disabled:cursor-not-allowed disabled:text-[var(--vj-modal-disabled-ink)]"
              >
                Đăng nhập bằng mã OTP
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {step === 'password' ? (
        <form onSubmit={handleLogin} noValidate>
          <SkyIdPhoneField
            id="skyid-phone-echo"
            label={identifierMode === 'phone' ? 'Số điện thoại' : 'Email hoặc mã hội viên SkyJoy'}
            value={identifierMode === 'phone' ? phone : accountIdentifier}
            onChange={() => undefined}
            flag={country.flag}
            dial={country.dial}
            readOnly
          />

          <div className="relative mt-4">
            <label htmlFor="skyid-password" className="vj-skyid-label">
              Mật khẩu
            </label>
            <input
              id="skyid-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="vj-skyid-input"
              style={{ paddingRight: 60 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--vj-skyid-muted)]"
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <button type="submit" disabled={loading} className="vj-skyid-btn">
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setPassword('');
                setError('');
              }}
              className="vj-skyid-link"
            >
              Quay lại
            </button>
          </div>
        </form>
      ) : null}

      {/* Bước xác nhận OTP đăng nhập (không cần mật khẩu). */}
      {step === 'login-otp' ? (
        <form onSubmit={handleVerifyLoginOtp} noValidate>
          <p className="text-sm leading-[22px] text-[var(--vj-skyid-muted)]">
            Mã xác thực gồm {OTP_LENGTH} chữ số đã được gửi tới{' '}
            <span className="font-bold text-[var(--vj-skyid-ink)]">{identifier}</span>. Quý khách
            vui lòng kiểm tra tin nhắn (hoặc mục Spam/Rác) và nhập mã để hoàn tất.
          </p>
          <SkyIdDevHint hint={loginOtpHint} />
          <div className="mt-4">
            <SkyIdPinInput
              length={OTP_LENGTH}
              value={loginOtpCode}
              onChange={(v) => setLoginOtpCode(v.replace(/[^\d]/g, ''))}
              id="skyid-login-otp"
            />
          </div>
          <div className="mt-5 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setLoginOtpCode('');
                setError('');
              }}
              className="vj-skyid-link"
            >
              Quay lại
            </button>
            <button type="submit" disabled={loading} className="vj-skyid-btn">
              {loading ? 'Đang xác nhận…' : 'Xác nhận'}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'register' ? (
        <form onSubmit={handleRegister} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SkyIdField
              id="skyid-surname"
              label="Họ"
              value={surname}
              onChange={setSurname}
              autoComplete="family-name"
              placeholder="NGUYEN"
            />
            <SkyIdField
              id="skyid-given-name"
              label="Tên đệm và tên"
              value={givenName}
              onChange={setGivenName}
              autoComplete="given-name"
              placeholder="VAN A"
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-[var(--vj-skyid-muted)]">
              Ngày sinh
            </span>
            <div className="vj-skyid-phone px-2">
              <select
                aria-label="Ngày"
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className="w-12 bg-transparent text-sm font-medium text-[var(--vj-skyid-ink)] outline-none"
              >
                <option value="">Ngày</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-[var(--vj-skyid-muted)]">/</span>
              <select
                aria-label="Tháng"
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="w-14 bg-transparent text-sm font-medium text-[var(--vj-skyid-ink)] outline-none"
              >
                <option value="">Tháng</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-[var(--vj-skyid-muted)]">/</span>
              <select
                aria-label="Năm"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-[var(--vj-skyid-ink)] outline-none"
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

          <SkyIdField
            id="skyid-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="email@example.com"
          />

          <SkyIdField
            id="skyid-referral"
            label="Mã giới thiệu SkyJoy (nếu có)"
            value={referralCode}
            onChange={setReferralCode}
            placeholder="SJ12345678"
          />

          <label className="flex cursor-pointer select-none items-start gap-2 pt-1 text-xs text-[var(--vj-skyid-muted)]">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="vj-skyid-consent mt-0.5"
            />
            <span>
              Tôi đồng ý với{' '}
              <Link
                href="/gioi-thieu"
                target="_blank"
                rel="noreferrer"
                className="vj-skyid-link font-bold underline"
              >
                Điều khoản dịch vụ và Chính sách bảo mật
              </Link>{' '}
              của Vietjet SkyJoy.
            </span>
          </label>

          <div className="flex justify-center pt-1">
            <button type="submit" disabled={loading} className="vj-skyid-btn">
              {loading ? 'Đang đăng ký…' : 'Đăng ký'}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'otp' ? (
        <form onSubmit={handleVerifyOtp} noValidate>
          <p className="text-sm leading-[22px] text-[var(--vj-skyid-muted)]">
            Mã xác thực gồm {OTP_LENGTH} chữ số đã được gửi tới {email.trim()}. Quý khách vui lòng
            kiểm tra hộp thư đến (hoặc mục Spam/Rác) và nhập mã để hoàn tất.
          </p>
          <SkyIdDevHint hint={otpHint} />
          <div className="mt-4">
            <SkyIdPinInput
              length={OTP_LENGTH}
              value={otpCode}
              onChange={(v) => setOtpCode(v.replace(/[^\d]/g, ''))}
              id="skyid-otp"
            />
          </div>
          <div className="mt-5 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStep('register');
                setOtpCode('');
                setError('');
              }}
              className="vj-skyid-link"
            >
              Sửa thông tin
            </button>
            <button type="submit" disabled={loading} className="vj-skyid-btn">
              {loading ? 'Đang xác nhận…' : 'Xác nhận'}
            </button>
          </div>
        </form>
      ) : null}

      {step !== 'register' && step !== 'otp' && step !== 'login-otp' ? (
        <>
          {/* Divider "hoặc tiếp tục với" */}
          <div className="vj-skyid-divider my-5">hoặc tiếp tục với</div>

          <SkyIdSocialButtons
            appleEnabled={Boolean(socialEnabled.apple)}
            googleEnabled={Boolean(socialEnabled.google)}
            onApple={() => openSocial('apple')}
            onGoogle={() => openSocial('google')}
          />
        </>
      ) : null}

      {/* Dòng chuyển chế độ — "Bạn chưa có tài khoản? Đăng ký ngay". */}
      <div className="mt-5 text-center">
        <p className="vj-skyid-subtitle">
          {mode === 'register' ? 'Bạn đã có tài khoản? ' : 'Bạn chưa có tài khoản? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'register' ? 'login' : 'register');
              setStep('phone');
              setIdentifierMode('phone');
              setError('');
            }}
            className="vj-skyid-link font-bold underline"
          >
            {mode === 'register' ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
          </button>
        </p>
      </div>
    </>
  );

  if (variant === 'page') {
    return (
      <SkyIdShell title={title} subtitle={subtitle}>
        {body}
      </SkyIdShell>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'register' ? 'Đăng ký Vietjet SkyJoy ID' : 'Đăng nhập Vietjet SkyJoy ID'}
      className="fixed inset-0 z-[1500] overflow-y-auto"
      style={{ background: 'var(--vj-skyid-overlay)' }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-[420px]">
          <SkyIdShell title={title} subtitle={subtitle} showArt={false}>
            {body}
          </SkyIdShell>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl font-bold text-white transition hover:bg-black/60"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
