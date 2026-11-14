'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SeatDistribution } from '../types/dashboard';

interface SeatClassPieChartProps {
  data?: SeatDistribution[];
  title?: string;
  className?: string;
}

const CLASS_COLORS: Record<string, string> = {
  eco: '#7CB342',
  economy: '#7CB342',
  deluxe: '#F4511E',
  skyboss: '#EC2029',
  business: '#B8860B',
};

function getSeatColor(item: SeatDistribution, index: number): string {
  if (item.color) return item.color;
  const key = (item.class || item.name || '').toLowerCase();
  for (const [k, color] of Object.entries(CLASS_COLORS)) {
    if (key.includes(k)) return color;
  }
  const fallbackColors = ['#7CB342', '#F4511E', '#EC2029', '#B8860B', '#38BDF8', '#8B5CF6'];
  return fallbackColors[index % fallbackColors.length];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: SeatDistribution;
    color?: string;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  const color = payload[0].color || '#38BDF8';

  return (
    <div
      className="rounded-xl border border-white/10 p-3 text-xs shadow-xl backdrop-blur-md"
      style={{ background: 'rgba(15, 23, 42, 0.95)' }}
    >
      <div className="flex items-center gap-2 font-bold text-white mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span>{item.name || item.class}</span>
      </div>
      <div className="space-y-1 text-slate-300">
        <div>
          Số lượng:{' '}
          <span className="font-bold text-white">{item.count.toLocaleString('vi-VN')}</span>
        </div>
        <div>
          Tỷ lệ: <span className="font-bold text-white">{item.percent}%</span>
        </div>
      </div>
    </div>
  );
};

export default function SeatClassPieChart({
  data = [],
  title = 'Phân bổ hạng vé (Seat Class)',
  className = '',
}: SeatClassPieChartProps) {
  const hasData = Array.isArray(data) && data.length > 0 && data.some((d) => d.count > 0);

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
            Tỷ lệ theo từng hạng vé Eco, Deluxe, SkyBoss, Business
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-sm text-slate-400">
          <p>Chưa có dữ liệu phân bổ hạng vé</p>
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                formatter={(value: string, entry) => {
                  const item = data.find((d) => (d.name || d.class) === value);
                  return (
                    <span className="text-slate-300 text-xs font-medium ml-1 mr-3">
                      {value} {item ? `(${item.percent}%)` : ''}
                    </span>
                  );
                }}
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="46%"
                outerRadius={88}
                innerRadius={36}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getSeatColor(entry, index)}
                    stroke="rgba(15, 23, 42, 0.5)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
