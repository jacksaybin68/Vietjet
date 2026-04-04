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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-stone-900">Quản lý mã giảm giá</h2>
          <p className="text-sm text-stone-400">{total} mã trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-glow-red hover:shadow-none text-sm"
        >
          <Icon name="PlusIcon" size={16} />
          Tạo mã mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên mã giảm giá..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Mã / Loại</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Giá trị</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Điều kiện</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Hiệu lực</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider text-center">Đã dùng</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider text-center">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-stone-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-stone-400">
                    Chưa có mã giảm giá nào.
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => {
                  const isExpired = new Date(discount.end_date) < new Date();
                  const isFuture = new Date(discount.start_date) > new Date();
                  
                  return (
                    <tr key={discount.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold text-stone-900">{discount.code}</div>
                        <div className="text-[10px] text-stone-400 uppercase font-semibold">
                          {discount.type === 'percentage' ? 'Phần trăm' : 'Cố định'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-primary">
                          {discount.type === 'percentage' 
                            ? `${discount.value}%` 
                            : `${Number(discount.value).toLocaleString('vi-VN')}₫`}
                        </div>
                        {discount.type === 'percentage' && discount.max_discount_amount && (
                          <div className="text-[10px] text-stone-400">
                            Tối đa: {Number(discount.max_discount_amount).toLocaleString('vi-VN')}₫
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-stone-600">
                        <div>Đơn từ: {Number(discount.min_booking_amount).toLocaleString('vi-VN')}₫</div>
                        {discount.usage_per_user_limit && (
                          <div className="text-[10px] text-stone-400">Max {discount.usage_per_user_limit} lần/người</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <div className="text-stone-600">Từ: {new Date(discount.start_date).toLocaleDateString('vi-VN')}</div>
                        <div className={`font-medium ${isExpired ? 'text-red-500' : 'text-stone-600'}`}>
                          Đến: {new Date(discount.end_date).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="text-sm font-medium text-stone-900">{discount.used_count}</div>
                        {discount.usage_limit && (
                          <div className="text-[10px] text-stone-400">/ {discount.usage_limit}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(discount)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                            isExpired 
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                              : discount.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                          disabled={isExpired}
                        >
                          {isExpired ? 'Hết hạn' : discount.is_active ? 'Đang chạy' : 'Đã tắt'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingDiscount(discount)}
                            className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Sửa"
                          >
                            <Icon name="PencilSquareIcon" size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(discount.id, discount.code)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
        
        {/* Pagination placeholder - Real implementation would use the Pagination component */}
        {total > pageSize && (
          <div className="px-4 py-3 border-t border-stone-50 bg-stone-50/30 flex items-center justify-between">
             <div className="text-xs text-stone-400">
               Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} trong số {total}
             </div>
             {/* Pagination component would go here */}
          </div>
        )}
      </div>

      {/* Add/Edit Modal placeholder */}
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
  onToast 
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
    start_date: discount?.start_date ? new Date(discount.start_date).toISOString().split('T')[0] : '',
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
        onToast?.success('Thành công', discount ? 'Đã cập nhật mã giảm giá' : 'Đã tạo mã giảm giá mới');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeInUp_0.3s_ease-out]">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-900">{discount ? 'Chỉnh sửa mã' : 'Thêm mã mới'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Mã giảm giá</label>
              <input
                required
                type="text"
                placeholder="Ví dụ: SUMMER2024"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold placeholder:font-normal uppercase"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Loại</label>
              <select
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
              >
                <option value="percentage">Phần trăm (%)</option>
                <option value="fixed">Cố định (₫)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Giá trị</label>
              <input
                required
                type="number"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Đơn từ (₫)</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                value={formData.min_booking_amount}
                onChange={(e) => setFormData({ ...formData, min_booking_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Giảm tối đa (₫)</label>
              <input
                disabled={formData.type === 'fixed'}
                type="number"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm disabled:opacity-50"
                value={formData.max_discount_amount}
                onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Ngày bắt đầu</label>
              <input
                required
                type="date"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Ngày kết thúc</label>
              <input
                required
                type="date"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Tổng lượt dùng</label>
              <input
                type="number"
                placeholder="Bỏ trống = ∞"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5 ml-1">Mỗi người dùng</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                value={formData.usage_per_user_limit}
                onChange={(e) => setFormData({ ...formData, usage_per_user_limit: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary rounded border-stone-300"
            />
            <label htmlFor="is_active" className="text-sm font-semibold text-stone-700">Kích hoạt mã ngay</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              disabled={isSaving}
              type="submit"
              className="flex-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl transition-all shadow-glow-red hover:shadow-none disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : discount ? 'Cập nhật' : 'Tạo mã'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
