'use client';

import React from 'react';

/**
 * Trường nhập liệu chuẩn hoá với label nổi (floating label), trạng thái focus và
 * lỗi validation. Dùng token màu từ `tailwind.config.js` / `tailwind.css`,
 * không thêm hex cục bộ.
 *
 * - `label` — nhãn hiển thị.
 * - `error` — nếu có, viền và thông báo hiện màu đỏ brand.
 * - `required` — hiển thị dấu hoa thị đỏ bên cạnh label.
 */
interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export default function InputField({
  label,
  error,
  required,
  helperText,
  className = '',
  id,
  ...props
}: InputFieldProps) {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const hasError = error ? true : false;

  return (
    <div className={`relative space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className={`block text-[10px] font-bold uppercase leading-none tracking-[0.06em] transition-colors ${
            hasError ? 'text-[var(--primary-dark)]' : 'text-[#6c6c6c]'
          } ${required ? 'font-extrabold' : ''}`}
        >
          {label}
          {required && <span className="ml-0.5 text-[var(--primary-dark)]">*</span>}
        </label>
      )}

      <input
        id={fieldId}
        aria-invalid={hasError || undefined}
        aria-errormessage={hasError ? `${fieldId}-error` : undefined}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-base font-extrabold text-[#222222] bg-transparent outline-none transition-colors focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)] focus-within:bg-[#fffdf3] ${
          hasError
            ? 'border-[var(--primary-dark)] focus-within:border-[var(--primary-dark)]'
            : 'border-[#e4e4e4]'
        } ${className}`}
        {...props}
      />

      {hasError && (
        <p
          id={`${fieldId}-error`}
          className="text-[11px] font-bold text-[var(--primary-dark)]"
          role="alert"
        >
          {error}
        </p>
      )}

      {helperText && !hasError && (
        <p className="text-[11px] font-medium text-[#6c6c6c]">{helperText}</p>
      )}
    </div>
  );
}

InputField.displayName = 'InputField';
