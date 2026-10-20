import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PassengerInfoStep from '@/features/bookings/components/PassengerInfoStep';
import BookingSummaryPanel from '@/app/tim-ve/components/BookingSummaryPanel';

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
  price: 1000000,
  economyPrice: 1000000,
  businessPrice: 2500000,
  class: 'economy' as const,
  airline: 'Vietjet Air',
  flightNo: 'VJ301',
  available: 20,
  stops: 0,
};

describe('Passenger dynamic count and calculation features', () => {
  it('allows adding and removing passengers dynamically in PassengerInfoStep', () => {
    const onPassengersChange = vi.fn();
    render(
      <PassengerInfoStep
        flight={flight}
        passengerCount={1}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
        onPassengersChange={onPassengersChange}
      />
    );

    // Initial state: 1 adult
    expect(screen.getByText(/Tổng cộng: 1 hành khách/)).toBeInTheDocument();
    expect(screen.getByText(/1 Người lớn/)).toBeInTheDocument();

    // Click "+ Người lớn"
    const addAdultBtn = screen.getByRole('button', { name: /\+ Người lớn/i });
    fireEvent.click(addAdultBtn);

    expect(screen.getByText(/Tổng cộng: 2 hành khách/)).toBeInTheDocument();
    expect(screen.getByText(/2 Người lớn/)).toBeInTheDocument();
    expect(screen.getByText(/Người lớn 2/)).toBeInTheDocument();
    expect(onPassengersChange).toHaveBeenCalled();

    // Click "+ Trẻ em"
    const addChildBtn = screen.getByRole('button', { name: /\+ Trẻ em/i });
    fireEvent.click(addChildBtn);

    expect(screen.getByText(/Tổng cộng: 3 hành khách/)).toBeInTheDocument();
    expect(screen.getByText(/Trẻ em 1/)).toBeInTheDocument();

    // Click "+ Em bé"
    const addInfantBtn = screen.getByRole('button', { name: /\+ Em bé/i });
    fireEvent.click(addInfantBtn);

    expect(screen.getByText(/Tổng cộng: 4 hành khách/)).toBeInTheDocument();
    expect(screen.getByText(/Em bé 1/)).toBeInTheDocument();

    // Delete a passenger
    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[deleteButtons.length - 1]); // Delete infant

    expect(screen.getByText(/Tổng cộng: 3 hành khách/)).toBeInTheDocument();
  });

  it('renders detailed passenger counts and itemized fare calculation in BookingSummaryPanel', () => {
    render(
      <BookingSummaryPanel
        data={{
          trip: 'HAN → SGN',
          date: '20/03/2026',
          flightNo: 'VJ301',
          fareClass: 'Eco',
          fare: 1750000, // 1 adult (1,000,000) + 1 child (750,000)
          tax: 1163162,
          serviceFee: 0,
          total: 2913162,
          paxCounts: {
            adult: 1,
            child: 1,
            infant: 0,
          },
        }}
        onContinue={vi.fn()}
        canContinue={true}
      />
    );

    // Section Thông tin hành khách
    expect(screen.getByText(/Thông tin hành khách/)).toBeInTheDocument();
    expect(screen.getByText(/2 khách/)).toBeInTheDocument();
    expect(screen.getByText('Trẻ em (2 - 11 tuổi)')).toBeInTheDocument();

    // Section Giá vé itemization
    expect(screen.getByText(/Người lớn x 1/)).toBeInTheDocument();
    expect(screen.getByText(/Trẻ em x 1 \(75%\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/1.000.000 VND/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/750.000 VND/).length).toBeGreaterThan(0);
  });
});
