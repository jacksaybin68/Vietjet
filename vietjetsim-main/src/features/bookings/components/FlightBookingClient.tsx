'use client';
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/shared/components/ui';
import { FlightResultsStep, getAirportCity } from '@/features/flights';
import PassengerInfoStep from './PassengerInfoStep';
import SeatSelectionStep from './SeatSelectionStep';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { ErrorBoundary } from '@/shared/components/feedback';
import { createBooking } from '@/features/bookings/services';
import { ApiRequestError } from '@/shared/services';
import {
  getBookingTotals,
  type AncillaryId,
  type Flight,
  type Passenger,
  type BookingState,
  type SearchParams,
} from '@/features/bookings';

const STEPS = [
  { id: 1, label: 'Chọn chuyến bay' },
  { id: 2, label: 'Thông tin hành khách' },
  { id: 3, label: 'Chọn chỗ ngồi' },
];

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
    ancillaries: [],
  }));
  const router = useRouter();
  const toast = useToast();

  // The wizard swaps steps in place (no route change), so PageTransition's
  // scroll-to-top never fires — bring the new step into view ourselves, the
  // way vietjetair.com loads each step's page at the top.
  const goStep = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleFlightSelect = (flight: Flight) => {
    setBooking((b) => ({ ...b, selectedFlight: flight }));
    goStep(2);
    toast.success(
      'Chuyến bay đã được chọn!',
      `${flight.flightNo}: ${flight.fromCity} → ${flight.toCity} lúc ${flight.departTime}`
    );
  };

  const handlePassengerSubmit = (passengers: Passenger[]) => {
    setBooking((b) => ({ ...b, passengers }));
    goStep(3);
    toast.success(
      'Thông tin hành khách đã lưu!',
      `${passengers.length} hành khách đã được xác nhận. Vui lòng chọn chỗ ngồi.`
    );
  };

  const handleSeatConfirm = async (
    seats: string[],
    seatPrices: number[],
    ancillaries: AncillaryId[]
  ): Promise<boolean> => {
    try {
      const flightId = booking.selectedFlight?.id;
      if (!flightId) {
        toast.error('Lỗi đặt chỗ', 'Vui lòng chọn chuyến bay trước.');
        return false;
      }
      const passengers = booking.passengers;
      const basePrice = booking.selectedFlight?.price || 0;

      const seatsFee = seatPrices.reduce((sum, price) => sum + price, 0);
      const totals = getBookingTotals({
        farePerPassenger: basePrice,
        passengerCount: passengers.length,
        seatFee: seatsFee,
        ancillaries,
      });

      const data = await createBooking({
        flight_id: flightId,
        total_price: totals.total,
        passengers: passengers,
        seats: seats,
      });

      const bookingId = data.booking.id;

      setBooking((b) => ({ ...b, selectedSeats: seats, ancillaries }));

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
          fareSubtotal: totals.fareSubtotal,
          tax: totals.taxAndFee,
          seatFee: totals.seatFee,
          ancillaryFee: totals.ancillaryFee,
          ancillaries,
          total: totals.total,
        })
      );

      toast.success(
        'Chỗ ngồi đã được chọn!',
        `Ghế ${seats.join(', ')} đã được giữ. Mã ĐC: ${bookingId}. Đang chuyển đến thanh toán...`,
        { duration: 3000 }
      );
      setTimeout(() => router.push(`/thanh-toan?bookingId=${bookingId}`), 800);
      return true;
    } catch (err) {
      // Booking creation requires a session (the API answers 401); send guests
      // to login with the current search kept as the post-login destination
      // instead of surfacing a raw "Authentication required" toast.
      if (err instanceof ApiRequestError && err.status === 401) {
        toast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để hoàn tất đặt vé.');
        const target = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/dang-nhap?redirect=${target}`);
        return false;
      }
      toast.error('Lỗi đặt chỗ', err instanceof Error ? err.message : 'Không thể tạo booking');
      return false;
    }
  };

  /** The results step's date strip rewrites `depart` so the route re-searches. */
  const handleDateChange = (isoDate: string) => {
    if (!isoDate || isoDate === params.depart) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('depart', isoDate);
    router.replace(`/tim-ve?${next.toString()}`, { scroll: false });
  };

  const tripLabel = params.return ? 'Chuyến bay khứ hồi' : 'Chuyến bay một chiều';

  return (
    <div className="min-h-screen bg-[var(--background)] font-body">
      {/* Trip board — vietjetair.com repeats the trip summary in a brand-yellow strip. */}
      <div className="bg-[var(--vj-yellow)] text-[var(--vj-navy)]" data-testid="trip-board">
        <div className="mx-auto max-w-5xl px-3 py-2 sm:px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm font-koho">
            <span className="font-black uppercase tracking-wide">{tripLabel}</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="font-semibold">{passengerCount} Người lớn</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="PaperAirplaneIcon" size={12} className="text-[var(--primary-dark)]" />
              <span className="font-semibold">Điểm khởi hành</span>
              <span className="font-bold text-[var(--primary-dark)]">
                {params.from
                  ? `${getAirportCity(params.from)} ( ${params.from.toUpperCase()} )`
                  : '---'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="MapPinIcon" size={12} className="text-[var(--primary-dark)]" />
              <span className="font-semibold">Điểm đến</span>
              <span className="font-bold text-[var(--primary-dark)]">
                {params.to ? `${getAirportCity(params.to)} ( ${params.to.toUpperCase()} )` : '---'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Booking progress — compact, sticky below the global header. */}
      <div className="border-b border-[var(--border)] bg-[var(--background)] shadow-sm">
        <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2 overflow-x-auto sm:gap-3 md:gap-4">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-black transition-all flex-shrink-0`}
                    style={{
                      background:
                        step > s.id
                          ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                          : step === s.id
                            ? 'var(--primary)'
                            : 'var(--surface-2)',
                      color:
                        step > s.id
                          ? 'var(--vj-navy)'
                          : step === s.id
                            ? 'white'
                            : 'var(--foreground-muted)',
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
                          ? 'var(--primary)'
                          : step > s.id
                            ? 'var(--foreground)'
                            : 'var(--foreground-muted)',
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
                            ? 'var(--primary)'
                            : 'var(--border)',
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content - responsive padding */}
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-7 md:px-6">
        {step === 1 && (
          <ErrorBoundary inline variant="api" retryLabel="Tìm lại chuyến bay">
            <FlightResultsStep
              onSelect={handleFlightSelect}
              search={params}
              onDateChange={handleDateChange}
              pax={params.pax}
            />
          </ErrorBoundary>
        )}
        {step === 2 && (
          <ErrorBoundary inline variant="booking" retryLabel="Nhập lại thông tin">
            <PassengerInfoStep
              flight={booking.selectedFlight!}
              passengerCount={booking.passengers.length}
              onSubmit={handlePassengerSubmit}
              onBack={() => goStep(1)}
            />
          </ErrorBoundary>
        )}
        {step === 3 && (
          <ErrorBoundary inline variant="booking" retryLabel="Chọn lại chỗ ngồi">
            <SeatSelectionStep
              flight={booking.selectedFlight!}
              passengers={booking.passengers}
              onConfirm={handleSeatConfirm}
              onBack={() => goStep(2)}
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
      <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-8 animate-pulse">
        <div className="h-8 bg-[var(--surface-2)] rounded-lg w-1/3 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 bg-[var(--surface-2)] rounded w-1/2 mb-2" />
              <div className="h-10 bg-[var(--surface-2)] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
