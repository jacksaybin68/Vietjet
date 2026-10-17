'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAdminAnalytics, listAdminFlights, listUsers } from '@/features/admin';
import { Icon } from '@/shared/components/ui';
import {
  AdminTabHeader,
  AdminStatCard,
  ADMIN_CARD_CLASS,
  ADMIN_CARD_STYLE,
  ADMIN_ACTION_BTN,
} from './AdminSection';

interface Stats {
  totalFlights: number;
  totalBookings: number;
  totalUsers: number;
  totalRevenue: number;
}

export default function AnalyticsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [analytics, flights, users] = await Promise.all([
        getAdminAnalytics(),
        listAdminFlights({ limit: 1 }),
        listUsers({ limit: 1 }),
      ]);
      setStats({
        totalFlights: flights.pagination.total,
        totalBookings: analytics.revenue.totalBookings,
        totalUsers: users.pagination.total,
        totalRevenue: analytics.revenue.totalRevenue,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-slate-500/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-slate-500/10 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-slate-500/10 rounded-xl animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={ADMIN_CARD_CLASS} style={ADMIN_CARD_STYLE}>
              <div className="h-4 w-24 bg-slate-500/10 rounded mb-3 animate-pulse" />
              <div className="h-8 w-32 bg-slate-500/10 rounded mb-2 animate-pulse" />
              <div className="h-3 w-full bg-slate-500/10 rounded animate-pulse" />
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
          icon="ChartBarIcon"
          title="Thống kê tổng quan"
          subtitle="Dữ liệu thống kê từ hệ thống"
        />
        <div
          className={ADMIN_CARD_CLASS}
          style={{ ...ADMIN_CARD_STYLE, textAlign: 'center', padding: '3rem' }}
        >
          <Icon name="ExclamationTriangleIcon" size={32} className="text-primary mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">Không thể tải dữ liệu thống kê</h3>
          <p className="text-sm text-slate-400 mb-5">{error}</p>
          <button
            onClick={fetchStats}
            className={`${ADMIN_ACTION_BTN} text-sm font-semibold text-white bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 mx-auto`}
          >
            <Icon name="ArrowPathIcon" size={16} />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-5">
      <AdminTabHeader
        icon="ChartBarIcon"
        title="Thống kê tổng quan"
        subtitle="Dữ liệu thống kê từ hệ thống"
        actions={
          <button
            onClick={fetchStats}
            className={`${ADMIN_ACTION_BTN} text-white bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30`}
          >
            <Icon name="ArrowPathIcon" size={14} />
            Làm mới
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          icon="PaperAirplaneIcon"
          value={stats.totalFlights.toLocaleString('vi-VN')}
          label="Tổng chuyến bay"
        />
        <AdminStatCard
          icon="TicketIcon"
          iconClassName="text-rose-400"
          value={stats.totalBookings.toLocaleString('vi-VN')}
          label="Tổng đặt vé"
        />
        <AdminStatCard
          icon="UsersIcon"
          iconClassName="text-amber-400"
          value={stats.totalUsers.toLocaleString('vi-VN')}
          label="Tổng người dùng"
        />
        <AdminStatCard
          icon="BanknotesIcon"
          iconClassName="text-emerald-400"
          value={formatCurrency(stats.totalRevenue)}
          label="Tổng doanh thu"
        />
      </div>

      {/* Info Banner */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Icon name="InformationCircleIcon" size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-white mb-1">Thông tin</h3>
            <p className="text-sm text-slate-400">
              Tính năng phân tích Neo4j Graph và đề xuất thông minh đang được phát triển. Hiện tại
              chỉ hiển thị thống kê cơ bản từ hệ thống.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
