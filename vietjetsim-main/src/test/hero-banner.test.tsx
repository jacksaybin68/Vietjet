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
  //
  // Màn SkyID (13/11/2026) đã bỏ `AuthShell.tsx`: `/dang-nhap`, `/dang-ky`,
  // `/quen-mat-khau` và `/dat-lai-mat-khau` giờ dùng `SkyIdShell` — trang đứng
  // riêng, không có `<Header />`. Danh sách nên dừng ở 11 route render chrome.
  const chromeRenderingFiles = [
    ...fs
      .readdirSync(appDir, { recursive: true, encoding: 'utf-8' })
      .filter((e) => e.endsWith('page.tsx')),
  ].filter((entry) => /<Header[\s/>]/.test(sourceOf(entry)));

  it('scans every surface that renders the shared header', () => {
    expect(chromeRenderingFiles.length).toBeGreaterThanOrEqual(11);
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

  // Site thật đặt nhãn sân bay là "Điểm khởi hành" / "Điểm đến" (18px/600),
  // không phải "Từ" / "Đến" — xem số đo ngày 13/11/2026.
  it('renders airport selectors', () => {
    render(<HeroSection />);
    expect(screen.getByText('Điểm khởi hành')).toBeInTheDocument();
    expect(screen.getByText('Điểm đến')).toBeInTheDocument();
  });

  // Ba tab dịch vụ phía trên panel, rộng 201 / 103 / 76px, cao 52px.
  it('renders the booking bar chrome of the production site', () => {
    render(<HeroSection />);
    expect(
      screen.getByText('Mua hành lý, suất ăn chọn chỗ ngồi và hơn thế nữa...')
    ).toBeInTheDocument();
    expect(screen.getByText('Đổi thưởng & Mua Skypoint')).toBeInTheDocument();
    expect(screen.getByText('Gửi hàng nhanh')).toBeInTheDocument();
    expect(screen.getByText('Hành khách')).toBeInTheDocument();
    expect(screen.getByText('Tìm vé rẻ nhất')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đổi điểm khởi hành/i })).toBeInTheDocument();
  });

  // Ô nhập của panel là các hộp 48px xếp dọc trong thân form 410px, mỗi hộp có
  // nhãn và giá trị riêng — không phải một hàng ngang 4 cột như bố cục cũ.
  it('stacks the booking fields vertically inside the panel body', () => {
    const { container } = render(<HeroSection />);
    const field = container.querySelector('.vj-booking-panel .h-\\[48px\\]');
    expect(field).not.toBeNull();
  });

  it('lets the customer pick one-way and round-trip trips', () => {
    render(<HeroSection />);
    const oneWay = screen.getByRole('radio', { name: 'Một chiều' });
    expect(oneWay).not.toBeChecked();
    fireEvent.click(oneWay);
    expect(oneWay).toBeChecked();
  });
});
