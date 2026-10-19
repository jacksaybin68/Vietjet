'use client';

import React from 'react';

/**
 * Nút icon nhỏ, dùng cho đóng/ mở overlay, prev/next carousel, toggle menu…
 * Kích thước chuẩn 34–40px,Focus rõ (gold outline + red ring) như chuẩn a11y.
 */
interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  label: string;
  size?: 'sm' | 'md';
  active?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
};

export default function IconButton({
  label,
  size = 'md',
  active = false,
  className = '',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg border border-transparent text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] hover:shadow-[0_0_20px_rgba(236,32,41,0.35)] transition-all duration-160 focus-visible:outline-[3px] focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[3px] ${sizeClasses[size]} ${active ? 'bg-[var(--accent)] text-[var(--foreground)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

IconButton.displayName = 'IconButton';
