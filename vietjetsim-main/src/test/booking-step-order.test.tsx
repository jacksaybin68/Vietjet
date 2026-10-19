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

vi.mock('@/features/flights', () => ({
  getAirportCity: (code: string) => (code === 'HAN' ? 'Hà Nội' : 'TP.HCM'),
  FlightResultsStep: ({ onSelect }: { onSelect: (flight: object) => void }) => (
    <button onClick={() => onSelect(flight)}>Chọn chuyến bay VJ301</button>
  ),
}));

vi.mock('../features/bookings/components/PassengerInfoStep', () => ({
  default: ({ onSubmit }: { onSubmit: (passengers: object[], consents: object) => void }) => (
    <div>
      <h2>Nhập thông tin hành khách</h2>
      <button
        onClick={() =>
          onSubmit(
            [{ name: 'LONG CHIN', gender: 'male', phone: '0901234567', email: 'user@example.com' }],
            { marketing: false, survey: false, retainForFutureBooking: false, policyAccepted: true }
          )
        }
      >
        Lưu thông tin hành khách
      </button>
    </div>
  ),
}));

vi.mock('../features/bookings/components/AncillaryServicesStep', () => ({
  default: () => <h2>Dịch vụ bổ sung</h2>,
}));

describe('FlightBookingClient step order', () => {
  it('moves through flight selection -> passenger details -> ancillary services', () => {
    render(<FlightBookingClient />);

    const progress = screen.getByRole('navigation', { name: 'Tiến trình đặt vé' });
    expect(progress).toHaveClass('mx-auto', 'max-w-2xl', 'justify-center');
    expect(
      within(progress).getAllByText(/Chọn chuyến bay|Thông tin hành khách|Dịch vụ bổ sung/)
    ).toHaveLength(3);
    expect(
      within(progress)
        .getAllByText(/Chọn chuyến bay|Thông tin hành khách|Dịch vụ bổ sung/)
        .map((node) => node.textContent)
    ).toEqual(['Chọn chuyến bay', 'Thông tin hành khách', 'Dịch vụ bổ sung']);

    fireEvent.click(screen.getByRole('button', { name: 'Chọn chuyến bay VJ301' }));
    expect(screen.getByRole('heading', { name: 'Nhập thông tin hành khách' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin hành khách' }));
    expect(screen.getByRole('heading', { name: 'Dịch vụ bổ sung' })).toBeInTheDocument();
  });
});
