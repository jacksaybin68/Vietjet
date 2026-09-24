'use client';

import React from 'react';
import { MdFlight, MdCheckCircle, MdAccessTime, MdAttachMoney } from 'react-icons/md';

interface FrequentDestination {
  code: string;
  city: string;
  count: number;
}

interface MyFlightsStatsProps {
  totalBookings: number;
  completedFlights: number;
  pendingFlights: number;
  totalSpent: number;
  frequentDestinations: FrequentDestination[];
}

export default function MyFlightsStats({
  totalBookings,
  completedFlights,
  pendingFlights,
  totalSpent,
  frequentDestinations,
}: MyFlightsStatsProps) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
            Tổng quan
          </p>
          <h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Thống kê chuyến bay</h2>
        </div>
        <span className="text-xs text-[var(--foreground-muted)]">
          Cập nhật theo hành trình của bạn
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--vj-red-rgb))]/10 text-[var(--vj-red)]">
              <MdFlight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--foreground)]">{totalBookings}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Tổng đặt chỗ</p>
            </div>
          </div>
        </div>
        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--vj-blue-rgb))]/10 text-[var(--vj-blue)]">
              <MdCheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--foreground)]">{completedFlights}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Chuyến hoàn thành</p>
            </div>
          </div>
        </div>
        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--vj-yellow-rgb))]/25 text-[var(--vj-red)]">
              <MdAccessTime className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--foreground)]">{pendingFlights}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Chuyến sắp tới</p>
            </div>
          </div>
        </div>
        <div className="vj-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--vj-green-rgb))]/10 text-[var(--vj-green)]">
              <MdAttachMoney className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--foreground)]">
                {totalSpent.toLocaleString('vi-VN')}₫
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">Tổng chi tiêu</p>
            </div>
          </div>
        </div>
      </div>

      {frequentDestinations.length > 0 && (
        <div className="vj-card mt-4 p-4">
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-3">Điểm đến thường xuyên</h3>
          <div className="space-y-2">
            {frequentDestinations.map((dest) => (
              <div key={dest.code} className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]">{dest.city}</span>
                <span className="text-xs font-medium text-[var(--foreground-muted)]">
                  {dest.count} chuyến
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
