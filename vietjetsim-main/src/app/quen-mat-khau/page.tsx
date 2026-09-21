'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Icon from '@/shared/components/ui/AppIcon';
import AuthShell from '@/features/auth/components/AuthShell';
import AlertBanner from '@/features/auth/components/AlertBanner';
import { requestPasswordReset } from '@/features/auth';
import { getApiErrorMessage } from '@/shared/services';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [demoResetUrl, setDemoResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await requestPasswordReset(identifier.trim());
      setSent(true);
      // The server echoes the link only outside production (no mailer wired up).
      if (result.resetUrl) setDemoResetUrl(result.resetUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Khôi phục tài khoản"
      title="Quên mật khẩu?"
      subtitle="Nhập email hoặc số điện thoại đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
    >
      {sent ? (
        <div className="space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon name="EnvelopeOpenIcon" size={32} className="text-primary" />
          </div>
          <p className="text-center text-sm text-[var(--foreground-muted)]">
            Nếu thông tin khớp với một tài khoản, liên kết đặt lại mật khẩu đã được gửi tới{' '}
            <span className="font-semibold text-primary">{identifier}</span>. Liên kết có hiệu lực
            trong 30 phút.
          </p>

          {demoResetUrl && (
            <div className="rounded-xl border border-[rgb(var(--accent-rgb))]/40 bg-[rgb(var(--accent-rgb))]/10 px-4 py-3 text-xs text-[var(--foreground)]">
              <p className="font-semibold">Chế độ demo (chưa cấu hình email)</p>
              <Link
                href={demoResetUrl}
                className="mt-1 inline-block font-semibold text-primary hover:underline"
              >
                Mở liên kết đặt lại mật khẩu →
              </Link>
            </div>
          )}

          <Link
            href="/dang-nhap"
            className="vj-btn vj-btn-primary vj-btn-pill flex w-full items-center justify-center gap-2 py-3.5 text-base"
          >
            <Icon name="ArrowLeftIcon" size={18} />
            Về trang đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner message={error} variant="error" />

          <div className={`form-field-float ${identifier ? 'has-value' : ''}`}>
            <Icon
              name="EnvelopeIcon"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--foreground-subtle)]"
            />
            <input
              id="forgot-identifier"
              name="identifier"
              type="text"
              autoComplete="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder=" "
              className="form-input font-body-vj w-full rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] py-3 pl-10 pr-4 text-sm transition-all focus:border-primary focus:bg-[var(--background)] focus:ring-2 focus:ring-primary/20"
              required
            />
            <label className="form-label-float has-icon">Email hoặc Số điện thoại</label>
          </div>

          <button
            type="submit"
            disabled={loading || !identifier.trim()}
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
                <Icon name="PaperAirplaneIcon" size={18} />
                Gửi liên kết đặt lại
              </>
            )}
          </button>

          <Link
            href="/dang-nhap"
            className="flex items-center justify-center gap-1 text-sm font-semibold text-[var(--foreground-muted)] transition-colors hover:text-primary"
          >
            <Icon name="ArrowLeftIcon" size={14} /> Quay lại đăng nhập
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
