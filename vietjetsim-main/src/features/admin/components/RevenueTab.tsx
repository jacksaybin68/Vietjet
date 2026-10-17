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
import { getAdminAnalytics } from '@/features/admin';
import type { AdminAnalytics } from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';
import {
  AdminTabHeader,
  AdminStatCard,
  ADMIN_CARD_CLASS,
  ADMIN_CARD_STYLE,
  ADMIN_ACTION_BTN,
  ADMIN_SUBTITLE_CLASS,
} from './AdminSection';

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
      <div
        className="rounded-xl border border-white/10 p-3 text-xs"
        style={{ background: '#0f172a' }}
      >
        <div className="font-bold text-white mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="text-slate-400">
            {p.name}:{' '}
            <span className="font-bold text-white">
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
  <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">{message}</div>
);

const AXIS_TICK = { fontSize: 11, fill: '#64748b' };

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
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-slate-500/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-slate-500/10 rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-slate-500/10 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={ADMIN_CARD_CLASS} style={ADMIN_CARD_STYLE}>
              <div className="h-4 w-24 bg-slate-500/10 rounded mb-3 animate-pulse" />
              <div className="h-8 w-32 bg-slate-500/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <AdminTabHeader
          icon="BanknotesIcon"
          title="Thống kê doanh thu"
          subtitle="Doanh thu theo thời gian thực"
        />
        <div
          className={ADMIN_CARD_CLASS}
          style={{ ...ADMIN_CARD_STYLE, textAlign: 'center', padding: '3rem' }}
        >
          <Icon name="ExclamationTriangleIcon" size={32} className="text-primary mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">Lỗi tải dữ liệu</h3>
          <p className="text-sm text-slate-400 mb-5">{error}</p>
          <button
            onClick={() => void load()}
            className={`${ADMIN_ACTION_BTN} text-sm font-semibold text-white bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 mx-auto`}
          >
            <Icon name="ArrowPathIcon" size={16} />
            Thử lại
          </button>
        </div>
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
    <div className="space-y-5">
      <AdminTabHeader
        icon="BanknotesIcon"
        title="Thống kê doanh thu"
        subtitle={`Cập nhật lần cuối: ${updatedAt ?? '—'}`}
        actions={
          <div className="flex rounded-xl p-1 gap-1 border border-white/10 bg-slate-900/60">
            {[
              ['1m', '1 tháng'],
              ['3m', '3 tháng'],
              ['6m', '6 tháng'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPeriod(val as '6m' | '3m' | '1m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === val ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard
          icon="CurrencyDollarIcon"
          iconClassName="text-emerald-400"
          value={formatCurrency(analytics.revenue.totalRevenue)}
          label={`Tổng doanh thu · ${analytics.revenue.completedBookings} vé hoàn thành`}
        />
        <AdminStatCard
          icon="TicketIcon"
          iconClassName="text-rose-400"
          value={analytics.revenue.totalBookings.toLocaleString('vi-VN')}
          label={`Tổng vé đã bán · ${analytics.revenue.pendingBookings} chờ thanh toán`}
        />
        <AdminStatCard
          icon="ChartBarIcon"
          iconClassName="text-blue-400"
          value={formatCurrency(analytics.revenue.avgBookingValue)}
          label="Giá vé trung bình mỗi đặt chỗ"
        />
      </div>

      {/* Revenue Chart */}
      <div className={ADMIN_CARD_CLASS} style={ADMIN_CARD_STYLE}>
        <h3 className="font-bold text-white mb-5">Doanh thu theo tháng</h3>
        {displayData.length === 0 ? (
          <EmptyChart message="Chưa có đặt chỗ nào trong khoảng thời gian này." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" tick={AXIS_TICK} />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 10, fill: '#64748b' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="revenue" name="Doanh thu" fill="#ED1C24" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tickets Trend + Class Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={ADMIN_CARD_CLASS} style={ADMIN_CARD_STYLE}>
          <h3 className="font-bold text-white mb-5">Số lượng vé bán ra</h3>
          {displayData.length === 0 ? (
            <EmptyChart message="Chưa có dữ liệu vé bán ra." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="month" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
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

        <div className={ADMIN_CARD_CLASS} style={ADMIN_CARD_STYLE}>
          <h3 className="font-bold text-white mb-5">Phân bổ theo hạng ghế</h3>
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
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.1)" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => `${val}%`}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#fff',
                  }}
                />
                <Legend
                  formatter={(val) => <span className="text-xs text-slate-400">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Route Revenue Table */}
      <div
        className={ADMIN_CARD_CLASS}
        style={{ ...ADMIN_CARD_STYLE, padding: 0, overflow: 'hidden' }}
      >
        <div className="p-5 border-b border-white/5">
          <h3 className="font-bold text-white">Doanh thu theo đường bay</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Đường bay
                </th>
                <th className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Doanh thu
                </th>
                <th className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Vé bán
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4 hidden sm:table-cell">
                  Tỷ trọng
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.routes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
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
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-bold text-white text-sm">{route.route}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-bold text-white text-sm">
                          {formatCurrency(route.revenue)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm text-slate-400">
                          {route.tickets.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-500/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-8 tabular-nums">{pct}%</span>
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

      <p className={ADMIN_SUBTITLE_CLASS}>Số liệu đồng bộ với tab Thống kê tổng quan</p>
    </div>
  );
}
