'use client';

import React from 'react';
import { OTP_LENGTH } from '@/lib/skyjoy';
import { SkyIdPinInput } from '../SkyIdFields';
import { SkyIdDevHint } from '../SkyIdControls';

/**
 * Bước xác thực mã OTP — dùng chung cho đăng ký và đăng nhập không mật khẩu.
 *
 * Số đo (13/11/2026, DOM sống `skyjoy-id.vietjetair.com`):
 *   - Sáu ô `input.pin-otp`: cao `35px`, rộng tối đa `35px`, bo góc `11px`,
 *     gạch chân dưới `linear-gradient(#000,#000) center bottom 5px/30% 2px`.
 *   - Chữ của ô là `25px`, canh giữa, font đẳng khoảng.
 *   - Dòng `.gid-resend-otp`: `14px/22px`.
 *
 * `OTP_LENGTH` lấy từ `@/lib/skyjoy` để số ô và độ dài mã luôn khớp với
 * những nơi khác sinh mã (API `/api/xac-thuc/otp`).
 */

export interface OtpStepProps {
  /** Nơi mã đã được gửi tới — hiển thị trong câu dẫn. */
  destination: string;
  /** Mã thử nghiệm khi chưa cấu hình SMS gateway. */
  hint?: string;
  code: string;
  onCodeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
  /** Nhãn của nút quay lại — khác nhau giữa đăng ký và đăng nhập. */
  backLabel: string;
  loading: boolean;
  /** `id` gốc của ô nhập đầu tiên, để `autoComplete="one-time-code"` khớp. */
  inputId?: string;
  /**
   * Số giây còn lại phải chờ trước khi được gửi lại mã.
   *
   * `0` nghĩa là có thể gửi lại ngay. Đồng hồ do bước cha
   * (`useResendCountdown` trong `SkyIdAuthFlow`) giữ nên không bị reset mỗi lần
   * bước này render lại.
   */
  resendCooldown?: number;
  /** Được gọi khi người dùng bấm "Gửi lại mã" và hết thời gian chờ. */
  onResend?: () => void;
}

export default function OtpStep({
  destination,
  hint,
  code,
  onCodeChange,
  onSubmit,
  onBack,
  backLabel,
  loading,
  inputId = 'skyid-otp',
  resendCooldown = 0,
  onResend,
}: OtpStepProps) {
  const secondsLeft = Math.max(0, resendCooldown);
  const canResend = secondsLeft <= 0 && !loading && typeof onResend === 'function';

  return (
    <form onSubmit={onSubmit} noValidate>
      <p className="text-sm leading-[22px] text-[var(--vj-skyid-muted)]">
        Mã xác thực gồm {OTP_LENGTH} chữ số đã được gửi tới{' '}
        <span className="font-bold text-[var(--vj-skyid-ink)]">{destination}</span>. Quý khách vui
        lòng kiểm tra tin nhắn (hoặc mục Spam/Rác) và nhập mã để hoàn tất.
      </p>
      <SkyIdDevHint hint={hint ?? ''} />
      <div className="mt-4">
        <SkyIdPinInput
          length={OTP_LENGTH}
          value={code}
          onChange={(v) => onCodeChange(v.replace(/[^\d]/g, ''))}
          id={inputId}
        />
      </div>
      <div className="mt-5 flex flex-col items-center gap-3">
        <button type="button" onClick={onBack} className="vj-skyid-link">
          {backLabel}
        </button>
        <button type="submit" disabled={loading} className="vj-skyid-btn">
          {loading ? 'Đang xác nhận…' : 'Xác nhận'}
        </button>
      </div>
      {onResend ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            className="vj-skyid-resend"
            onClick={onResend}
            disabled={!canResend}
            aria-live="polite"
          >
            {secondsLeft > 0 ? `Gửi lại mã (${secondsLeft}s)` : 'Gửi lại mã'}
          </button>
        </div>
      ) : null}
    </form>
  );
}
