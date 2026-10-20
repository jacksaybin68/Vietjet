'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FlightBookingClient } from '@/features/bookings';
import { PASSENGER_TYPE_LABELS, type PassengerType } from '@/features/bookings';
import { getAirportCity } from '@/features/flights';
import { FareBenefitsModal, type FlightSelection } from '@/features/flights';
import type { FareClassId } from '@/features/bookings/pricing';
import { TAX_AND_FEE_RATE } from '@/features/bookings/pricing';
import { RiInformationLine } from 'react-icons/ri';
import { Icon } from '@/shared/components/ui';
import DateStrip from './DateStrip';
import type { DateStripItem } from './DateStrip';
import FareClassTabs from './FareClassTabs';
import BookingSummaryPanel from './BookingSummaryPanel';
import TripLegTabs, { type TripLeg } from './TripLegTabs';

const DAYS_OF_WEEK = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

/** "2 Người lớn, 1 Trẻ em" — only the categories actually on the booking. */
function describePax(counts: Record<PassengerType, number>): string {
  return (['adult', 'child', 'infant'] as const)
    .filter((type) => counts[type] > 0)
    .map((type) => `${counts[type]} ${PASSENGER_TYPE_LABELS[type]}`)
    .join(', ');
}

function generateDateItems(departParam?: string | null): DateStripItem[] {
  let baseDate = new Date();
  if (departParam) {
    const parsed = new Date(departParam);
    if (!isNaN(parsed.getTime())) {
      baseDate = parsed;
    }
  }

  const items: DateStripItem[] = [];
  for (let offset = -2; offset <= 5; offset++) {
    const cur = new Date(baseDate);
    cur.setDate(baseDate.getDate() + offset);
    const iso = cur.toISOString().slice(0, 10);
    const dayName = DAYS_OF_WEEK[cur.getDay()];
    const dateStr = `${cur.getDate()}/${cur.getMonth() + 1}`;
    const daySeed = (cur.getDate() * 7 + cur.getMonth() * 13) % 9;
    const price = 1150000 + daySeed * 60000;

    items.push({
      label: `${dayName} ${dateStr}`,
      value: iso,
      price,
    });
  }
  return items;
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

/** Uppercase tab id → the bucket id the results cards and the modal use. */
const FARE_CLASS_TO_ID: Record<string, FareClassId> = {
  ECO: 'eco',
  DELUXE: 'deluxe',
  SKYBOSS: 'skyboss',
  BUSINESS: 'business',
};

export default function FlightBookingResultsWrapper({
  trip,
  date,
}: FlightBookingResultsWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departParam = searchParams.get('depart');
  const returnParam = searchParams.get('return');
  /** Khứ hồi chỉ tồn tại khi form tìm kiếm có ngày về (`return`). */
  const isRoundTrip = Boolean(returnParam);
  /** Chặng nào đang mở: đi trước, về sau (URL `leg=return`). */
  const leg: TripLeg = isRoundTrip && searchParams.get('leg') === 'return' ? 'return' : 'outbound';
  /** State key for the leg above — `return` reads better as `inbound` here. */
  const bookingKey = leg === 'return' ? 'inbound' : 'outbound';

  /** Passenger mix from the search, for the yellow trip strip under the header. */
  const paxCounts: Record<PassengerType, number> = {
    adult: Number(searchParams.get('pax') ?? 1) || 1,
    child: Number(searchParams.get('child') ?? 0) || 0,
    infant: Number(searchParams.get('infant') ?? 0) || 0,
  };
  const tripLabel = isRoundTrip ? 'Chuyến bay khứ hồi' : 'Chuyến bay một chiều';

  const [bookings, setBookings] = useState<Record<'outbound' | 'inbound', SelectedBooking | null>>({
    outbound: null,
    inbound: null,
  });
  /** Highlighted tab when no flight is held yet, so the row still answers a tap. */
  const [activeFareClass, setActiveFareClass] = useState('ECO');
  const [continueSignal, setContinueSignal] = useState(0);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  /** Which fare name opened the table; undefined = the plain "Quyền lợi" button. */
  const [compareFare, setCompareFare] = useState<FareClassId | undefined>(undefined);

  const dateItems = useMemo(() => generateDateItems(departParam), [departParam]);
  const selectedBooking = bookings[bookingKey];

  const updateUrl = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      router.replace(`/tim-ve?${next.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleDateChange = useCallback(
    (value: string) => {
      // The strip follows the leg on screen, so a return-leg tap rewrites the
      // return date and the outbound departure date stays where it was.
      updateUrl((params) => params.set(leg === 'return' ? 'return' : 'depart', value));
    },
    [updateUrl, leg]
  );

  const handleLegChange = useCallback(
    (next: TripLeg) => {
      updateUrl((params) => {
        if (next === 'return') params.set('leg', 'return');
        else params.delete('leg');
      });
    },
    [updateUrl]
  );

  const handleFlightSelect = useCallback(
    (
      flightNo: string,
      fareClass: string,
      fare: number,
      fares?: Partial<Record<FareClassId, number>>,
      flight?: any
    ) => {
      const normalized = normalizeFareClass(fareClass);
      const tax = 581581 * (paxCounts.adult || 1);
      // The base is the ECO price of this same flight: a Deluxe pick must not
      // become the "Eco" figure the tabs then multiply from.
      const baseFare = fares?.eco ?? Math.round(fare / (FARE_CLASS_MULTIPLIER[normalized] ?? 1));
      setBookings((prev) => ({
        ...prev,
        [bookingKey]: {
          flightNo,
          fareClass: normalized,
          fare,
          tax,
          total: fare + tax,
          baseFare,
          fares,
          departTime: flight?.departTime,
          arriveTime: flight?.arriveTime,
        },
      }));
      setActiveFareClass(normalized);
    },
    [bookingKey, paxCounts.adult]
  );

  const handleFareClassChange = useCallback(
    (fareClass: string) => {
      const normalized = normalizeFareClass(fareClass);
      setActiveFareClass(normalized);
      const current = bookings[bookingKey];
      if (!current) return;
      // Prefer the ladder the card printed; fall back to the Eco-based step only
      // for a selection that arrived without one.
      const fromLadder = current.fares?.[FARE_CLASS_TO_ID[normalized]];
      const fare =
        typeof fromLadder === 'number'
          ? fromLadder
          : Math.round(current.baseFare * (FARE_CLASS_MULTIPLIER[normalized] ?? 1));
      const tax = 581581 * (paxCounts.adult || 1);
      setBookings((prev) => ({
        ...prev,
        [bookingKey]: { ...current, fareClass: normalized, fare, tax, total: fare + tax },
      }));
    },
    [bookings, bookingKey, paxCounts.adult]
  );

  const handleContinue = useCallback(() => {
    setContinueSignal((n) => n + 1);
  }, []);

  // Panel + card highlight for whichever leg is on screen.
  const _selection: FlightSelection | null = selectedBooking
    ? {
        flightNo: selectedBooking.flightNo,
        fareClass:
          FARE_CLASS_TO_ID[selectedBooking.fareClass] ?? selectedBooking.fareClass.toLowerCase(),
        fare: selectedBooking.fare,
        fares: selectedBooking.fares,
      }
    : null;

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

  const totalBookingAmount =
    (bookings.outbound?.total ?? 0) + (isRoundTrip ? (bookings.inbound?.total ?? 0) : 0);

  return (
    <>
      {/* Trip strip — full-bleed brand-yellow band directly under the red header */}
      <div className="bg-[#FFCC00] text-gray-950 shadow-sm" data-testid="trip-board">
        <div className="mx-auto flex max-w-[1368px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 text-xs sm:px-6 sm:text-sm lg:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
            <span className="font-black uppercase tracking-wide">{tripLabel}</span>
            <span className="opacity-50">|</span>
            <span>{describePax(paxCounts)}</span>
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

      <div className="mx-auto max-w-[1368px] px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Cột trái: danh sách chuyến bay (~68%) */}
          <div className="flex-1 lg:w-[68%] min-w-0">
            <FlightBookingClient
              continueSignal={continueSignal}
              onFlightSelect={handleFlightSelect}
              onStepChange={setBookingStep}
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
            canContinue={bookings.outbound !== null && (!isRoundTrip || bookings.inbound !== null)}
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
            disabled={!bookings.outbound || (isRoundTrip && !bookings.inbound)}
            className="bg-[#FFCC00] hover:bg-[#FFD200] disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-black text-sm px-10 py-2.5 rounded-full shadow transition-all active:scale-95"
          >
            Đi tiếp
          </button>
        </div>
      </div>

      {/* Bảng so sánh 4 hạng vé */}
      <FareBenefitsModal
        open={showBenefitsModal}
        onClose={() => setShowBenefitsModal(false)}
        highlight={compareFare}
        prices={selectedBooking?.fares}
      />
    </>
  );
}
