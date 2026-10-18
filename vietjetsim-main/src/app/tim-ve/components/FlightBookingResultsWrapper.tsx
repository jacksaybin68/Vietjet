'use client';

import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlightBookingClient } from '@/features/bookings';
import { TAX_AND_FEE_RATE } from '@/features/bookings/pricing';
import DateStrip from './DateStrip';
import type { DateStripItem } from './DateStrip';
import FareClassTabs from './FareClassTabs';
import BookingSummaryPanel from './BookingSummaryPanel';

const DATE_ITEMS: DateStripItem[] = [
  { label: 'Thứ năm 15/10', value: '2026-10-15', price: 1190000 },
  { label: 'Thứ sáu 16/10', value: '2026-10-16', price: 1440000 },
  { label: 'Thứ bảy 17/10', value: '2026-10-17', price: 1890000 },
  { label: 'Chủ nhật 18/10', value: '2026-10-18', price: 1650000 },
  { label: 'Thứ hai 19/10', value: '2026-10-19', price: 1250000 },
  { label: 'Thứ ba 20/10', value: '2026-10-20', price: 1180000 },
  { label: 'Thứ tư 21/10', value: '2026-10-21', price: 1220000 },
  { label: 'Thứ năm 22/10', value: '2026-10-22', price: 1300000 },
];

interface FlightBookingResultsWrapperProps {
  trip: string;
  date: string;
}

interface SelectedBooking {
  flightNo: string;
  fareClass: string;
  fare: number;
  tax: number;
  total: number;
}

export default function FlightBookingResultsWrapper({
  trip,
  date,
}: FlightBookingResultsWrapperProps) {
  const searchParams = useSearchParams();
  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null);

  const handleDateChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('depart', value);
      window.history.pushState(null, '', `/tim-ve?${next.toString()}`);
    },
    [searchParams]
  );

  const handleFlightSelect = useCallback((flightNo: string, fareClass: string, fare: number) => {
    const tax = Math.round(fare * TAX_AND_FEE_RATE);
    const total = fare + tax;
    setSelectedBooking({ flightNo, fareClass, fare, tax, total });
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Cột trái: danh sách chuyến bay (~68%) */}
      <div className="flex-1 lg:w-[68%]">
        <DateStrip
          items={DATE_ITEMS}
          selectedValue={searchParams.get('depart') ?? undefined}
          onSelect={handleDateChange}
        />
        <FareClassTabs activeClass={selectedBooking?.fareClass ?? 'ECO'} onSelect={() => {}} />
        <FlightBookingClient onFlightSelect={handleFlightSelect} />
      </div>

      {/* Cột phải: panel thông tin đặt chỗ (~32%) */}
      <BookingSummaryPanel
        data={{
          trip,
          date,
          fare: selectedBooking?.fare ?? 0,
          tax: selectedBooking?.tax ?? 0,
          serviceFee: 0,
          total: selectedBooking?.total ?? 0,
        }}
        onContinue={() => {}}
        canContinue={selectedBooking !== null}
      />
    </div>
  );
}
