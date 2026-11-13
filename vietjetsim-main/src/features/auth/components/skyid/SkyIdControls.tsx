'use client';

import React from 'react';

/**
 * Bộ nút phụ và đường ngăn cách của SkyID.
 *
 * Số đo (13/11/2026, DOM sống `skyjoy-id.vietjetair.com`):
 *   - `.gid-content .btn`: `border-radius:8px!important`, `height:32px`.
 *   - Nút social trong luồng SkyID dùng nền trắng, viền `#E8EBEF`.
 *   - `.gid-resend-otp` / `.gid-alert`: `14px/22px`, `margin-top:4px`.
 */

export interface SkyIdSocialButtonsProps {
  appleEnabled: boolean;
  googleEnabled: boolean;
  onApple: () => void;
  onGoogle: () => void;
}

export function SkyIdSocialButtons({
  appleEnabled,
  googleEnabled,
  onApple,
  onGoogle,
}: SkyIdSocialButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onApple}
        disabled={!appleEnabled}
        title={
          appleEnabled ? 'Đăng nhập bằng Apple ID' : 'Đăng nhập bằng Apple ID chưa được cấu hình'
        }
        className="vj-skyid-btn-ghost"
      >
        Apple
      </button>
      <button
        type="button"
        onClick={onGoogle}
        disabled={!googleEnabled}
        title={googleEnabled ? 'Đăng nhập bằng Google' : 'Đăng nhập bằng Google chưa được cấu hình'}
        className="vj-skyid-btn-ghost"
      >
        Google
      </button>
    </div>
  );
}

/** Dòng nhắc nhở lỗi — `.gid-custom-server-error` / `.gid-alert`. */
export function SkyIdErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-2 text-sm leading-[22px]"
      style={{ color: 'var(--vj-skyid-border-error)' }}
    >
      {message}
    </p>
  );
}

/** Dòng gợi ý mã thử nghiệm khi chưa cấu hình SMS gateway. */
export function SkyIdDevHint({ hint }: { hint: string }) {
  if (!hint) return null;
  return (
    <p className="mt-2 rounded-md border border-[var(--vj-skyid-border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--vj-skyid-ink)]">
      {hint}
    </p>
  );
}
