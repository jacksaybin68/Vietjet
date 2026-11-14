'use client';

import React from 'react';
import { Icon } from '@/shared/components/ui';
import type { DashboardFlightSummary } from '../types/dashboard';

interface UpcomingFlightsTableProps {
  data?: DashboardFlightSummary[];
  onViewAll?: () => void;
  className?: string;
}

const FLIGHT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Đúng giờ', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_time: { label: 'Đúng giờ', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  boarding: { label: 'Đang lên máy bay', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  delayed: { label: 'Chậm giờ', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  departed: { label: 'Đã cất cánh', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  active: { label: 'Hoạt động', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

function formatDepartTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${hours}:${minutes} - ${day}/${month}`;
  } catch {
    return isoString;
  }
}

export default function UpcomingFlightsTable({
  data = [],
  onViewAll,
  className = '',
}: UpcomingFlightsTableProps) {
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
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <div>
            <h3 className="font-bold text-white text-base tracking-tight">
              Chuyến bay sắp cất cánh
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">5 chuyến bay khởi hành tiếp theo</p>
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
              <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Chuyến bay
              </th>
              <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Tuyến bay
              </th>
              <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Khởi hành
              </th>
              <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Ghế trống
              </th>
              <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-3.5">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!hasData ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                  Không có chuyến bay sắp cất cánh
                </td>
              </tr>
            ) : (
              data.map((flight) => {
                const statusMeta = FLIGHT_STATUS_MAP[flight.status.toLowerCase()] || {
                  label: flight.status,
                  cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                };

                const seatsColor =
                  flight.availableSeats > 20
                    ? 'text-emerald-400'
                    : flight.availableSeats > 0
                      ? 'text-amber-400'
                      : 'text-rose-400';

                return (
                  <tr
                    key={flight.id || flight.flightNo}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Icon
                          name="PaperAirplaneIcon"
                          size={14}
                          className="text-primary transform -rotate-45"
                        />
                        <span className="font-mono font-bold text-sm text-white">
                          {flight.flightNo}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-200">
                        {flight.route || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-300">
                        {formatDepartTime(flight.departTime)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-center">
                      <span className={`font-bold text-sm ${seatsColor}`}>
                        {flight.availableSeats}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${statusMeta.cls}`}
                      >
                        {statusMeta.label}
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
