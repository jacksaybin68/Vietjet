'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlightBookingClient } from '@/features/bookings';
import { PASSENGER_TYPE_LABELS, type PassengerType } from '@/features/bookings';
import { getAirportCity } from '@/features/flights';
import { FareBenefitsModal } from '@/features/flights';
import type { FareClassId } from '@/features/bookings/pricing';
import { Icon } from '@/shared/components/ui';
import BookingSummaryPanel from './BookingSummaryPanel';
import PassengerDetailModal from './PassengerDetailModal';

/** "2 Người lớn, 1 Trẻ em" — only the categories actually on the booking. */
function describePax(counts: Record<PassengerType, number>): string {
  return (['adult', 'child', 'infant'] as const)
    .filter((type) => counts[type] > 0)
    .map((type) => `${counts[type]} ${PASSENGER_TYPE_LABELS[type]}`)
    .join(', ');
}

interface FlightBookingResultsWrapperProps {
  trip: string;
  date: string;
}

interface SelectedBooking {
  flightNo: string;
  /** Normalised bucket id — `ECO` · `DELUXE` · `SKYBOSS` · `BUSINESS`. */
  fareClass: string;
  fare: number;
  tax: number;
  total: number;
  /** Eco fare of the same flight; every tab switch re-prices from this base. */
  baseFare: number;
  /**
   * The four prices the card printed for this flight. Held verbatim so a tab
   * switch shows exactly what the card showed, instead of a number derived from
   * a multiplier that never matched the stored fare ladder.
   */
  fares?: Partial<Record<FareClassId, number>>;
  departTime?: string;
  arriveTime?: string;
}

/** Card ids arrive lowercase (`eco`), the tabs speak uppercase (`ECO`). */
const FARE_CLASS_ALIASES: Record<string, string> = {
  economy: 'ECO',
  eco: 'ECO',
  ECO: 'ECO',
  deluxe: 'DELUXE',
  DELUXE: 'DELUXE',
  skyboss: 'SKYBOSS',
  SKYBOSS: 'SKYBOSS',
  business: 'BUSINESS',
  biz: 'BUSINESS',
  BUSINESS: 'BUSINESS',
  BIZ: 'BUSINESS',
};

function normalizeFareClass(fareClass: string): string {
  return FARE_CLASS_ALIASES[fareClass] ?? fareClass.toUpperCase();
}

/**
 * Fallback step between buckets, used only when a selection carries no ladder
 * (an older caller that hands over a bare price). The ladder itself comes from
 * the results card, which prices from the `flights` row.
 */
const FARE_CLASS_MULTIPLIER: Record<string, number> = {
  ECO: 1,
  DELUXE: 1.3,
  SKYBOSS: 1.7,
  BUSINESS: 2.77,
  BIZ: 2.77,
};

export default function FlightBookingResultsWrapper({
  trip,
  date: _date,
}: FlightBookingResultsWrapperProps) {
  const searchParams = useSearchParams();
  const departParam = searchParams.get('depart');
  const returnParam = searchParams.get('return');
  /** Khứ hồi chỉ tồn tại khi form tìm kiếm có ngày về (`return`). */
  const isRoundTrip = Boolean(returnParam);
  /** State key for the leg above — `return` reads better as `inbound` here. */
  const bookingKey = isRoundTrip && searchParams.get('leg') === 'return' ? 'inbound' : 'outbound';

  /** Passenger mix from the search, for the yellow trip strip under the header. */
  const [paxCounts, setPaxCounts] = useState<Record<PassengerType, number>>(() => ({
    adult: Number(searchParams.get('adult') ?? searchParams.get('pax') ?? 1) || 1,
    child: Number(searchParams.get('child') ?? 0) || 0,
    infant: Number(searchParams.get('infant') ?? 0) || 0,
  }));
  const tripLabel = isRoundTrip ? 'Chuyến bay khứ hồi' : 'Chuyến bay một chiều';

  const [bookings, setBookings] = useState<Record<'outbound' | 'inbound', SelectedBooking | null>>({
    outbound: null,
    inbound: null,
  });
  const [continueSignal, setContinueSignal] = useState(0);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isPaxDropdownOpen, setIsPaxDropdownOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  /** Tổng tiền do bước con báo lên — panel tổng tính từ `bookings`, thanh đáy
      tính từ đây, nên hai nơi phải lấy cùng một nguồn. */
  const [clientTotal, setClientTotal] = useState<number>(0);

  const paxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaxDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!paxRef.current?.contains(e.target as Node)) {
        setIsPaxDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPaxDropdownOpen]);

  const selectedBooking = bookings[bookingKey];

  const handlePaxCountsChange = useCallback(
    (newPax: Record<PassengerType, number>) => {
      setPaxCounts(newPax);
      // Đổi số hành khách phải tính lại giá của chuyến đã chọn: giá vé trên
      // panel và trên thanh đáy là của TRẠNG THÁI HIỆN TẠI, không phải của
      // trạng thái lúc bấm chọn. Trẻ em tính 75% (khớp `pricing.ts`).
      setBookings((prev) => {
        const next = { ...prev };
        (['outbound', 'inbound'] as const).forEach((key) => {
          const item = next[key];
          if (item) {
            const currentWeight = paxCounts.adult + paxCounts.child * 0.75 || 1;
            const unitFare = item.fare / currentWeight;
            const nextWeight = newPax.adult + newPax.child * 0.75;
            const nextFare = Math.round(unitFare * nextWeight);
            const nextTax = 581581 * (newPax.adult || 1);
            next[key] = {
              ...item,
              fare: nextFare,
              tax: nextTax,
              total: nextFare + nextTax,
            };
          }
        });
        return next;
      });
    },
    [paxCounts.adult, paxCounts.child]
  );

  const handleFlightSelect = useCallback(
    (
      flightNo: string,
      fareClass: string,
      fare: number,
      fares?: Partial<Record<FareClassId, number>>,
      flight?: { departTime?: string; arriveTime?: string },
      leg: 'outbound' | 'inbound' = 'outbound'
    ) => {
      const normalized = normalizeFareClass(fareClass);
      const tax = 581581 * (paxCounts.adult || 1);
      const baseFare = fares?.eco ?? Math.round(fare / (FARE_CLASS_MULTIPLIER[normalized] ?? 1));
      const legFlight = {
        flightNo,
        fareClass: normalized,
        fare,
        tax,
        total: fare + tax,
        baseFare,
        fares,
        departTime: flight?.departTime || (leg === 'outbound' ? '06:00' : '18:30'),
        arriveTime: flight?.arriveTime || (leg === 'outbound' ? '08:15' : '20:45'),
      };

      setBookings((prev) => ({
        ...prev,
        [leg]: legFlight,
      }));
    },
    [paxCounts.adult]
  );

  const handleContinue = useCallback(() => {
    setContinueSignal((n) => n + 1);
    setBookingStep((prev) => prev + 1);
  }, []);

  const [outboundFrom, outboundTo] = trip.split('→').map((part) => part.trim());
  const returnTrip = [outboundTo, outboundFrom].filter(Boolean).join(' → ');
  const formatDay = (iso?: string | null) => {
    if (!iso) return '--/--/----';
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    // Tiêu đề bước trên mobile: rút ngắn vì thanh header chỉ còn ~230px bề
    // rộng cho chữ (logo + nút menu), nên "LỰA CHỌN CHUYẾN BAY" bị cắt thành
    // "LỰA CHỌN CHUYẾN …". Desktop không dùng chuỗi này.
    const titles: Record<number, string> = {
      1: 'CHỌN CHUYẾN BAY',
      2: 'THÔNG TIN KHÁCH',
      3: 'CHỌN DỊCH VỤ',
      4: 'THANH TOÁN',
    };
    const title = titles[bookingStep] || 'CHỌN CHUYẾN BAY';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vj-booking-step-title', { detail: title }));
    }
  }, [bookingStep]);

  const flightBaseAmount =
    (bookings.outbound?.total ?? 0) + (isRoundTrip ? (bookings.inbound?.total ?? 0) : 0);
  const totalBookingAmount = Math.max(clientTotal, flightBaseAmount);

  return (
    <>
      {/* Trip strip under header */}
      <div className="bg-accent text-gray-950 shadow-sm" data-testid="trip-board">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-x-3 px-3 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm lg:px-8">
          <div className="flex items-center gap-1">
            <span className="font-black uppercase tracking-wide">{tripLabel}</span>
            <span className="opacity-50">|</span>
            <div className="relative inline-block" ref={paxRef}>
              <button
                type="button"
                onClick={() => setIsPaxDropdownOpen((v) => !v)}
                className="inline-flex items-center gap-1 hover:underline cursor-pointer bg-black/10 hover:bg-black/15 px-2 py-0.5 rounded transition-colors focus:outline-none focus:ring-0"
                title="Thay đổi số lượng hành khách"
              >
                <span>{describePax(paxCounts)}</span>
                <span className="text-2xs opacity-70">▼</span>
              </button>

              {isPaxDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-vj bg-white p-4 shadow-xl border border-gray-200 text-gray-800 text-xs">
                  <div className="font-bold text-xs text-gray-900 mb-3 pb-2 border-b border-gray-100 flex justify-between items-center">
                    <span>Chọn số lượng hành khách</span>
                    <button
                      type="button"
                      onClick={() => setIsPaxDropdownOpen(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 font-normal">
                    {/* Người lớn */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">Người lớn :</div>
                        <div className="text-2xs text-gray-400">12 tuổi trở lên</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (paxCounts.adult > 1) {
                              setPaxCounts((prev) => ({ ...prev, adult: prev.adult - 1 }));
                            }
                          }}
                          disabled={paxCounts.adult <= 1}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-bold text-gray-900">
                          {paxCounts.adult}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const total = paxCounts.adult + paxCounts.child + paxCounts.infant;
                            if (total < 9) {
                              setPaxCounts((prev) => ({
                                ...prev,
                                adult: prev.adult + 1,
                              }));
                            }
                          }}
                          disabled={paxCounts.adult + paxCounts.child + paxCounts.infant >= 9}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Trẻ em */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">Trẻ em :</div>
                        <div className="text-2xs text-gray-400">2 - 11 tuổi (75%)</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (paxCounts.child > 0) {
                              setPaxCounts((prev) => ({ ...prev, child: prev.child - 1 }));
                            }
                          }}
                          disabled={paxCounts.child <= 0}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-bold text-gray-900">
                          {paxCounts.child}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const total = paxCounts.adult + paxCounts.child + paxCounts.infant;
                            if (total < 9 && paxCounts.child < paxCounts.adult * 2) {
                              setPaxCounts((prev) => ({
                                ...prev,
                                child: prev.child + 1,
                              }));
                            }
                          }}
                          disabled={
                            paxCounts.adult + paxCounts.child + paxCounts.infant >= 9 ||
                            paxCounts.child >= paxCounts.adult * 2
                          }
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Em bé */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">Em bé :</div>
                        <div className="text-2xs text-gray-400">Dưới 2 tuổi (Miễn phí)</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (paxCounts.infant > 0) {
                              setPaxCounts((prev) => ({ ...prev, infant: prev.infant - 1 }));
                            }
                          }}
                          disabled={paxCounts.infant <= 0}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-bold text-gray-900">
                          {paxCounts.infant}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const total = paxCounts.adult + paxCounts.child + paxCounts.infant;
                            if (total < 9 && paxCounts.infant < paxCounts.adult) {
                              setPaxCounts((prev) => ({
                                ...prev,
                                infant: prev.infant + 1,
                              }));
                            }
                          }}
                          disabled={
                            paxCounts.adult + paxCounts.child + paxCounts.infant >= 9 ||
                            paxCounts.infant >= paxCounts.adult
                          }
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPaxDropdownOpen(false)}
                      className="w-full mt-3 py-1.5 bg-primary text-white font-bold rounded-vj hover:bg-red-700 transition-colors cursor-pointer text-center"
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              )}
            </div>
            <span className="mx-1 h-3.5 w-px bg-black/20" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-red-600 bg-red-600" />
              <span className="font-semibold text-gray-800">Điểm khởi hành</span>
              <span className="font-bold text-red-700">
                {searchParams.get('from')
                  ? `${getAirportCity(searchParams.get('from')!)} ( ${searchParams.get('from')!.toUpperCase()} )`
                  : '---'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-green-600 bg-green-600" />
              <span className="font-semibold text-gray-800">Điểm đến</span>
              <span className="font-bold text-red-700">
                {searchParams.get('to')
                  ? `${getAirportCity(searchParams.get('to')!)} ( ${searchParams.get('to')!.toUpperCase()} )`
                  : '---'}
              </span>
            </span>
          </div>

          {/* 4 circular step indicators from sample image */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-xs text-white font-bold transition-all ${
                bookingStep === 1 ? 'bg-vj-step-green' : 'bg-vj-amber'
              }`}
              title="Chọn chuyến bay"
            >
              <Icon name="PaperAirplaneIcon" size={12} className="rotate-45" />
            </div>
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-xs text-white font-bold transition-all ${
                bookingStep === 2 ? 'bg-vj-step-green' : 'bg-vj-amber'
              }`}
              title="Thông tin hành khách"
            >
              <Icon name="UserIcon" size={12} />
            </div>
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-xs text-white font-bold transition-all ${
                bookingStep === 3 ? 'bg-vj-step-green' : 'bg-vj-amber'
              }`}
              title="Dịch vụ bổ sung"
            >
              <Icon name="ShoppingCartIcon" size={12} />
            </div>
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-xs text-white font-bold transition-all ${
                bookingStep === 4 ? 'bg-vj-step-green' : 'bg-vj-amber'
              }`}
              title="Thanh toán"
            >
              <span className="font-black text-xs leading-none">$</span>
            </div>
          </div>
        </div>
      </div>

      {/* Khung nội dung — số đo site thật (13/11/2026, 1440×900):
          vùng nội dung `1200px` (x=120…1320 ở viewport 1440) = cột trái `820px`
          (padding trong `15px`) + panel phải `380px` (x=940…1320).
          Vì vậy container là `max-w-[1200px]` không padding ngang ở desktop
          (padding ngang chỉ dành cho mobile). */}
      <div className="mx-auto w-full max-w-[1200px] px-[15px] lg:px-0 pt-3 sm:pt-5 pb-24 sm:pb-28 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row items-start w-full">
          {/* Cột trái: danh sách chuyến bay (ô 820px ở desktop) */}
          {/* `w-full` là bắt buộc ở mobile: parent dùng `items-start`, nên cột
              con không tự giãn theo bề rộng container — nó lấy bề rộng nội
              dung. Không có `w-full`, lưới 4 cột giá đẩy cột này rộng ~658px
              trong viewport 390px và bị `overflow-x-hidden` của wrapper cắt mất
              (giá vé của các hạng bên phải không chạm được trên điện thoại). */}
          <div className="w-full lg:w-[820px] lg:flex-none min-w-0">
            {/* H1 cột trái — site thật (đo 13/11/2026, 1440×900): nền đỏ,
                chữ trắng 16px/700 JambonoMedium uppercase. Nằm NGOÀI lớp
                padding 15px của cột để mép trái khớp x=120 (nội dung chuyến
                bay), giống dải dịch vụ phụ của header. Ở mobile tiêu đề đã
                nằm trong băng đỏ của header nên bản này chỉ hiện từ `lg`. */}
            <h1 className="hidden lg:block mb-2 rounded-vj bg-primary px-4 py-2.5 text-base font-bold font-jambono uppercase text-white tracking-normal">
              Lựa chọn chuyến bay
            </h1>
            <div className="lg:px-[15px]">
              <FlightBookingClient
                continueSignal={continueSignal}
                onFlightSelect={handleFlightSelect}
                onStepChange={setBookingStep}
                onPaxCountsChange={handlePaxCountsChange}
                baseTotal={flightBaseAmount}
                onTotalChange={setClientTotal}
              />
            </div>
          </div>

          {/* Cột phải: panel thông tin đặt chỗ 380px (x=940…1320 ở 1440) */}
          <div className="lg:w-[380px] lg:flex-none min-w-0">
            <BookingSummaryPanel
              data={{
                trip,
                date: formatDay(departParam),
                flightNo: bookings.outbound?.flightNo,
                fareClass: bookings.outbound?.fareClass,
                fare: bookings.outbound?.fare ?? 0,
                tax: bookings.outbound?.tax ?? 0,
                serviceFee: 0,
                departTime: bookings.outbound?.departTime,
                arriveTime: bookings.outbound?.arriveTime,
                total: bookings.outbound?.total ?? 0,
                isRoundTrip,
                paxCounts,
                returnLeg: isRoundTrip
                  ? {
                      trip: returnTrip,
                      date: formatDay(returnParam),
                      flightNo: bookings.inbound?.flightNo,
                      fareClass: bookings.inbound?.fareClass,
                      fare: bookings.inbound?.fare ?? 0,
                      tax: bookings.inbound?.tax ?? 0,
                      departTime: bookings.inbound?.departTime,
                      arriveTime: bookings.inbound?.arriveTime,
                      total: bookings.inbound?.total ?? 0,
                    }
                  : undefined,
              }}
              onContinue={handleContinue}
              canContinue={bookings.outbound !== null}
            />
          </div>
        </div>
      </div>

      {/* Bottom bars for Step 1 (Flight Selection) */}
      {bookingStep === 1 && (
        <>
          {/* Desktop Sticky Bottom Bar */}
          <div className="hidden sm:block fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4 sm:px-8">
            <div className="mx-auto max-w-[1200px] flex items-center justify-between">
              <div className="flex-1 flex flex-col items-center">
                {/* "Tổng tiền" 20px/600, giá 22px/700 Jambono (đo 13/11/2026) */}
                <span className="text-2xl3 font-semibold text-gray-800 font-koho">Tổng tiền</span>
                <span className="text-xl4 font-bold font-jambono text-primary leading-none">
                  {totalBookingAmount.toLocaleString('vi-VN')} VND
                </span>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!bookings.outbound}
                className="vj-cta disabled:opacity-50 disabled:cursor-not-allowed h-[39px] min-h-[39px] px-6 rounded-vj font-koho text-sm font-medium uppercase tracking-normal transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Đi tiếp
              </button>
            </div>
          </div>

          {/* Mobile Floating "Đi tiếp" button matching Screenshot */}
          <div className="sm:hidden fixed bottom-5 left-0 right-0 z-[60] flex justify-center pointer-events-none px-4">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!bookings.outbound}
              className="vj-cta pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed text-base px-16 py-3 rounded-vj shadow-[0_8px_20px_rgba(0,0,0,0.2)] border border-yellow-400 active:scale-95 transition-all cursor-pointer"
            >
              Đi tiếp
            </button>
          </div>

          {/* Red bottom accent stripe matching sample image */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 h-2 bg-primary-dark z-50 pointer-events-none" />
        </>
      )}

      {/* Bảng so sánh 4 hạng vé */}
      <FareBenefitsModal
        open={showBenefitsModal}
        onClose={() => setShowBenefitsModal(false)}
        prices={selectedBooking?.fares}
      />

      {/* Modal Thông tin đặt chỗ (Screenshot 7) */}
      <PassengerDetailModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        outboundFare={bookings.outbound?.fare ?? 1220400}
        inboundFare={bookings.inbound?.fare ?? 549720}
        outboundTax={bookings.outbound?.tax ?? 581581}
        inboundTax={bookings.inbound?.tax ?? 581581}
        outboundFlightNo={bookings.outbound?.flightNo ?? 'VJ141'}
        inboundFlightNo={bookings.inbound?.flightNo ?? 'VJ134'}
        isRoundTrip={isRoundTrip}
      />
    </>
  );
}
