'use client';
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/shared/components/ui';
import { FlightResultsStep } from '@/features/flights';
import PassengerInfoStep from './PassengerInfoStep';
import AncillaryServicesStep from './AncillaryServicesStep';
import SeatSelectionDrawer from './SeatSelectionDrawer';
import BaggageSelectionDrawer from './BaggageSelectionDrawer';
import InsuranceDrawer from './InsuranceDrawer';
import MealSelectionDrawer from './MealSelectionDrawer';
import PetServiceDrawer from './PetServiceDrawer';
import PassengerServicesDrawer from './PassengerServicesDrawer';
import TaxiServiceDrawer from './TaxiServiceDrawer';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { ErrorBoundary } from '@/shared/components/feedback';
import { createBooking } from '@/features/bookings/services';
import { ApiRequestError } from '@/shared/services';
import {
  getBookingTotals,
  TRAVEL_SAFE_INSURANCE_PRICE,
  type BookingConsents,
  type Flight,
  type Passenger,
  type PassengerType,
  type BookingState,
  type SearchParams,
} from '@/features/bookings';

const STEPS = [
  { id: 1, label: 'Chọn chuyến bay' },
  { id: 2, label: 'Thông tin hành khách' },
  { id: 3, label: 'Dịch vụ bổ sung' },
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

export interface FlightBookingClientProps {
  onFlightSelect?: (
    flightNo: string,
    fareClass: string,
    fare: number,
    fares?: Partial<Record<string, number>>,
    flight?: { departTime?: string; arriveTime?: string }
  ) => void;
  continueSignal?: number;
  onStepChange?: (step: number) => void;
  onPaxCountsChange?: (counts: Record<PassengerType, number>) => void;
}

function FlightBookingClientInner({
  onFlightSelect,
  continueSignal,
  onStepChange,
  onPaxCountsChange,
}: FlightBookingClientProps) {
  const searchParams = useSearchParams();
  const params: SearchParams = {
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    depart: searchParams.get('depart') || undefined,
    return: searchParams.get('return') || undefined,
    pax: searchParams.get('pax') || searchParams.get('adult') || undefined,
    child: searchParams.get('child') || undefined,
    infant: searchParams.get('infant') || undefined,
    cheapest: searchParams.get('cheapest') || undefined,
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
    selectedBaggage: null,
    hasInsurance: false,
  }));
  const [selectedSeatPrices, setSelectedSeatPrices] = useState<number[]>([]);
  const [baggageFee, setBaggageFee] = useState<number>(0);
  const [baggageLabel, setBaggageLabel] = useState<string>('');
  const [isSeatDrawerOpen, setIsSeatDrawerOpen] = useState(false);
  const [isBaggageDrawerOpen, setIsBaggageDrawerOpen] = useState(false);
  const [isMealDrawerOpen, setIsMealDrawerOpen] = useState(false);
  const [isInsuranceDrawerOpen, setIsInsuranceDrawerOpen] = useState(false);
  const [isPassengerServicesDrawerOpen, setIsPassengerServicesDrawerOpen] = useState(false);
  const [isPetDrawerOpen, setIsPetDrawerOpen] = useState(false);
  const [isTaxiDrawerOpen, setIsTaxiDrawerOpen] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState<Record<string, number>>({});
  const [mealFee, setMealFee] = useState<number>(0);
  const [consents, setConsents] = useState<BookingConsents>({
    marketing: false,
    survey: false,
    retainForFutureBooking: false,
    policyAccepted: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const toast = useToast();

  const goStep = (next: number) => {
    setStep(next);
    onStepChange?.(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Signal từ nút "Đi tiếp" ở panel bên ngoài → chuyển sang bước 2.
  const stateRef = useRef({ step, selected: booking.selectedFlight });
  stateRef.current = { step, selected: booking.selectedFlight };
  // goStep là hàm tạo mới mỗi render — giữ qua ref để effect không phụ thuộc nó
  // (thêm vào deps sẽ khiến effect chạy lại mỗi render và tự chuyển bước liên tục).
  const goStepRef = useRef(goStep);
  goStepRef.current = goStep;
  useEffect(() => {
    if (continueSignal && continueSignal > 0) {
      if (!stateRef.current.selected) {
        toast.error('Chưa chọn chuyến bay', 'Vui lòng chọn chuyến bay trước khi bấm Đi tiếp.');
        return;
      }
      if (stateRef.current.step === 1) {
        goStepRef.current(2);
      } else if (stateRef.current.step === 2) {
        goStepRef.current(3);
      }
    }
  }, [continueSignal, toast]);

  const handleFlightSelect = (flight: Flight) => {
    setBooking((b) => ({
      ...b,
      selectedFlight: flight,
      selectedSeats: [],
      ancillaries: [],
    }));
    setSelectedSeatPrices([]);
    if (continueSignal === undefined) {
      goStep(2);
    }
    toast.success(
      'Chuyến bay đã được chọn!',
      `${flight.flightNo}: ${flight.fromCity} → ${flight.toCity} lúc ${flight.departTime}`
    );
  };

  const handlePassengersChange = (newPassengers: Passenger[]) => {
    setBooking((b) => ({ ...b, passengers: newPassengers }));
    onPaxCountsChange?.(countByType(newPassengers));
  };

  const handlePassengerSubmit = (passengers: Passenger[], newConsents: BookingConsents) => {
    setBooking((b) => ({ ...b, passengers }));
    setConsents(newConsents);
    onPaxCountsChange?.(countByType(passengers));
    goStep(3);
    toast.success(
      'Đã lưu thông tin hành khách!',
      'Vui lòng chọn dịch vụ bổ sung trước khi hoàn tất đặt vé.'
    );
  };

  const handleConfirmSeats = (seats: string[], seatFee: number) => {
    setBooking((b) => ({ ...b, selectedSeats: seats }));
    setSelectedSeatPrices(seats.length > 0 ? [seatFee] : []);
    if (seats.length > 0) {
      toast.success('Đã chọn chỗ ngồi!', `Ghế: ${seats.join(', ')}`);
    }
  };

  const handleConfirmBaggage = (packageId: string | null, fee: number, label: string) => {
    setBooking((b) => ({ ...b, selectedBaggage: packageId }));
    setBaggageFee(fee);
    setBaggageLabel(label);
    if (fee > 0) {
      toast.success('Đã chọn gói hành lý!', label);
    }
  };

  const handleConfirmInsurance = (enabled: boolean) => {
    setBooking((b) => ({ ...b, hasInsurance: enabled }));
    if (enabled) {
      toast.success(
        'Đã chọn Bảo hiểm Travel Safe!',
        `${TRAVEL_SAFE_INSURANCE_PRICE.toLocaleString('vi-VN')} VND`
      );
    }
  };

  const handleConfirmMeals = (meals: Record<string, number>, totalFee: number) => {
    setSelectedMeals(meals);
    setMealFee(totalFee);
    if (totalFee > 0) {
      const count = Object.values(meals).reduce((a, b) => a + b, 0);
      toast.success('Đã chọn suất ăn!', `${count} suất (${totalFee.toLocaleString('vi-VN')} VND)`);
    }
  };

  const seatFeeTotal = selectedSeatPrices.reduce((sum, price) => sum + price, 0);
  const insuranceFeeTotal = booking.hasInsurance ? TRAVEL_SAFE_INSURANCE_PRICE : 0;
  const currentFlight = booking.selectedFlight;

  const baseTotals = currentFlight
    ? getBookingTotals({
        farePerPassenger: currentFlight.price,
        passengerCount: booking.passengers.length,
        paxCounts: countByType(booking.passengers),
        seatFee: seatFeeTotal,
        ancillaries: booking.ancillaries,
      })
    : null;

  const finalTotal = (baseTotals?.total ?? 0) + baggageFee + insuranceFeeTotal + mealFee;

  const handleFinalBookingSubmit = async () => {
    try {
      setIsSubmitting(true);
      const selectedFlight = booking.selectedFlight;
      const flightId = selectedFlight?.id;
      if (!selectedFlight || !flightId) {
        toast.error('Lỗi đặt chỗ', 'Vui lòng chọn chuyến bay trước.');
        return;
      }

      const seats = booking.selectedSeats;
      const ancillaries = [...booking.ancillaries];
      if (baggageFee > 0) ancillaries.push('baggage');
      if (booking.hasInsurance) ancillaries.push('insurance');

      const data = await createBooking({
        flight_id: flightId,
        total_price: finalTotal,
        passengers: booking.passengers,
        seats,
        fareClass: selectedFlight.fareClass ?? 'eco',
        ancillaries,
        consents,
      });
      const bookingId = data.booking.id;

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
          date: selectedFlight.departDate,
          passengers: booking.passengers.map((passenger, index) => ({
            name: passenger.name,
            seat: seats[index],
          })),
          fareSubtotal: baseTotals?.fareSubtotal ?? 0,
          tax: baseTotals?.taxAndFee ?? 0,
          seatFee: seatFeeTotal,
          baggageFee,
          insuranceFee: insuranceFeeTotal,
          total: finalTotal,
        })
      );

      toast.success(
        'Đặt chỗ thành công!',
        `Mã đặt chỗ: ${bookingId}. Đang chuyển đến thanh toán...`,
        { duration: 3000 }
      );
      setTimeout(() => router.push(`/thanh-toan?bookingId=${bookingId}`), 800);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        toast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để hoàn tất đặt vé.');
        const target = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/dang-nhap?redirect=${target}`);
        return;
      }
      toast.error('Lỗi đặt chỗ', err instanceof Error ? err.message : 'Không thể tạo booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (isoDate: string) => {
    if (!isoDate || isoDate === params.depart) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('depart', isoDate);
    router.replace(`/tim-ve?${next.toString()}`, { scroll: false });
  };

  const leadPassengerName = booking.passengers[0]?.name?.trim() || 'LONG CHIN';

  return (
    <div className="font-body">
      {/* Booking progress steps (visually hidden, 4 circular steps are in top strip) */}
      <div className="sr-only">
        <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4 md:px-6">
          <nav
            aria-label="Tiến trình đặt vé"
            className="mx-auto flex max-w-2xl items-center justify-center gap-2 overflow-x-auto sm:gap-3 md:gap-4"
          >
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-2xs sm:text-xs md:text-sm font-black transition-all flex-shrink-0"
                    style={{
                      background:
                        step > s.id
                          ? 'rgb(var(--primary-rgb) / 0.12)'
                          : step === s.id
                            ? 'var(--primary)'
                            : 'var(--surface-2)',
                      color:
                        step > s.id
                          ? 'var(--primary)'
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
                    className="text-2xs sm:text-xs md:text-sm font-semibold hidden sm:block transition-colors"
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
                    className="flex-1 h-0.5 min-w-6 sm:min-w-8 md:min-w-12 max-w-10 sm:max-w-12 md:max-w-16 transition-colors flex-shrink-0"
                    style={{
                      background:
                        step > s.id + 1
                          ? 'var(--primary)'
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

      {/* Step Content */}
      <div className="mx-auto max-w-5xl">
        {step === 1 && (
          <ErrorBoundary inline variant="api" retryLabel="Tìm lại chuyến bay">
            <FlightResultsStep
              onSelect={handleFlightSelect}
              onFlightSelect={onFlightSelect}
              search={params}
              onDateChange={handleDateChange}
              pax={params.pax}
              child={params.child}
              infant={params.infant}
            />
          </ErrorBoundary>
        )}

        {step === 2 && booking.selectedFlight && (
          <ErrorBoundary inline variant="booking" retryLabel="Nhập lại thông tin">
            <PassengerInfoStep
              flight={booking.selectedFlight}
              passengerCount={booking.passengers.length}
              initialPassengers={booking.passengers}
              seatFee={seatFeeTotal}
              ancillaries={booking.ancillaries}
              onSubmit={handlePassengerSubmit}
              onBack={() => goStep(1)}
              onPassengersChange={handlePassengersChange}
            />
          </ErrorBoundary>
        )}

        {step === 3 && booking.selectedFlight && (
          <ErrorBoundary inline variant="booking" retryLabel="Thử lại dịch vụ bổ sung">
            <AncillaryServicesStep
              flight={booking.selectedFlight}
              passengerName={leadPassengerName}
              selectedSeats={booking.selectedSeats}
              seatFee={seatFeeTotal}
              baggageLabel={baggageLabel}
              baggageFee={baggageFee}
              hasInsurance={booking.hasInsurance}
              insuranceFee={TRAVEL_SAFE_INSURANCE_PRICE}
              mealFee={mealFee}
              mealCount={Object.values(selectedMeals).reduce((a, b) => a + b, 0)}
              totalAmount={finalTotal}
              onOpenSeatDrawer={() => setIsSeatDrawerOpen(true)}
              onOpenBaggageDrawer={() => setIsBaggageDrawerOpen(true)}
              onOpenMealDrawer={() => setIsMealDrawerOpen(true)}
              onOpenTaxiDrawer={() => setIsTaxiDrawerOpen(true)}
              onOpenInsuranceDrawer={() => setIsInsuranceDrawerOpen(true)}
              onOpenPassengerServicesDrawer={() => setIsPassengerServicesDrawerOpen(true)}
              onOpenPetDrawer={() => setIsPetDrawerOpen(true)}
              onBack={() => goStep(2)}
              onContinue={handleFinalBookingSubmit}
              isSubmitting={isSubmitting}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Drawer 1: Chọn chỗ ngồi */}
      {booking.selectedFlight && (
        <SeatSelectionDrawer
          isOpen={isSeatDrawerOpen}
          onClose={() => setIsSeatDrawerOpen(false)}
          flight={booking.selectedFlight}
          passengerName={leadPassengerName}
          initialSeats={booking.selectedSeats}
          onConfirmSeats={handleConfirmSeats}
          isRoundTrip={Boolean(params.return)}
        />
      )}

      {/* Drawer 2: Chọn hành lý */}
      {booking.selectedFlight && (
        <BaggageSelectionDrawer
          isOpen={isBaggageDrawerOpen}
          onClose={() => setIsBaggageDrawerOpen(false)}
          flight={booking.selectedFlight}
          passengerName={leadPassengerName}
          initialPackageId={booking.selectedBaggage}
          onConfirmBaggage={handleConfirmBaggage}
          isRoundTrip={Boolean(params.return)}
        />
      )}

      {/* Drawer 3: Chọn suất ăn */}
      {booking.selectedFlight && (
        <MealSelectionDrawer
          isOpen={isMealDrawerOpen}
          onClose={() => setIsMealDrawerOpen(false)}
          flight={booking.selectedFlight}
          passengerName={leadPassengerName}
          initialMeals={selectedMeals}
          onConfirmMeals={handleConfirmMeals}
          isRoundTrip={Boolean(params.return)}
        />
      )}

      {/* Drawer 4: Bảo hiểm du lịch Vietjet Travel Safe */}
      {booking.selectedFlight && (
        <InsuranceDrawer
          isOpen={isInsuranceDrawerOpen}
          onClose={() => setIsInsuranceDrawerOpen(false)}
          flight={booking.selectedFlight}
          hasInsurance={Boolean(booking.hasInsurance)}
          onConfirmInsurance={handleConfirmInsurance}
        />
      )}

      {/* Drawer 5: Dịch vụ theo hành khách */}
      {booking.selectedFlight && (
        <PassengerServicesDrawer
          isOpen={isPassengerServicesDrawerOpen}
          onClose={() => setIsPassengerServicesDrawerOpen(false)}
          flight={booking.selectedFlight}
          passengerName={leadPassengerName}
          isRoundTrip={Boolean(params.return)}
        />
      )}

      {/* Drawer 6: Mang theo thú cưng */}
      {booking.selectedFlight && (
        <PetServiceDrawer
          isOpen={isPetDrawerOpen}
          onClose={() => setIsPetDrawerOpen(false)}
          flight={booking.selectedFlight}
          passengerName={leadPassengerName}
          isRoundTrip={Boolean(params.return)}
        />
      )}

      {/* Drawer 7: Dịch vụ Taxi */}
      {booking.selectedFlight && (
        <TaxiServiceDrawer
          isOpen={isTaxiDrawerOpen}
          onClose={() => setIsTaxiDrawerOpen(false)}
          flight={booking.selectedFlight}
        />
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </div>
  );
}

export default function FlightBookingClient({
  onFlightSelect,
  continueSignal,
  onStepChange,
}: FlightBookingClientProps) {
  return (
    <Suspense fallback={<FlightSearchSkeleton />}>
      <FlightBookingClientInner
        onFlightSelect={onFlightSelect}
        continueSignal={continueSignal}
        onStepChange={onStepChange}
      />
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
