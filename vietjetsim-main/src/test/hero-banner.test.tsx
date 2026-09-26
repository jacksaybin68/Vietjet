import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroSection from '@/app/trang-chu/components/HeroSection';

describe('HeroSection Banner', () => {
  it('renders the flight search form', () => {
    render(<HeroSection />);
    expect(screen.getByText('Bay là thích ngay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tìm chuyến bay/i })).toBeInTheDocument();
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
    expect(screen.getByText('Đặt chuyến đi & Mua SkyJoy')).toBeInTheDocument();
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
    expect(groups[0]).toHaveClass('divide-[#e4e4e4]', 'sm:divide-x');
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
