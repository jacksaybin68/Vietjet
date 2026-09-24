import { render, screen } from '@testing-library/react';
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
});
