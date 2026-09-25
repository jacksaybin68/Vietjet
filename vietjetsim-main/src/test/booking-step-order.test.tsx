import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FlightBookingClient from '@/features/bookings/components/FlightBookingClient';

const flight = {
  id: 'flight-1',
  from: 'HAN',
  to: 'SGN',
  fromCity: 'Hà Nội',
  toCity: 'TP.HCM',
  departTime: '06:00',
  arriveTime: '08:25',
  duration: '2h 25m',
  price: 899000,
  class: 'economy' as const,
  airline: 'Vietjet Air',
  flightNo: 'VJ301',
  available: 20,
  stops: 0,
};

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

vi.mock('@/features/flights', () => ({
  getAirportCity: (code: string) => (code === 'HAN' ? 'Hà Nội' : 'TP.HCM'),
  FlightResultsStep: ({ onSelect }: { onSelect: (flight: object) => void }) => (
    <button onClick={() => onSelect(flight)}>Chọn chuyến bay VJ301</button>
  ),
}));

vi.mock('../features/bookings/components/SeatSelectionStep', () => ({
  default: ({
    onConfirm,
  }: {
    onConfirm: (seats: string[], prices: number[], ancillaries: never[]) => boolean;
  }) => (
    <div>
      <h2>Màn hình chọn chỗ ngồi</h2>
      <button onClick={() => onConfirm(['1A'], [150000], [])}>Xác nhận chỗ ngồi</button>
    </div>
  ),
}));

vi.mock('../features/bookings/components/PassengerInfoStep', () => ({
  default: () => <h2>Nhập thông tin hành khách</h2>,
}));

describe('FlightBookingClient step order', () => {
  it('centers the progress steps and moves through seat selection before passenger details', () => {
    render(<FlightBookingClient />);

    const progress = screen.getByRole('navigation', { name: 'Tiến trình đặt vé' });
    expect(progress).toHaveClass('mx-auto', 'max-w-2xl', 'justify-center');
    expect(
      within(progress).getAllByText(/Chọn chuyến bay|Chọn chỗ ngồi|Thông tin hành khách/)
    ).toHaveLength(3);
    expect(
      within(progress)
        .getAllByText(/Chọn chuyến bay|Chọn chỗ ngồi|Thông tin hành khách/)
        .map((node) => node.textContent)
    ).toEqual(['Chọn chuyến bay', 'Chọn chỗ ngồi', 'Thông tin hành khách']);

    fireEvent.click(screen.getByRole('button', { name: 'Chọn chuyến bay VJ301' }));
    expect(screen.getByRole('heading', { name: 'Màn hình chọn chỗ ngồi' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận chỗ ngồi' }));
    expect(screen.getByRole('heading', { name: 'Nhập thông tin hành khách' })).toBeInTheDocument();
  });
});
