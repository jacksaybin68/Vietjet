'use client';
import React, { useState, useEffect } from 'react';
import { Icon } from '@/shared/components/ui';
import { Pagination } from '@/shared/components/ui';
import { apiRequest, getApiErrorMessage } from '@/shared/services';

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
  warning: (title: string, message?: string, options?: object) => void;
  info: (title: string, message?: string, options?: object) => void;
}

interface Agency {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  commission_rate: number;
  notes: string | null;
  is_active: boolean;
  discount_count?: number;
  created_at: string;
  updated_at: string;
}

export default function AgenciesTab({ onToast }: { onToast?: ToastAPI }) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAgencies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchQuery,
      });
      const data = await apiRequest<{ agencies: Agency[]; pagination: { total: number } }>(
        `/api/quan-tri/dai-ly?${params.toString()}`
      );
      setAgencies(data.agencies);
      setTotal(data.pagination.total);
    } catch (error) {
      onToast?.error('Lỗi', getApiErrorMessage(error, 'Không thể tải danh sách đại lý'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, [currentPage, pageSize, searchQuery]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Bạn có chắc muốn xóa đại lý "${name}"? Mã giảm giá đã phát hành sẽ trở thành mã dùng chung.`
      )
    )
      return;
    setDeletingId(id);
    try {
      await apiRequest(`/api/quan-tri/dai-ly/${id}`, { method: 'DELETE' });
      onToast?.success('Thành công', `Đã xóa đại lý "${name}"`);
      fetchAgencies();
    } catch (error) {
      onToast?.error('Lỗi', getApiErrorMessage(error, 'Không thể xóa đại lý'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (agency: Agency) => {
    try {
      await apiRequest(`/api/quan-tri/dai-ly/${agency.id}`, {
        method: 'PATCH',
        body: { is_active: !agency.is_active },
      });
      onToast?.success(
        'Thành công',
        `Đã ${!agency.is_active ? 'kích hoạt' : 'tạm dừng'} đại lý "${agency.name}"`
      );
      fetchAgencies();
    } catch (error) {
      onToast?.error('Lỗi', getApiErrorMessage(error, 'Không thể cập nhật trạng thái'));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Icon name="BuildingOfficeIcon" size={24} className="text-primary" />
            Quản lý đại lý
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            {total} đại lý trong hệ thống
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.2em] px-6 py-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
        >
          <Icon name="PlusIcon" size={16} />
          Thêm đại lý
        </button>
      </div>

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
          placeholder="Tìm theo mã, tên hoặc email đại lý..."
          className="w-full pl-12 pr-4 py-3.5 bg-slate-800/40 border border-white/5 rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all focus:bg-slate-800/60"
        />
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
                  Đại lý
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Liên hệ
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Hoa hồng
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Mã đã phát hành
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
                    <td colSpan={6} className="px-6 py-6">
                      <div className="h-6 bg-slate-800/50 rounded-xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Icon name="InboxIcon" size={32} className="text-slate-600" />
                      <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                        Chưa có đại lý
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-white/[0.04] transition-all group">
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-200 group-hover:text-primary transition-colors tracking-tight">
                        {agency.name}
                      </div>
                      <div className="text-[10px] text-primary/70 uppercase font-black tracking-[0.2em] mt-1">
                        {agency.code}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[11px] font-bold text-slate-300">
                        {agency.contact_name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {agency.contact_email || agency.contact_phone || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-black text-slate-200 tabular-nums">
                        {Number(agency.commission_rate)}%
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-black text-slate-200 tabular-nums">
                        {agency.discount_count ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={() => handleToggleStatus(agency)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                          agency.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${agency.is_active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'}`}
                        />
                        {agency.is_active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingAgency(agency)}
                          className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center transition-all active:scale-95"
                          title="Sửa"
                        >
                          <Icon name="PencilSquareIcon" size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(agency.id, agency.name)}
                          className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                          disabled={deletingId === agency.id}
                          title="Xóa"
                        >
                          <Icon name="TrashIcon" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {(showAddModal || editingAgency) && (
        <AgencyModal
          agency={editingAgency}
          onClose={() => {
            setShowAddModal(false);
            setEditingAgency(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingAgency(null);
            fetchAgencies();
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ─── Modal Component ────────────────────────────────────────────────────────
function AgencyModal({
  agency,
  onClose,
  onSuccess,
  onToast,
}: {
  agency: Agency | null;
  onClose: () => void;
  onSuccess: () => void;
  onToast?: ToastAPI;
}) {
  const [formData, setFormData] = useState({
    code: agency?.code || '',
    name: agency?.name || '',
    contact_name: agency?.contact_name || '',
    contact_email: agency?.contact_email || '',
    contact_phone: agency?.contact_phone || '',
    address: agency?.address || '',
    commission_rate: agency?.commission_rate ?? '0',
    notes: agency?.notes || '',
    is_active: agency?.is_active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = agency ? `/api/quan-tri/dai-ly/${agency.id}` : '/api/quan-tri/dai-ly';
      await apiRequest(url, { method: agency ? 'PATCH' : 'POST', body: formData });
      onToast?.success('Thành công', agency ? 'Đã cập nhật đại lý' : 'Đã tạo đại lý mới');
      onSuccess();
    } catch (error) {
      onToast?.error('Lỗi', getApiErrorMessage(error, 'Thao tác thất bại'));
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass =
    'w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder-slate-700 focus:outline-none focus:border-primary/50 focus:bg-white/10';
  const labelClass =
    'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1';

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl relative animate-in zoom-in-95 duration-300">
        <div className="px-8 py-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between sticky top-0">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">
            {agency ? 'Chỉnh sửa đại lý' : 'Thêm đại lý mới'}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl flex items-center justify-center transition-all border border-white/5"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Mã đại lý</label>
              <input
                required
                type="text"
                placeholder="Ví dụ: DL-SG-01"
                className={`${fieldClass} uppercase tracking-widest`}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className={labelClass}>Tên đại lý</label>
              <input
                required
                type="text"
                placeholder="Công ty du lịch..."
                className={fieldClass}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Người liên hệ</label>
              <input
                type="text"
                className={fieldClass}
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={fieldClass}
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Số điện thoại</label>
              <input
                type="text"
                className={fieldClass}
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Tỷ lệ hoa hồng (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className={fieldClass}
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Địa chỉ</label>
              <input
                type="text"
                className={fieldClass}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Ghi chú</label>
              <textarea
                rows={2}
                className={fieldClass}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
            <input
              type="checkbox"
              id="agency_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 accent-emerald-500 rounded border-white/10 bg-transparent cursor-pointer"
            />
            <label
              htmlFor="agency_is_active"
              className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer"
            >
              Đại lý đang hoạt động
            </label>
          </div>

          <div className="flex gap-4 pt-2">
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
              {isSaving ? 'Đang lưu...' : agency ? 'Lưu thay đổi' : 'Tạo đại lý'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
