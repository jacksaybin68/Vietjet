'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import FlightResultsStep from './FlightResultsStep';
import PassengerInfoStep from './PassengerInfoStep';
import SeatSelectionStep from './SeatSelectionStep';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';

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

export default function FlightBookingClient() {
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingState>({
    selectedFlight: null,
    passengers: [{ name: '', dob: '', idNumber: '', gender: 'male' }],
    selectedSeats: [],
  });
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

  const handleSeatConfirm = async (seats: string[]) => {
    try {
      const flightId = booking.selectedFlight?.id;
      const passengers = booking.passengers;
      const basePrice = booking.selectedFlight?.price || 0;
      
      const passengerCount = passengers.length;
      // Note: Tax and fee calculations simulate simple logic.
      const taxAndFee = Math.round(basePrice * passengerCount * 0.15);
      const seatsFee = 50000 * seats.length; // Approximate seat fees
      const totalPrice = basePrice * passengerCount + taxAndFee + seatsFee;

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight_id: flightId,
          total_price: totalPrice,
          passengers: passengers
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      const bookingId = data.booking.id;

      setBooking((b) => ({ ...b, selectedSeats: seats }));
      
      sessionStorage.setItem('vjsim_booking', JSON.stringify({
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
        seatFee: seatsFee
      }));

      toast.success(
        'Chỗ ngồi đã được chọn!',
        `Ghế ${seats.join(', ')} đã được giữ. Mã ĐC: ${bookingId}. Đang chuyển đến thanh toán...`,
        { duration: 3000 }
      );
      setTimeout(() => router.push(`/payment?bookingId=${bookingId}`), 800);
    } catch (err: any) {
      toast.error('Lỗi đặt chỗ', err.message || 'Không thể tạo booking');
    }
  };

  return (
    <div
      className="pt-[128px] pb-12 min-h-screen bg-gray-50 font-body"
    >
      {/* VietJet-style sticky step bar */}
      <div
        className="sticky top-[128px] z-30"
        style={{
          background: 'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-8 py-5">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-black transition-all ${
                      step > s.id
                        ? 'text-[#1A2948]'
                        : step === s.id
                          ? 'bg-white'
                          : 'bg-white/20 text-white'
                    }`}
                    style={{
                      background:
                        step > s.id
                          ? 'linear-gradient(26.73deg, rgb(249,165,26) 13.7%, rgb(251,182,18) 29.8%, rgb(255,221,0) 66.81%)'
                          : step === s.id
                            ? 'white'
                            : 'rgba(255,255,255,0.20)',
                      color: step > s.id ? '#1A2948' : step === s.id ? '#EC2029' : 'white',
                      fontWeight: 900
                    }}
                  >
                    {step > s.id ? <Icon name="CheckIcon" size={16} /> : s.id}
                  </div>
                  <span
                    className={`text-base font-semibold hidden sm:block transition-colors`}
                    style={{
                      color:
                        step === s.id
                          ? 'white'
                          : step > s.id
                            ? '#FFD400'
                            : 'rgba(255,255,255,0.60)',
                      fontWeight: step === s.id ? 700 : 600
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px max-w-16 sm:max-w-24 transition-colors`}
                    style={{
                      background:
                        step > s.id + 1
                          ? '#FFD400'
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

      {/* Step Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
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
