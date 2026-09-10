"use client";

import React from 'react';
import Link from 'next/link';
import {
  MdCheckCircle,
  MdCancel,
  MdAccessTime,
  MdLocationOn,
  MdFlight,
} from 'react-icons/md';

interface TimelineProps {
  bookings: Array<{
    id: string;
    flight_no: string;
    from_code: string;
    to_code: string;
    depart_time: string;
    arrive_time: string;
    total_price: number;
    status: string;
    created_at: string;
    has_check_in?: boolean;
    check_in_number?: string | null;
    seat_number?: string | null;
    check_in_time?: string | null;
  }>;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: MdAccessTime, color: 'text-[var(--vj-yellow)]', bg: 'bg-[var(--vj-yellow)]/10' },
  confirmed: { icon: MdFlight, color: 'text-[var(--vj-red)]', bg: 'bg-[var(--vj-red)]/10' },
  completed: { icon: MdCheckCircle, color: 'text-[var(--vj-blue)]', bg: 'bg-[var(--vj-blue)]/10' },
  cancelled: { icon: MdCancel, color: 'text-[var(--foreground-muted)]', bg: 'bg-[var(--foreground-muted)]/10' },
  refunded: { icon: MdCancel, color: 'text-[var(--vj-purple)]', bg: 'bg-[var(--vj-purple)]/10' },
};

export default function MyFlightsTimeline({ bookings }: TimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[var(--border)] dark:bg-[var(--dark-border)]" />

      <div className="space-y-6">
        {bookings.map((booking, index) => {
          const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;
          const isPast = new Date(booking.depart_time) < new Date();

          return (
            <div
              key={booking.id}
              className="relative pl-12 hover:bg-[var(--background-secondary)]/50 rounded-lg p-4 transition-colors"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-3 top-5 w-4 h-4 rounded-full border-2 ${statusConfig.bg} ${statusConfig.color} border-2 z-10`}
              >
                {isPast && booking.status === 'completed' && (
                  <MdCheckCircle className="h-3 w-3 text-white" />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Status badge */}
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${statusConfig.bg}`}
                  >
                    <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-[var(--foreground)]">
                        {booking.flight_no}
                      </h4>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}
                      >
                        {booking.status === 'pending' && 'Chờ thanh toán'}
                        {booking.status === 'confirmed' && 'Đã xác nhận'}
                        {booking.status === 'completed' && 'Hoàn thành'}
                        {booking.status === 'cancelled' && 'Đã hủy'}
                        {booking.status === 'refunded' && 'Đã hoàn tiền'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-sm text-[var(--foreground-muted)] flex-wrap">
                      <MdLocationOn className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium">{booking.from_code}</span>
                      <span className="text-[var(--vj-red)]">→</span>
                      <span className="font-medium">{booking.to_code}</span>
                      <span className="text-[var(--foreground-muted)]/50">|</span>
                      <MdAccessTime className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{new Date(booking.depart_time).toLocaleDateString('vi-VN')}</span>
                      <span className="text-[var(--foreground-muted)]/50">·</span>
                      <span>{new Date(booking.depart_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Check-in info */}
                    {booking.has_check_in && (
                      <div className="mt-2 flex items-center gap-2 text-xs bg-[var(--vj-green)]/10 rounded px-2 py-1">
                        <MdCheckCircle className="h-3.5 w-3.5 text-[var(--vj-green)]" />
                        <span className="text-[var(--vj-green)] font-semibold">Đã check-in</span>
                        {booking.seat_number && (
                          <>
                            <span className="text-[var(--foreground-muted)]">·</span>
                            <span className="text-[var(--foreground)]">
                              Ghế: {booking.seat_number}
                            </span>
                          </>
                        )}
                        {booking.check_in_time && (
                          <>
                            <span className="text-[var(--foreground-muted)]">·</span>
                            <span>{new Date(booking.check_in_time).toLocaleTimeString('vi-VN')}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[var(--vj-red)]">
                    {booking.total_price.toLocaleString('vi-VN')}₫
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]/50">
                    Đặt: {new Date(booking.created_at).toLocaleDateString('vi-VN')}
                  </p>

                  {/* Quick actions */}
                  {!isPast && booking.status === 'confirmed' && !booking.has_check_in && (
                    <Link
                      href={`/lam-thu-tuc?code=${booking.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[var(--vj-red)]/10 text-[var(--vj-red)] hover:bg-[var(--vj-red)]/20 transition-colors"
                    >
                      <MdCheckCircle className="h-3 w-3" />
                      Check-in
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
