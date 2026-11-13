'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { requestPasswordReset } from '@/features/auth';
import { getApiErrorMessage } from '@/shared/services';
import SkyIdShell from '../../SkyIdShell';
import { SkyIdField } from '../SkyIdFields';
import { SkyIdErrorNote } from '../SkyIdControls';

/**
 * Màn "Quên mật khẩu?" — dựng lại theo giao diện SkyID thật.
 *
 * Số đo (13/11/2026, `skyjoy-id.vietjetair.com`):
 *   - Tiêu đề `18px/700` căn giữa, dòng phụ `14px/22px #7B7B7B`.
 *   - Ô nhập cao `32px`, nhãn nổi `16px/500` đè lên viền.
 *   - Nút CTA gradient vàng, chữ `#333`, bo góc `8px`.
 *   - Chân trang "Được cung cấp và xác thực bởi SkyJoy ID" + 3 logo.
 *
 * Nghiệp vụ giữ nguyên: `requestPasswordReset` gọi
 * `POST /api/xac-thuc/quen-mat-khau`, token dùng một lần và băm trong
 * `account_recovery` (`src/lib/password-reset.ts`).
 */
export default function SkyIdForgotPassword() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || undefined;

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [directResetUrl, setDirectResetUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await requestPasswordReset(identifier.trim());
        setSent(true);
        toast.success(
          'Đã gửi liên kết',
          `Liên kết đặt lại mật khẩu đã được gửi tới ${identifier.trim()}`
        );
        // Server chỉ kèm link khi chạy ngoài production (không có hộp thư để nhận).
        if (result.resetUrl) setDirectResetUrl(result.resetUrl);
      } catch (err) {
        const msg = getApiErrorMessage(err, 'Không thể gửi yêu cầu. Vui lòng thử lại.');
        setError(msg);
        toast.error('Lỗi gửi yêu cầu', msg);
      } finally {
        setLoading(false);
      }
    })();
  };

  if (sent) {
    return (
      <SkyIdShell title="Đã gửi liên kết" subtitle="Vui lòng kiểm tra hộp thư đến của bạn.">
        <p className="text-sm leading-[22px] text-[var(--vj-skyid-muted)]">
          Nếu thông tin khớp với một tài khoản, liên kết đặt lại mật khẩu đã được gửi tới{' '}
          <span className="font-bold text-[var(--vj-skyid-ink)]">{identifier}</span>. Liên kết có
          hiệu lực trong 30 phút.
        </p>

        {directResetUrl ? (
          <div className="mt-4 rounded-md border border-[var(--vj-skyid-border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--vj-skyid-ink)]">
            <p className="font-semibold">Môi trường phát triển — mở trực tiếp:</p>
            <Link href={directResetUrl} className="vj-skyid-link mt-1 inline-block font-semibold">
              Mở liên kết đặt lại mật khẩu →
            </Link>
          </div>
        ) : null}

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (redirectTo) {
                router.push(redirectTo);
                return;
              }
              router.push('/dang-nhap');
            }}
            className="vj-skyid-btn"
          >
            Về trang đăng nhập
          </button>
        </div>
      </SkyIdShell>
    );
  }

  return (
    <SkyIdShell
      title="Quên mật khẩu?"
      subtitle="Nhập email hoặc số điện thoại đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
    >
      <form onSubmit={handleSubmit} noValidate>
        <SkyIdErrorNote message={error} />

        <SkyIdField
          id="skyid-forgot-identifier"
          label="Email hoặc số điện thoại"
          value={identifier}
          onChange={setIdentifier}
          autoComplete="username"
          placeholder="Nhập email hoặc số điện thoại"
        />

        <div className="mt-5 flex justify-center">
          <button type="submit" disabled={loading || !identifier.trim()} className="vj-skyid-btn">
            {loading ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/dang-nhap" className="vj-skyid-link">
            Quay lại đăng nhập
          </Link>
        </div>
      </form>
    </SkyIdShell>
  );
}
