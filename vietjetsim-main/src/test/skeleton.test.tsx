import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Skeleton, { type SkeletonRounded } from '@/shared/components/ui/Skeleton';

/**
 * Primitive `Skeleton` (Phase 1 — Mục 3).
 *
 * Hạt này được 188 chỗ trong `SkeletonLoader.tsx` dùng lại, và `scripts/ui-check.cjs`
 * nhận diện skeleton bằng chính các class `.skeleton-*` — nên test khoá cả hai:
 * class của hạt và API cũ (`rounded` / `accent`) mà các skeleton ghép vẫn gọi.
 */
function renderSkeleton(ui: React.ReactElement) {
  return render(ui).container.firstElementChild as HTMLElement;
}

describe('Skeleton primitive', () => {
  it('mặc định là khối trang trí xám, bo tròn, ẩn khỏi a11y tree', () => {
    const el = renderSkeleton(<Skeleton />);
    expect(el.className).toContain('skeleton-pulse');
    expect(el.className).toContain('skeleton-base');
    expect(el.className).toContain('rounded-full');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('map đủ thang bo góc', () => {
    const cases: Array<[SkeletonRounded, string]> = [
      ['sm', 'rounded-sm'],
      ['md', 'rounded-md'],
      ['lg', 'rounded-lg'],
      ['xl', 'rounded-xl'],
      ['2xl', 'rounded-2xl'],
      ['full', 'rounded-full'],
    ];
    for (const [rounded, expected] of cases) {
      expect(renderSkeleton(<Skeleton rounded={rounded} />).className).toContain(expected);
    }
  });

  it('nhận variant="accent" và vẫn nhận alias `accent` cũ', () => {
    expect(renderSkeleton(<Skeleton variant="accent" />).className).toContain('skeleton-accent');
    expect(renderSkeleton(<Skeleton accent />).className).toContain('skeleton-accent');
    // `variant` thắng khi cả hai cùng được truyền.
    expect(renderSkeleton(<Skeleton variant="base" accent />).className).toContain('skeleton-base');
  });

  it('nối className của caller và chuyển tiếp props còn lại', () => {
    const el = renderSkeleton(<Skeleton className="h-4 w-10" data-testid="sk" />);
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-10');
    expect(el.getAttribute('data-testid')).toBe('sk');
  });

  it('cho phép caller ghi đè aria-hidden khi khối không thuần trang trí', () => {
    const el = renderSkeleton(<Skeleton aria-hidden={false} />);
    expect(el.getAttribute('aria-hidden')).toBe('false');
  });
});
