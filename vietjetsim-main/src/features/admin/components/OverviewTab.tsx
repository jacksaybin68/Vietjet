'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@/shared/components/ui';
import { AdminTab } from './AdminDashboardClient';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { KPIWidget } from './KPIWidget';
import RevenueChart from './RevenueChart';
import SeatClassPieChart from './SeatClassPieChart';
import TopRoutesBarChart from './TopRoutesBarChart';
import CancellationDonutChart from './CancellationDonutChart';
import RecentBookingsTable from './RecentBookingsTable';
import UpcomingFlightsTable from './UpcomingFlightsTable';

interface Props {
  onNavigate?: (tab: AdminTab) => void;
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} tỷ₫`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} tr₫`;
  return `${val.toLocaleString('vi-VN')}₫`;
}

export default function OverviewTab({ onNavigate }: Props) {
  const { data, loading, error, lastUpdated, refetch } = useAdminDashboard();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedLastUpdated =
    mounted && lastUpdated
      ? lastUpdated.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            Bảng điều khiển tổng quan
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi thời gian thực các chỉ số kinh doanh, chuyến bay và đặt chỗ Vietjet
          </p>
        </div>

        <div className="flex items-center gap-3">
          {formattedLastUpdated && (
            <span className="text-xs text-slate-400 hidden sm:inline-block">
              Cập nhật lúc:{' '}
              <span className="font-mono text-slate-300 font-semibold">{formattedLastUpdated}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Icon name="ArrowPathIcon" size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Icon name="ExclamationTriangleIcon" size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-200">Không thể tải dữ liệu mới nhất</h4>
              <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <div className="space-y-6">
          {/* KPI Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl border animate-pulse"
                style={{
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                }}
              />
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div
              className="h-[340px] rounded-2xl border animate-pulse"
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
            <div
              className="h-[340px] rounded-2xl border animate-pulse"
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div
              className="h-[340px] rounded-2xl border animate-pulse"
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
            <div
              className="h-[340px] rounded-2xl border animate-pulse"
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
          </div>

          {/* Tables Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div
              className="h-64 rounded-2xl border animate-pulse"
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
            <div
              className="h-64 rounded-2xl border animate-pulse"
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
          </div>
        </div>
      ) : (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIWidget
              title="Bookings hôm nay"
              value={data?.kpi?.bookingsToday?.toLocaleString('vi-VN') ?? '0'}
              change={data?.kpi?.bookingsTodayChange}
              icon={<Icon name="TicketIcon" size={24} className="text-sky-400" />}
              colorClass="text-sky-400"
            />
            <KPIWidget
              title="Doanh thu hôm nay"
              value={formatCurrency(data?.kpi?.revenueToday ?? 0)}
              change={data?.kpi?.revenueTodayChange}
              icon={<Icon name="CurrencyDollarIcon" size={24} className="text-emerald-400" />}
              colorClass="text-emerald-400"
            />
            <KPIWidget
              title="Người dùng hoạt động"
              value={data?.kpi?.activeUsers?.toLocaleString('vi-VN') ?? '0'}
              change={data?.kpi?.activeUsersChange}
              icon={<Icon name="UsersIcon" size={24} className="text-purple-400" />}
              colorClass="text-purple-400"
            />
            <KPIWidget
              title="Tỷ lệ lấp đầy ghế"
              value={`${data?.kpi?.loadFactor ?? 0}%`}
              subValue="Load Factor"
              change={data?.kpi?.loadFactorChange}
              icon={<Icon name="ChartBarIcon" size={24} className="text-amber-400" />}
              colorClass="text-amber-400"
            />
          </div>

          {/* Grid 2 cột: RevenueChart + SeatClassPieChart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RevenueChart data={data?.revenue} />
            <SeatClassPieChart data={data?.seatDistribution} />
          </div>

          {/* Grid 2 cột: TopRoutesBarChart + CancellationDonutChart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TopRoutesBarChart data={data?.topRoutes} />
            <CancellationDonutChart data={data?.cancellationRate} />
          </div>

          {/* Grid 2 cột: RecentBookingsTable + UpcomingFlightsTable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RecentBookingsTable
              data={data?.recentBookings}
              onViewAll={onNavigate ? () => onNavigate('bookings') : undefined}
            />
            <UpcomingFlightsTable
              data={data?.upcomingFlights}
              onViewAll={onNavigate ? () => onNavigate('flights') : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}
