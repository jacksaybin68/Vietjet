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
  //
  // Từ 14/11/2026 `/chuyen-bay-cua-toi` dùng `SubpageHeader` (header TRẮNG
  // 74px của site thật) thay cho `Header` 4 tầng, nên danh sách quét cả hai.
  const chromeRenderingFiles = [
    ...fs
      .readdirSync(appDir, { recursive: true, encoding: 'utf-8' })
      .filter((e) => e.endsWith('page.tsx')),
  ].filter((entry) => /<(Header|SubpageHeader)[\s/>]/.test(sourceOf(entry)));

  it('scans every surface that renders the shared header', () => {
    expect(chromeRenderingFiles.length).toBeGreaterThanOrEqual(11);
  });

  it.each(chromeRenderingFiles)('%s: main#main-content follows the shared header', (entry) => {
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

  // Loại hành trình chỉ nằm TRONG popover lịch (đúng site thật: trang chủ
  // không có dải pill), nên phải mở lịch trước khi kiểm tra.
  it('renders round-trip and one-way options inside the calendar popover', () => {
    render(<HeroSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Ngày đi' }));
    expect(screen.getByText('Khứ hồi')).toBeInTheDocument();
    expect(screen.getByText('Một chiều')).toBeInTheDocument();
  });

  // Site thật đặt nhãn sân bay là "Từ" / "Đến" khi nhìn, còn tên truy cập là
  // "Điểm khởi hành" / "Điểm đến" (đo ngày 13/11/2026).
  it('renders airport selectors', () => {
    render(<HeroSection />);
    expect(screen.getByRole('button', { name: 'Điểm khởi hành' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Điểm đến' })).toBeInTheDocument();
    expect(screen.getByText('Từ')).toBeInTheDocument();
    expect(screen.getByText('Đến')).toBeInTheDocument();
  });

  // Rail dịch vụ 4 nút, đúng site thật (đo 14/11/2026): Đặt vé / Khách sạn /
  // Skyshop / Đổi thưởng vé máy bay.
  it('renders the booking bar chrome of the production site', () => {
    render(<HeroSection />);
    expect(screen.getByText('Đặt vé')).toBeInTheDocument();
    expect(screen.getByText('Khách sạn')).toBeInTheDocument();
    expect(screen.getByText('Skyshop')).toBeInTheDocument();
    expect(screen.getByText('Đổi thưởng vé máy bay')).toBeInTheDocument();
    expect(screen.getByText('Hành khách')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đổi điểm khởi hành/i })).toBeInTheDocument();
  });

  // Dải đặt vé là thanh NGANG 1200px gồm rail 4 tab + hàng tìm kiếm 1 hàng,
  // không phải panel dọc 380×409px như bố cục cũ.
  it('lays the booking fields out in one horizontal row', () => {
    const { container } = render(<HeroSection />);
    expect(container.querySelector('.vj-booking-rail')).not.toBeNull();
    expect(container.querySelector('.vj-booking-bar')).not.toBeNull();
    expect(container.querySelector('.vj-booking-fields')).not.toBeNull();
    // Ô nhập nằm ngang trong một lưới, không xếp dọc.
    expect(container.querySelector('.vj-booking-panel .h-\\[48px\\]')).toBeNull();
  });

  it('lets the customer pick one-way and round-trip trips', () => {
    render(<HeroSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Ngày đi' }));
    const oneWay = screen.getByRole('button', { name: 'Một chiều' });
    expect(oneWay).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(oneWay);
    expect(oneWay).toHaveAttribute('aria-pressed', 'true');
  });
});
