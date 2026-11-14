'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { RevenuePoint } from '../types/dashboard';

interface RevenueChartProps {
  data?: RevenuePoint[];
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

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="rounded-xl border border-white/10 p-3 text-xs shadow-xl backdrop-blur-md"
      style={{ background: 'rgba(15, 23, 42, 0.95)' }}
    >
      <div className="font-bold text-white mb-2 pb-1 border-b border-white/10">
        Ngày: {label ? formatDateLabel(label) : '—'}
      </div>
      <div className="space-y-1.5">
        {payload.map((item, index) => {
          const isRevenue = item.dataKey === 'revenue';
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}:
              </span>
              <span className="font-bold text-white">
                {isRevenue
                  ? `${item.value.toLocaleString('vi-VN')}₫`
                  : `${item.value.toLocaleString('vi-VN')} vé`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function RevenueChart({
  data = [],
  title = 'Doanh thu & Số lượng đặt vé',
  className = '',
}: RevenueChartProps) {
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Biểu đồ kết hợp doanh thu (VND) và số lượng vé bán
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-sm text-slate-400">
          <p>Chưa có dữ liệu doanh thu</p>
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                stroke="rgba(148, 163, 184, 0.2)"
                tickLine={false}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tickFormatter={formatVND}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                stroke="rgba(148, 163, 184, 0.2)"
                tickLine={false}
                width={55}
              />
              <YAxis
                yAxisId="bookings"
                orientation="right"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                stroke="rgba(148, 163, 184, 0.2)"
                tickLine={false}
                allowDecimals={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                formatter={(value: string) => (
                  <span className="text-slate-300 font-medium">{value}</span>
                )}
              />
              <Bar
                yAxisId="bookings"
                dataKey="bookings"
                name="Số đặt vé"
                fill="#38BDF8"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                opacity={0.75}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="#EC2029"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#EC2029', strokeWidth: 1, stroke: '#ffffff' }}
                activeDot={{ r: 5, fill: '#EC2029', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
