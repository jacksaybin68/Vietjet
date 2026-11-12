import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { searchFlightsWithDates } = vi.hoisted(() => ({ searchFlightsWithDates: vi.fn() }));

vi.mock('@/features/flights/services', () => ({
  searchFlightsWithDates,
  getAirportCity: (code: string) => (code === 'HAN' ? 'Hà Nội' : 'TP.HCM'),
}));

import FlightResultsStep from '@/features/flights/components/FlightResultsStep';

const flights = [
  {
    id: 'f-1',
    flightNo: 'VJ301',
    airline: 'Vietjet Air',
    departDate: '2026-03-20',
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
    searchFlightsWithDates.mockResolvedValue({ flights, availableDates: [] });
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
  // Mobile-first: trên điện thoại card xếp dọc (khối thông tin chuyến bay ở
  // trên, lưới giá 2×2 bên dưới) vì bốn cột giá không vừa 390px; từ `sm` trở
  // lên nó trở về hàng ngang như desktop.
  it('hàng ngang trên cả mobile và desktop', async () => {
    const card = await renderResults();
    expect(card.className).toContain('flex-row');
  });

  it('khối thông tin chuyến bay chiếm cột cố định 240px trên desktop và border-r', async () => {
    const card = await renderResults();
    const info = card.firstElementChild as HTMLElement;
    expect(info.className).toContain('lg:w-[240px]');
    expect(info.className).toContain('border-r');
  });

  // Bốn hạng giá nằm trên MỘT hàng 4 cột cả trên mobile và desktop
  it('hiển thị 4 hạng giá trong một hàng 4 cột', async () => {
    const card = await renderResults();
    const fareGrid = (card.querySelector('.grid-cols-4') || card.children[1]) as HTMLElement;
    expect(fareGrid.className).toContain('grid-cols-4');
    expect(fareGrid.children).toHaveLength(4);
  });
});
