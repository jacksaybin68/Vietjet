'use client';
import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination from '@/components/ui/Pagination';

interface Transaction {
  id: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  bookingId: string;
  userEmail: string;
  userName: string;
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
  const pageSize = 10;

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions?status=${filterStatus}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setTransactions(data);
    } catch (error: any) {
      onToast?.error('Lỗi tải dữ liệu', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterStatus]);

  const filtered = transactions.filter(
    (t) =>
      t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

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
        return 'Đang xử lý';
      case 'failed':
        return 'Thất bại';
      case 'refunded':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Icon name="CurrencyDollarIcon" size={24} className="text-indigo-400" />
            Lịch sử giao dịch
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            Theo dõi toàn bộ dòng tiền trong hệ thống
          </p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 group">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
          />
          <input
            type="text"
            placeholder="Tìm theo email, tên, mã đặt vé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/40 border border-white/5 rounded-2xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all focus:bg-slate-800/60"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-800/40 border border-white/5 p-1 rounded-2xl">
          {['all', 'completed', 'pending', 'failed', 'refunded'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilterStatus(s);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s === 'all' ? 'Tất cả' : getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

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
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Giao dịch
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                  Số tiền
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                  Ngày thực hiện
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6">
                      <div className="h-6 bg-slate-800/50 rounded-xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic">
                    Không có giao dịch nào được tìm thấy
                  </td>
                </tr>
              ) : (
                paginated.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTransaction(t)}
                    className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <div className="font-mono font-bold text-indigo-400 text-sm group-hover:text-indigo-300 transition-colors">
                        #{t.id.slice(0, 8)}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                        Đặt vé: {t.bookingId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">
                        {t.userName}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {t.userEmail}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="font-black text-white text-base tracking-tighter tabular-nums">
                        {formatCurrency(t.amount)}
                      </div>
                      <div className="text-[10px] font-black text-indigo-300/50 uppercase tracking-widest">
                        {t.method}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(t.status)}`}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                        {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">
                        {new Date(t.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                ))
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
              boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div className="px-8 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                  <Icon name="CurrencyDollarIcon" size={24} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Chi tiết giao dịch
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    ID:{' '}
                    <span className="text-indigo-400 font-mono tracking-normal">
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
            <div className="p-8 space-y-8">
              {/* Amount Display */}
              <div className="text-center py-6 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-[-20%] left-[-10%] w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 relative z-10">
                  Số tiền giao dịch
                </p>
                <h4 className="text-4xl font-black text-white tracking-tighter tabular-nums relative z-10">
                  {formatCurrency(selectedTransaction.amount)}
                </h4>
                <div className="mt-4 flex justify-center relative z-10">
                  <span
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(selectedTransaction.status)}`}
                  >
                    {getStatusLabel(selectedTransaction.status)}
                  </span>
                </div>
              </div>

              {/* Transaction Info Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Phương thức
                  </p>
                  <p className="text-sm font-bold text-slate-200">{selectedTransaction.method}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Thời gian
                  </p>
                  <p className="text-sm font-bold text-slate-200">
                    {new Date(selectedTransaction.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="col-span-2 h-[1px] bg-white/5" />
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Khách hàng
                  </p>
                  <p className="text-sm font-bold text-slate-200">{selectedTransaction.userName}</p>
                  <p className="text-[10px] font-bold text-slate-500">
                    {selectedTransaction.userEmail}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Mã đặt chuyến
                  </p>
                  <p className="text-sm font-bold text-indigo-400 font-mono">
                    #{selectedTransaction.bookingId}
                  </p>
                </div>
              </div>

              {/* Additional Context */}
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
                <div className="flex gap-4 items-start">
                  <Icon name="InformationCircleIcon" size={18} className="text-indigo-400 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Giao dịch này được tự động ghi nhận vào hệ thống sau khi khách hàng hoàn tất
                    cổng thanh toán. Liên hệ bộ phận kỹ thuật nếu có sai lệch về số dư.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-8 pb-8 flex gap-3">
              <button className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                In hoá đơn
              </button>
              {selectedTransaction.status === 'completed' && (
                <button className="flex-1 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                  Hoàn tiền
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
