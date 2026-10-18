import React from 'react';

/**
 * Wrapper section chuẩn hoá cho các trang công khai.
 *
 * Dùng padding-block theo scale spacing (clamp từ 2.75rem → 4.5rem tùy viewport)
 * và background `--surface`. Không thêm màu hex cục bộ.
 */
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  muted?: boolean;
}

export default function Section({ children, className = '', muted = false }: SectionProps) {
  return (
    <section
      className={`relative overflow-hidden bg-[var(--surface)] px-4 pb-[clamp(2.75rem,5vw,4.5rem)] pt-[clamp(2.75rem,5vw,4.5rem)] ${muted ? 'bg-[#f7f7f7]' : ''} ${className}`}
    >
      {children}
    </section>
  );
}

Section.displayName = 'Section';
