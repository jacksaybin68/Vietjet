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

  // Field copy follows vietjetair.com ("Điểm khởi hành" / "Điểm đến") now that
  // the hero card mirrors the production booking widget.
  it('renders airport selectors', () => {
    render(<HeroSection />);
    expect(screen.getByText('Điểm khởi hành')).toBeInTheDocument();
    expect(screen.getByText('Điểm đến')).toBeInTheDocument();
  });

  it('renders the right-hand booking widget chrome', () => {
    render(<HeroSection />);
    expect(screen.getByText('Đổi thưởng & Mua SkyPoint')).toBeInTheDocument();
    expect(screen.getByText('Hành khách')).toBeInTheDocument();
    expect(screen.getByText('Tìm vé rẻ nhất')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đổi điểm khởi hành/i })).toBeInTheDocument();
  });

  // Airport and date sit in one bordered box split 2:1 by a `|` hairline, so the
  // group owns the border and each half is only a segment of it.
  it('pairs each airport with its date inside a single bordered box', () => {
    const { container } = render(<HeroSection />);
    const groups = container.querySelectorAll('[class*="sm:grid-cols-[2fr_1fr]"]');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveClass('sm:divide-x');
    expect(groups[0].className).toMatch(/divide-(?:\[#e4e4e4\]|\[var\(--border\)\]|#e4e4e4)/);
    expect(groups[0].querySelectorAll('label')).toHaveLength(2);
    expect(groups[1].querySelectorAll('label')).toHaveLength(2);
  });

  it('lets the destination fill the whole box on a one-way trip', () => {
    render(<HeroSection />);
    fireEvent.click(screen.getByLabelText('Một chiều'));
    // The airport picker owns its own <label>, so the grid span lives on the
    // element that is the actual grid child.
    const destination = screen.getByLabelText('Điểm đến').closest('div.relative');
    expect(destination).toHaveClass('sm:col-span-2');
  });

  it('keeps the compact "Gửi hàng nhanh" frame from stretching like a tab', () => {
    render(<HeroSection />);
    const cargo = screen.getByText('Gửi hàng nhanh');
    expect(cargo).toHaveClass('w-[72px]', 'shrink-0');
    expect(cargo).not.toHaveClass('flex-1');
  });
});
