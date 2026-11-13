'use client';

import React from 'react';

/**
 * Các ô nhập dùng chung cho bộ SkyID.
 *
 * Số đo lấy từ DOM sống của `skyjoy-id.vietjetair.com` (13/11/2026):
 *   - `.form-label`: `position:absolute; left:0; top:10px`, `16px/12px`,
 *     `font-weight:500`, `#333`, `padding-left:10px` — nhãn nổi ngay trên
 *     viền ô nhập, KHÔNG nổi lên khi có giá trị (không có rule float).
 *   - `input.form-control`: cao `32px`, `padding:5px 10px`, bo góc `4px`,
 *     viền `1px solid #E8EBEF`, `box-shadow:0 4px 20px rgba(0,0,0,.15)`.
 *   - `input.form-control:focus`: viền `#FFDB01`, bóng đổ bằng `none`.
 *   - `input.form-control-error`: viền `#E60A32`.
 *   - `input::placeholder`: `#C4C4C4`.
 *   - `.iti__selected-flag`: rộng `90px`.
 */

export interface SkyIdFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'tel' | 'email' | 'password';
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  maxLength?: number;
  invalid?: boolean;
  /** Tiện ích hiển thị bên phải (nút hiện/ẩn mật khẩu). */
  trailing?: React.ReactNode;
  className?: string;
}

/** Ô nhập một dòng với nhãn nổi tuyệt đối trên viền. */
export function SkyIdField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  invalid = false,
  trailing,
  className = '',
}: SkyIdFieldProps) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="vj-skyid-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        className="vj-skyid-input"
        style={trailing ? { paddingRight: 52 } : undefined}
      />
      {trailing}
    </div>
  );
}

/** Ô nhập có cờ + mã quốc gia, đúng hàng của `intl-tel` trên site thật.
 *
 *  Trên site thật, `.iti__country-container` là khối `position:absolute` bám
 *  vào mép trái ô nhập (`left:0`, rộng 90px), còn ô nhập số bị đẩy sang phải
 *  (`x = 85px` so với mép khối) — và Nhãn nổi cũng nằm đúng ở `x = 85px`, tức
 *  ngay trên mép trái của vùng gõ số, KHÔNG đè lên cờ. Ở đây dựng lại đúng
 *  quan hệ đó: cờ + mã quốc gia tuyệt đối ở mép trái (rộng 85px), ô nhập
 *  đẩy sang `margin-left:85px`, nhãn ở `left:85px`.
 */
export interface SkyIdPhoneFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  flag: string;
  dial: string;
  /** Danh sách mã quốc gia (dropdown), đã bọc trong `role="listbox"`. */
  countryMenu?: React.ReactNode;
  /** Đang mở danh sách mã quốc gia hay không. */
  countryOpen?: boolean;
  onToggleCountry?: () => void;
  invalid?: boolean;
  autoComplete?: string;
  readOnly?: boolean;
  placeholder?: string;
}

export function SkyIdPhoneField({
  id,
  label,
  value,
  onChange,
  flag,
  dial,
  countryMenu,
  countryOpen = false,
  onToggleCountry,
  invalid = false,
  autoComplete = 'tel',
  readOnly = false,
  placeholder,
}: SkyIdPhoneFieldProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="vj-skyid-label vj-skyid-label-phone">
        {label}
      </label>
      <div className="vj-skyid-phone">
        <div className="vj-skyid-phone-menu">
          <button
            type="button"
            onClick={onToggleCountry}
            aria-expanded={countryOpen}
            aria-haspopup="listbox"
            aria-label="Chọn mã quốc gia"
          >
            <span aria-hidden="true">{flag}</span>
            <span>{dial}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {countryMenu}
        </div>
        <input
          id={id}
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          readOnly={readOnly}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className="vj-skyid-input vj-skyid-input-phone"
        />
      </div>
    </div>
  );
}

/** Bộ 6 ô nhập mã OTP — `input.pin-otp` của SkyID. */
export interface SkyIdPinInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function SkyIdPinInput({ length, value, onChange, id = 'skyid-otp' }: SkyIdPinInputProps) {
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Mã xác thực">
      {digits.map((digit, index) => {
        const isFilled = digit !== ' ';
        return (
          <input
            key={index}
            id={index === 0 ? id : `${id}-${index}`}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            value={isFilled ? digit : ''}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, '').slice(0, length);
              onChange(next);
            }}
            aria-label={`Chữ số thứ ${index + 1}`}
            className="vj-skyid-pin"
            style={isFilled ? undefined : { backgroundImage: 'none' }}
          />
        );
      })}
    </div>
  );
}
