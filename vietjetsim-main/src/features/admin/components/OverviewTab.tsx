'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/shared/components/ui';
import { AdminTab } from './AdminDashboardClient';
import { DashboardStatsSkeleton, AdminBookingsTableSkeleton } from '@/shared/components/ui';
import { getAdminAnalytics, listAdminFlights, listUsers } from '@/features/admin';
import type { AdminAnalytics, AdminRecentActivity } from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';

interface Props {
  onNavigate: (tab: AdminTab) => void;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ duyệt', cls: 'badge-warning' },
  confirmed: { label: 'Xác nhận', cls: 'badge-success' },
  completed: { label: 'Hoàn thành', cls: 'badge-info' },
  cancelled: { label: 'Đã huỷ', cls: 'badge-error' },
  refunded: { label: 'Đã hoàn tiền', cls: 'badge-info' },
  approved: { label: 'Đã duyệt', cls: 'badge-success' },
  rejected: { label: 'Từ chối', cls: 'badge-error' },
};

/** 'vừa xong' / '5 phút trước' — rows only render after the client fetch, so no SSR mismatch. */
function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return '—';
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} tỷ₫`;
  return `${value.toLocaleString('vi-VN')}₫`;
}

const activityLabel = (activity: AdminRecentActivity) =>
  activity.booking_code || activity.id.slice(0, 8).toUpperCase();

export default function OverviewTab({ onNavigate }: Props) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [flightCount, setFlightCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The two counters come from list endpoints with their own permissions —
      // a denied permission must not blank the whole overview, hence the
      // per-call fallback to `null` ('—' in the UI).
      const [analyticsData, flightsData, usersData] = await Promise.all([
        getAdminAnalytics(),
        listAdminFlights({ limit: 1 }).catch(() => null),
        listUsers({ limit: 1 }).catch(() => null),
      ]);
      setAnalytics(analyticsData);
      setFlightCount(flightsData?.pagination?.total ?? null);
      setUserCount(usersData?.pagination?.total ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải số liệu tổng quan.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = analytics
    ? [
        {
          label: 'Tổng doanh thu',
          value: formatCompactCurrency(analytics.revenue.totalRevenue),
          sub: `${analytics.revenue.completedBookings} vé hoàn thành`,
          icon: 'CurrencyDollarIcon' as const,
          color: 'bg-green-50 text-green-600',
        },
        {
          label: 'Vé đã bán',
          value: analytics.revenue.totalBookings.toLocaleString('vi-VN'),
          sub: `${analytics.revenue.pendingBookings} chờ thanh toán`,
          icon: 'TicketIcon' as const,
          color: 'bg-primary-50 text-primary',
        },
        {
          label: 'Chuyến bay',
          value: flightCount === null ? '—' : flightCount.toLocaleString('vi-VN'),
          sub: 'trong hệ thống',
          icon: 'PaperAirplaneIcon' as const,
          color: 'bg-blue-50 text-blue-600',
        },
        {
          label: 'Người dùng',
          value: userCount === null ? '—' : userCount.toLocaleString('vi-VN'),
          sub: 'tài khoản',
          icon: 'UsersIcon' as const,
          color: 'bg-purple-50 text-purple-600',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      {isLoading ? (
        <DashboardStatsSkeleton count={4} />
      ) : error ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            borderColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <Icon name="ExclamationTriangleIcon" size={32} className="text-primary mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">Không tải được số liệu</h3>
          <p className="text-sm text-slate-400 mb-5">{error}</p>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all"
          >
            <Icon name="ArrowPathIcon" size={16} />
            Thử lại
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-300">Chỉ số tổng quan</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Dữ liệu trực tiếp
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border transition-all duration-300 p-5 group hover:translate-y-[-4px]"
                style={{
                  background: 'rgba(30, 41, 59, 0.4)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${stat.color.split(' ')[0].replace('bg-', 'bg-opacity-20 bg-')}`}
                    style={{
                      border: '1px solid rgba(255,255,255,0.05)',
                      boxShadow: 'inset 0 0 12px rgba(255,255,255,0.05)',
                    }}
                  >
                    <Icon name={stat.icon} size={24} className={stat.color.split(' ')[1]} />
                  </div>
                  <div
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400"
                    style={{ border: '1px solid rgba(148,163,184,0.2)' }}
                  >
                    {stat.sub}
                  </div>
                </div>
                <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Thêm chuyến bay',
            icon: 'PlusCircleIcon' as const,
            tab: 'flights' as AdminTab,
            color: 'from-indigo-600 to-indigo-700 text-white',
            shadow: '0 4px 15px rgba(79,70,229,0.3)',
          },
          {
            label: 'Quản lý vé',
            icon: 'TicketIcon' as const,
            tab: 'bookings' as AdminTab,
            color: 'from-amber-400 to-amber-500 text-slate-900',
            shadow: '0 4px 15px rgba(245,158,11,0.3)',
          },
          {
            label: 'Xem người dùng',
            icon: 'UsersIcon' as const,
            tab: 'users' as AdminTab,
            color: 'from-emerald-500 to-emerald-600 text-white',
            shadow: '0 4px 15px rgba(16,185,129,0.3)',
          },
          {
            label: 'Báo cáo doanh thu',
            icon: 'ChartBarIcon' as const,
            tab: 'revenue' as AdminTab,
            color: 'from-rose-500 to-rose-600 text-white',
            shadow: '0 4px 15px rgba(225,29,72,0.3)',
          },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.tab)}
            className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 text-left font-bold text-sm transition-all duration-300 hover:translate-y-[-2px] hover:brightness-110 active:scale-95 flex flex-col gap-3 group`}
            style={{ boxShadow: action.shadow }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
              <Icon name={action.icon} size={20} />
            </div>
            {action.label}
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Hoạt động gần đây
          </h2>
          <button
            onClick={() => void load()}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-all hover:gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
          >
            <Icon name="ArrowPathIcon" size={12} />
            Làm mới
          </button>
          <button
            onClick={() => onNavigate('bookings')}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-all hover:gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
          >
            Xem tất cả
            <Icon name="ArrowRightIcon" size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-6 py-4">
                  Mã đặt chỗ
                </th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-6 py-4">
                  Khách hàng
                </th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-6 py-4 hidden sm:table-cell">
                  Hành trình
                </th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-6 py-4">
                  Giá trị
                </th>
                <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-6 py-4">
                  Trạng thái
                </th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-6 py-4 hidden md:table-cell">
                  Thời gian
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <AdminBookingsTableSkeleton rows={5} />
              ) : !analytics || analytics.recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                    Chưa có hoạt động nào.
                  </td>
                </tr>
              ) : (
                analytics.recentActivity.map((activity) => (
                  <tr
                    key={`${activity.type}-${activity.id}`}
                    className="vj-table-row border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-sm text-indigo-400">
                        {activityLabel(activity)}
                      </span>
                      {activity.type === 'refund' && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Hoàn tiền
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-200">
                        {activity.user_name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm text-slate-400 font-medium">
                        {activity.route || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-white text-sm">
                        {typeof activity.total_price === 'number'
                          ? `${activity.total_price.toLocaleString('vi-VN')}₫`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${(STATUS_MAP[activity.status]?.cls ?? 'badge-warning').replace('badge-', 'bg-').replace('success', 'emerald-500/10 text-emerald-400').replace('warning', 'amber-500/10 text-amber-400').replace('error', 'rose-500/10 text-rose-400').replace('info', 'sky-500/10 text-sky-400')}`}
                        style={{ border: '1px solid currentColor' }}
                      >
                        {STATUS_MAP[activity.status]?.label ?? activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right hidden md:table-cell">
                      <span className="text-xs text-slate-500 font-medium">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
