'use client';
import React, { useCallback, useEffect, useState } from 'react';
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
import { Icon } from '@/shared/components/ui';
import { RevenueTabSkeleton } from '@/shared/components/ui';
import { getAdminAnalytics } from '@/features/admin';
import type { AdminAnalytics } from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';

/** Seat-class labels + chart palette; the API returns raw `economy`/`business` keys. */
const CLASS_LABELS: Record<string, string> = {
  economy: 'Phổ thông',
  business: 'Thương gia',
};

const CHART_COLORS = ['#ED1C24', '#FFDD00', '#3B82F6', '#10B981', '#8B5CF6'];

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

const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-[220px] flex items-center justify-center text-sm text-stone-400">{message}</div>
);

export default function RevenueTab() {
  const [period, setPeriod] = useState<'6m' | '3m' | '1m'>('6m');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Set after mount so server and client render the same initial text —
  // rendering Date.now()-derived time during SSR causes a hydration mismatch.
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAnalytics(await getAdminAnalytics());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải dữ liệu doanh thu. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setUpdatedAt(new Date().toLocaleString('vi-VN'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
          onClick={() => void load()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          <Icon name="ArrowPathIcon" size={16} />
          Thử lại
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const monthly = analytics.monthly;
  const displayData =
    period === '1m' ? monthly.slice(-1) : period === '3m' ? monthly.slice(-3) : monthly;

  const routeTotal = analytics.routes.reduce((sum, r) => sum + r.revenue, 0);
  const classTotal = analytics.classSplit.reduce((sum, c) => sum + c.count, 0);
  const classSplit = analytics.classSplit.map((entry, index) => ({
    name: CLASS_LABELS[entry.class] || entry.class,
    value: classTotal > 0 ? Math.round((entry.count / classTotal) * 100) : 0,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-stone-900">Thống kê doanh thu</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              Dữ liệu trực tiếp
            </span>
          </div>
          <p className="text-sm text-stone-400">Cập nhật lần cuối: {updatedAt ?? '—'}</p>
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
            value: formatCurrency(analytics.revenue.totalRevenue),
            note: `${analytics.revenue.completedBookings} vé hoàn thành`,
            icon: 'CurrencyDollarIcon' as const,
            color: 'text-green-600 bg-green-50',
          },
          {
            label: 'Tổng vé đã bán',
            value: analytics.revenue.totalBookings.toLocaleString('vi-VN'),
            note: `${analytics.revenue.pendingBookings} chờ thanh toán`,
            icon: 'TicketIcon' as const,
            color: 'text-primary bg-primary-50',
          },
          {
            label: 'Giá vé trung bình',
            value: formatCurrency(analytics.revenue.avgBookingValue),
            note: 'trung bình mỗi đặt chỗ',
            icon: 'ChartBarIcon' as const,
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
              <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {kpi.note}
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
        {displayData.length === 0 ? (
          <EmptyChart message="Chưa có đặt chỗ nào trong khoảng thời gian này." />
        ) : (
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
        )}
      </div>

      {/* Tickets Trend + Class Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tickets Line Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-bold text-stone-900 mb-5">Số lượng vé bán ra</h3>
          {displayData.length === 0 ? (
            <EmptyChart message="Chưa có dữ liệu vé bán ra." />
          ) : (
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
                  stroke="#FFDD00"
                  strokeWidth={3}
                  dot={{ fill: '#FFDD00', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart - Class Split */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-bold text-stone-900 mb-5">Phân bổ theo hạng ghế</h3>
          {classSplit.length === 0 ? (
            <EmptyChart message="Chưa có dữ liệu hạng ghế." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={classSplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {classSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend
                  formatter={(val) => <span className="text-xs text-stone-600">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
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
              {analytics.routes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-stone-400">
                    Chưa có dữ liệu đường bay.
                  </td>
                </tr>
              ) : (
                analytics.routes.map((route, i) => {
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  const pct = routeTotal > 0 ? Math.round((route.revenue / routeTotal) * 100) : 0;
                  return (
                    <tr
                      key={route.route}
                      className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
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
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-xs text-stone-500 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
