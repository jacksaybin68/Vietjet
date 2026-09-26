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
  PASSENGER_TYPE_LABELS,
  type AncillaryId,
  type BookingConsents,
  type Flight,
  type Passenger,
  type PassengerType,
  type BookingState,
  type SearchParams,
} from '@/features/bookings';

const STEPS = [
  { id: 1, label: 'Chọn chuyến bay' },
  { id: 2, label: 'Chọn chỗ ngồi' },
  { id: 3, label: 'Thông tin hành khách' },
];

/** Build the passenger roster: adults first, then children, then lap infants. */
function buildPassengerRoster(counts: Record<PassengerType, number>): Passenger[] {
  const blank = {
    name: '',
    dob: '',
    idNumber: '',
    gender: 'male',
    countryCode: 'VN',
    phone: '',
    email: '',
    residence: '',
    skyJoyMemberId: '',
  };
  return (['adult', 'child', 'infant'] as const).flatMap((type) =>
    Array.from({ length: counts[type] }, () => ({ ...blank, type }))
  );
}

/** Recount the roster after the passenger form is edited, so pricing never drifts. */
function countByType(passengers: Passenger[]): Record<PassengerType, number> {
  const counts: Record<PassengerType, number> = { adult: 0, child: 0, infant: 0 };
  for (const passenger of passengers) {
    counts[passenger.type ?? 'adult'] += 1;
  }
  return counts;
}

/** "2 Người lớn, 1 Trẻ em" — only the categories actually on the booking. */
function describePax(counts: Record<PassengerType, number>): string {
  return (['adult', 'child', 'infant'] as const)
    .filter((type) => counts[type] > 0)
    .map((type) => `${counts[type]} ${PASSENGER_TYPE_LABELS[type]}`)
    .join(', ');
}

function FlightBookingClientInner() {
  const searchParams = useSearchParams();
  const params: SearchParams = {
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    depart: searchParams.get('depart') || undefined,
    return: searchParams.get('return') || undefined,
    pax: searchParams.get('pax') || undefined,
    child: searchParams.get('child') || undefined,
    infant: searchParams.get('infant') || undefined,
  };

  const [step, setStep] = useState(1);
  const paxCounts: Record<PassengerType, number> = {
    adult: params.pax ? parseInt(params.pax, 10) || 1 : 1,
    child: params.child ? parseInt(params.child, 10) || 0 : 0,
    infant: params.infant ? parseInt(params.infant, 10) || 0 : 0,
  };
  const [booking, setBooking] = useState<BookingState>(() => ({
    selectedFlight: null,
    passengers: buildPassengerRoster(paxCounts),
    selectedSeats: [],
    ancillaries: [],
  }));
  const [selectedSeatPrices, setSelectedSeatPrices] = useState<number[]>([]);
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
    setBooking((b) => ({
      ...b,
      selectedFlight: flight,
      selectedSeats: [],
      ancillaries: [],
    }));
    setSelectedSeatPrices([]);
    goStep(2);
    toast.success(
      'Chuyến bay đã được chọn!',
      `${flight.flightNo}: ${flight.fromCity} → ${flight.toCity} lúc ${flight.departTime}`
    );
  };

  const handleSeatContinue = (
    seats: string[],
    seatPrices: number[],
    ancillaries: AncillaryId[]
  ): boolean => {
    setBooking((b) => ({ ...b, selectedSeats: seats, ancillaries }));
    setSelectedSeatPrices(seatPrices);
    goStep(3);
    toast.success(
      'Chỗ ngồi đã được chọn!',
      `Ghế ${seats.join(', ')} đã được giữ. Vui lòng nhập thông tin hành khách.`
    );
    return true;
  };

  const handlePassengerSubmit = async (passengers: Passenger[], consents: BookingConsents) => {
    try {
      const selectedFlight = booking.selectedFlight;
      const flightId = selectedFlight?.id;
      if (!selectedFlight || !flightId) {
        toast.error('Lỗi đặt chỗ', 'Vui lòng chọn chuyến bay trước.');
        return;
      }

      const seats = booking.selectedSeats;
      const ancillaries = booking.ancillaries;
      const basePrice = selectedFlight.price;
      const seatsFee = selectedSeatPrices.reduce((sum, price) => sum + price, 0);
      const totals = getBookingTotals({
        farePerPassenger: basePrice,
        passengerCount: passengers.length,
        paxCounts: countByType(passengers),
        seatFee: seatsFee,
        ancillaries,
      });

      const data = await createBooking({
        flight_id: flightId,
        total_price: totals.total,
        passengers,
        seats,
        consents,
      });
      const bookingId = data.booking.id;

      setBooking((b) => ({
        ...b,
        passengers,
        selectedSeats: seats,
        ancillaries,
      }));

      sessionStorage.setItem(
        'vjsim_booking',
        JSON.stringify({
          bookingId,
          flightNo: selectedFlight.flightNo,
          from: selectedFlight.from,
          to: selectedFlight.to,
          fromCity: selectedFlight.fromCity,
          toCity: selectedFlight.toCity,
          departTime: selectedFlight.departTime,
          arriveTime: selectedFlight.arriveTime,
          date: new Date().toLocaleDateString('vi-VN'),
          passengers: passengers.map((passenger, index) => ({
            name: passenger.name,
            seat: seats[index],
          })),
          fareSubtotal: totals.fareSubtotal,
          tax: totals.taxAndFee,
          seatFee: totals.seatFee,
          ancillaryFee: totals.ancillaryFee,
          ancillaries,
          total: totals.total,
        })
      );

      toast.success(
        'Thông tin hành khách đã được xác nhận!',
        `Mã đặt chỗ: ${bookingId}. Đang chuyển đến thanh toán...`,
        { duration: 3000 }
      );
      setTimeout(() => router.push(`/thanh-toan?bookingId=${bookingId}`), 800);
    } catch (err) {
      // Booking creation requires a session (the API answers 401); send guests
      // to login with the current search kept as the post-login destination.
      if (err instanceof ApiRequestError && err.status === 401) {
        toast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để hoàn tất đặt vé.');
        const target = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/dang-nhap?redirect=${target}`);
        return;
      }
      toast.error('Lỗi đặt chỗ', err instanceof Error ? err.message : 'Không thể tạo booking');
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
            <span className="font-semibold">{describePax(paxCounts)}</span>
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
          <nav
            aria-label="Tiến trình đặt vé"
            className="mx-auto flex max-w-2xl items-center justify-center gap-2 overflow-x-auto sm:gap-3 md:gap-4"
          >
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
          </nav>
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
              child={params.child}
              infant={params.infant}
            />
          </ErrorBoundary>
        )}
        {step === 2 && (
          <ErrorBoundary inline variant="booking" retryLabel="Chọn lại chỗ ngồi">
            <SeatSelectionStep
              flight={booking.selectedFlight!}
              passengers={booking.passengers}
              initialSeats={booking.selectedSeats}
              initialAncillaries={booking.ancillaries}
              onConfirm={handleSeatContinue}
              onBack={() => goStep(1)}
            />
          </ErrorBoundary>
        )}
        {step === 3 && (
          <ErrorBoundary inline variant="booking" retryLabel="Nhập lại thông tin">
            <PassengerInfoStep
              flight={booking.selectedFlight!}
              passengerCount={booking.passengers.length}
              initialPassengers={booking.passengers}
              seatFee={selectedSeatPrices.reduce((sum, price) => sum + price, 0)}
              ancillaries={booking.ancillaries}
              onSubmit={handlePassengerSubmit}
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
