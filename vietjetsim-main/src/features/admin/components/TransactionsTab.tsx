'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/shared/components/ui';
import { Pagination } from '@/shared/components/ui';
import { listTransactions, confirmTransaction } from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';

interface Transaction {
  id: string;
  paymentId?: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  bookingId: string;
  bookingCode?: string;
  bookingStatus?: string;
  userEmail: string;
  userName: string;
  receiptImage?: string;
  transferNote?: string;
}

interface ToastAPI {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export default function TransactionsTab({ onToast }: { onToast?: ToastAPI }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingReceiptImage, setViewingReceiptImage] = useState<string | null>(null);
  const pageSize = 10;

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listTransactions(
        filterStatus && filterStatus !== 'all' ? { status: filterStatus } : {}
      );
      setTransactions((data ?? []) as unknown as Transaction[]);
    } catch (error) {
      onToast?.error('Lỗi tải dữ liệu', getApiErrorMessage(error, 'Không thể tải giao dịch'));
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, onToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleProcessTransaction = async (
    t: Transaction,
    action: 'confirm' | 'reject',
    note?: string
  ) => {
    setProcessingId(t.id);
    try {
      const res = await confirmTransaction({
        transactionId: t.id,
        bookingId: t.bookingId,
        action,
        note,
      });

      if (res.success) {
        onToast?.success(
          action === 'confirm' ? 'Xác nhận thành công!' : 'Đã từ chối giao dịch',
          res.message || 'Cập nhật trạng thái thành công'
        );

        // Update local selected transaction if modal is open
        if (selectedTransaction?.id === t.id) {
          setSelectedTransaction((prev) =>
            prev ? { ...prev, status: action === 'confirm' ? 'completed' : 'failed' } : null
          );
        }

        // Refresh transactions list
        await fetchTransactions();
      }
    } catch (err) {
      onToast?.error('Lỗi xử lý', getApiErrorMessage(err, 'Không thể xác nhận giao dịch'));
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = transactions.filter(
    (t) =>
      t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.bookingCode && t.bookingCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // KPI Metrics
  const totalCount = transactions.length;
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const completedCount = transactions.filter((t) => t.status === 'completed').length;
  const totalRevenue = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'refunded':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Thành công';
      case 'pending':
        return 'Chờ xác nhận';
      case 'failed':
        return 'Thất bại';
      case 'refunded':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  };

  const getMethodBadge = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('vietqr') || m.includes('qr')) {
      return { label: 'VietQR', color: 'bg-teal-500/10 text-teal-300 border-teal-500/20' };
    }
    if (m.includes('bank') || m.includes('ngan')) {
      return { label: 'Chuyển khoản', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' };
    }
    if (m.includes('card') || m.includes('the')) {
      return {
        label: 'Thẻ tín dụng',
        color: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      };
    }
    if (m.includes('momo') || m.includes('zalo') || m.includes('wallet')) {
      return { label: 'Ví điện tử', color: 'bg-pink-500/10 text-pink-300 border-pink-500/20' };
    }
    return { label: method || 'Khác', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Icon name="CurrencyDollarIcon" size={24} className="text-amber-400" />
            Quản lý & Xác nhận thanh toán
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            Duyệt thanh toán VietQR / Ngân hàng, xuất vé điện tử tự động
          </p>
        </div>
        <button
          onClick={() => fetchTransactions()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-95 self-start sm:self-auto"
        >
          <Icon name="ArrowPathIcon" size={16} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden">
          <p className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
            Tổng giao dịch
          </p>
          <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{totalCount}</h3>
          <div className="text-2xs text-slate-400 mt-1">Giao dịch trong hệ thống</div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-bold text-amber-400 uppercase tracking-wider">
              Chờ xác nhận
            </p>
            {pendingCount > 0 && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black text-amber-300 mt-1 tabular-nums">{pendingCount}</h3>
          <div className="text-2xs text-amber-400/80 mt-1">Cần Admin đối soát & duyệt</div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden">
          <p className="text-2xs font-bold text-emerald-400 uppercase tracking-wider">
            Đã hoàn tất
          </p>
          <h3 className="text-2xl font-black text-emerald-300 mt-1 tabular-nums">
            {completedCount}
          </h3>
          <div className="text-2xs text-emerald-400/80 mt-1">Vé đã xuất thành công</div>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 relative overflow-hidden">
          <p className="text-2xs font-bold text-indigo-400 uppercase tracking-wider">
            Doanh thu đã duyệt
          </p>
          <h3 className="text-xl font-black text-indigo-300 mt-1 tabular-nums truncate">
            {formatCurrency(totalRevenue)}
          </h3>
          <div className="text-2xs text-indigo-400/80 mt-1">Thực thu vào tài khoản</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 group">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors"
          />
          <input
            type="text"
            placeholder="Tìm theo email, tên, mã PNR, mã giao dịch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/40 border border-white/5 rounded-2xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all focus:bg-slate-800/60"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-800/40 border border-white/5 p-1 rounded-2xl overflow-x-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ duyệt', count: pendingCount },
            { id: 'completed', label: 'Đã thanh toán' },
            { id: 'failed', label: 'Thất bại/Hủy' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setFilterStatus(item.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-2xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === item.id
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{item.label}</span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-3xs font-extrabold ${
                    filterStatus === item.id
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div
        className="rounded-3xl border overflow-hidden transition-all duration-500"
        style={{
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-5 text-2xs font-black text-slate-500 uppercase tracking-widest">
                  Mã GD / PNR
                </th>
                <th className="px-6 py-5 text-2xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-6 py-5 text-2xs font-black text-slate-500 uppercase tracking-widest text-right">
                  Số tiền & Phương thức
                </th>
                <th className="px-6 py-5 text-2xs font-black text-slate-500 uppercase tracking-widest text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-5 text-2xs font-black text-slate-500 uppercase tracking-widest text-right">
                  Thời gian
                </th>
                <th className="px-6 py-5 text-2xs font-black text-slate-500 uppercase tracking-widest text-center">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6">
                      <div className="h-6 bg-slate-800/50 rounded-xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">
                    Không có giao dịch nào được tìm thấy
                  </td>
                </tr>
              ) : (
                paginated.map((t) => {
                  const methodBadge = getMethodBadge(t.method);
                  const isPending = t.status === 'pending';
                  const isProcessing = processingId === t.id;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTransaction(t)}
                      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-5">
                        <div className="font-mono font-bold text-amber-400 text-sm group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                          <span>#{t.id.slice(0, 10)}</span>
                        </div>
                        <div className="text-2xs font-black text-slate-400 uppercase tracking-widest mt-0.5">
                          PNR:{' '}
                          <span className="text-white font-mono font-extrabold">
                            {t.bookingCode || t.bookingId.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">
                          {t.userName}
                        </div>
                        <div className="text-2xs font-bold text-slate-500">{t.userEmail}</div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="font-black text-white text-base tracking-tighter tabular-nums">
                          {formatCurrency(t.amount)}
                        </div>
                        <div className="flex items-center gap-1.5 justify-end mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-3xs font-black uppercase tracking-wider border ${methodBadge.color}`}
                          >
                            {methodBadge.label}
                          </span>
                          {t.receiptImage && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              📷 Có biên lai
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-3xs font-black uppercase tracking-widest border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {getStatusLabel(t.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                          {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="text-2xs font-black text-slate-600 uppercase tracking-widest mt-0.5">
                          {new Date(t.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleProcessTransaction(t, 'confirm')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1"
                              title="Xác nhận tiền đã về tài khoản và xuất vé"
                            >
                              {isProcessing ? (
                                <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                              ) : (
                                <Icon name="CheckCircleIcon" size={14} />
                              )}
                              <span>Xác nhận</span>
                            </button>
                            <button
                              onClick={() => handleProcessTransaction(t, 'reject')}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl border border-rose-500/20 transition-all"
                              title="Từ chối / Hủy giao dịch"
                            >
                              <Icon name="XMarkIcon" size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-2xs font-semibold text-slate-500 flex items-center justify-center gap-1">
                            <Icon name="CheckBadgeIcon" size={16} className="text-emerald-500" />
                            Đã duyệt
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-5 border-t border-white/5 bg-white/5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
            style={{
              background:
                'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div className="px-8 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                  <Icon name="CurrencyDollarIcon" size={24} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Chi tiết giao dịch thanh toán
                  </h3>
                  <p className="text-2xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Mã GD:{' '}
                    <span className="text-amber-400 font-mono tracking-normal">
                      #{selectedTransaction.id}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              {/* Pending Action Banner */}
              {selectedTransaction.status === 'pending' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3.5">
                  <Icon
                    name="ExclamationTriangleIcon"
                    size={22}
                    className="text-amber-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <h5 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Chờ xác nhận thanh toán
                    </h5>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Khách hàng đã chuyển tiền hoặc tạo lệnh thanh toán VietQR. Quản trị viên vui
                      lòng kiểm tra tài khoản ngân hàng nhận, sau đó bấm{' '}
                      <strong>Xác nhận thanh toán</strong> để hoàn tất xuất vé.
                    </p>
                  </div>
                </div>
              )}

              {/* Amount Display */}
              <div className="text-center py-6 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-[-20%] left-[-10%] w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                <p className="text-2xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 relative z-10">
                  Số tiền thanh toán
                </p>
                <h4 className="text-4xl font-black text-white tracking-tighter tabular-nums relative z-10">
                  {formatCurrency(selectedTransaction.amount)}
                </h4>
                <div className="mt-4 flex justify-center relative z-10">
                  <span
                    className={`px-3 py-1 rounded-lg text-2xs font-black uppercase tracking-widest border ${getStatusBadge(
                      selectedTransaction.status
                    )}`}
                  >
                    {getStatusLabel(selectedTransaction.status)}
                  </span>
                </div>
              </div>

              {/* Transaction Info Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="text-2xs font-black text-slate-500 uppercase tracking-widest mb-1">
                    Phương thức
                  </p>
                  <p className="text-sm font-bold text-slate-200 capitalize">
                    {selectedTransaction.method}
                  </p>
                </div>
                <div>
                  <p className="text-2xs font-black text-slate-500 uppercase tracking-widest mb-1">
                    Mã đặt chỗ (PNR)
                  </p>
                  <p className="text-sm font-black text-amber-400 font-mono">
                    {selectedTransaction.bookingCode || selectedTransaction.bookingId.slice(0, 8)}
                  </p>
                </div>
                <div className="col-span-2 h-[1px] bg-white/5" />
                <div>
                  <p className="text-2xs font-black text-slate-500 uppercase tracking-widest mb-1">
                    Khách hàng
                  </p>
                  <p className="text-sm font-bold text-slate-200">{selectedTransaction.userName}</p>
                  <p className="text-2xs font-bold text-slate-500">
                    {selectedTransaction.userEmail}
                  </p>
                </div>
                <div>
                  <p className="text-2xs font-black text-slate-500 uppercase tracking-widest mb-1">
                    Thời gian tạo
                  </p>
                  <p className="text-sm font-bold text-slate-200">
                    {new Date(selectedTransaction.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Receipt Image for Admin Verification */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="PhotoIcon" size={18} className="text-amber-400" />
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Ảnh biên lai chuyển khoản (Đối chiếu Admin)
                    </h5>
                  </div>
                  {selectedTransaction.receiptImage ? (
                    <span className="px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Đã đính kèm ảnh
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-white/5">
                      Chưa có ảnh
                    </span>
                  )}
                </div>

                {selectedTransaction.receiptImage ? (
                  <div className="space-y-2">
                    <div
                      onClick={() =>
                        setViewingReceiptImage(selectedTransaction.receiptImage || null)
                      }
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 hover:border-amber-400/50 transition-all flex items-center justify-center max-h-56 p-2"
                      title="Bấm để phóng to ảnh biên lai"
                    >
                      <img
                        src={selectedTransaction.receiptImage}
                        alt="Ảnh biên lai đối chiếu"
                        className="max-h-52 w-auto object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-xs">
                        <Icon name="MagnifyingGlassPlusIcon" size={20} />
                        <span>Bấm để phóng to đối chiếu</span>
                      </div>
                    </div>
                    {selectedTransaction.transferNote && (
                      <p className="text-xs text-slate-300 bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                        <span className="text-slate-400">Nội dung CK:</span>{' '}
                        <span className="text-amber-300 font-mono font-bold">
                          {selectedTransaction.transferNote}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-950/30 rounded-xl border border-dashed border-white/10 text-xs text-slate-500">
                    Khách hàng chưa đính kèm ảnh chụp màn hình biên lai.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
              {selectedTransaction.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleProcessTransaction(selectedTransaction, 'confirm')}
                    disabled={processingId === selectedTransaction.id}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {processingId === selectedTransaction.id ? (
                      <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                    ) : (
                      <Icon name="CheckCircleIcon" size={18} />
                    )}
                    <span>Xác nhận thanh toán ngay</span>
                  </button>
                  <button
                    onClick={() => handleProcessTransaction(selectedTransaction, 'reject')}
                    disabled={processingId === selectedTransaction.id}
                    className="px-6 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    Từ chối
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full-Size Receipt Image Preview */}
      {viewingReceiptImage && (
        <div
          onClick={() => setViewingReceiptImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[90vh] bg-slate-900 border border-white/20 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative"
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Icon name="PhotoIcon" size={18} className="text-amber-400" />
                <h4 className="text-sm font-black text-white">Ảnh biên lai thanh toán đối chiếu</h4>
              </div>
              <button
                onClick={() => setViewingReceiptImage(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-black/50">
              <img
                src={viewingReceiptImage}
                alt="Ảnh biên lai phóng to"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="px-6 py-3 border-t border-white/10 bg-slate-950 text-right">
              <button
                onClick={() => setViewingReceiptImage(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-all"
              >
                Đóng ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
