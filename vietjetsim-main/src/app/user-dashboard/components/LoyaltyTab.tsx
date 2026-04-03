'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';
import { getTierColor } from '@/lib/loyalty';
import Pagination from '@/components/ui/Pagination';

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjust';
  description: string | null;
  expires_at: string | null;
  expired: boolean;
  created_at: string;
}

interface LoyaltyData {
  id: string;
  total_points: number;
  available_points: number;
  lifetime_points: number;
  tier: string;
  joined_at: string;
}

interface Tier {
  id: string;
  name: string;
  min_lifetime_points: number;
  points_multiplier: number;
  benefits: string | null;
  tier_order: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  earn: { label: 'Tích điểm', color: '#10B981', bg: '#D1FAE5', icon: 'ArrowTrendingUpIcon' },
  redeem: { label: 'Đổi điểm', color: '#EC2029', bg: '#FEE2E2', icon: 'GiftIcon' },
  expire: { label: 'Hết hạn', color: '#6B7280', bg: '#F3F4F6', icon: 'ClockIcon' },
  bonus: { label: 'Thưởng', color: '#F59E0B', bg: '#FEF3C7', icon: 'StarIcon' },
  adjust: { label: 'Điều chỉnh', color: '#8B5CF6', bg: '#EDE9FE', icon: 'AdjustmentsHorizontalIcon' },
};

function formatPoints(points: number): string {
  return Math.abs(points).toLocaleString('vi-VN');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function RedeemModal({
  availablePoints,
  onClose,
  onSuccess,
}: {
  availablePoints: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState('');

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(points);
    if (!pts || pts <= 0) {
      toast.error('Lỗi', 'Vui lòng nhập số điểm hợp lệ.');
      return;
    }
    if (pts < 500) {
      toast.error('Lỗi', 'Tối thiểu 500 điểm để đổi.');
      return;
    }
    if (pts > availablePoints) {
      toast.error('Lỗi', 'Số điểm không đủ.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ points: pts, description: 'Đổi điểm thưởng VietjetSim' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Lỗi', data.error || 'Đổi điểm thất bại.');
        return;
      }
      toast.success('Thành công', `Đã đổi ${formatPoints(pts)} điểm.`);
      onSuccess();
      onClose();
    } catch {
      toast.error('Lỗi', 'Đổi điểm thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#EC2029]/20 focus:border-[#EC2029] font-[Be Vietnam Pro,sans-serif]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Đổi điểm thưởng
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            <Icon name="XMarkIcon" size={20} className="text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleRedeem} className="p-6 space-y-5">
          <div className="bg-[#FFD400]/10 rounded-xl p-4 text-center">
            <div className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
              Điểm khả dụng
            </div>
            <div className="text-3xl font-bold font-[KoHo,sans-serif] text-[#1A2948] mt-1">
              {formatPoints(availablePoints)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-[#1A2948] font-[KoHo,sans-serif]">
              Số điểm muốn đổi
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className={inputClass}
              placeholder="Nhập số điểm (tối thiểu 500)"
              min={500}
              max={availablePoints}
            />
            <div className="flex gap-2 mt-2">
              {[500, 1000, 2000, 5000].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPoints(p.toString())}
                  disabled={p > availablePoints}
                  className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold text-[#1A2948] transition-colors disabled:opacity-40 font-[Be Vietnam Pro,sans-serif]"
                >
                  {formatPoints(p)}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-stone-500 font-[Be Vietnam Pro,sans-serif]">
            Quy đổi: 1,000 điểm = 10,000 VND giảm giá vé máy bay.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#FFD400] text-[#1A2948] rounded-xl font-bold text-sm font-[KoHo,sans-serif] hover:bg-[#E5C100] transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
              ) : (
                <Icon name="GiftIcon" size={18} />
              )}
              Đổi điểm
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-stone-200 transition-all"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoyaltyTab() {
  const toast = useToast();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRedeem, setShowRedeem] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchData = useCallback(async () => {
    try {
      const [loyaltyRes, txRes] = await Promise.all([
        fetch('/api/loyalty', { credentials: 'include' }),
        fetch(`/api/loyalty/transactions?limit=${limit}&offset=${(page - 1) * limit}`, {
          credentials: 'include',
        }),
      ]);

      const loyaltyData = await loyaltyRes.json();
      const txData = await txRes.json();

      if (loyaltyRes.ok && loyaltyData.loyalty) {
        setLoyalty(loyaltyData.loyalty);
        setTiers(loyaltyData.tiers || []);
      }

      if (txRes.ok) {
        setTransactions(txData.transactions || []);
      }
    } catch {
      toast.error('Lỗi', 'Không thể tải dữ liệu loyalty.');
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tierColors = loyalty ? getTierColor(loyalty.tier) : getTierColor('Bronze');

  const currentTierIndex = tiers.findIndex((t) => t.name === loyalty?.tier);
  const nextTier = currentTierIndex >= 0 && currentTierIndex < tiers.length - 1
    ? tiers[currentTierIndex + 1]
    : null;
  const currentTierMin = tiers[currentTierIndex]?.min_lifetime_points || 0;
  const range = nextTier ? nextTier.min_lifetime_points - currentTierMin : 1;
  const progress = loyalty ? loyalty.lifetime_points - currentTierMin : 0;
  const progressPercent = nextTier
    ? Math.min(100, Math.round((progress / range) * 100))
    : 100;

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-56 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-40 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Điểm thưởng
          </h2>
          <p className="text-sm text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
            Chương trình tích điểm VietjetSim Rewards
          </p>
        </div>
        <button
          onClick={() => setShowRedeem(true)}
          disabled={!loyalty || loyalty.available_points < 500}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFD400] text-[#1A2948] rounded-lg text-sm font-bold font-[KoHo,sans-serif] hover:bg-[#E5C100] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Icon name="GiftIcon" size={16} />
          Đổi điểm
        </button>
      </div>

      {/* Tier Card */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tierColors.bg} 0%, ${tierColors.border} 100%)`,
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />

        <div className="relative">
          {/* Tier Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="px-4 py-1.5 rounded-full text-sm font-bold font-[KoHo,sans-serif]"
              style={{ background: 'rgba(255,255,255,0.3)', color: '#fff' }}
            >
              {loyalty?.tier || 'Bronze'}
            </div>
            <span className="text-sm text-white/70 font-[Be Vietnam Pro,sans-serif]">
              Thành viên từ{' '}
              {loyalty?.joined_at ? formatDate(loyalty.joined_at) : 'N/A'}
            </span>
          </div>

          {/* Points */}
          <div className="mb-4">
            <div className="text-sm text-white/70 font-[Be Vietnam Pro,sans-serif] mb-1">
              Điểm khả dụng
            </div>
            <div className="text-4xl font-bold font-[KoHo,sans-serif]">
              {formatPoints(loyalty?.available_points || 0)}
              <span className="text-lg ml-1 text-white/70">điểm</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-xs text-white/60 font-[Be Vietnam Pro,sans-serif]">Tổng điểm</div>
              <div className="text-lg font-bold font-[KoHo,sans-serif]">
                {formatPoints(loyalty?.total_points || 0)}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-xs text-white/60 font-[Be Vietnam Pro,sans-serif]">Điểm tích lũy trọn đời</div>
              <div className="text-lg font-bold font-[KoHo,sans-serif]">
                {formatPoints(loyalty?.lifetime_points || 0)}
              </div>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {nextTier && (
            <div className="mt-4 bg-white/10 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-white/80 font-[Be Vietnam Pro,sans-serif]">
                  {nextTier.name}
                </span>
                <span className="text-xs text-white/60 font-[Be Vietnam Pro,sans-serif]">
                  {formatPoints(loyalty?.lifetime_points || 0)} / {formatPoints(nextTier.min_lifetime_points)} điểm
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%`, background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tiers Overview */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
        <div className="p-5 border-b border-stone-100">
          <h3 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Hạng thành viên
          </h3>
        </div>
        <div className="flex overflow-x-auto">
          {tiers.map((tier) => {
            const colors = getTierColor(tier.name);
            const isCurrentTier = tier.name === loyalty?.tier;
            return (
              <div
                key={tier.id}
                className={`flex-1 min-w-[140px] p-4 text-center border-r border-stone-100 last:border-r-0 ${
                  isCurrentTier ? 'bg-stone-50' : ''
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ background: colors.bg }}
                >
                  <Icon name="StarIcon" size={18} style={{ color: colors.bg === '#FFD700' ? colors.text : colors.bg }} />
                </div>
                <div
                  className="text-sm font-bold font-[KoHo,sans-serif]"
                  style={{ color: isCurrentTier ? '#EC2029' : '#1A2948' }}
                >
                  {tier.name}
                </div>
                <div className="text-xs text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
                  {formatPoints(tier.min_lifetime_points)} điểm
                </div>
                {isCurrentTier && (
                  <div className="mt-2 text-xs font-bold text-[#EC2029] font-[Be Vietnam Pro,sans-serif]">
                    ★ Hạng hiện tại
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
        <div className="p-5 border-b border-stone-100">
          <h3 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Lịch sử điểm
          </h3>
        </div>

        <div className="divide-y divide-stone-100">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="StarIcon" size={28} className="text-stone-400" />
              </div>
              <p className="text-stone-500 text-sm font-[Be Vietnam Pro,sans-serif]">
                Chưa có lịch sử tích điểm.
              </p>
            </div>
          ) : (
            transactions.map((tx) => {
              const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.earn;
              const isPositive = tx.points > 0;
              return (
                <div key={tx.id} className="p-4 flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: config.bg }}
                  >
                    <Icon
                      name={config.icon as any}
                      size={18}
                      style={{ color: config.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#1A2948] font-[KoHo,sans-serif]">
                      {config.label}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 font-[Be Vietnam Pro,sans-serif]">
                      {tx.description || config.label} · {formatDate(tx.created_at)}
                    </div>
                  </div>
                  <div
                    className={`font-bold text-sm font-[KoHo,sans-serif] ${
                      isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}
                  >
                    {isPositive ? '+' : '-'}{formatPoints(tx.points)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {transactions.length >= limit && (
          <div className="p-4 border-t border-stone-100">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(transactions.length / limit))}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {showRedeem && loyalty && (
        <RedeemModal
          availablePoints={loyalty.available_points}
          onClose={() => setShowRedeem(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
