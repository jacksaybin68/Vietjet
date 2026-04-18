'use client';
import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination from '@/components/ui/Pagination';

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
  warning: (title: string, message?: string, options?: object) => void;
  info: (title: string, message?: string, options?: object) => void;
}

interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_booking_amount: number;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  usage_per_user_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function DiscountsTab({ onToast }: { onToast?: ToastAPI }) {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [viewingDiscount, setViewingDiscount] = useState<DiscountCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchQuery,
      });
      const res = await fetch(`/api/admin/discounts?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDiscounts(data.discounts);
        setTotal(data.pagination.total);
      } else {
        onToast?.error('Lỗi', data.message || 'Không thể tải danh sách mã giảm giá');
      }
    } catch (error) {
      onToast?.error('Lỗi', 'Kết nối server thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [currentPage, pageSize, searchQuery]);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc muốn xóa mã giảm giá "${code}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onToast?.success('Thành công', `Đã xóa mã "${code}"`);
        fetchDiscounts();
      } else {
        const data = await res.json();
        onToast?.error('Lỗi', data.message || 'Không thể xóa mã');
      }
    } catch (error) {
      onToast?.error('Lỗi', 'Kết nối server thất bại');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (discount: DiscountCode) => {
    try {
      const res = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !discount.is_active }),
      });
      if (res.ok) {
        onToast?.success(
          'Thành công',
          `Đã ${!discount.is_active ? 'kích hoạt' : 'tạm dừng'} mã "${discount.code}"`
        );
        fetchDiscounts();
      }
    } catch (error) {
      onToast?.error('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Icon name="TagIcon" size={24} className="text-primary" />
            Quản lý mã giảm giá
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            {total} mã trong hệ thống
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.2em] px-6 py-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
        >
          <Icon name="PlusIcon" size={16} />
          Tạo mã mới
        </button>
      </div>

      {/* Filters */}
      <div className="relative group">
        <Icon
          name="MagnifyingGlassIcon"
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Tìm theo tên mã giảm giá..."
          className="w-full pl-12 pr-4 py-3.5 bg-slate-800/40 border border-white/5 rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all focus:bg-slate-800/60"
        />
      </div>

      {/* Table */}
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
                  Mã / Loại
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Giá trị
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Điều kiện
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Hiệu lực
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Sử dụng
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-6">
                      <div className="h-6 bg-slate-800/50 rounded-xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Icon name="InboxIcon" size={32} className="text-slate-600" />
                      <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                        Không có mã giảm giá
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => {
                  const isExpired = new Date(discount.end_date) < new Date();
                  const isFuture = new Date(discount.start_date) > new Date();
                  const StatusIcon = discount.is_active ? 'CheckCircleIcon' : 'XCircleIcon';

                  return (
                    <tr
                      key={discount.id}
                      onClick={() => setViewingDiscount(discount)}
                      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-5">
                        <div className="font-black text-slate-200 group-hover:text-primary transition-colors tracking-tight">
                          {discount.code}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                          {discount.type === 'percentage' ? 'Phần trăm' : 'Cố định'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-white tabular-nums tracking-tighter text-base">
                          {discount.type === 'percentage'
                            ? `${discount.value}%`
                            : `${Number(discount.value).toLocaleString('vi-VN')}₫`}
                        </div>
                        {discount.type === 'percentage' && discount.max_discount_amount && (
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                            Tối đa: {Number(discount.max_discount_amount).toLocaleString('vi-VN')}₫
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Đơn từ: {Number(discount.min_booking_amount).toLocaleString('vi-VN')}₫
                        </div>
                        {discount.usage_per_user_limit && (
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1.5 px-2 py-0.5 bg-white/5 rounded-md inline-block">
                            Max {discount.usage_per_user_limit} lượt/người
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Đến {new Date(discount.end_date).toLocaleDateString('vi-VN')}
                        </div>
                        <div
                          className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${isExpired ? 'text-rose-500' : 'text-emerald-500'}`}
                        >
                          {isExpired ? 'Đã hết hạn' : 'Đang hiệu lực'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="text-sm font-black text-slate-200 tabular-nums">
                          {discount.used_count}
                        </div>
                        {discount.usage_limit && (
                          <div className="text-[10px] font-bold text-slate-500 tracking-widest mt-0.5">
                            / {discount.usage_limit}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(discount)}
                          disabled={isExpired}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                            isExpired
                              ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-50'
                              : discount.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-slate-600' : discount.is_active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'}`}
                          />
                          {isExpired ? 'Hết hạn' : discount.is_active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingDiscount(discount)}
                            className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center transition-all active:scale-95"
                            title="Sửa"
                          >
                            <Icon name="PencilSquareIcon" size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(discount.id, discount.code)}
                            className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                            disabled={deletingId === discount.id}
                            title="Xóa"
                          >
                            <Icon name="TrashIcon" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="px-6 py-5 border-t border-white/5 bg-white/[0.02] flex items-center justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {viewingDiscount && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
            style={{
              background:
                'linear-gradient(135deg, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)',
            }}
          >
            <div className="px-8 py-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Icon name="TagIcon" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {viewingDiscount.code}
                  </h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                    {viewingDiscount.type === 'percentage'
                      ? 'Chiết khấu Phần trăm'
                      : 'Giảm giá Cố định'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingDiscount(null)}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center transition-all border border-white/5"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between bg-slate-950/40 border border-white/5 rounded-3xl p-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">
                    Giá trị ưu đãi
                  </p>
                  <p className="text-4xl font-black text-white tracking-tighter tabular-nums">
                    {viewingDiscount.type === 'percentage'
                      ? `${viewingDiscount.value}%`
                      : `${Number(viewingDiscount.value).toLocaleString('vi-VN')}₫`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">
                    Lượt đã dùng
                  </p>
                  <p className="text-3xl font-black text-slate-200 tabular-nums">
                    {viewingDiscount.used_count}
                    <span className="text-sm text-slate-600">
                      {' '}
                      / {viewingDiscount.usage_limit || '∞'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Đơn hàng tối thiểu
                  </label>
                  <p className="text-sm font-bold text-slate-300 tabular-nums">
                    {Number(viewingDiscount.min_booking_amount).toLocaleString('vi-VN')}₫
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Giảm tối đa
                  </label>
                  <p className="text-sm font-bold text-slate-300 tabular-nums">
                    {viewingDiscount.max_discount_amount
                      ? `${Number(viewingDiscount.max_discount_amount).toLocaleString('vi-VN')}₫`
                      : 'Không giới hạn'}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Bắt đầu
                  </label>
                  <p className="text-xs font-bold text-slate-400">
                    {new Date(viewingDiscount.start_date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Kết thúc
                  </label>
                  <p className="text-xs font-bold text-slate-400">
                    {new Date(viewingDiscount.end_date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 flex gap-4">
              <button
                onClick={() => {
                  setViewingDiscount(null);
                  setEditingDiscount(viewingDiscount);
                }}
                className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all active:scale-95"
              >
                Chỉnh sửa
              </button>
              <button
                onClick={() => setViewingDiscount(null)}
                className="flex-1 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {(showAddModal || editingDiscount) && (
        <DiscountModal
          discount={editingDiscount}
          onClose={() => {
            setShowAddModal(false);
            setEditingDiscount(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingDiscount(null);
            fetchDiscounts();
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ─── Modal Component ────────────────────────────────────────────────────────
function DiscountModal({
  discount,
  onClose,
  onSuccess,
  onToast,
}: {
  discount: DiscountCode | null;
  onClose: () => void;
  onSuccess: () => void;
  onToast?: ToastAPI;
}) {
  const [formData, setFormData] = useState({
    code: discount?.code || '',
    type: discount?.type || 'percentage',
    value: discount?.value || '',
    min_booking_amount: discount?.min_booking_amount || '0',
    max_discount_amount: discount?.max_discount_amount || '',
    start_date: discount?.start_date
      ? new Date(discount.start_date).toISOString().split('T')[0]
      : '',
    end_date: discount?.end_date ? new Date(discount.end_date).toISOString().split('T')[0] : '',
    usage_limit: discount?.usage_limit || '',
    usage_per_user_limit: discount?.usage_per_user_limit || '1',
    is_active: discount?.is_active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = discount ? `/api/admin/discounts/${discount.id}` : '/api/admin/discounts';
      const method = discount ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        onToast?.success(
          'Thành công',
          discount ? 'Đã cập nhật mã giảm giá' : 'Đã tạo mã giảm giá mới'
        );
        onSuccess();
      } else {
        onToast?.error('Lỗi', data.message || 'Thao tác thất bại');
      }
    } catch (error) {
      onToast?.error('Lỗi', 'Kết nối server thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">
            {discount ? 'Chỉnh sửa mã' : 'Thêm mã ưu đãi mới'}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl flex items-center justify-center transition-all border border-white/5"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Mã giảm giá
              </label>
              <input
                required
                type="text"
                placeholder="Ví dụ: SUMMERCARE"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-white placeholder-slate-700 uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all focus:bg-white/10"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Loại ưu đãi
              </label>
              <select
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-200 focus:outline-none focus:border-primary/50 appearance-none bg-transparent"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })
                }
              >
                <option value="percentage">Phần trăm (%)</option>
                <option value="fixed">Cố định (₫)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Giá trị
              </label>
              <input
                required
                type="number"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-white focus:outline-none focus:border-primary/50 focus:bg-white/10"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Đơn hàng từ (vnđ)
              </label>
              <input
                type="number"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-primary/50 focus:bg-white/10"
                value={formData.min_booking_amount}
                onChange={(e) => setFormData({ ...formData, min_booking_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Giảm tối đa (vnđ)
              </label>
              <input
                disabled={formData.type === 'fixed'}
                type="number"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-primary/50 disabled:opacity-30 focus:bg-white/10"
                value={formData.max_discount_amount}
                onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Ngày bắt đầu
              </label>
              <input
                required
                type="date"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-slate-200 focus:outline-none focus:border-primary/50 appearance-none bg-transparent"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Ngày hết hạn
              </label>
              <input
                required
                type="date"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-slate-200 focus:outline-none focus:border-primary/50 appearance-none bg-transparent"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Tổng lượt dùng
              </label>
              <input
                type="number"
                placeholder="Bỏ trống = ∞"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-white focus:outline-none focus:border-primary/50 placeholder-slate-700 focus:bg-white/10"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 accent-emerald-500 rounded border-white/10 bg-transparent cursor-pointer"
            />
            <label
              htmlFor="is_active"
              className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer"
            >
              Kích hoạt mã ngay lập tức
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-white/5"
            >
              Hủy bỏ
            </button>
            <button
              disabled={isSaving}
              type="submit"
              className="flex-[2] bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl transition-all shadow-lg active:scale-95 shadow-primary/20 disabled:opacity-50"
            >
              {isSaving ? 'Đang khởi tạo...' : discount ? 'Lưu thay đổi' : 'Khởi tạo mã'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
