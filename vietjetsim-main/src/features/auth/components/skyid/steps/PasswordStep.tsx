'use client';

import React from 'react';
import { SkyIdPhoneField } from '../SkyIdFields';
import { type SkyIdCountry } from './types';

/**
 * Bước 2 — nhập mật khẩu.
 *
 * Site thật hiển thị lại định danh đã nhập ở bước trước (ô bị khoá, không sửa
 * được) rồi mới có ô "Mật khẩu" — cùng hàng `32px`, nhãn nổi `16px/500`.
 *
 * Nút CTA gradient vàng, kèm đường "Quay lại" quay về bước nhập định danh.
 */

export interface PasswordStepProps {
  /** Định danh đã nhập, hiển thị lại ở dạng chỉ đọc. */
  identifier: string;
  /** Nhãn của ô định danh — số điện thoại hay email / mã hội viên. */
  identifierLabel: string;
  country: SkyIdCountry;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
  loading: boolean;
}

export default function PasswordStep({
  identifier,
  identifierLabel,
  country,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  onSubmit,
  onBack,
  loading,
}: PasswordStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <SkyIdPhoneField
        id="skyid-phone-echo"
        label={identifierLabel}
        value={identifier}
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
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Nhập mật khẩu"
          className="vj-skyid-input"
          style={{ paddingRight: 60 }}
        />
        <button
          type="button"
          onClick={onTogglePassword}
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
        <button type="button" onClick={onBack} className="vj-skyid-link">
          Quay lại
        </button>
      </div>
    </form>
  );
}
