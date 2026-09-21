'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/shared/components/ui/AppIcon';
import AuthShell from '@/features/auth/components/AuthShell';
import AlertBanner from '@/features/auth/components/AlertBanner';
import { isResetTokenValid, resetPassword } from '@/features/auth';
import { getApiErrorMessage } from '@/shared/services';
import { PASSWORD_POLICY } from '@/features/auth/constants';

function ResetPasswordPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    { label: 'Có ký tự đặc biệt', met: /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password) },
  ];
  const passwordStrong = requirements.every((r) => r.met);
  const matches = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStrong) {
      setError('Mật khẩu chưa đáp ứng yêu cầu bảo mật.');
      return;
    }
    if (!matches) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/dang-nhap'), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Bảo mật tài khoản"
      title="Đặt lại mật khẩu"
      subtitle="Tạo mật khẩu mới cho tài khoản Vietjet SkyJoy của bạn."
    >
      {checking ? (
        <div className="flex flex-col items-center gap-4 py-10 text-sm text-[var(--foreground-muted)]">
          <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
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
          Đang kiểm tra liên kết...
        </div>
      ) : done ? (
        <div className="space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--vj-green-light)]">
            <Icon name="CheckCircleIcon" size={32} className="text-[var(--vj-green)]" />
          </div>
          <p className="text-center text-sm text-[var(--foreground-muted)]">
            Mật khẩu đã được cập nhật. Bạn sẽ được chuyển tới trang đăng nhập...
          </p>
          <Link
            href="/dang-nhap"
            className="vj-btn vj-btn-primary vj-btn-pill flex w-full items-center justify-center gap-2 py-3.5 text-base"
          >
            Đăng nhập ngay
          </Link>
        </div>
      ) : !tokenValid ? (
        <div className="space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--primary-rgb))]/10">
            <Icon name="ExclamationTriangleIcon" size={32} className="text-primary" />
          </div>
          <p className="text-center text-sm text-[var(--foreground-muted)]">
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.
          </p>
          <Link
            href="/quen-mat-khau"
            className="vj-btn vj-btn-primary vj-btn-pill flex w-full items-center justify-center gap-2 py-3.5 text-base"
          >
            Yêu cầu liên kết mới
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner message={error} variant="error" />

          <div className={`form-field-float ${password ? 'has-value' : ''}`}>
            <Icon
              name="LockClosedIcon"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
            />
            <input
              id="new-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              className="form-input w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-10 pr-12 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20"
              required
            />
            <label className="form-label-float has-icon">Mật khẩu mới</label>
            <button
              type="button"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)]"
            >
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
            </button>
          </div>

          <ul className="grid grid-cols-1 gap-1.5 rounded-xl bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] px-4 py-3 text-xs sm:grid-cols-2">
            {requirements.map((req) => (
              <li
                key={req.label}
                className={`flex items-center gap-1.5 ${req.met ? 'text-[var(--vj-green)]' : 'text-[var(--foreground-muted)]'}`}
              >
                <Icon
                  name={req.met ? 'CheckCircleIcon' : 'XCircleIcon'}
                  size={14}
                  className={req.met ? 'text-[var(--vj-green)]' : 'text-[var(--foreground-subtle)]'}
                />
                {req.label}
              </li>
            ))}
          </ul>

          <div className={`form-field-float ${confirmPassword ? 'has-value' : ''}`}>
            <Icon
              name="LockClosedIcon"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
            />
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder=" "
              className="form-input w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-10 pr-12 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20"
              required
            />
            <label className="form-label-float has-icon">Xác nhận mật khẩu</label>
          </div>

          {confirmPassword && !matches && (
            <p className="text-xs font-medium text-primary">Mật khẩu xác nhận không khớp.</p>
          )}

          <button
            type="submit"
            disabled={loading || !passwordStrong || !matches}
            className="vj-btn vj-btn-primary vj-btn-pill flex w-full items-center justify-center gap-2 py-3.5 text-base"
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
                <Icon name="ShieldCheckIcon" size={18} />
                Đặt lại mật khẩu
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
