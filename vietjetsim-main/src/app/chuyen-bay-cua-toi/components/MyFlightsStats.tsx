'use client';

import React from 'react';
import Link from 'next/link';
import { MdFlight, MdCheckCircle, MdPending, MdAttachMoney, MdPeople } from 'react-icons/md';

interface StatsProps {
  totalBookings: number;
  completedFlights: number;
  pendingFlights: number;
  totalSpent: number;
  frequentDestinations: Array<{ code: string; city: string; count: number }>;
}

export default function MyFlightsStats({
  totalBookings,
  completedFlights,
  pendingFlights,
  totalSpent,
  frequentDestinations,
}: StatsProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-red)]/10">
              <MdFlight className="h-5 w-5 text-[var(--vj-red)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Tổng chuyến</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-blue)]/10">
              <MdCheckCircle className="h-5 w-5 text-[var(--vj-blue)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Đã hoàn thành</p>
              <p className="text-2xl font-bold text-[var(--vj-blue)]">{completedFlights}</p>
            </div>
          </div>
        </div>

        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-yellow)]/10">
              <MdPending className="h-5 w-5 text-[var(--vj-yellow)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Đang chờ</p>
              <p className="text-2xl font-bold text-[var(--vj-yellow)]">{pendingFlights}</p>
            </div>
          </div>
        </div>

        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-green)]/10">
              <MdAttachMoney className="h-5 w-5 text-[var(--vj-green)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Tổng chi tiêu</p>
              <p className="text-2xl font-bold text-[var(--vj-green)]">
                {totalSpent.toLocaleString('vi-VN')}₫
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frequent Destinations */}
      {frequentDestinations.length > 0 && (
        <div className="vj-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--foreground)]">
            <MdPeople className="h-5 w-5 text-[var(--vj-red)]" />
            Đến nơi thường đến
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {frequentDestinations.map((dest, index) => (
              <div
                key={dest.code}
                className="relative overflow-hidden rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)] p-3 transition-all hover:shadow-md"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--vj-red)]/5 to-transparent" />
                <div className="relative z-10">
                  <p className="text-xs text-[var(--foreground-muted)]">Sân bay</p>
                  <p className="text-sm font-bold text-[var(--foreground)]">{dest.code}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{dest.city}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--vj-red)]">{dest.count} chuyến</span>
                    <div className="h-1 flex-1 rounded-full bg-[var(--vj-red)]/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--vj-red)] transition-all"
                        style={{
                          width: `${Math.min(100, (dest.count / Math.max(1, frequentDestinations[0]?.count || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/tim-ve"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--vj-red)] text-white font-semibold hover:bg-[var(--vj-red)]/90 transition-colors"
        >
          <MdFlight className="h-4 w-4" />
          Đặt vé mới
        </Link>
        <Link
          href="/lam-thu-tuc"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)] font-semibold hover:bg-[var(--vj-yellow)]/10 transition-colors"
        >
          <MdCheckCircle className="h-4 w-4" />
          Check-in trực tiếp
        </Link>
      </div>
    </div>
  );
}
