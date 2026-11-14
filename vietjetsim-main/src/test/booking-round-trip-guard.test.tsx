import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FlightBookingClient from '@/features/bookings/components/FlightBookingClient';

const outboundFlight = {
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

const returnFlight = {
  id: 'flight-2',
  from: 'SGN',
  to: 'HAN',
  fromCity: 'TP.HCM',
  toCity: 'Hà Nội',
  departDate: '2026-03-27',
  departTime: '10:00',
  arriveTime: '12:25',
  duration: '2h 25m',
  price: 999000,
  class: 'economy' as const,
  airline: 'Vietjet Air',
  flightNo: 'VJ302',
  available: 15,
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
  FlightResultsStep: ({
    onSelect,
    search,
  }: {
    onSelect: (flight: object, isUserAction?: boolean) => void;
    search: { from?: string };
  }) => {
    const isOutbound = search.from === 'HAN';
    return (
      <button onClick={() => onSelect(isOutbound ? outboundFlight : returnFlight, true)}>
        {isOutbound ? 'Chọn chuyến đi VJ301' : 'Chọn chuyến về VJ302'}
      </button>
    );
  },
}));

vi.mock('@/features/bookings/components/PassengerInfoStep', () => ({
  default: () => <h2>Nhập thông tin hành khách</h2>,
}));

vi.mock('@/features/bookings/components/AncillaryServicesStep', () => ({
  default: () => <h2>Dịch vụ bổ sung</h2>,
}));

describe('round-trip booking flow', () => {
  it('supports selecting outbound then return flight and advancing to passenger info', () => {
    render(<FlightBookingClient />);

    // Initially on outbound leg
    expect(screen.getByRole('tab', { name: /chiều đi/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Chọn chuyến đi VJ301' })).toBeInTheDocument();

    // Select outbound flight
    fireEvent.click(screen.getByRole('button', { name: 'Chọn chuyến đi VJ301' }));

    // Automatically switches to return leg
    expect(screen.getByRole('tab', { name: /chiều về/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Chọn chuyến về VJ302' })).toBeInTheDocument();

    // Select return flight -> advances to passenger info step
    fireEvent.click(screen.getByRole('button', { name: 'Chọn chuyến về VJ302' }));

    expect(screen.getByRole('heading', { name: 'Nhập thông tin hành khách' })).toBeInTheDocument();
  });
});
