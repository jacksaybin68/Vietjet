'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/shared/components/ui';
import FlightResultsStep from './FlightResultsStep';
import PassengerInfoStep from './PassengerInfoStep';
import SeatSelectionStep from './SeatSelectionStep';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { ErrorBoundary } from '@/shared/components/feedback';

export type Flight = {
  id: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  price: number;
  class: 'economy' | 'business';
  airline: string;
  flightNo: string;
  available: number;
  stops: number;
};

export type Passenger = {
  name: string;
  dob: string;
  idNumber: string;
  gender: string;
};

export type BookingState = {
  selectedFlight: Flight | null;
  passengers: Passenger[];
  selectedSeats: string[];
};

const STEPS = [
  { id: 1, label: 'Chọn chuyến bay', icon: 'MagnifyingGlassIcon' as const },
  { id: 2, label: 'Thông tin hành khách', icon: 'UserIcon' as const },
  { id: 3, label: 'Chọn chỗ ngồi', icon: 'TicketIcon' as const },
];

export type SearchParams = {
  from?: string;
  to?: string;
  depart?: string;
  return?: string;
  pax?: string;
};

function FlightBookingClientInner() {
  const searchParams = useSearchParams();
  const params: SearchParams = {
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    depart: searchParams.get('depart') || undefined,
    return: searchParams.get('return') || undefined,
    pax: searchParams.get('pax') || undefined,
  };

  const [step, setStep] = useState(1);
  const passengerCount = params.pax ? parseInt(params.pax, 10) || 1 : 1;
  const [booking, setBooking] = useState<BookingState>(() => ({
    selectedFlight: null,
    passengers: Array.from({ length: passengerCount }, () => ({
      name: '',
      dob: '',
      idNumber: '',
      gender: 'male',
    })),
    selectedSeats: [],
  }));
  const router = useRouter();
  const toast = useToast();

  const handleFlightSelect = (flight: Flight) => {
    // #endregion
    setBooking((b) => ({ ...b, selectedFlight: flight }));
    setStep(2);
    toast.success(
      'Chuyến bay đã được chọn!',
      `${flight.flightNo}: ${flight.fromCity} → ${flight.toCity} lúc ${flight.departTime}`
    );
  };

  const handlePassengerSubmit = (passengers: Passenger[]) => {
    setBooking((b) => ({ ...b, passengers }));
    setStep(3);
    toast.success(
      'Thông tin hành khách đã lưu!',
      `${passengers.length} hành khách đã được xác nhận. Vui lòng chọn chỗ ngồi.`
    );
  };

  const handleSeatConfirm = async (seats: string[], seatPrices: number[]) => {
    try {
      const flightId = booking.selectedFlight?.id;
      const passengers = booking.passengers;
      const basePrice = booking.selectedFlight?.price || 0;

      const passengerCount = passengers.length;
      const taxAndFee = Math.round(basePrice * passengerCount * 0.15);
      const seatsFee = seatPrices.reduce((sum, price) => sum + price, 0);
      const totalPrice = basePrice * passengerCount + taxAndFee + seatsFee;

      const res = await fetch('/api/dat-ve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight_id: flightId,
          total_price: totalPrice,
          passengers: passengers,
          seats: seats,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      const bookingId = data.booking.id;

      setBooking((b) => ({ ...b, selectedSeats: seats }));

      sessionStorage.setItem(
        'vjsim_booking',
        JSON.stringify({
          bookingId: bookingId,
          flightNo: booking.selectedFlight?.flightNo,
          from: booking.selectedFlight?.from,
          to: booking.selectedFlight?.to,
          fromCity: booking.selectedFlight?.fromCity,
          toCity: booking.selectedFlight?.toCity,
          departTime: booking.selectedFlight?.departTime,
          arriveTime: booking.selectedFlight?.arriveTime,
          date: new Date().toLocaleDateString('vi-VN'),
          passengers: passengers.map((p, i) => ({ name: p.name, seat: seats[i] })),
          basePrice: basePrice * passengerCount,
          tax: taxAndFee,
          seatFee: seatsFee,
        })
      );

      toast.success(
        'Chỗ ngồi đã được chọn!',
        `Ghế ${seats.join(', ')} đã được giữ. Mã ĐC: ${bookingId}. Đang chuyển đến thanh toán...`,
        { duration: 3000 }
      );
      setTimeout(() => router.push(`/thanh-toan?bookingId=${bookingId}`), 800);
    } catch (err: any) {
      toast.error('Lỗi đặt chỗ', err.message || 'Không thể tạo booking');
    }
  };

  return (
    <div className="pt-[128px] pb-8 sm:pb-12 min-h-screen bg-[var(--surface)] dark:bg-[var(--dark-surface)] font-body">
      {/* VietJet-style sticky step bar - responsive */}
      <div
        className="sticky top-[128px] z-30"
        style={{
          background: 'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
        }}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 py-2 sm:py-3 overflow-x-auto">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-black transition-all flex-shrink-0`}
                    style={{
                      background:
                        step > s.id
                          ? 'linear-gradient(26.73deg, rgb(249,165,26) 13.7%, rgb(251,182,18) 29.8%, rgb(255,221,0) 66.81%)'
                          : step === s.id
                            ? 'white'
                            : 'rgba(255,255,255,0.20)',
                      color:
                        step > s.id ? 'var(--vj-navy)' : step === s.id ? 'var(--primary)' : 'white',
                      fontWeight: 900,
                    }}
                  >
                    {step > s.id ? (
                      <Icon
                        name="CheckIcon"
                        size={12}
                        className="sm:!w-3.5 sm:!h-3.5 md:!w-4 md:!h-4"
                      />
                    ) : (
                      s.id
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs md:text-sm font-semibold hidden sm:block transition-colors`}
                    style={{
                      color:
                        step === s.id
                          ? 'white'
                          : step > s.id
                            ? 'var(--accent)'
                            : 'rgba(255,255,255,0.60)',
                      fontWeight: step === s.id ? 700 : 600,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 min-w-6 sm:min-w-8 md:min-w-12 max-w-10 sm:max-w-12 md:max-w-16 transition-colors flex-shrink-0`}
                    style={{
                      background:
                        step > s.id + 1
                          ? 'var(--accent)'
                          : step > s.id
                            ? 'rgba(255,255,255,0.60)'
                            : 'rgba(255,255,255,0.20)',
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content - responsive padding */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 mt-4 sm:mt-6">
        {step === 1 && (
          <ErrorBoundary inline variant="api" retryLabel="Tìm lại chuyến bay">
            <FlightResultsStep onSelect={handleFlightSelect} />
          </ErrorBoundary>
        )}
        {step === 2 && (
          <ErrorBoundary inline variant="booking" retryLabel="Nhập lại thông tin">
            <PassengerInfoStep
              flight={booking.selectedFlight!}
              passengerCount={booking.passengers.length}
              onSubmit={handlePassengerSubmit}
              onBack={() => setStep(1)}
            />
          </ErrorBoundary>
        )}
        {step === 3 && (
          <ErrorBoundary inline variant="booking" retryLabel="Chọn lại chỗ ngồi">
            <SeatSelectionStep
              flight={booking.selectedFlight!}
              passengers={booking.passengers}
              onConfirm={handleSeatConfirm}
              onBack={() => setStep(2)}
            />
          </ErrorBoundary>
        )}
      </div>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </div>
  );
}

export default function FlightBookingClient() {
  return (
    <Suspense fallback={<FlightSearchSkeleton />}>
      <FlightBookingClientInner />
    </Suspense>
  );
}

function FlightSearchSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-[var(--surface)] dark:bg-[var(--dark-surface)] rounded-2xl shadow-lg p-8 animate-pulse">
        <div className="h-8 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] rounded-lg w-1/3 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] rounded w-1/2 mb-2" />
              <div className="h-10 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
