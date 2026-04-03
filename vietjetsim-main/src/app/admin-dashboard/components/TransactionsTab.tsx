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

  const filtered = transactions.filter(t => 
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
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      case 'refunded': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Thành công';
      case 'pending': return 'Đang xử lý';
      case 'failed': return 'Thất bại';
      case 'refunded': return 'Đã hoàn tiền';
      default: return status;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-stone-900">Lịch sử giao dịch</h2>
        <p className="text-sm text-stone-400">Theo dõi toàn bộ dòng tiền trong hệ thống</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Icon name="MagnifyingGlassIcon" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo email, tên, mã đặt vé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
          {['all', 'completed', 'pending', 'failed', 'refunded'].map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === s ? 'bg-primary text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'
              }`}
            >
              {s === 'all' ? 'Tất cả' : getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-5 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Giao dịch</th>
                <th className="px-5 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Khách hàng</th>
                <th className="px-5 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Số tiền</th>
                <th className="px-5 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-center">Trạng thái</th>
                <th className="px-5 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Ngày thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-5 py-6"><div className="h-4 bg-stone-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-20 text-center text-stone-400 italic">Không có giao dịch nào được tìm thấy</td>
                </tr>
              ) : (
                paginated.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-stone-900 text-sm">#{t.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-stone-400">Vé: {t.bookingId.slice(0, 8)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-stone-800 text-sm">{t.userName}</div>
                      <div className="text-xs text-stone-500">{t.userEmail}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-black text-stone-900">{formatCurrency(t.amount)}</div>
                      <div className="text-[10px] text-stone-400 uppercase">{t.method}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                        {getStatusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="text-sm font-medium text-stone-600">
                        {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {new Date(t.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-stone-100 bg-stone-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
