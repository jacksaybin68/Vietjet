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
    const timer = setTimeout(() => setIsLoading(false), 1200);
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
              className="bg-white rounded-2xl border border-stone-200 p-5 card-hover"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color.split(' ')[0]}`}
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                >
                  <Icon name={stat.icon} size={20} className={stat.color.split(' ')[1]} />
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    stat.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-black text-stone-900">{stat.value}</div>
              <div className="text-xs text-stone-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Thêm chuyến bay',
            icon: 'PlusCircleIcon' as const,
            tab: 'flights' as AdminTab,
            color: 'bg-primary text-white',
            shadow: '0 2px 8px rgba(237,28,36,0.22)',
          },
          {
            label: 'Quản lý vé',
            icon: 'TicketIcon' as const,
            tab: 'bookings' as AdminTab,
            color: 'bg-accent text-stone-900',
            shadow: '0 2px 8px rgba(255,212,0,0.28)',
          },
          {
            label: 'Xem người dùng',
            icon: 'UsersIcon' as const,
            tab: 'users' as AdminTab,
            color: 'bg-blue-600 text-white',
            shadow: '0 2px 8px rgba(37,99,235,0.22)',
          },
          {
            label: 'Báo cáo doanh thu',
            icon: 'ChartBarIcon' as const,
            tab: 'revenue' as AdminTab,
            color: 'bg-green-600 text-white',
            shadow: '0 2px 8px rgba(22,163,74,0.22)',
          },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.tab)}
            className={`${action.color} rounded-xl p-4 text-left font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2`}
            style={{ boxShadow: action.shadow }}
          >
            <Icon name={action.icon} size={18} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Recent Bookings */}
      <div
        className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">Đặt vé gần đây</h2>
          <button
            onClick={() => onNavigate('bookings')}
            className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
          >
            Xem tất cả
            <Icon name="ArrowRightIcon" size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3">
                  Mã đặt chỗ
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3">
                  Khách hàng
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                  Hành trình
                </th>
                <th className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3">
                  Giá trị
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3">
                  Trạng thái
                </th>
                <th className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">
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
                    className={`vj-table-row border-b border-stone-50 ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {booking.id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-stone-700">{booking.user}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-stone-600 font-semibold">{booking.route}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-stone-900 text-sm">
                        {booking.amount.toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_MAP[booking.status].cls}`}
                      >
                        <span className="badge-dot" />
                        {STATUS_MAP[booking.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      <span className="text-xs text-stone-400">{booking.time}</span>
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
