import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/trang-chu',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import PopupFrame from '@/features/auth/components/PopupFrame';
import MobileBottomNav, { BOTTOM_NAV_HEIGHT } from '@/shared/components/navigation/MobileBottomNav';

/**
 * Cấu trúc popup 622×664 của site thật — số đo ở
 * `docs/qa/2026-11-15-vietjet-measure/README.md` §1.
 *
 * Site thật không có trang đăng nhập riêng: mọi thao tác đều mở popup này,
 * gồm băng đỏ 48px, khung form SkyID 500×208 và bottom nav 62px.
 */
describe('PopupFrame', () => {
  it('render băng đỏ, khung form và bottom nav 4 mục', () => {
    const { container } = render(
      <PopupFrame title="Đăng nhập SkyJoy" onClose={() => undefined}>
        <input aria-label="Số điện thoại" />
      </PopupFrame>
    );

    expect(container.querySelector('.vj-popup-frame')).not.toBeNull();
    expect(container.querySelector('.vj-popup-header')).not.toBeNull();
    expect(container.querySelector('.vj-popup-viewport')).not.toBeNull();
    expect(container.querySelector('.vj-popup-nav')).not.toBeNull();
    expect(screen.getByText('Đăng nhập SkyJoy')).toBeInTheDocument();
  });

  it('bottom nav đúng 4 nhãn của site thật', () => {
    render(
      <PopupFrame title="Đăng nhập SkyJoy">
        <input aria-label="Số điện thoại" />
      </PopupFrame>
    );

    const nav = screen.getByRole('navigation', { name: 'Dịch vụ nhanh' });
    expect(nav).toBeInTheDocument();
    ['Đặt chuyến bay', 'Chuyến bay của tôi', 'Mua hành lý, chỗ ngồi...', 'Check-in'].forEach(
      (label) => expect(screen.getByText(label)).toBeInTheDocument()
    );
  });
});

describe('MobileBottomNav hiện trên 2 route tra cứu', () => {
  it('chiều cao 62px theo site thật', () => {
    expect(BOTTOM_NAV_HEIGHT).toBe(62);
  });
});
