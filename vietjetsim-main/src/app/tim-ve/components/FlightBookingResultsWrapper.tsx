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
  }, []);

  const [outboundFrom, outboundTo] = trip.split('→').map((part) => part.trim());
  const returnTrip = [outboundTo, outboundFrom].filter(Boolean).join(' → ');
  const formatDay = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '--/--/----';

  const [bookingStep, setBookingStep] = useState(1);

  useEffect(() => {
    const titles: Record<number, string> = {
      1: 'LỰA CHỌN CHUYẾN BAY',
      2: 'THÔNG TIN HÀNH KHÁCH',
      3: 'LỰA CHỌN DỊCH VỤ',
      4: 'THANH TOÁN',
    };
    const title = titles[bookingStep] || 'LỰA CHỌN CHUYẾN BAY';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vj-booking-step-title', { detail: title }));
    }
  }, [bookingStep]);

  const totalBookingAmount =
    (bookings.outbound?.total ?? 0) + (isRoundTrip ? (bookings.inbound?.total ?? 0) : 0);

  return (
    <>
      {/* Trip strip — full-bleed brand-yellow band directly under the red header */}
      <div className="bg-[#FFCC00] text-gray-950 shadow-sm" data-testid="trip-board">
        <div className="mx-auto flex max-w-[1368px] items-center justify-between gap-x-3 px-3 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm lg:px-8">
          {/* Mobile "Tổng [X] VND ▾" button matching Screenshot 3 & 4 */}
          <div className="flex sm:hidden items-center">
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="bg-white rounded-full px-3 py-1 text-xs font-black text-gray-900 flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
            >
              <span>Tổng</span>
              <span className="text-red-600 font-black">
                {totalBookingAmount > 0
                  ? `${totalBookingAmount.toLocaleString('vi-VN')} VND`
                  : '0 VND'}
              </span>
              <span className="text-3xs text-gray-500">▾</span>
            </button>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
            <span className="font-black uppercase tracking-wide">{tripLabel}</span>
            <span className="opacity-50">|</span>
            <div className="relative inline-block" ref={paxRef}>
              <button
                type="button"
                onClick={() => setIsPaxDropdownOpen((v) => !v)}
                className="inline-flex items-center gap-1 hover:underline cursor-pointer bg-black/10 hover:bg-black/15 px-2 py-0.5 rounded transition-colors"
                title="Thay đổi số lượng hành khách"
              >
                <span>{describePax(paxCounts)}</span>
                <span className="text-2xs opacity-70">▼</span>
              </button>

              {isPaxDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl bg-white p-4 shadow-xl border border-gray-200 text-gray-800 text-xs">
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
                              handlePaxCountsChange({ ...paxCounts, adult: paxCounts.adult - 1 });
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
                              handlePaxCountsChange({ ...paxCounts, adult: paxCounts.adult + 1 });
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
                              handlePaxCountsChange({ ...paxCounts, child: paxCounts.child - 1 });
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
                              handlePaxCountsChange({ ...paxCounts, child: paxCounts.child + 1 });
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
                              handlePaxCountsChange({ ...paxCounts, infant: paxCounts.infant - 1 });
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
                              handlePaxCountsChange({ ...paxCounts, infant: paxCounts.infant + 1 });
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
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPaxDropdownOpen(false)}
                    className="w-full mt-3 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-center"
                  >
                    Xác nhận
                  </button>
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
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm text-white font-bold ${
                bookingStep === 1
                  ? 'bg-[#54B848]'
                  : 'bg-[#FFCC00] border border-black/10 text-gray-800'
              }`}
              title="Chọn chuyến bay"
            >
              <Icon name="PaperAirplaneIcon" size={13} className="rotate-45" />
            </div>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm text-white font-bold ${
                bookingStep === 2
                  ? 'bg-[#54B848]'
                  : 'bg-[#FFCC00] border border-black/10 text-gray-800'
              }`}
              title="Thông tin hành khách"
            >
              <Icon name="UserIcon" size={13} />
            </div>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm text-white font-bold ${
                bookingStep === 3
                  ? 'bg-[#54B848]'
                  : 'bg-[#FFCC00] border border-black/10 text-gray-800'
              }`}
              title="Dịch vụ bổ sung"
            >
              <Icon name="ShoppingCartIcon" size={13} />
            </div>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm text-white font-bold ${
                bookingStep === 4
                  ? 'bg-[#54B848]'
                  : 'bg-[#FFCC00] border border-black/10 text-gray-800'
              }`}
              title="Thanh toán"
            >
              <span className="font-black text-xs leading-none">$</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1368px] px-4 sm:px-6 lg:px-8 pt-5 pb-24 sm:pb-28">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Cột trái: danh sách chuyến bay (~68%) */}
          <div className="flex-1 lg:w-[68%] min-w-0">
            <FlightBookingClient
              continueSignal={continueSignal}
              onFlightSelect={handleFlightSelect}
              onStepChange={setBookingStep}
              onPaxCountsChange={handlePaxCountsChange}
            />
          </div>

          {/* Cột phải: panel thông tin đặt chỗ (~32%) */}
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

      {/* Sticky Bottom Bar — Tong tien + Di tiep matching sample image */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4 sm:px-8">
        <div className="mx-auto max-w-[1368px] flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center">
            <span className="text-2xs text-gray-500 font-bold uppercase tracking-wider">
              Tổng tiền
            </span>
            <span className="text-xl sm:text-2xl font-black text-gray-900 font-koho leading-none">
              {totalBookingAmount.toLocaleString('vi-VN')} VND
            </span>
          </div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!bookings.outbound}
            className="bg-[#FFCC00] hover:bg-[#FFD200] disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-black text-sm px-10 py-2.5 rounded-full shadow transition-all active:scale-95 cursor-pointer"
          >
            Đi tiếp
          </button>
        </div>
      </div>

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
