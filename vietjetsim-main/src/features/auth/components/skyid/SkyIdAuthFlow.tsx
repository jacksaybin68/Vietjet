'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { flashToast } from '@/lib/toast';
import { OTP_LENGTH, normalizePassportName } from '@/lib/skyjoy';
import SkyIdShell from '../SkyIdShell';
import { SkyIdErrorNote, SkyIdSocialButtons } from './SkyIdControls';
import PhoneStep from './steps/PhoneStep';
import PasswordStep from './steps/PasswordStep';
import RegisterStep from './steps/RegisterStep';
import OtpStep from './steps/OtpStep';
import { SKY_ID_COUNTRY_CODES, type IdentifierMode, type SkyIdCountry } from './steps/types';
import { useResendCountdown } from './useResendCountdown';

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
  /** `overlay` = lớp phủ fixed; `page` = nhúng thẳng trong `<main>`;
   *  `popup` = chỉ phần form, để `<PopupFrame>` bọc ngoài (622×664). */
  variant?: 'overlay' | 'page' | 'popup';
  mode?: SkyIdMode;
  /** Đường dẫn quay lại sau khi đăng nhập/đăng ký thành công. */
  redirectTo?: string;
  onClose?: () => void;
}

type Step = 'phone' | 'password' | 'register' | 'otp' | 'login-otp';

const COUNTRY_CODES = SKY_ID_COUNTRY_CODES;

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
  const [country, setCountry] = useState<SkyIdCountry>(COUNTRY_CODES[0]);
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

  /**
   * Đồng hồ đếm ngược của nút "Gửi lại mã" (`.gid-resend-otp`).
   *
   * Tách riêng cho luồng đăng ký và luồng đăng nhập để việc gửi lại mã ở một
   * luồng không mở khóa nút của luồng còn lại.
   */
  const [registerOtpCooldown, startRegisterOtpCountdown] = useResendCountdown();
  const [loginOtpCooldown, startLoginOtpCountdown] = useResendCountdown();

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
      startLoginOtpCountdown();
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
        startRegisterOtpCountdown();
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

  /**
   * Gửi lại mã OTP đăng nhập — `.gid-resend-otp` của SkyID.
   *
   * Chỉ chạy được khi đồng hồ đếm ngược đã về 0; sau khi gửi lại thành công
   * thì đồng hồ chạy lại từ đầu.
   */
  const handleResendLoginOtp = async () => {
    if (loginOtpCooldown > 0) return;
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
      startLoginOtpCountdown();
      toast.info('Đã gửi lại mã xác thực', 'Mã OTP mới đã được gửi tới quý khách.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không gửi lại được mã xác thực';
      setError(message);
      toast.error('Lỗi gửi lại mã xác thực', message);
    } finally {
      setLoading(false);
    }
  };

  /** Gửi lại mã OTP đăng ký — `.gid-resend-otp` của SkyID. */
  const handleResendRegisterOtp = async () => {
    if (registerOtpCooldown > 0) return;
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
      startRegisterOtpCountdown();
      toast.info('Đã gửi lại mã xác thực', `Mã OTP mới đã được gửi tới ${email.trim()}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không gửi lại được mã xác thực';
      setError(message);
      toast.error('Lỗi gửi lại mã xác thực', message);
    } finally {
      setLoading(false);
    }
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
        <PhoneStep
          mode={mode}
          identifierMode={identifierMode}
          onIdentifierModeChange={(next) => {
            setIdentifierMode(next);
            setError('');
          }}
          phone={phone}
          onPhoneChange={(v) => setPhone(v.replace(/[^\d]/g, ''))}
          accountIdentifier={accountIdentifier}
          onAccountIdentifierChange={setAccountIdentifier}
          country={country}
          countryOpen={countryOpen}
          onToggleCountry={() => setCountryOpen((open) => !open)}
          countryMenu={countryMenu}
          canContinue={Boolean(identifier)}
          onContinue={handlePhoneContinue}
          onSendLoginOtp={handleSendLoginOtp}
          loading={loading}
        />
      ) : null}

      {step === 'password' ? (
        <PasswordStep
          identifier={identifierMode === 'phone' ? phone : accountIdentifier}
          identifierLabel={
            identifierMode === 'phone' ? 'Số điện thoại' : 'Email hoặc mã hội viên SkyJoy'
          }
          country={country}
          password={password}
          onPasswordChange={setPassword}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onSubmit={handleLogin}
          onBack={() => {
            setStep('phone');
            setPassword('');
            setError('');
          }}
          loading={loading}
        />
      ) : null}

      {/* Bước xác nhận OTP đăng nhập (không cần mật khẩu). */}
      {step === 'login-otp' ? (
        <OtpStep
          destination={identifier}
          hint={loginOtpHint}
          code={loginOtpCode}
          onCodeChange={setLoginOtpCode}
          onSubmit={handleVerifyLoginOtp}
          onBack={() => {
            setStep('phone');
            setLoginOtpCode('');
            setError('');
          }}
          backLabel="Quay lại"
          loading={loading}
          inputId="skyid-login-otp"
          resendCooldown={loginOtpCooldown}
          onResend={handleResendLoginOtp}
        />
      ) : null}

      {step === 'register' ? (
        <RegisterStep
          surname={surname}
          onSurnameChange={setSurname}
          givenName={givenName}
          onGivenNameChange={setGivenName}
          birthDay={birthDay}
          onBirthDayChange={setBirthDay}
          birthMonth={birthMonth}
          onBirthMonthChange={setBirthMonth}
          birthYear={birthYear}
          onBirthYearChange={setBirthYear}
          email={email}
          onEmailChange={setEmail}
          referralCode={referralCode}
          onReferralCodeChange={setReferralCode}
          agree={agree}
          onAgreeChange={setAgree}
          onSubmit={handleRegister}
          loading={loading}
        />
      ) : null}

      {step === 'otp' ? (
        <OtpStep
          destination={email.trim()}
          hint={otpHint}
          code={otpCode}
          onCodeChange={setOtpCode}
          onSubmit={handleVerifyOtp}
          onBack={() => {
            setStep('register');
            setOtpCode('');
            setError('');
          }}
          backLabel="Sửa thông tin"
          loading={loading}
          inputId="skyid-otp"
          resendCooldown={registerOtpCooldown}
          onResend={handleResendRegisterOtp}
        />
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

  /**
   * Bản POPUP — nằm trong khung 500×208 của `PopupFrame` (khung 622×664 của
   * site thật). Khối form trắng bo góc dưới 16px, nội dung cuộn dọc.
   */
  if (variant === 'popup') {
    return (
      <div className="vj-skyid-popup-card">
        <h1 className="vj-skyid-title">{title}</h1>
        {subtitle ? <p className="vj-skyid-subtitle mt-1">{subtitle}</p> : null}
        <div className="mt-4 text-left">{body}</div>
      </div>
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
