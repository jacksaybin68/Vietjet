'use client';

import React from 'react';
import Link from 'next/link';
import { SkyIdField } from '../SkyIdFields';

/**
 * Bước đăng ký — họ / tên, ngày sinh, email, mã giới thiệu và ô đồng ý.
 *
 * Số đo (13/11/2026, DOM sống `skyjoy-id.vietjetair.com`):
 *   - Tiêu đề `18px/700`.
 *   - Ô nhập cao `32px`, nhãn nổi `16px/500`.
 *   - Ngày sinh là ba `select` cạnh nhau trong một khung viền `32px`.
 *   - Checkbox đồng ý `18×18px`, viền `2px solid #C4C4C4`, khi tick bo góc
 *     `4px` và hiện `ic_checked.svg`.
 */

export interface RegisterStepProps {
  surname: string;
  onSurnameChange: (value: string) => void;
  givenName: string;
  onGivenNameChange: (value: string) => void;
  birthDay: string;
  onBirthDayChange: (value: string) => void;
  birthMonth: string;
  onBirthMonthChange: (value: string) => void;
  birthYear: string;
  onBirthYearChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  referralCode: string;
  onReferralCodeChange: (value: string) => void;
  agree: boolean;
  onAgreeChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading: boolean;
}

/** Danh sách năm sinh, từ năm hiện tại ngược về 1900. */
function buildBirthYears(currentYear: number): number[] {
  return Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);
}

export default function RegisterStep({
  surname,
  onSurnameChange,
  givenName,
  onGivenNameChange,
  birthDay,
  onBirthDayChange,
  birthMonth,
  onBirthMonthChange,
  birthYear,
  onBirthYearChange,
  email,
  onEmailChange,
  referralCode,
  onReferralCodeChange,
  agree,
  onAgreeChange,
  onSubmit,
  loading,
}: RegisterStepProps) {
  const birthYears = buildBirthYears(new Date().getFullYear());

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SkyIdField
          id="skyid-surname"
          label="Họ"
          value={surname}
          onChange={onSurnameChange}
          autoComplete="family-name"
          placeholder="NGUYEN"
        />
        <SkyIdField
          id="skyid-given-name"
          label="Tên đệm và tên"
          value={givenName}
          onChange={onGivenNameChange}
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
            onChange={(e) => onBirthDayChange(e.target.value)}
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
            onChange={(e) => onBirthMonthChange(e.target.value)}
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
            onChange={(e) => onBirthYearChange(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-[var(--vj-skyid-ink)] outline-none"
          >
            <option value="">Năm</option>
            {birthYears.map((y) => (
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
        onChange={onEmailChange}
        autoComplete="email"
        placeholder="email@example.com"
      />

      <SkyIdField
        id="skyid-referral"
        label="Mã giới thiệu SkyJoy (nếu có)"
        value={referralCode}
        onChange={onReferralCodeChange}
        placeholder="SJ12345678"
      />

      <label className="flex cursor-pointer select-none items-start gap-2 pt-1 text-xs text-[var(--vj-skyid-muted)]">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => onAgreeChange(e.target.checked)}
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
  );
}
