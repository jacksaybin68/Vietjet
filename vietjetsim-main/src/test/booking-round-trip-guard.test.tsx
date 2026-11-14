import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FlightBookingClient from '@/features/bookings/components/FlightBookingClient';

const flight = {
  id: 'flight-1',
  from: 'HAN',
  to: 'SGN',
  fromCity: 'Hà Nội',
  toCity: 'TP.HCM',
  departDate: '2026-03-20',
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/tim-ve',
  useSearchParams: () => new URLSearchParams('from=HAN&to=SGN&depart=2026-03-20&return=2026-03-27'),
  useParams: () => ({}),
}));

vi.mock('@/features/flights', () => ({
  getAirportCity: (code: string) => (code === 'HAN' ? 'Hà Nội' : 'TP.HCM'),
  FlightResultsStep: ({ onSelect }: { onSelect: (flight: object) => void }) => (
    <button onClick={() => onSelect(flight)}>Chọn chuyến bay VJ301</button>
  ),
}));

vi.mock('@/features/bookings/components/PassengerInfoStep', () => ({
  default: () => <h2>Nhập thông tin hành khách</h2>,
}));

vi.mock('@/features/bookings/components/AncillaryServicesStep', () => ({
  default: () => <h2>Dịch vụ bổ sung</h2>,
}));

describe('round-trip booking guard', () => {
  it('does not start checkout for a round-trip search', () => {
    render(<FlightBookingClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Chọn chuyến bay VJ301' }));

    // The API only books one leg; the screen must refuse rather than sell a
    // round trip that would be recorded as one-way.
    expect(screen.queryByRole('heading', { name: 'Nhập thông tin hành khách' })).toBeNull();
    expect(screen.getByText('Chưa hỗ trợ đặt vé khứ hồi')).toBeInTheDocument();
  });
});
