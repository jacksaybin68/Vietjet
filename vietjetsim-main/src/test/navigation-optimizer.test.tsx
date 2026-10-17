/**
 * `NavigationOptimizer` tải trước vài route ở lúc rảnh. Danh sách của nó từng có
 * `/dat-ve` — nhưng không tồn tại route `/dat-ve`; chỉ có route động `/dat-ve/[id]`.
 * Ở `next dev` chuyện đó im lặng, còn ở `next build` mỗi trang đều phát một RSC
 * fetch `GET /dat-ve?_rsc=…` trả **404** (đo bằng Chrome headless trên bản
 * production: 13 trang, 13 lần 404).
 *
 * Test này ghim đúng danh sách prefetch, để một route động (không có trang tĩnh
 * nào để tải trước) không lọt vào đó lần nữa.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const prefetchMock = vi.fn();

// Ghi đè mock `next/navigation` trong setup bằng bản bắt được lời gọi prefetch.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: prefetchMock }),
}));

import NavigationOptimizer from '@/shared/components/layouts/NavigationOptimizer';

function prefetchedRoutes(): string[] {
  return prefetchMock.mock.calls.map(([route]) => route as string);
}

describe('NavigationOptimizer', () => {
  beforeEach(() => {
    prefetchMock.mockClear();
    // jsdom không có requestIdleCallback; chạy callback ngay để test tất định.
    Object.defineProperty(window, 'requestIdleCallback', {
      value: (cb: () => void) => {
        cb();
        return 0;
      },
      configurable: true,
      writable: true,
    });
  });

  it('chỉ prefetch các route tĩnh có trang thật', async () => {
    render(<NavigationOptimizer />);

    await waitFor(() => expect(prefetchMock).toHaveBeenCalled());
    expect(prefetchedRoutes()).toEqual(['/trang-chu', '/tim-ve', '/tai-khoan']);
  });

  it('không prefetch route động `/dat-ve` (chỉ có `/dat-ve/[id]`)', async () => {
    render(<NavigationOptimizer />);

    await waitFor(() => expect(prefetchMock).toHaveBeenCalled());
    const routes = prefetchedRoutes();

    expect(routes).not.toContain('/dat-ve');
    // Không route nào chứa tham số động — không có trang tĩnh để tải trước.
    expect(routes.some((route) => route.includes('['))).toBe(false);
  });
});
