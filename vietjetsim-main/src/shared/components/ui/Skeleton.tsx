import React from 'react';

/**
 * Primitive Skeleton — khối placeholder hiển thị trong lúc chờ dữ liệu.
 *
 * Đây là "hạt" duy nhất mà mọi skeleton ghép (`FlightCardSkeleton`,
 * `DealsSkeleton`, `SeatMapSkeleton`…) dựng lên; trước đây hạt này nằm lẫn ở đầu
 * `SkeletonLoader.tsx` nên không phải một primitive đúng nghĩa trong `ui/`.
 *
 * Component chỉ dùng utility có sẵn (`rounded-*`) và các class `skeleton-*` khai
 * báo ở `src/styles/tailwind.css`; không hard-code màu, không đặt cỡ chữ tuỳ ý —
 * nhờ vậy nó không làm tăng nợ CSS.
 *
 * Skeleton là thuần trang trí: mặc định `aria-hidden`, còn trạng thái chờ nên
 * được thông báo bằng `aria-busy` trên container thật thay vì mô tả từng khối.
 */

export type SkeletonRounded = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

/** `base` — xám trung tính; `accent` — ánh đỏ brand cho khối cần nhấn mạnh. */
export type SkeletonVariant = 'base' | 'accent';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Bo góc theo thang radius của Tailwind. Mặc định `full`. */
  rounded?: SkeletonRounded;
  /** Kiểu hoạt ảnh. Mặc định `base`. */
  variant?: SkeletonVariant;
  /**
   * Tương thích ngược với API cũ ở `SkeletonLoader.tsx`: `accent` tương đương
   * `variant="accent"`. Khi cả hai cùng có, `variant` được ưu tiên.
   */
  accent?: boolean;
}

const ROUNDED_CLASSES: Record<SkeletonRounded, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  base: 'skeleton-base',
  accent: 'skeleton-accent',
};

export default function Skeleton({
  rounded = 'full',
  variant,
  accent = false,
  className = '',
  'aria-hidden': ariaHidden = true,
  ...props
}: SkeletonProps) {
  const resolvedVariant: SkeletonVariant = variant ?? (accent ? 'accent' : 'base');

  return (
    <div
      aria-hidden={ariaHidden}
      className={`skeleton-pulse ${ROUNDED_CLASSES[rounded]} ${VARIANT_CLASSES[resolvedVariant]} ${className}`}
      {...props}
    />
  );
}

Skeleton.displayName = 'Skeleton';
