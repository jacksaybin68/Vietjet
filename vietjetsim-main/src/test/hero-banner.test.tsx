import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import HeroSection from '@/app/trang-chu/components/HeroSection';

describe('RootLayout skip link (Phase 1 a11y)', () => {
  // The link is rendered by the root layout; the landmark it points at is not.
  // `<Header />` repeats at the top of every page, so a layout-level `<main>` — the
  // shape this test used to assert — wrapped the very navigation the link exists to
  // skip, and Tab landed back on the announcement bar. Each page now renders
  // `main#main-content` *after* its own `<Header />`.
  //
  // Asserting `layout.tsx` contains `id="main-content"` would still pass today: the
  // attribute survives in the comment that explains its removal. So the target is
  // checked where it now lives — by scanning the tree, and by pinning how many
  // surfaces the scan found, so an empty or shrunken scan fails instead of passing.
  it('layout renders the skip link tới nội dung chính', () => {
    const layoutSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'layout.tsx'), 'utf-8');
    expect(layoutSrc).toContain('href="#main-content"');
    expect(layoutSrc).toContain('Bỏ qua tới nội dung chính');
  });

  const appDir = path.join(__dirname, '..', 'app');
  const sourceOf = (entry: string) => fs.readFileSync(path.join(appDir, entry), 'utf-8');

  // Pages, plus the one shared shell outside `app/` that renders `<Header />` — it
  // carries `/dang-nhap`, `/quen-mat-khau` and `/dat-lai-mat-khau`, which are
  // standalone and so have no `<Header />` of their own. `src/app/page.tsx` only
  // re-exports the homepage, and `/hanh-ly` + `/lam-thu-tuc-truc-tuyen` are pure
  // `redirect()`s, so none of those renders chrome and none is expected here.
  const chromeRenderingFiles = [
    ...fs
      .readdirSync(appDir, { recursive: true, encoding: 'utf-8' })
      .filter((e) => e.endsWith('page.tsx')),
    '../features/auth/components/AuthShell.tsx',
  ].filter((entry) => /<Header[\s/>]/.test(sourceOf(entry)));

  it('scans every surface that renders the shared header', () => {
    expect(chromeRenderingFiles.length).toBeGreaterThanOrEqual(12);
  });

  it.each(chromeRenderingFiles)('%s: main#main-content follows <Header />', (entry) => {
    expect(sourceOf(entry)).toMatch(/<main[^>]*id="main-content"/);
  });
});

describe('HeroSection Banner', () => {
  it('renders the flight search form', () => {
    const { container } = render(<HeroSection />);
    expect(container.querySelector('#hero-booking-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tìm chuyến bay/i })).toBeInTheDocument();
  });

  // The campaign headline belongs to the hero artwork, so the only `<h1>` is the
  // screen-reader one — nothing is painted over the image (design feedback).
  it('paints no visible hero headline over the artwork', () => {
    const { container } = render(<HeroSection />);
    container.querySelectorAll('h1').forEach((heading) => {
      expect(heading).toHaveClass('sr-only');
    });
  });

  it('renders round-trip and one-way options', () => {
    render(<HeroSection />);
    expect(screen.getByText('Khứ hồi')).toBeInTheDocument();
    expect(screen.getByText('Một chiều')).toBeInTheDocument();
  });

  // Field copy follows vietjetair.com: nhãn ô nhập là "Từ" / "Đến" / "Ngày đi".
  it('renders airport selectors', () => {
    render(<HeroSection />);
    expect(screen.getByText('Từ')).toBeInTheDocument();
    expect(screen.getByText('Đến')).toBeInTheDocument();
  });

  it('renders the booking bar chrome of the production site', () => {
    render(<HeroSection />);
    expect(screen.getByText('Đặt vé')).toBeInTheDocument();
    expect(screen.getByText('Khách sạn')).toBeInTheDocument();
    expect(screen.getByText('Skyshop')).toBeInTheDocument();
    expect(screen.getByText('Đổi thưởng vé máy bay')).toBeInTheDocument();
    expect(screen.getByText('Hành khách')).toBeInTheDocument();
    expect(screen.getByText('Tìm vé rẻ nhất')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đổi điểm khởi hành/i })).toBeInTheDocument();
  });

  // Site thật: dải đặt vé là một thanh ngang — bốn ô (Từ, Đến, Ngày đi, Hành
  // khách) cạnh nhau trong cùng một hàng, không phải hai hàng xếp dọc.
  it('lays the four booking fields out in a single row', () => {
    const { container } = render(<HeroSection />);
    const grid = container.querySelector('.lg\\:grid-cols-\\[235px_235px_235px_235px_1fr\\]');
    expect(grid).not.toBeNull();
  });

  it('lets the customer pick one-way and round-trip trips', () => {
    render(<HeroSection />);
    const oneWay = screen.getByRole('button', { name: 'Một chiều' });
    expect(oneWay).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(oneWay);
    expect(oneWay).toHaveAttribute('aria-pressed', 'true');
  });
});
