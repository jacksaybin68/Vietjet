import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: { value: '/trang-chu' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock.value,
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

import MobileBottomNav, { BOTTOM_NAV_HEIGHT } from '@/shared/components/navigation/MobileBottomNav';

const TABS = [
  ['Đặt vé', '/trang-chu#hero-booking-form'],
  ['Chuyến của tôi', '/chuyen-bay-cua-toi'],
  ['Hành lý & chỗ', '/dich-vu?service=baggage'],
  ['Check-in', '/lam-thu-tuc'],
] as const;

describe('MobileBottomNav', () => {
  it('offers the four tasks a traveller reaches for most', () => {
    pathnameMock.value = '/trang-chu';
    render(<MobileBottomNav />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(TABS.map(([, href]) => href));
    TABS.forEach(([label]) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('marks exactly the tab matching the current route', () => {
    pathnameMock.value = '/lam-thu-tuc';
    render(<MobileBottomNav />);

    const current = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Check-in');
  });

  // A query string must not break the active state: the baggage tab lives at
  // `/dich-vu?service=baggage`, so matching on the href verbatim would leave it
  // unhighlighted on its own page.
  it('keeps the baggage tab active on its own service page', () => {
    pathnameMock.value = '/dich-vu';
    render(<MobileBottomNav />);

    const current = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Hành lý & chỗ');
  });

  // The sign-in and admin screens have their own fixed furniture, and a
  // navigation bar on top of it would cover the form.
  it.each(['/dang-nhap', '/quan-tri', '/quen-mat-khau'])('stays out of the way on %s', (path) => {
    pathnameMock.value = path;
    const { container } = render(<MobileBottomNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives every tab a full-height tap target', () => {
    pathnameMock.value = '/trang-chu';
    render(<MobileBottomNav />);

    // The bar is fixed to the viewport edge, so a short bar or a short link
    // makes the bottom rows hard to hit on a phone.
    expect(BOTTOM_NAV_HEIGHT).toBeGreaterThanOrEqual(56);
    screen.getAllByRole('link').forEach((link) => {
      expect(link.className).toContain(`min-h-[56px]`);
    });
  });
});
