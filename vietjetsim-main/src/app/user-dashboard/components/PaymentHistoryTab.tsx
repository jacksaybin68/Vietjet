'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';
import Pagination from '@/components/ui/Pagination';

interface Payment {
  id: string;
  booking_id: string;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  booking_status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Đang xử lý', color: '#F59E0B', bg: '#FEF3C7' },
  completed: { label: 'Thành công', color: '#10B981', bg: '#D1FAE5' },
  failed: { label: 'Thất bại', color: '#EF4444', bg: '#FEE2E2' },
  refunded: { label: 'Đã hoàn tiền', color: '#8B5CF6', bg: '#EDE9FE' },
};

const METHOD_LABELS: Record<string, string> = {
  credit_card: 'Thẻ tín dụng',
  bank_transfer: 'Chuyển khoản',
  e_wallet: 'Ví điện tử',
  vietqr: 'VietQR',
  wallet: 'Ví Vietjet Air',
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Chi tiết giao dịch
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            <Icon name="XMarkIcon" size={20} className="text-stone-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center pb-4 border-b border-stone-100">
            <div
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold mb-3"
              style={{ color: status.color, background: status.bg }}
            >
              {status.label}
            </div>
            <div className="text-3xl font-bold font-[KoHo,sans-serif] text-[#1A2948]">
              {formatCurrency(payment.amount)}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
                Mã giao dịch
              </span>
              <span className="text-sm font-semibold text-[#1A2948] font-[Be Vietnam Pro,sans-serif]">
                {payment.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
                Mã đặt chỗ
              </span>
              <span className="text-sm font-semibold text-[#1A2948] font-[Be Vietnam Pro,sans-serif]">
                {payment.booking_id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
                Phương thức
              </span>
              <span className="text-sm font-semibold text-[#1A2948] font-[Be Vietnam Pro,sans-serif]">
                {METHOD_LABELS[payment.method] || payment.method}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
                Ngày thanh toán
              </span>
              <span className="text-sm font-semibold text-[#1A2948] font-[Be Vietnam Pro,sans-serif]">
                {formatDate(payment.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-stone-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#1A2948] text-white rounded-xl font-semibold text-sm font-[KoHo,sans-serif] hover:bg-[#2A3F6F] transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentHistoryTab() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/history?limit=${limit}&offset=${(page - 1) * limit}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (res.ok) {
        setPayments(data.payments || []);
        setTotalPages(Math.max(1, Math.ceil((data.payments?.length || 0) / limit)));
      } else {
        toast.error('Lỗi', 'Không thể tải lịch sử thanh toán.');
      }
    } catch {
      toast.error('Lỗi', 'Không thể tải lịch sử thanh toán.');
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleExportCSV = () => {
    if (payments.length === 0) return;

    const headers = ['Mã GD', 'Mã đặt chỗ', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày'];
    const rows = payments.map((p) => [
      p.id.slice(0, 8).toUpperCase(),
      p.booking_id.slice(0, 8).toUpperCase(),
      p.amount,
      METHOD_LABELS[p.method] || p.method,
      STATUS_CONFIG[p.status]?.label || p.status,
      new Date(p.created_at).toLocaleDateString('vi-VN'),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lich-su-thanh-toan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Xuất thành công', 'File CSV đã được tải về.');
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Lịch sử thanh toán
          </h2>
          <p className="text-sm text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
            Xem lại tất cả giao dịch của bạn
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={payments.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A2948] text-white rounded-lg text-sm font-semibold font-[KoHo,sans-serif] hover:bg-[#2A3F6F] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="ArrowDownTrayIcon" size={16} />
          Xuất CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 text-center shadow-vj-card">
          <div className="text-2xl font-bold font-[KoHo,sans-serif] text-[#10B981]">
            {payments.filter((p) => p.status === 'completed').length}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
            Thành công
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 text-center shadow-vj-card">
          <div className="text-2xl font-bold font-[KoHo,sans-serif] text-[#F59E0B]">
            {payments.filter((p) => p.status === 'pending').length}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
            Đang xử lý
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 text-center shadow-vj-card">
          <div className="text-2xl font-bold font-[KoHo,sans-serif] text-[#8B5CF6]">
            {payments.filter((p) => p.status === 'refunded').length}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
            Đã hoàn tiền
          </div>
        </div>
      </div>

      {/* Payment List */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-vj-card">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="ReceiptPercentIcon" size={28} className="text-stone-400" />
          </div>
          <p className="text-stone-500 text-sm font-[Be Vietnam Pro,sans-serif]">
            Chưa có giao dịch thanh toán nào.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
          <div className="divide-y divide-stone-100">
            {payments.map((payment) => {
              const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
              return (
                <button
                  key={payment.id}
                  onClick={() => setSelectedPayment(payment)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${status.color}15` }}
                  >
                    <Icon name="BanknotesIcon" size={20} style={{ color: status.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1A2948] font-[KoHo,sans-serif]">
                        Thanh toán
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ color: status.color, background: status.bg }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 font-[Be Vietnam Pro,sans-serif]">
                      {METHOD_LABELS[payment.method] || payment.method} ·{' '}
                      {formatDate(payment.created_at)}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm font-[KoHo,sans-serif] text-[#1A2948]">
                      {formatCurrency(payment.amount)}
                    </div>
                    <Icon
                      name="ChevronRightIcon"
                      size={14}
                      className="text-stone-400 ml-auto mt-1"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-stone-100">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {selectedPayment && (
        <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </div>
  );
}
