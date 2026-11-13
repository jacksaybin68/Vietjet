'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { flashToast } from '@/lib/toast';
import { PASSWORD_POLICY } from '@/features/auth/constants';
import { isResetTokenValid, resetPassword } from '@/features/auth';
import { getApiErrorMessage } from '@/shared/services';
import SkyIdShell from '../SkyIdShell';
import { SkyIdErrorNote } from './SkyIdControls';

/**
 * Màn "Đặt lại mật khẩu" — dựng lại theo giao diện SkyID thật.
 *
 * Số đo giống màn Quên mật khẩu (xem `SkyIdForgotPassword.tsx`):
 *   - Tiêu đề `18px/700` căn giữa.
 *   - Hai ô nhập cao `32px` với nhãn nổi `16px/500`.
 *   - Nút CTA gradient vàng, chữ `#333`, bo góc `8px`.
 *   - Chân trang "Được cung cấp và xác thực bởi SkyJoy ID" + 3 logo.
 *
 * Nghiệp vụ giữ nguyên: token dùng một lần và băm trong `account_recovery`;
 * đặt lại xong sẽ thu hồi refresh token và session.
 */
export default function SkyIdResetPassword() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) {
      setChecking(false);
      setTokenValid(false);
      return;
    }
    isResetTokenValid(token)
      .then((valid) => {
        if (active) setTokenValid(valid);
      })
      .catch(() => {
        if (active) setTokenValid(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const requirements = [
    {
      label: `Ít nhất ${PASSWORD_POLICY.MIN_LENGTH} ký tự`,
      met: password.length >= PASSWORD_POLICY.MIN_LENGTH,
    },
    { label: 'Có chữ in hoa', met: /[A-Z]/.test(password) },
    { label: 'Có chữ thường', met: /[a-z]/.test(password) },
    { label: 'Có chữ số', met: /\d/.test(password) },
    {
      label: 'Có ký tự đặc biệt',
      met: /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password),
    },
  ];
  const passwordStrong = requirements.every((r) => r.met);
  const matches = password.length > 0 && password === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStrong) {
      setError('Mật khẩu chưa đáp ứng yêu cầu bảo mật.');
      return;
    }
    if (!matches) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    void (async () => {
      setLoading(true);
      setError('');
      try {
        await resetPassword(token, password);
        setDone(true);
        toast.success(
          'Đặt lại mật khẩu thành công!',
          'Mật khẩu của bạn đã được cập nhật thành công.'
        );
        flashToast({
          type: 'success',
          title: 'Đặt lại mật khẩu thành công',
          message: 'Mật khẩu mới đã có hiệu lực. Bạn có thể đăng nhập ngay.',
        });
        setTimeout(() => router.push('/dang-nhap'), 1500);
      } catch (err) {
        const msg = getApiErrorMessage(err, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
        setError(msg);
        toast.error('Đặt lại mật khẩu thất bại', msg);
      } finally {
        setLoading(false);
      }
    })();
  };

  if (checking) {
    return (
      <SkyIdShell title="Đặt lại mật khẩu" subtitle="Đang kiểm tra liên kết...">
        <p className="text-sm leading-[22px] text-[var(--vj-skyid-muted)]">
          Đang kiểm tra liên kết, vui lòng chờ trong giây lát.
        </p>
      </SkyIdShell>
    );
  }

  if (done) {
    return (
      <SkyIdShell title="Đặt lại mật khẩu thành công" subtitle="Mật khẩu mới đã có hiệu lực.">
        <p className="text-sm leading-[22px] text-[var(--vj-skyid-muted)]">
          Mật khẩu đã được cập nhật. Bạn sẽ được chuyển tới trang đăng nhập...
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/dang-nhap" className="vj-skyid-btn">
            Đăng nhập ngay
          </Link>
        </div>
      </SkyIdShell>
    );
  }

  if (!tokenValid) {
    return (
      <SkyIdShell
        title="Liên kết không hợp lệ"
        subtitle="Liên kết đặt lại mật khẩu đã hết hạn hoặc không tồn tại."
      >
        <p className="text-sm leading-[22px] text-[var(--vj-skyid-muted)]">
          Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/quen-mat-khau" className="vj-skyid-btn">
            Yêu cầu liên kết mới
          </Link>
        </div>
      </SkyIdShell>
    );
  }

  return (
    <SkyIdShell
      title="Đặt lại mật khẩu"
      subtitle="Tạo mật khẩu mới cho tài khoản Vietjet SkyJoy của bạn."
    >
      <form onSubmit={handleSubmit} noValidate>
        <SkyIdErrorNote message={error} />

        <div className="relative">
          <label htmlFor="skyid-new-password" className="vj-skyid-label">
            Mật khẩu mới
          </label>
          <input
            id="skyid-new-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
            className="vj-skyid-input"
            style={{ paddingRight: 60 }}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--vj-skyid-muted)]"
          >
            {showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>

        <ul className="mt-3 grid grid-cols-1 gap-1.5 rounded-md bg-[var(--surface-2)] px-4 py-3 text-xs sm:grid-cols-2">
          {requirements.map((req) => (
            <li
              key={req.label}
              className={req.met ? 'text-[var(--vj-green)]' : 'text-[var(--vj-skyid-muted)]'}
            >
              {req.met ? '✓' : '○'} {req.label}
            </li>
          ))}
        </ul>

        <div className="relative mt-4">
          <label htmlFor="skyid-confirm-password" className="vj-skyid-label">
            Xác nhận mật khẩu
          </label>
          <input
            id="skyid-confirm-password"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            className="vj-skyid-input"
            style={{ paddingRight: 60 }}
          />
        </div>

        {confirmPassword && !matches ? (
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--vj-skyid-border-error)' }}>
            Mật khẩu xác nhận không khớp.
          </p>
        ) : null}

        <div className="mt-5 flex justify-center">
          <button
            type="submit"
            disabled={loading || !passwordStrong || !matches}
            className="vj-skyid-btn"
          >
            {loading ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
          </button>
        </div>
      </form>
    </SkyIdShell>
  );
}
