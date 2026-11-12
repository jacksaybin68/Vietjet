'use client';

import React, { useState } from 'react';
import { Icon } from '@/shared/components/ui';

interface Passenger {
  name: string;
  seat: string;
}

interface BookingTicketCardProps {
  flightNo?: string;
  from?: string;
  to?: string;
  fromCity?: string;
  toCity?: string;
  departTime?: string;
  arriveTime?: string;
  date?: string;
  bookingCode?: string | null;
  passengers?: Passenger[];
  fareClass?: string;
  ancillaries?: string[];
  onOpenDetails?: () => void;
}

export default function BookingTicketCard({
  flightNo = 'VJ141',
  from = 'SGN',
  to = 'HAN',
  fromCity = 'TP. Hồ Chí Minh',
  toCity = 'Hà Nội',
  departTime = '08:30',
  arriveTime = '10:40',
  date,
  bookingCode,
  passengers = [{ name: 'NGUYEN VAN A', seat: '12A' }],
  fareClass = 'Eco',
  ancillaries = ['Hành lý xách tay 7kg'],
  onOpenDetails,
}: BookingTicketCardProps) {
  const [copiedPnr, setCopiedPnr] = useState(false);

  const copyPnr = () => {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode);
    setCopiedPnr(true);
    setTimeout(() => setCopiedPnr(false), 2000);
  };

  return (
    <div className="bg-[var(--background)] rounded-3xl border border-[var(--border)] shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg">
      {/* Header bar: Vietjet brand red */}
      <div className="bg-gradient-to-r from-[var(--vj-red)] to-[var(--vj-red-dark)] px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-6 px-2 bg-[var(--background)] rounded-md flex items-center justify-center shrink-0">
            <span className="font-black italic text-xs tracking-tight text-[var(--vj-red)]">
              vietjet<span className="text-[var(--vj-yellow)]">Air</span>
            </span>
          </div>
          <span className="font-extrabold text-sm tracking-wide truncate">
            Chuyến bay {flightNo}
          </span>
          <span className="shrink-0 text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
            {fareClass}
          </span>
        </div>

        {bookingCode && (
          <button
            type="button"
            onClick={copyPnr}
            aria-label={`Sao chép mã đặt chỗ ${bookingCode}`}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-2.5 py-1.5 text-white transition-colors hover:bg-white/25 active:scale-95 cursor-pointer"
            title="Sao chép mã đặt chỗ"
          >
            <span className="text-3xs font-bold uppercase tracking-wider text-white/70">PNR</span>
            <span className="font-mono font-black text-sm tracking-widest">{bookingCode}</span>
            <Icon
              name={copiedPnr ? 'CheckCircleIcon' : 'ClipboardDocumentIcon'}
              size={14}
              className={copiedPnr ? 'text-[var(--vj-yellow)]' : 'text-white/80'}
            />
          </button>
        )}
      </div>

      {/* Main ticket content */}
      <div className="p-5 space-y-4">
        {/* Hành trình */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-3xs font-bold uppercase tracking-wider text-[var(--foreground-subtle)]">
              Hành trình
            </span>
            {date && (
              <span className="text-3xs font-medium text-[var(--foreground-muted)]">{date}</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--border)]">
            <div className="text-left min-w-0">
              <span className="text-2xl sm:text-3xl font-black font-koho text-[var(--foreground)] block leading-none">
                {from}
              </span>
              <span className="text-xs font-semibold text-[var(--foreground-muted)] mt-1 block truncate">
                {fromCity}
              </span>
              <span className="text-sm font-bold text-primary mt-1 block">{departTime}</span>
            </div>

            {/* Đường bay */}
            <div className="flex-1 px-2 sm:px-4 flex flex-col items-center">
              <span className="text-3xs font-bold uppercase tracking-wider text-[var(--foreground-subtle)] mb-1.5">
                Bay thẳng
              </span>
              <div className="w-full flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--vj-red)] shrink-0" />
                <div className="h-0.5 flex-1 bg-gradient-to-r from-[var(--vj-red)] via-[var(--vj-yellow)] to-[var(--vj-red)] relative">
                  <Icon
                    name="PaperAirplaneIcon"
                    size={14}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 text-[var(--vj-red)] bg-[var(--background)] px-0.5"
                  />
                </div>
                <div className="w-2 h-2 rounded-full bg-[var(--vj-red)] shrink-0" />
              </div>
            </div>

            <div className="text-right min-w-0">
              <span className="text-2xl sm:text-3xl font-black font-koho text-[var(--foreground)] block leading-none">
                {to}
              </span>
              <span className="text-xs font-semibold text-[var(--foreground-muted)] mt-1 block truncate">
                {toCity}
              </span>
              <span className="text-sm font-bold text-primary mt-1 block">{arriveTime}</span>
            </div>
          </div>
        </section>

        {/* Hành khách */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-3xs font-bold uppercase tracking-wider text-[var(--foreground-subtle)]">
              Hành khách
            </span>
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-3xs font-bold text-[var(--foreground-muted)]">
              {passengers.length}
            </span>
          </div>

          <ul className="space-y-1.5">
            {passengers.map((p, i) => {
              const seat = p.seat?.trim();
              const name = p.name?.trim();
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon
                      name="UserIcon"
                      size={14}
                      className="shrink-0 text-[var(--foreground-subtle)]"
                    />
                    <span className="truncate text-xs font-bold text-[var(--foreground)]">
                      {name || '—'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-3xs text-[var(--foreground-muted)]">Ghế</span>
                    {seat ? (
                      <span className="rounded-md border border-[rgb(var(--vj-red-rgb))]/25 bg-[rgb(var(--vj-red-rgb))]/10 px-1.5 py-0.5 font-mono text-2xs font-extrabold text-[var(--vj-red)]">
                        {seat}
                      </span>
                    ) : (
                      <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 font-mono text-2xs font-extrabold text-[var(--foreground-subtle)]">
                        Chưa chọn
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Dịch vụ đã chọn */}
        {ancillaries.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-3xs font-bold uppercase tracking-wider text-[var(--foreground-subtle)]">
                Dịch vụ đã chọn
              </span>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-3xs font-bold text-[var(--foreground-muted)]">
                {ancillaries.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ancillaries.map((service, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--vj-green-rgb))]/25 bg-[rgb(var(--vj-green-rgb))]/10 px-2 py-1 text-3xs font-semibold text-[var(--vj-green)]"
                >
                  <Icon name="CheckIcon" size={12} />
                  {service}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Xem chi tiết điều kiện vé & đặt chỗ */}
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 text-xs font-bold text-primary transition-colors hover:border-[rgb(var(--vj-red-rgb))]/30 hover:bg-[rgb(var(--vj-red-rgb))]/10 cursor-pointer"
          >
            <span className="flex items-center justify-center gap-1.5">
              <Icon name="InformationCircleIcon" size={14} />
              Xem chi tiết điều kiện vé & đặt chỗ
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
