'use client';

import React from 'react';

/**
 * Thẻ chính chuẩn hoá dùng cho các card dịch vụ, điểm đến, ưu đãi trên giao diện
 * công khai. Viền, bo góc, bóng và hiệu ứng hover đều dùng token, không hex cục bộ.
 */
interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div
      className={`relative border border-[var(--border)] rounded-lg bg-[var(--background)] shadow-sm transition-all duration-160 ${
        hover
          ? 'hover:border-[rgba(236,32,41,0.28)] hover:shadow-[0_12px_30px_rgba(26,41,72,0.12)] hover:-translate-y-1'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

Card.displayName = 'Card';
