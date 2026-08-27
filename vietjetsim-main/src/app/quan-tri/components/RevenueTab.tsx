'use client';
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import Icon from '@/components/ui/AppIcon';
import { RevenueTabSkeleton } from '@/components/ui/SkeletonLoader';

const MONTHLY_REVENUE = [
  { month: 'T10/25', revenue: 285000000, tickets: 312 },
  { month: 'T11/25', revenue: 342000000, tickets: 378 },
  { month: 'T12/25', revenue: 521000000, tickets: 567 },
  { month: 'T1/26', revenue: 398000000, tickets: 431 },
  { month: 'T2/26', revenue: 445000000, tickets: 489 },
  { month: 'T3/26', revenue: 482000000, tickets: 523 },
];

const ROUTE_REVENUE = [
  { route: 'HAN→SGN', revenue: 1820000000, tickets: 1245, color: '#ED1C24' },
  { route: 'SGN→PQC', revenue: 980000000, tickets: 876, color: '#FFD400' },
  { route: 'HAN→DAD', revenue: 654000000, tickets: 698, color: '#3B82F6' },
  { route: 'SGN→HAN', revenue: 756000000, tickets: 634, color: '#10B981' },
  { route: 'Khác', revenue: 610000000, tickets: 394, color: '#8B5CF6' },
];

const CLASS_SPLIT = [
  { name: 'Phổ thông', value: 78, color: '#ED1C24' },
  { name: 'Thương gia', value: 22, color: '#FFD400' },
];

const formatCurrency = (val: number) => {
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B₫`;
  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M₫`;
  return `${val.toLocaleString('vi-VN')}₫`;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-3 text-xs">
        <div className="font-bold text-stone-900 mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="text-stone-600">
            {p.name}:{' '}
            <span className="font-bold text-stone-900">
              {typeof p.value === 'number' && p.value > 10000 ? formatCurrency(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueTab() {
  const [period, setPeriod] = useState<'6m' | '3m' | '1m'>('6m');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate data fetch — in production replace with real API call
      try {
        setIsLoading(false);
      } catch {
        setError('Không thể tải dữ liệu doanh thu. Vui lòng thử lại.');
        setIsLoading(false);
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <RevenueTabSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Icon name="ExclamationTriangleIcon" size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">Lỗi tải dữ liệu</h3>
        <p className="text-sm text-stone-500 text-center max-w-sm mb-5">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          <Icon name="ArrowPathIcon" size={16} />
          Thử lại
        </button>
      </div>
    );
  }

  const totalRevenue = MONTHLY_REVENUE.reduce((s, m) => s + m.revenue, 0);
  const totalTickets = MONTHLY_REVENUE.reduce((s, m) => s + m.tickets, 0);
  const avgTicketPrice = Math.round(totalRevenue / totalTickets);

  const displayData =
    period === '1m'
      ? MONTHLY_REVENUE.slice(-1)
      : period === '3m'
        ? MONTHLY_REVENUE.slice(-3)
        : MONTHLY_REVENUE;

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-stone-900">Thống kê doanh thu</h2>
          <p className="text-sm text-stone-400">Cập nhật lần cuối: 16/03/2026 21:00</p>
        </div>
        <div className="flex bg-white border border-stone-200 rounded-xl p-1 gap-1">
          {[
            ['1m', '1 tháng'],
            ['3m', '3 tháng'],
            ['6m', '6 tháng'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPeriod(val as '6m' | '3m' | '1m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === val ? 'bg-primary text-white' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Tổng doanh thu',
            value: formatCurrency(totalRevenue),
            icon: 'CurrencyDollarIcon' as const,
            change: '+12.5%',
            color: 'text-green-600 bg-green-50',
          },
          {
            label: 'Tổng vé đã bán',
            value: totalTickets.toLocaleString('vi-VN'),
            icon: 'TicketIcon' as const,
            change: '+8.2%',
            color: 'text-primary bg-primary-50',
          },
          {
            label: 'Giá vé trung bình',
            value: formatCurrency(avgTicketPrice),
            icon: 'ChartBarIcon' as const,
            change: '+3.8%',
            color: 'text-blue-600 bg-blue-50',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color.split(' ')[1]}`}
              >
                <Icon name={kpi.icon} size={20} className={kpi.color.split(' ')[0]} />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                {kpi.change}
              </span>
            </div>
            <div className="text-2xl font-black text-stone-900">{kpi.value}</div>
            <div className="text-xs text-stone-400 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <h3 className="font-bold text-stone-900 mb-5">Doanh thu theo tháng</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716C' }} />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 10, fill: '#78716C' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Doanh thu" fill="#ED1C24" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tickets Trend + Route Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tickets Line Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-bold text-stone-900 mb-5">Số lượng vé bán ra</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716C' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="tickets"
                name="Số vé"
                stroke="#FFD400"
                strokeWidth={3}
                dot={{ fill: '#FFD400', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Class Split */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-bold text-stone-900 mb-5">Phân bổ theo hạng ghế</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={CLASS_SPLIT}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {CLASS_SPLIT.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => `${val}%`} />
              <Legend formatter={(val) => <span className="text-xs text-stone-600">{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Route Revenue Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <h3 className="font-bold text-stone-900">Doanh thu theo đường bay</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3">
                  Đường bay
                </th>
                <th className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3">
                  Doanh thu
                </th>
                <th className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3">
                  Vé bán
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                  Tỷ trọng
                </th>
              </tr>
            </thead>
            <tbody>
              {ROUTE_REVENUE.map((route, i) => {
                const pct = Math.round(
                  (route.revenue / ROUTE_REVENUE.reduce((s, r) => s + r.revenue, 0)) * 100
                );
                return (
                  <tr
                    key={route.route}
                    className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: route.color }}
                        />
                        <span className="font-bold text-stone-900 text-sm">{route.route}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-stone-900 text-sm">
                        {formatCurrency(route.revenue)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm text-stone-600">
                        {route.tickets.toLocaleString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: route.color }}
                          />
                        </div>
                        <span className="text-xs text-stone-500 w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
