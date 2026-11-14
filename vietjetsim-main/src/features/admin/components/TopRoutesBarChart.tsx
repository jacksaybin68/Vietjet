'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TopRoute } from '../types/dashboard';

interface TopRoutesBarChartProps {
  data?: TopRoute[];
  title?: string;
  className?: string;
}

function formatVND(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ₫`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} tr₫`;
  }
  return `${value.toLocaleString('vi-VN')}₫`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TopRoute;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;

  return (
    <div
      className="rounded-xl border border-white/10 p-3 text-xs shadow-xl backdrop-blur-md"
      style={{ background: 'rgba(15, 23, 42, 0.95)' }}
    >
      <div className="font-bold text-white mb-2 pb-1 border-b border-white/10 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary" />
        Chặng: {item.route}
      </div>
      <div className="space-y-1.5 text-slate-300">
        <div className="flex items-center justify-between gap-4">
          <span>Doanh thu:</span>
          <span className="font-bold text-emerald-400">
            {item.revenue.toLocaleString('vi-VN')}₫
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Số lượt đặt:</span>
          <span className="font-bold text-sky-400">
            {item.bookings.toLocaleString('vi-VN')} lượt
          </span>
        </div>
      </div>
    </div>
  );
};

export default function TopRoutesBarChart({
  data = [],
  title = 'Top chặng bay hiệu quả',
  className = '',
}: TopRoutesBarChartProps) {
  const [metric, setMetric] = useState<'revenue' | 'bookings'>('revenue');
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 ${className}`}
      style={{
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Top 5 đường bay có lượng giao dịch và doanh số cao nhất
          </p>
        </div>
        <div className="flex items-center p-0.5 rounded-xl bg-slate-900/60 border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              metric === 'revenue'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Doanh thu
          </button>
          <button
            type="button"
            onClick={() => setMetric('bookings')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              metric === 'bookings'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lượt đặt
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-sm text-slate-400">
          <p>Chưa có dữ liệu chặng bay</p>
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.1)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={(val: number) =>
                  metric === 'revenue' ? formatVND(val) : val.toLocaleString('vi-VN')
                }
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                stroke="rgba(148, 163, 184, 0.2)"
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="route"
                tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                stroke="rgba(148, 163, 184, 0.2)"
                tickLine={false}
                width={85}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={metric}
                name={metric === 'revenue' ? 'Doanh thu' : 'Số lượt đặt'}
                fill={metric === 'revenue' ? '#EC2029' : '#38BDF8'}
                radius={[0, 6, 6, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
