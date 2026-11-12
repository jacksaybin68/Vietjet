import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ItineraryModal from '@/features/bookings/components/ItineraryModal';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn((_text, _opts, cb) => cb(null, 'data:image/png;base64,mockqr')),
  },
}));

describe('ItineraryModal Component', () => {
  const mockBooking = {
    id: 'b1-uuid-test',
    booking_code: 'KHD6V3',
    status: 'pending',
    created_at: '2026-11-12T06:48:00.000Z',
    total_price: 17658000,
    contact_name: 'BUI THI THUONG',
    contact_email: 'thuong@tangthuan.vn',
    flight: {
      flight_no: 'VJ087',
      from_code: 'SGN',
      to_code: 'WSI',
      depart_time: '2027-02-27T14:25:00.000Z',
      arrive_time: '2027-02-28T03:00:00.000Z',
      class: 'deluxe',
    },
    passengers: [
      { id: 'p1', name: 'BUI THI THUONG', seat_number: '12A' },
      { id: 'p2', name: 'PHAM VAN HUNG', seat_number: '12B' },
    ],
  };

  it('renders modal with correct booking code, passengers, and flight route', () => {
    render(<ItineraryModal isOpen={true} onClose={vi.fn()} booking={mockBooking} />);

    // Header & Title
    expect(screen.getByText('Thông tin hành trình của bạn')).toBeInTheDocument();
    expect(screen.getByText('THÔNG TIN HÀNH TRÌNH CỦA BẠN')).toBeInTheDocument();

    // Booking code
    expect(screen.getByText('KHD6V3')).toBeInTheDocument();

    // Passenger names
    expect(screen.getAllByText('BUI THI THUONG').length).toBeGreaterThan(0);
    expect(screen.getByText('PHAM VAN HUNG')).toBeInTheDocument();

    // Flight number
    expect(screen.getByText('VJ087')).toBeInTheDocument();

    // Print buttons
    expect(screen.getByText('Print')).toBeInTheDocument();
    expect(screen.getByText('Tải xuống PDF')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ItineraryModal isOpen={false} onClose={vi.fn()} booking={mockBooking} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
