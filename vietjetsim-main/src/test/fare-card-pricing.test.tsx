import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFareForClass, type FareClassId } from '@/features/bookings/pricing';
import type { Flight } from '@/features/flights/types';

const { searchFlightsForUi } = vi.hoisted(() => ({ searchFlightsForUi: vi.fn() }));

vi.mock('@/features/flights/services', () => ({
  searchFlightsForUi,
  getAirportCity: (code: string) => (code === 'HAN' ? 'Hà Nội' : 'TP.HCM'),
}));

import FlightResultsStep from '@/features/flights/components/FlightResultsStep';

const ECONOMY = 4_900_000;
const BUSINESS = 13_573_000;

const flight: Flight = {
  id: 'f-1',
  flightNo: 'VJ115',
  airline: 'Vietjet Air',
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
    searchFlightsForUi.mockResolvedValue([flight]);
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
    const fareGrid = card.lastElementChild as HTMLElement;
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
    const printed = printedFares(card.lastElementChild as HTMLElement);

    expect(printed).toHaveLength(4);
    expect(printed).toContain(format(ECONOMY));
    expect(printed).toContain(format(BUSINESS));
  });
});
