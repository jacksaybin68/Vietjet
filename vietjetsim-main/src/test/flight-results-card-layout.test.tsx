import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { searchFlightsForUi } = vi.hoisted(() => ({ searchFlightsForUi: vi.fn() }));

vi.mock('@/features/flights/services', () => ({
  searchFlightsForUi,
  getAirportCity: (code: string) => (code === 'HAN' ? 'Hà Nội' : 'TP.HCM'),
}));

import FlightResultsStep from '@/features/flights/components/FlightResultsStep';

const flights = [
  {
    id: 'f-1',
    flightNo: 'VJ301',
    airline: 'Vietjet Air',
    departTime: '06:00',
    arriveTime: '08:25',
    duration: '2h 25m',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP.HCM',
    price: 899000,
    stops: 0,
    cabin: 'economy' as const,
  },
];

describe('FlightResultsStep — card bố cục 1 hàng ngang', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchFlightsForUi.mockResolvedValue(flights);
  });

  const renderResults = async () => {
    render(
      <FlightResultsStep
        onSelect={vi.fn()}
        search={{ from: 'HAN', to: 'SGN', depart: '2026-09-26' }}
        pax="1"
      />
    );
    await waitFor(() => expect(screen.getByTestId('flight-result-card')).toBeInTheDocument());
    return screen.getByTestId('flight-result-card');
  };

  // Điều chỉnh từ phản hồi UI: card kết quả xếp dọc ở viewport 1219px vì bố cục
  // hàng ngang chỉ bật từ `xl` (1280px) — trong khi cột kết quả chỉ rộng ~480px
  // từ `lg` trở lên, nên phải bật hàng ngang ngay tại `lg`.
  it('bật bố cục hàng ngang từ lg, không phải xl', async () => {
    const card = await renderResults();
    expect(card.className).toContain('lg:flex-row');
    expect(card.className).not.toContain('xl:flex-row');
  });

  it('khối thông tin chuyến bay chiếm cột cố định 240px và bỏ đường kẻ ngang từ lg', async () => {
    const card = await renderResults();
    const info = card.firstElementChild as HTMLElement;
    expect(info.className).toContain('lg:w-[240px]');
    expect(info.className).toContain('lg:border-b-0');
    expect(info.className).not.toContain('xl:w-[240px]');
  });

  // 4 hạng giá phải nằm trên một hàng duy nhất, không lưới 2×2 như bản cũ.
  it('hiển thị 4 hạng giá trong một hàng', async () => {
    const card = await renderResults();
    const fareGrid = card.lastElementChild as HTMLElement;
    expect(fareGrid.className).toContain('grid-cols-4');
    expect(fareGrid.className).not.toContain('grid-cols-2');
    expect(fareGrid.children).toHaveLength(4);
  });
});
