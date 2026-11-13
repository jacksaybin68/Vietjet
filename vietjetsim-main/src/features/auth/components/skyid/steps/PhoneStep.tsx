'use client';

import React from 'react';
import Link from 'next/link';
import { SkyIdField, SkyIdPhoneField } from '../SkyIdFields';
import { type IdentifierMode, type SkyIdCountry } from './types';

/**
 * Bước 1 — nhập số điện thoại (hoặc email / mã hội viên).
 *
 * Số đo (13/11/2026, DOM sống `skyjoy-id.vietjetair.com`):
 *   - Nhãn nổi `16px/500` đè lên viền ô nhập, ô nhập cao `32px`.
 *   - Cờ + mã quốc gia chiếm `90px` ở mép trái (`intl-tel`).
 *   - Nút CTA gradient vàng `min-width:160px`, `min-height:38px`.
 *   - Dòng "Bạn chưa có tài khoản? Đăng ký ngay" (`14px`, link `#2F6BFF`).
 *
 * Bước này có thêm hai đường vào không có trên site thật (tab chuyển kiểu
 * định danh, đăng nhập bằng OTP) — chúng là tiện ích nội bộ của dự án và
 * được giữ lại để không phá deep-link đã có.
 */

export interface PhoneStepProps {
  /** Chế độ đăng nhập hay đăng ký — đăng ký chỉ dùng số điện thoại. */
  mode: 'login' | 'register';
  identifierMode: IdentifierMode;
  onIdentifierModeChange: (mode: IdentifierMode) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  accountIdentifier: string;
  onAccountIdentifierChange: (value: string) => void;
  country: SkyIdCountry;
  countryOpen: boolean;
  onToggleCountry: () => void;
  countryMenu: React.ReactNode;
  /** Định danh đã chuẩn hoá, dùng để bật/tắt nút "Tiếp tục". */
  canContinue: boolean;
  onContinue: () => void;
  /** Gửi OTP đăng nhập không cần mật khẩu. */
  onSendLoginOtp: () => void;
  loading: boolean;
}

export default function PhoneStep({
  mode,
  identifierMode,
  onIdentifierModeChange,
  phone,
  onPhoneChange,
  accountIdentifier,
  onAccountIdentifierChange,
  country,
  countryOpen,
  onToggleCountry,
  countryMenu,
  canContinue,
  onContinue,
  onSendLoginOtp,
  loading,
}: PhoneStepProps) {
  return (
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
              onClick={() => onIdentifierModeChange(tab.id)}
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
          onChange={onPhoneChange}
          flag={country.flag}
          dial={country.dial}
          countryMenu={countryOpen ? countryMenu : null}
          countryOpen={countryOpen}
          onToggleCountry={onToggleCountry}
          placeholder="Nhập số điện thoại của bạn"
        />
      ) : (
        <SkyIdField
          id="skyid-account"
          label="Email hoặc mã hội viên SkyJoy"
          value={accountIdentifier}
          onChange={onAccountIdentifierChange}
          autoComplete="username"
          placeholder="Nhập email hoặc mã hội viên"
        />
      )}

      <div className="mt-5 flex justify-center">
        <button type="button" onClick={onContinue} disabled={!canContinue} className="vj-skyid-btn">
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
            onClick={onSendLoginOtp}
            disabled={loading || !canContinue}
            className="vj-skyid-link disabled:cursor-not-allowed disabled:text-[var(--vj-modal-disabled-ink)]"
          >
            Đăng nhập bằng mã OTP
          </button>
        </div>
      ) : null}
    </>
  );
}
