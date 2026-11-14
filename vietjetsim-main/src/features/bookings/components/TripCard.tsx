'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MdFlight as FlightIcon,
  MdCheckCircle,
  MdAirlineSeatReclineNormal,
  MdPrint,
  MdLuggage,
  MdPayment,
  MdSwapHoriz,
  MdWarning,
} from 'react-icons/md';
import { useToast } from '@/hooks/useToast';
import { getAirportCity } from '@/features/flights';
import { BAGGAGE_PACKAGES, OVERSIZED_BAGGAGE } from '@/features/bookings/pricing';
import SeatChangeModal from './SeatChangeModal';
import BaggagePurchaseModal from './BaggagePurchaseModal';

/** Một chặng bay trong một trip. */
export interface TripLeg {
  /** UUID dòng `bookings`. */
  id: string;
  /** PNR của chặng này. */
  bookingCode: string | null;
  legRole: 'outbound' | 'inbound';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  totalPrice: number;
  createdAt: string;
  /** UUID của chuyến bay (cần cho SSE ghế ngồi). */
  flightId: string;
  flight: {
    flight_no: string;
    from_code: string;
    to_code: string;
    depart_time: string;
    arrive_time: string;
  };
  flight_status?: string;
  gate?: string | null;
  terminal?: string | null;
  passengers: Array<{ id: string; name: string; seat_number?: string | null }>;
  check_ins: Array<{
    id: string;
    passenger_id: string | null;
    passenger_name: string;
    seat_number: string;
    check_in_number: string;
    boarding_pass_number: string | null;
    gate: string | null;
    terminal: string | null;
  }>;
}

export interface Trip {
  tripId: string;
  legs: TripLeg[];
}

const STATUS_LABELS: Record<TripLeg['status'], { label: string; color: string; bg: string }> = {
  pending: {
    label: 'Chờ thanh toán',
    color: 'text-[var(--vj-red)]',
    bg: 'bg-[rgb(var(--vj-yellow-rgb))]/25',
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: 'text-[var(--vj-red)]',
    bg: 'bg-[rgb(var(--vj-red-rgb))]/10',
  },
  completed: {
    label: 'Hoàn thành',
    color: 'text-[var(--vj-blue)]',
    bg: 'bg-[rgb(var(--vj-blue-rgb))]/10',
  },
  cancelled: {
    label: 'Đã hủy',
    color: 'text-[var(--foreground-muted)]',
    bg: 'bg-[rgb(var(--foreground-muted-rgb))]/15',
  },
  refunded: {
    label: 'Đã hoàn tiền',
    color: 'text-[var(--vj-purple)]',
    bg: 'bg-[rgb(var(--vj-purple-rgb))]/15',
  },
};

/** Nhãn trạng thái chuyến bay realtime (SSE). */
const FLIGHT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: 'Đúng giờ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  delayed: { label: 'Trễ giờ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { label: 'Hủy chuyến', className: 'bg-red-50 text-red-700 border-red-200' },
  completed: { label: 'Đã hoàn thành', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  departed: { label: 'Đã cất cánh', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const formatDate = (iso?: string) => {
  try {
    return new Date(iso || '').toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
};

const formatTime = (iso?: string) => {
  try {
    return new Date(iso || '').toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--';
  }
};

const formatDuration = (d?: string, a?: string) => {
  try {
    const diff = new Date(a || '').getTime() - new Date(d || '').getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${String(m).padStart(2, '0')}ph`;
  } catch {
    return '--';
  }
};

interface TripCardProps {
  trip: Trip;
}

/**
 * Thẻ một hành trình (khứ hồi = 2 chặng).
 *
 * Trước đây mỗi dòng `bookings` là một thẻ riêng và mã đặt chỗ in ra là UUID
 * (`Đặt chỗ: b.id`) — khách không có mã đó. Giờ mỗi trip là một thẻ, in PNR
 * thật, và mỗi chặng có dòng lịch trình riêng kèm trạng thái realtime.
 */
export default function TripCard({ trip }: TripCardProps) {
  const toast = useToast();
  const [seatModal, setSeatModal] = useState<{ leg: TripLeg } | null>(null);
  const [baggageModal, setBaggageModal] = useState<TripLeg | null>(null);
  const [liveStatus, setLiveStatus] = useState<Record<string, string>>({});

  const outbound = trip.legs.find((leg) => leg.legRole === 'outbound');
  const inbound = trip.legs.find((leg) => leg.legRole === 'inbound');
  const primaryLeg = outbound ?? trip.legs[0];
  const primaryStatus = STATUS_LABELS[primaryLeg.status];

  /**
   * Trạng thái realtime của các chuyến bay trong trip.
   *
   * SSE (`/api/sse/trang-thai-chuyen-bay`) là một stream cho MỘT chuyến bay, nên
   * trip 2 chặng cần 2 stream. Chỉ mở stream cho chặng còn tới ngày bay —
   * chặng đã bay xong không cần cập nhật nữa.
   */
  const upcomingLegs = useMemo(
    () =>
      trip.legs.filter((leg) => {
        if (leg.status === 'cancelled' || leg.status === 'refunded') return false;
        const depart = new Date(leg.flight.depart_time).getTime();
        return Number.isFinite(depart) && depart > Date.now() - 6 * 3600_000;
      }),
    [trip.legs]
  );

  // Một EventSource cho mỗi chặng sắp bay.
  const legIds = useMemo(() => upcomingLegs.map((leg) => leg.id), [upcomingLegs]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const sources: EventSource[] = [];

    for (const legId of legIds) {
      const leg = upcomingLegs.find((item) => item.id === legId);
      if (!leg) continue;
      // Endpoint SSE tra cứu theo `flightId` HOẶC `flightNo`; dùng `flightNo`
      // vì payload danh sách bookings không mang UUID chuyến bay.
      const es = new EventSource(
        `/api/sse/trang-thai-chuyen-bay?flightNo=${encodeURIComponent(leg.flight.flight_no)}`
      );
      es.addEventListener('flight-status', (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as {
            status?: string;
          };
          if (payload.status) {
            setLiveStatus((prev) => ({ ...prev, [leg.id]: payload.status! }));
          }
        } catch {
          // malformed JSON — bỏ qua, giá trị cũ vẫn đúng
        }
      });
      sources.push(es);
    }

    return () => {
      for (const es of sources) es.close();
    };
  }, [legIds, upcomingLegs]);

  const handleShareTicket = useCallback(
    async (leg: TripLeg) => {
      const url = `/api/dat-ve/${leg.id}/ve-dien-tu?leg=${leg.legRole}`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('download failed');
        const blob = await response.blob();
        const file = new File([blob], `ve-dien-tu-${leg.bookingCode ?? 'vietjet'}.pdf`, {
          type: 'application/pdf',
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: `Vé điện tử ${leg.bookingCode}`, files: [file] });
          return;
        }
        // Không có Web Share API (desktop) — tải file xuống thay vì.
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } catch {
        toast.error('Không tải được vé', 'Vui lòng thử lại sau.');
      }
    },
    [toast]
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-sm transition-shadow hover:shadow-md">
      {/* Đầu phiếu: PNR thật + trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--vj-red)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
            <FlightIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-[var(--vj-yellow)]">
              {primaryLeg.bookingCode || '—'}
            </p>
            <p className="text-2xs text-white/75">
              {trip.legs.length > 1 ? 'Khứ hồi · ' : ''}
              {primaryLeg.flight.flight_no}
              {inbound ? ` / ${inbound.flight.flight_no}` : ''}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[var(--vj-red)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--vj-red)]" />
          {primaryStatus.label}
        </span>
      </div>

      {/* Mỗi chặng: một dòng lịch trình + trạng thái realtime */}
      <div className="divide-y divide-[var(--border)]">
        {trip.legs.map((leg) => {
          const f = leg.flight;
          const st = STATUS_LABELS[leg.status];
          const live = liveStatus[leg.id] ?? leg.flight_status ?? 'active';
          const liveLabel = FLIGHT_STATUS_LABELS[live] ?? FLIGHT_STATUS_LABELS.active;
          const hasCheckIn = leg.check_ins.length > 0;
          const seatNumbers = leg.passengers
            .map(
              (p) =>
                p.seat_number || leg.check_ins.find((ci) => ci.passenger_id === p.id)?.seat_number
            )
            .filter(Boolean)
            .join(', ');

          return (
            <div key={leg.id} className="px-4 py-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--vj-sky)] px-2 py-0.5 text-2xs font-black uppercase text-[var(--vj-red)]">
                  {leg.legRole === 'inbound' ? 'Chặng về' : 'Chặng đi'}
                </span>
                <span className="text-xs font-bold text-[var(--foreground)]">{f.flight_no}</span>
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${liveLabel.className}`}
                >
                  {liveLabel.label}
                </span>
                <span
                  className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}
                >
                  {st.label}
                </span>
                {leg.gate && (
                  <span className="text-2xs text-[var(--foreground-muted)]">Cổng {leg.gate}</span>
                )}
              </div>

              <div className="flex flex-col items-center gap-4 sm:flex-row">
                {/* Điểm đi */}
                <div className="w-24 text-center sm:text-left">
                  <p className="text-2xl font-black text-[var(--foreground)]">{f.from_code}</p>
                  <p className="mt-0.5 text-2xs text-[var(--foreground-muted)]">
                    {getAirportCity(f.from_code)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--vj-red)]">
                    {formatTime(f.depart_time)}
                  </p>
                </div>

                {/* Đường bay */}
                <div className="flex-1 text-center">
                  <p className="text-2xs text-[var(--foreground-muted)]">
                    {formatDate(f.depart_time)}
                  </p>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[var(--foreground-muted)]" />
                    <div className="flex-1 border-t-2 border-dashed border-[var(--foreground-muted)]" />
                    <FlightIcon className="h-5 w-5 text-[var(--vj-red)]" />
                    <div className="flex-1 border-t-2 border-dashed border-[var(--foreground-muted)]" />
                    <div className="h-2 w-2 rounded-full bg-[var(--foreground-muted)]" />
                  </div>
                  <p className="mt-1 text-2xs font-medium text-[var(--foreground-muted)]">
                    {formatDuration(f.depart_time, f.arrive_time)} · Trực tiếp
                  </p>
                </div>

                {/* Điểm đến */}
                <div className="w-24 text-center sm:text-right">
                  <p className="text-2xl font-black text-[var(--foreground)]">{f.to_code}</p>
                  <p className="mt-0.5 text-2xs text-[var(--foreground-muted)]">
                    {getAirportCity(f.to_code)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--vj-red)]">
                    {formatTime(f.arrive_time)}
                  </p>
                </div>
              </div>

              {/* Chip thông tin */}
              <div className="mt-4 flex flex-wrap gap-2">
                {seatNumbers && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[rgb(var(--vj-blue-rgb))]/10 px-2 py-1 text-2xs text-[var(--vj-blue)]">
                    <MdAirlineSeatReclineNormal className="h-3.5 w-3.5" /> Ghế {seatNumbers}
                  </span>
                )}
                {hasCheckIn && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[rgb(var(--vj-green-rgb))]/10 px-2 py-1 text-2xs text-[var(--vj-green)]">
                    <MdCheckCircle className="h-3.5 w-3.5" /> Đã check-in
                    {leg.check_ins[0]?.check_in_number
                      ? ` · ${leg.check_ins[0].check_in_number}`
                      : ''}
                  </span>
                )}
                {leg.passengers.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[rgb(var(--vj-yellow-rgb))]/25 px-2 py-1 text-2xs font-bold text-[var(--vj-red)]">
                    {leg.passengers.length} hành khách
                  </span>
                )}
                {leg.status === 'pending' && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-2xs font-bold text-[var(--vj-red)]">
                    <MdWarning className="h-3.5 w-3.5" /> Chưa thanh toán
                  </span>
                )}
              </div>

              {/* Hành động cho chặng này */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-3">
                <div className="flex flex-wrap gap-2">
                  {leg.status === 'pending' && (
                    <Link
                      href={`/thanh-toan?bookingId=${leg.bookingCode || leg.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--vj-red)] px-3 py-1.5 text-xs font-black text-white transition-all hover:bg-vj-red-dark active:scale-95"
                    >
                      <MdPayment className="h-3.5 w-3.5" /> Thanh toán ngay
                    </Link>
                  )}
                  {!hasCheckIn && leg.status === 'confirmed' && (
                    <Link
                      href={`/lam-thu-tuc?code=${leg.bookingCode || leg.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--vj-yellow)] px-3 py-1.5 text-xs font-black text-[var(--vj-red)] transition-colors hover:bg-[var(--vj-yellow-2)]"
                    >
                      <MdAirlineSeatReclineNormal className="h-3.5 w-3.5" /> Check-in
                    </Link>
                  )}
                  {hasCheckIn && (
                    <Link
                      href={`/lam-thu-tuc?code=${leg.bookingCode || leg.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--vj-yellow-rgb))]/25 px-3 py-1.5 text-xs font-bold text-[var(--vj-red)] transition-colors hover:bg-[rgb(var(--vj-yellow-rgb))]/40"
                    >
                      <MdCheckCircle className="h-3.5 w-3.5" /> Thẻ lên tàu
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleShareTicket(leg)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[rgb(var(--vj-yellow-rgb))]/10"
                  >
                    <MdPrint className="h-3.5 w-3.5" /> Vé điện tử
                  </button>
                  {/* Dịch vụ sau khi đặt vé: chỉ khi vé đã thanh toán. */}
                  {leg.status === 'confirmed' || leg.status === 'completed' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setBaggageModal(leg)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[rgb(var(--vj-yellow-rgb))]/10"
                      >
                        <MdLuggage className="h-3.5 w-3.5" /> Mua thêm hành lý
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeatModal({ leg })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[rgb(var(--vj-yellow-rgb))]/10"
                      >
                        <MdSwapHoriz className="h-3.5 w-3.5" /> Đổi ghế
                      </button>
                    </>
                  ) : null}
                </div>
                <p className="text-2xs text-[var(--foreground-muted)]">
                  Đặt: {new Date(leg.createdAt).toLocaleDateString('vi-VN')} ·{' '}
                  {leg.totalPrice.toLocaleString('vi-VN')}₫
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal đổi ghế */}
      {seatModal && (
        <SeatChangeModal
          leg={seatModal.leg}
          onClose={() => setSeatModal(null)}
          onChanged={() => {
            setSeatModal(null);
            toast.success('Đã đổi ghế', 'Chỗ ngồi mới đã được cập nhật.');
          }}
        />
      )}

      {/* Modal mua thêm hành lý */}
      {baggageModal && (
        <BaggagePurchaseModal
          bookingId={baggageModal.id}
          pnr={baggageModal.bookingCode ?? ''}
          packages={[...BAGGAGE_PACKAGES, ...OVERSIZED_BAGGAGE]}
          onClose={() => setBaggageModal(null)}
          onPurchased={(amount) => {
            toast.success(
              'Đã thêm hành lý',
              `Số tiền cần thanh toán bổ sung: ${amount.toLocaleString('vi-VN')}₫`
            );
          }}
        />
      )}
    </article>
  );
}
