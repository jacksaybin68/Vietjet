'use client';
import React from 'react';

// ─── Base Skeleton Atom ───────────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'xl' | '2xl';
  accent?: boolean; // red shimmer variant
  style?: React.CSSProperties;
}

export function Skeleton({
  className = '',
  rounded = 'full',
  accent = false,
  style,
}: SkeletonProps) {
  const roundedMap = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };
  return (
    <div
      className={`skeleton-pulse ${roundedMap[rounded]} ${accent ? 'skeleton-accent' : 'skeleton-base'} ${className}`}
      style={style}
    />
  );
}

// ─── Flight Card Skeleton ─────────────────────────────────────────────────────
export function FlightCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden skeleton-card">
      {/* Red accent top bar */}
      <div className="h-1 w-full skeleton-accent-bar" />
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8" rounded="lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        {/* Time row */}
        <div className="flex items-center gap-4">
          <div className="text-center space-y-1.5">
            <Skeleton className="h-7 w-14" rounded="lg" />
            <Skeleton className="h-3 w-8 mx-auto" />
            <Skeleton className="h-3 w-14 mx-auto" />
          </div>
          <div className="flex-1 flex flex-col items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <div className="w-full h-px skeleton-base rounded-none" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="text-center space-y-1.5">
            <Skeleton className="h-7 w-14" rounded="lg" />
            <Skeleton className="h-3 w-8 mx-auto" />
            <Skeleton className="h-3 w-14 mx-auto" />
          </div>
          <div className="text-right ml-4 space-y-2">
            <Skeleton className="h-7 w-28 ml-auto" rounded="lg" accent />
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-8 w-20 ml-auto" rounded="xl" accent />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Flight Results Skeleton ──────────────────────────────────────────────────
interface FlightResultsSkeletonProps {
  count?: number;
}

export function FlightResultsSkeleton({ count = 4 }: FlightResultsSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
          <FlightCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// ─── Bookings Table Row Skeleton ──────────────────────────────────────────────
export function BookingTableRowSkeleton() {
  return (
    <tr className="border-b border-stone-50 skeleton-row">
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6" rounded="md" />
          <Skeleton className="h-4 w-14" />
        </div>
      </td>
      <td className="px-5 py-4 hidden sm:table-cell">
        <Skeleton className="h-4 w-24 mb-1.5" />
        <Skeleton className="h-3 w-20" />
      </td>
      <td className="px-5 py-4 hidden md:table-cell">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-5 py-4 text-right">
        <Skeleton className="h-4 w-20 ml-auto" accent />
      </td>
      <td className="px-5 py-4 text-center">
        <Skeleton className="h-5 w-20 mx-auto" />
      </td>
    </tr>
  );
}

// ─── Bookings Table Skeleton ──────────────────────────────────────────────────
interface BookingsTableSkeletonProps {
  rows?: number;
}

export function BookingsTableSkeleton({ rows = 3 }: BookingsTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <BookingTableRowSkeleton key={i} />
      ))}
    </>
  );
}

// ─── Dashboard Stat Card Skeleton ─────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl border border-stone-200 p-5 skeleton-card"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
    >
      {/* Red accent top bar */}
      <div className="h-0.5 w-full skeleton-accent-bar mb-4 rounded-full" />
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-10 h-10" rounded="xl" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-7 w-24 mb-1.5" rounded="lg" accent />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

// ─── Dashboard Stats Grid Skeleton ───────────────────────────────────────────
interface DashboardStatsSkeletonProps {
  count?: number;
}

export function DashboardStatsSkeleton({ count = 4 }: DashboardStatsSkeletonProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 60}ms` }}>
          <StatCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// ─── Admin Bookings Table Row Skeleton ────────────────────────────────────────
export function AdminBookingRowSkeleton() {
  return (
    <tr className="border-b border-stone-50 skeleton-row">
      <td className="px-5 py-3.5">
        <Skeleton className="h-4 w-20" rounded="md" />
      </td>
      <td className="px-5 py-3.5">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="px-5 py-3.5 hidden sm:table-cell">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-5 py-3.5 text-right">
        <Skeleton className="h-4 w-20 ml-auto" accent />
      </td>
      <td className="px-5 py-3.5 text-center">
        <Skeleton className="h-5 w-16 mx-auto" />
      </td>
      <td className="px-5 py-3.5 text-right hidden md:table-cell">
        <Skeleton className="h-3 w-16 ml-auto" />
      </td>
    </tr>
  );
}

export function AdminBookingsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <AdminBookingRowSkeleton key={i} />
      ))}
    </>
  );
}

// ─── Revenue Tab Skeleton ─────────────────────────────────────────────────────
export function RevenueKPISkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-10 h-10" rounded="xl" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-7 w-28 mb-1.5" rounded="lg" accent />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function RevenueChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <Skeleton className="h-5 w-40 mb-5" rounded="lg" />
      <div className="flex items-end gap-3 px-2" style={{ height }}>
        {[65, 78, 92, 55, 88, 72].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <Skeleton
              className="w-full rounded-t-lg rounded-b-none"
              rounded="lg"
              style={{ height: `${h}%` }}
            />
            <Skeleton className="h-3 w-8 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" rounded="lg" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-9 w-48" rounded="xl" />
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <RevenueKPISkeleton key={i} />
        ))}
      </div>
      {/* Main Chart */}
      <RevenueChartSkeleton height={280} />
      {/* Two smaller charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChartSkeleton height={220} />
        <RevenueChartSkeleton height={220} />
      </div>
      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <Skeleton className="h-5 w-48" rounded="lg" />
        </div>
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-3 h-3" rounded="full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28 ml-auto" accent />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-2 flex-1" rounded="full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Payment Page Skeleton ────────────────────────────────────────────────────
export function PaymentSkeleton() {
  return (
    <div className="pt-[100px] pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Skeleton className="h-8 w-36 mb-6" rounded="lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment form skeleton */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <Skeleton className="h-5 w-48 mb-4" rounded="lg" />
              {/* Method tabs */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border border-stone-200"
                  >
                    <Skeleton className="w-6 h-6" rounded="lg" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
              {/* Form fields */}
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-20 mb-1.5" />
                    <Skeleton className="h-12 w-full" rounded="xl" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-20 mb-1.5" />
                      <Skeleton className="h-12 w-full" rounded="xl" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-14 w-full mt-2" rounded="xl" accent />
              </div>
            </div>
            <Skeleton className="h-14 w-full" rounded="xl" />
          </div>
          {/* Order summary skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <Skeleton className="h-5 w-36 mb-4" rounded="lg" />
              <Skeleton className="h-24 w-full mb-4" rounded="xl" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex justify-between py-2 border-b border-stone-100">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
              <div className="mt-4 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
                <div className="border-t border-stone-200 pt-2 flex justify-between">
                  <Skeleton className="h-5 w-32" rounded="lg" />
                  <Skeleton className="h-5 w-24" rounded="lg" accent />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Profile Skeleton ────────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: form card */}
      <div
        className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
      >
        <div className="h-1.5 w-full skeleton-accent-bar" />
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" rounded="lg" />
            <Skeleton className="h-0.5 w-10" rounded="full" accent />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-11 w-full" rounded="xl" />
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-10 w-32" rounded="xl" accent />
            <Skeleton className="h-10 w-20" rounded="xl" />
          </div>
        </div>
      </div>
      {/* Right: stats + security */}
      <div className="space-y-4">
        <div
          className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
        >
          <div className="h-1.5 w-full skeleton-accent-bar" />
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" rounded="lg" />
              <Skeleton className="h-0.5 w-8" rounded="full" accent />
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-stone-50"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8" rounded="lg" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <Skeleton className="h-4 w-12" rounded="lg" accent />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1A2948' }}>
          <div className="h-1 w-full" style={{ background: '#FFC72C' }} />
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" rounded="md" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-9 w-full" rounded="xl" accent />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Booking Card Skeleton ──────────────────────────────────────────
export function UpcomingBookingCardSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl border border-stone-200 overflow-hidden skeleton-card"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
    >
      <div className="h-1.5 w-full skeleton-accent-bar" />
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {/* Image placeholder */}
        <div className="h-40 sm:h-auto sm:col-span-1 skeleton-base" />
        {/* Content */}
        <div className="sm:col-span-2 p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16" rounded="lg" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-24" rounded="full" />
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-14" rounded="lg" accent />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <Skeleton className="w-5 h-5" rounded="md" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="h-7 w-14 ml-auto" rounded="lg" accent />
              <Skeleton className="h-3 w-20 ml-auto" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-20" rounded="lg" accent />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12" rounded="lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-7 w-20 ml-auto" rounded="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Bookings List Skeleton ─────────────────────────────────────────
export function UpcomingBookingsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
          <UpcomingBookingCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// ─── Flight Search Form Skeleton ──────────────────────────────────────────────
export function FlightSearchFormSkeleton() {
  return (
    <div className="lg:col-span-2 flex flex-col" style={{ background: '#EC2029' }}>
      {/* Service tabs skeleton */}
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 py-3 px-2"
            style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '5px 5px 0 0' }}
          >
            <Skeleton className="h-3 w-full mx-auto" rounded="md" />
          </div>
        ))}
      </div>
      {/* White form area */}
      <div
        className="mx-3 mb-3 mt-0 flex-1 flex flex-col"
        style={{ background: '#fff', borderRadius: '0 0 6px 6px' }}
      >
        <div className="px-4 pt-3 pb-4 flex-1 flex flex-col gap-2.5">
          {/* Trip type row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-12" rounded="md" />
          </div>
          {/* From / To fields */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
            <div className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="w-5 h-5 flex-shrink-0" rounded="full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-4 w-28" rounded="md" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <div className="text-right space-y-1.5">
                <Skeleton className="h-2.5 w-12 ml-auto" />
                <Skeleton className="h-3.5 w-10 ml-auto" rounded="md" />
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="w-5 h-5 flex-shrink-0" rounded="full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-4 w-32" rounded="md" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <div className="text-right space-y-1.5">
                <Skeleton className="h-2.5 w-12 ml-auto" />
                <Skeleton className="h-3.5 w-10 ml-auto" rounded="md" />
              </div>
            </div>
          </div>
          {/* Dates row */}
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 w-full" rounded="xl" />
            <Skeleton className="h-14 w-full" rounded="xl" />
          </div>
          {/* Passengers */}
          <Skeleton className="h-12 w-full" rounded="xl" />
          {/* Promo code */}
          <Skeleton className="h-10 w-full" rounded="xl" />
          {/* Checkbox */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" rounded="sm" />
            <Skeleton className="h-3 w-32" />
          </div>
          {/* CTA Button */}
          <Skeleton className="h-12 w-full mt-auto" rounded="xl" accent />
        </div>
      </div>
    </div>
  );
}

// ─── Popular Routes Section Skeleton ─────────────────────────────────────────
export function PopularRoutesSkeleton() {
  return (
    <section className="bg-white">
      {/* Service icons grid skeleton */}
      <div className="py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3">
                <Skeleton className="w-14 h-14" rounded="2xl" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Promo bento grid skeleton */}
      <div className="py-7 bg-[#F7F7F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="h-5 w-28" rounded="full" />
            <Skeleton className="h-5 w-48" rounded="lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Skeleton className="h-44 w-full" rounded="xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Deals Carousel Skeleton ──────────────────────────────────────────────────
export function DealsSkeleton() {
  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20" rounded="full" />
            <Skeleton className="h-5 w-36" rounded="lg" />
          </div>
          <Skeleton className="hidden sm:block h-7 w-24" rounded="md" />
        </div>
        {/* Cards row */}
        <div className="flex gap-3 overflow-hidden pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[210px] sm:min-w-[230px] flex-shrink-0 rounded-xl overflow-hidden border border-stone-200"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Skeleton className="h-32 w-full" rounded="lg" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
                <div className="flex items-end justify-between pt-1">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-20" rounded="md" accent />
                  </div>
                  <Skeleton className="h-7 w-16" rounded="md" accent />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Passenger Info Step Skeleton ─────────────────────────────────────────────
export function PassengerInfoSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form skeleton */}
      <div className="lg:col-span-2">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Skeleton className="w-1 h-6" rounded="sm" accent />
            <Skeleton className="h-6 w-44" rounded="lg" />
          </div>
          <Skeleton className="h-6 w-24" rounded="full" />
        </div>

        <div className="space-y-6">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden skeleton-card"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <div className="h-1 w-full skeleton-accent-bar" />
              <div className="p-6">
                {/* Passenger header */}
                <div className="flex items-center gap-2 mb-5">
                  <Skeleton className="w-7 h-7" rounded="full" accent />
                  <Skeleton className="h-5 w-32" rounded="lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gender row */}
                  <div className="sm:col-span-2">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <div className="flex gap-3">
                      <Skeleton className="flex-1 h-11" rounded="xl" />
                      <Skeleton className="flex-1 h-11" rounded="xl" />
                    </div>
                  </div>
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <Skeleton className="h-3 w-28 mb-1.5" />
                    <Skeleton className="h-12 w-full" rounded="xl" />
                  </div>
                  {/* DOB */}
                  <div>
                    <Skeleton className="h-3 w-20 mb-1.5" />
                    <Skeleton className="h-12 w-full" rounded="xl" />
                  </div>
                  {/* ID */}
                  <div>
                    <Skeleton className="h-3 w-32 mb-1.5" />
                    <Skeleton className="h-12 w-full" rounded="xl" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Buttons */}
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-12" rounded="xl" />
            <Skeleton className="flex-1 h-12" rounded="xl" accent />
          </div>
        </div>
      </div>

      {/* Booking summary skeleton */}
      <div className="lg:col-span-1">
        <div
          className="bg-white rounded-2xl border border-stone-200 overflow-hidden sticky top-36"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          <div className="h-1 w-full bg-gradient-to-r from-accent/40 via-accent/60 to-accent/40" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" rounded="sm" />
              <Skeleton className="h-5 w-36" rounded="lg" />
            </div>
            <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-7 h-7" rounded="lg" accent />
                <Skeleton className="h-3.5 w-16" rounded="md" accent />
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-12" rounded="lg" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="w-4 h-4" rounded="sm" />
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-12" rounded="lg" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
              <div className="border-t border-stone-100 pt-2 flex justify-between">
                <Skeleton className="h-4 w-24" rounded="lg" />
                <Skeleton className="h-4 w-28" rounded="lg" accent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Seat Map Skeleton ────────────────────────────────────────────────────────
export function SeatMapSkeleton() {
  const cols = 6;
  const rows = 12; // visible rows in skeleton

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Seat Map Panel */}
      <div className="lg:col-span-2 space-y-4">
        <div
          className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          <div className="h-1 w-full skeleton-accent-bar" />
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-1 h-5" rounded="sm" accent />
                <Skeleton className="h-5 w-36" rounded="lg" />
              </div>
              <Skeleton className="h-7 w-28" rounded="xl" />
            </div>
            <Skeleton className="h-3.5 w-52 mb-5" />

            {/* Legend skeleton */}
            <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 mb-5">
              <Skeleton className="h-3 w-28 mb-2" rounded="md" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 flex-shrink-0" rounded="md" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-2.5 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Airplane nose */}
            <div className="text-center mb-4">
              <Skeleton className="h-6 w-32 mx-auto" rounded="xl" />
            </div>

            {/* Seat grid shimmer */}
            <div className="overflow-x-auto">
              <div className="min-w-[340px]">
                {/* Col headers */}
                <div className="flex items-center mb-2 pl-8">
                  {Array.from({ length: cols }).map((_, i) => (
                    <React.Fragment key={i}>
                      {i === 3 && <div className="w-6" />}
                      <Skeleton className="w-8 h-3.5 mx-0.5" rounded="sm" />
                    </React.Fragment>
                  ))}
                </div>

                {/* Seat rows */}
                <div className="space-y-1.5">
                  {Array.from({ length: rows }).map((_, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="flex items-center gap-0"
                      style={{ animationDelay: `${rowIdx * 40}ms` }}
                    >
                      <Skeleton className="w-6 h-3 mr-2 flex-shrink-0" rounded="sm" />
                      {Array.from({ length: cols }).map((_, colIdx) => (
                        <React.Fragment key={colIdx}>
                          {colIdx === 3 && <div className="w-5" />}
                          <Skeleton
                            className="w-8 h-8 mx-0.5 flex-shrink-0"
                            rounded="md"
                            accent={rowIdx < 3}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Summary Panel */}
      <div className="lg:col-span-1">
        <div
          className="bg-white rounded-2xl border border-stone-200 overflow-hidden sticky top-36"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          <div className="h-1 w-full bg-gradient-to-r from-accent/40 via-accent/60 to-accent/40" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" rounded="sm" />
              <Skeleton className="h-5 w-28" rounded="lg" />
            </div>
            {/* Empty seat placeholder */}
            <div className="text-center py-8 space-y-2">
              <Skeleton className="w-8 h-8 mx-auto" rounded="xl" />
              <Skeleton className="h-3.5 w-32 mx-auto" />
            </div>
            {/* Price rows */}
            <div className="border-t border-stone-100 pt-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-20" accent={i === 2} />
                </div>
              ))}
            </div>
            {/* Buttons */}
            <div className="space-y-2 pt-1">
              <Skeleton className="h-10 w-full" rounded="xl" accent />
              <Skeleton className="h-10 w-full" rounded="xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
