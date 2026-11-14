'use client';

import React from 'react';
import { Icon } from '@/shared/components/ui';
import type { DashboardBookingSummary } from '../types/dashboard';

interface RecentBookingsTableProps {
  data?: DashboardBookingSummary[];
  onViewAll?: () => void;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ thanh toán', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed: {
    label: 'Đã xác nhận',
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  completed: { label: 'Hoàn thành', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  refunded: { label: 'Đã hoàn tiền', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const time = new Date(isoString).getTime();
    if (isNaN(time)) return '—';
    const diffMinutes = Math.floor((Date.now() - time) / 60000);
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays} ngày trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  } catch {
    return '—';
  }
}

export default function RecentBookingsTable({
  data = [],
  onViewAll,
  className = '',
}: RecentBookingsTableProps) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${className}`}
      style={{
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <h3 className="font-bold text-white text-base tracking-tight">Đặt vé gần đây</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              10 giao dịch đặt vé mới nhất trong hệ thống
            </p>
          </div>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-all hover:gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
          >
            Xem tất cả
            <Icon name="ArrowRightIcon" size={12} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              <th className="text-left text-2xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Mã đặt chỗ
              </th>
              <th className="text-left text-2xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Khách hàng
              </th>
              <th className="text-left text-2xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Chặng bay
              </th>
              <th className="text-right text-2xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Tổng tiền
              </th>
              <th className="text-center text-2xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Trạng thái
              </th>
              <th className="text-right text-2xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Thời gian
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!hasData ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  Chưa có giao dịch đặt vé nào
                </td>
              </tr>
            ) : (
              data.map((booking) => {
                const statusMeta = STATUS_MAP[booking.status.toLowerCase()] || {
                  label: booking.status,
                  cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                };

                return (
                  <tr
                    key={booking.id || booking.bookingCode}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {booking.bookingCode || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-200">
                        {booking.customerName || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-sm text-slate-300 font-medium">
                        {booking.route || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <span className="font-bold text-white text-sm">
                        {typeof booking.totalPrice === 'number'
                          ? `${booking.totalPrice.toLocaleString('vi-VN')}₫`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-block text-2xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${statusMeta.cls}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(booking.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
