'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CancellationRate } from '../types/dashboard';

interface CancellationDonutChartProps {
  data?: CancellationRate;
  title?: string;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      color: string;
      percent: string;
    };
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
      <div className="flex items-center gap-2 font-bold text-white mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        <span>{item.name}</span>
      </div>
      <div className="space-y-1 text-slate-300">
        <div>
          Số lượng:{' '}
          <span className="font-bold text-white">{item.value.toLocaleString('vi-VN')}</span>
        </div>
        <div>
          Tỷ lệ: <span className="font-bold text-white">{item.percent}</span>
        </div>
      </div>
    </div>
  );
};

export default function CancellationDonutChart({
  data = { total: 0, cancelled: 0, rate: 0 },
  title = 'Tỷ lệ hoàn thành & Huỷ vé',
  className = '',
}: CancellationDonutChartProps) {
  const { total = 0, cancelled = 0, rate = 0 } = data;
  const completed = Math.max(0, total - cancelled);
  const completedPercent = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
  const cancelledPercent = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0';

  const chartData = [
    {
      name: 'Hoàn thành / Giữ chỗ',
      value: completed,
      color: '#10B981',
      percent: `${completedPercent}%`,
    },
    {
      name: 'Đã huỷ vé',
      value: cancelled,
      color: '#EF4444',
      percent: `${cancelledPercent}%`,
    },
  ];

  const hasData = total > 0;

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
            Tương quan giữa đơn đặt thành công và đơn huỷ
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">
            Tỷ lệ huỷ
          </span>
          <div className="text-base font-black text-rose-400">{rate.toFixed(1)}%</div>
        </div>
      </div>

      {!hasData ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-sm text-slate-400">
          <p>Chưa có dữ liệu đặt chỗ</p>
        </div>
      ) : (
        <div className="h-[280px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                formatter={(value: string) => {
                  const item = chartData.find((d) => d.name === value);
                  return (
                    <span className="text-slate-300 text-xs font-medium ml-1 mr-3">
                      {value}{' '}
                      {item ? `(${item.value.toLocaleString('vi-VN')} - ${item.percent})` : ''}
                    </span>
                  );
                }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={4}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`donut-${index}`}
                    fill={entry.color}
                    stroke="rgba(15, 23, 42, 0.5)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Centered Donut Label */}
          <div className="absolute inset-0 top-[-20px] flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-400 font-medium">Tổng</span>
            <span className="text-xl font-black text-white">{total.toLocaleString('vi-VN')}</span>
            <span className="text-2xs text-slate-500">đặt chỗ</span>
          </div>
        </div>
      )}
    </div>
  );
}
