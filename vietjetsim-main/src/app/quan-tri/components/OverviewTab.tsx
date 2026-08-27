'use client';
import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { AdminTab } from './AdminDashboardClient';
import { DashboardStatsSkeleton, AdminBookingsTableSkeleton } from '@/components/ui/SkeletonLoader';

interface Props {
  onNavigate: (tab: AdminTab) => void;
}

const STATS = [
  {
    label: 'Tổng doanh thu',
    value: '4.82 tỷ₫',
    change: '+12.5%',
    positive: true,
    icon: 'CurrencyDollarIcon' as const,
    color: 'bg-green-50 text-green-600',
  },
  {
    label: 'Vé đã bán',
    value: '3,847',
    change: '+8.2%',
    positive: true,
    icon: 'TicketIcon' as const,
    color: 'bg-primary-50 text-primary',
  },
  {
    label: 'Chuyến bay hoạt động',
    value: '48',
    change: '-2',
    positive: false,
    icon: 'PaperAirplaneIcon' as const,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Người dùng mới',
    value: '284',
    change: '+23.1%',
    positive: true,
    icon: 'UsersIcon' as const,
    color: 'bg-purple-50 text-purple-600',
  },
];

const RECENT_BOOKINGS = [
  {
    id: 'VJ2B4K9',
    user: 'Nguyễn Văn An',
    route: 'HAN → SGN',
    amount: 1038900,
    status: 'confirmed',
    time: '5 phút trước',
  },
  {
    id: 'VJ7M3P1',
    user: 'Trần Thị Bích',
    route: 'SGN → PQC',
    amount: 598900,
    status: 'confirmed',
    time: '12 phút trước',
  },
  {
    id: 'VJ9X8Y7',
    user: 'Lê Minh Tuấn',
    route: 'HAN → DAD',
    amount: 548900,
    status: 'pending',
    time: '28 phút trước',
  },
  {
    id: 'VJ5Z6W4',
    user: 'Phạm Thu Hà',
    route: 'SGN → HAN',
    amount: 748900,
    status: 'cancelled',
    time: '1 giờ trước',
  },
  {
    id: 'VJ1A2B3',
    user: 'Hoàng Văn Dũng',
    route: 'HAN → CXR',
    amount: 449900,
    status: 'confirmed',
    time: '2 giờ trước',
  },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Xác nhận', cls: 'badge-success' },
  pending: { label: 'Chờ duyệt', cls: 'badge-warning' },
  cancelled: { label: 'Đã huỷ', cls: 'badge-error' },
};

export default function OverviewTab({ onNavigate }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      {isLoading ? (
        <DashboardStatsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => (
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
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    stat.positive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                  style={{
                    border: stat.positive
                      ? '1px solid rgba(16,185,129,0.2)'
                      : '1px solid rgba(248,113,113,0.2)',
                  }}
                >
                  {stat.positive ? '↑' : '↓'} {stat.change.replace('+', '').replace('-', '')}
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
                {stat.label}
              </div>
            </div>
          ))}
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

      {/* Recent Bookings */}
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
            Đặt vé gần đây
          </h2>
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
              ) : (
                RECENT_BOOKINGS.map((booking, i) => (
                  <tr
                    key={booking.id}
                    className="vj-table-row border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-sm text-indigo-400">
                        {booking.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-200">{booking.user}</span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm text-slate-400 font-medium">{booking.route}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-white text-sm">
                        {booking.amount.toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${STATUS_MAP[booking.status].cls.replace('badge-', 'bg-').replace('success', 'emerald-500/10 text-emerald-400').replace('warning', 'amber-500/10 text-amber-400').replace('error', 'rose-500/10 text-rose-400')}`}
                        style={{ border: '1px solid currentColor' }}
                      >
                        {STATUS_MAP[booking.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right hidden md:table-cell">
                      <span className="text-xs text-slate-500 font-medium">{booking.time}</span>
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
