import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFareForClass, type FareClassId } from '@/features/bookings/pricing';
import type { Flight } from '@/features/flights/types';

const { searchFlightsWithDates } = vi.hoisted(() => ({ searchFlightsWithDates: vi.fn() }));

vi.mock('@/features/flights/services', () => ({
  searchFlightsWithDates,
  getAirportCity: (code: string) => (code === 'HAN' ? 'Hà Nội' : 'TP.HCM'),
}));

import FlightResultsStep from '@/features/flights/components/FlightResultsStep';

const ECONOMY = 4_900_000;
const BUSINESS = 13_573_000;

const flight: Flight = {
  id: 'f-1',
  flightNo: 'VJ115',
  airline: 'Vietjet Air',
  departDate: '2026-03-20',
  departTime: '09:00',
  arriveTime: '14:20',
  duration: '5h 20m',
  from: 'HAN',
  to: 'ICN',
  fromCity: 'Hà Nội',
  toCity: 'Seoul',
  price: ECONOMY,
  economyPrice: ECONOMY,
  businessPrice: BUSINESS,
  class: 'economy',
  available: 180,
  stops: 0,
};

const format = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

describe('trạng thái rỗng dẫn tới ngày có chuyến thật', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderEmpty = async (availableDates: string[], onDateChange = vi.fn()) => {
    searchFlightsWithDates.mockResolvedValue({ flights: [], availableDates });
    render(
      <FlightResultsStep
        onSelect={vi.fn()}
        onDateChange={onDateChange}
        search={{ from: 'HAN', to: 'SGN', depart: '2026-10-20' }}
        pax="1"
      />
    );
    await waitFor(() => expect(screen.getByText(/Không tìm thấy chuyến bay/)).toBeInTheDocument());
    return onDateChange;
  };

  // The strip above is generated from today forward, so a search past the end
  // of the seeded week used to leave the customer on six more empty days with
  // advice and nothing to click.
  it('hiện ngày có chuyến và bấm được', async () => {
    const onDateChange = await renderEmpty(['2026-10-05', '2026-10-06']);

    // Match the heading, not a formatted date: the button label is built with
    // `toLocaleDateString('vi-VN')`, and jsdom's ICU renders that differently
    // from the browser this code actually ships in.
    expect(screen.getByText('Ngày có chuyến bay')).toBeInTheDocument();
    const buttons = screen.getAllByTestId('available-date');
    expect(buttons).toHaveLength(2);

    buttons[0]!.click();
    expect(onDateChange).toHaveBeenCalledWith('2026-10-05');
  });

  it('không hiện khối ngày khi tuyến không có chuyến nào', async () => {
    await renderEmpty([]);
    expect(screen.queryByText('Ngày có chuyến bay')).not.toBeInTheDocument();
  });
});

/**
 * The printed amount on each card. Scoped to the element that carries the
 * `₫` suffix so an ancestor, which repeats the same text, is not counted.
 */
function printedFares(fareGrid: HTMLElement): string[] {
  return [...fareGrid.querySelectorAll('div')]
    .filter((node) => node.children.length === 0 && (node.textContent ?? '').includes('₫'))
    .map((node) => (node.textContent ?? '').trim());
}

describe('giá thẻ hạng vé khớp với giá API thu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchFlightsWithDates.mockResolvedValue({ flights: [flight], availableDates: [] });
  });

  const renderResults = async (onSelect: (f: Flight) => void) => {
    render(
      <FlightResultsStep
        onSelect={onSelect}
        search={{ from: 'HAN', to: 'ICN', depart: '2026-10-06' }}
        pax="1"
      />
    );
    await waitFor(() => expect(screen.getByTestId('flight-result-card')).toBeInTheDocument());
  };

  // The regression: each card derived its own interpolated price, but handed
  // the API a bare `cabin`, so the two middle cards quoted a figure the server
  // never charged. The card is now identified by `fareClass`, and this pins
  // that the id carried into the booking resolves to the number printed above
  // the button.
  it('thẻ gửi đi fareClass mà giá hiển thị thuộc về', async () => {
    const onSelect = vi.fn();
    await renderResults(onSelect);

    const card = screen.getByTestId('flight-result-card');
    const fareGrid = (card.querySelector('.grid.grid-cols-4') ??
      card.lastElementChild) as HTMLElement;
    const printed = printedFares(fareGrid);
    expect(printed).toHaveLength(4);

    for (const [index, button] of [...fareGrid.querySelectorAll('button')].entries()) {
      onSelect.mockClear();
      button.click();

      const selected = onSelect.mock.calls[0]![0] as Flight;
      const quoted = Number(printed[index]!.replace(/[^\d]/g, ''));

      // What the card printed is what it selects.
      expect(selected.price).toBe(quoted);
      // And what it selects is what the server will look up for that card.
      expect(getFareForClass(selected.fareClass as FareClassId, flight)).toBe(quoted);
    }
  });

  it('thẻ rẻ nhất và đắt nhất đúng bằng hai giá lưu trong DB', async () => {
    await renderResults(vi.fn());
    const card = screen.getByTestId('flight-result-card');
    const fareGrid = (card.querySelector('.grid.grid-cols-4') ??
      card.lastElementChild) as HTMLElement;
    const printed = printedFares(fareGrid);

    expect(printed).toHaveLength(4);
    expect(printed).toContain(format(ECONOMY));
    expect(printed).toContain(format(BUSINESS));
  });

  it('onFlightSelect nhận đúng mã chuyến, hạng và giá đã in', async () => {
    const onSelect = vi.fn();
    const onFlightSelect = vi.fn();
    searchFlightsWithDates.mockResolvedValue({ flights: [flight], availableDates: [] });
    render(
      <FlightResultsStep
        onSelect={onSelect}
        onFlightSelect={onFlightSelect}
        search={{ from: 'HAN', to: 'ICN', depart: '2026-10-06' }}
        pax="1"
      />
    );
    await waitFor(() => expect(screen.getByTestId('flight-result-card')).toBeInTheDocument());

    const card = screen.getByTestId('flight-result-card');
    const fareGrid = card.lastElementChild as HTMLElement;
    const buttons = [...fareGrid.querySelectorAll('button')];
    buttons[0]!.click();

    expect(onFlightSelect).toHaveBeenCalledTimes(1);
    const [flightNo, fareClass, fare] = onFlightSelect.mock.calls[0]!;
    expect(flightNo).toBe('VJ115');
    expect(typeof fareClass).toBe('string');
    expect(typeof fare).toBe('number');
    // Song song với onSelect — cùng một giá vé.
    expect(fare).toBe((onSelect.mock.calls[0]![0] as Flight).price);
  });
});
