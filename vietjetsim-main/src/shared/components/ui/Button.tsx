'use client';

import React from 'react';

/**
 * Nút bấm chuẩn hoá cho giao diện công khai.
 *
 * - `variant="primary"` — màu đỏ brand, dùng cho hành động chính trên nền trắng.
 * - `variant="gold"` — nền vàng gradients, dùng cho CTA chính ("Tìm chuyến bay").
 * - `variant="outline"` — viền đỏ, nền trong, dùng cho hành động phụ nổi bật.
 * - `variant="ghost"` — không nền, không viền, dùng cho hành động nhẹ.
 *
 * Kích thước chuẩn: `sm` (34px), `md` (44px), `lg` (52px). Tuân theo thang spacing
 * 4/8/12/16/24/32/48/64/96 và token màu ở `tailwind.config.js` +
 * `src/styles/tailwind.css`. Không thêm hex cục bộ.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:shadow-[0_0_20px_rgba(236,32,41,0.35)]',
  gold: 'bg-[var(--accent)] text-[#333333] hover:brightness-105 hover:shadow-[0_0_20px_rgba(255,221,0,0.35)]',
  outline:
    'border border-[var(--primary)] text-[var(--primary)] bg-transparent hover:bg-[var(--primary)] hover:text-white',
  ghost: 'text-[var(--foreground-muted)] hover:text-[var(--primary)] bg-transparent',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-12 px-4 text-sm',
  lg: 'h-[52px] px-5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-lg font-bold transition-all duration-160 ease-outline disabled:opacity-60 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        children
      )}
    </button>
  );
}

Button.displayName = 'Button';
