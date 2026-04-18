import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HeroSection from '@/app/homepage/components/HeroSection';

describe('HeroSection Banner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the initial banner text', async () => {
    render(<HeroSection />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText('BAY VIETJETSIM NHẬN LỘC VÀNG')).toBeInTheDocument();
    expect(
      screen.getByText('Mua vé từ 03/03/2026 đến 19/05/2026 để nhận thưởng')
    ).toBeInTheDocument();
  });

  it('changes active banner when dot indicator is clicked', async () => {
    render(<HeroSection />);
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // There are 4 banners. Wait, get all dot indicators.
    const dotIndicators = screen.getAllByRole('button', { name: /Banner/i });
    expect(dotIndicators).toHaveLength(4);

    // Click the second dot
    fireEvent.click(dotIndicators[1]);

    // The second banner text should now be visible (and the others are hidden by opacity, but technically in the DOM).
    // Let's verify that the active class is applied to the dot indicator
    expect(dotIndicators[1]).toHaveClass('bg-white', 'w-6', 'h-2.5');
    expect(dotIndicators[0]).toHaveClass('bg-white/50');
  });

  it('automatically changes banner after 4500ms', async () => {
    render(<HeroSection />);
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const dotIndicators = screen.getAllByRole('button', { name: /Banner/i });

    // Initially, first dot is active
    expect(dotIndicators[0]).toHaveClass('bg-white', 'w-6', 'h-2.5');

    // Advance time by 4500ms
    act(() => {
      vi.advanceTimersByTime(4500);
    });

    // Second dot should now be active
    expect(dotIndicators[1]).toHaveClass('bg-white', 'w-6', 'h-2.5');
    expect(dotIndicators[0]).toHaveClass('bg-white/50');
  });
});
