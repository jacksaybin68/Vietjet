'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/shared/components/ui';
import { Pagination } from '@/shared/components/ui';
import { AdminTabHeader, ADMIN_CARD_STYLE, ADMIN_ACTION_BTN } from './AdminSection';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  type AdminAnnouncement as Announcement,
} from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
}

const PAGE_SIZE = 10;
const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  info: { label: 'Thông tin', cls: 'bg-blue-500/15 text-blue-400' },
  warning: { label: 'Cảnh báo', cls: 'bg-amber-500/15 text-amber-400' },
  promotion: { label: 'Khuyến mãi', cls: 'bg-emerald-500/15 text-emerald-400' },
  system: { label: 'Hệ thống', cls: 'bg-slate-500/15 text-slate-300' },
};

const TYPE_OPTIONS = [
  { value: 'info', label: 'Thông tin' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'promotion', label: 'Khuyến mãi' },
  { value: 'system', label: 'Hệ thống' },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'user', label: 'Người dùng' },
  { value: 'admin', label: 'Quản trị viên' },
];

export default function AnnouncementsTab({ onToast }: { onToast?: ToastAPI }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as Announcement['type'],
    target_role: 'all',
    is_active: true,
    start_date: '',
    end_date: '',
  });

  const fetchAnnouncements = useCallback(async (page = 1, search = '', type = '') => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await listAnnouncements({ page, limit: PAGE_SIZE, search, type });
      setAnnouncements(data.announcements || []);
      setTotalCount(data.pagination?.total || 0);
      setCurrentPage(page);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements(1, searchQuery, typeFilter);
  }, [fetchAnnouncements, searchQuery, typeFilter]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    fetchAnnouncements(page, searchQuery, typeFilter);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      target_role: 'all',
      is_active: true,
      start_date: '',
      end_date: '',
    });
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createAnnouncement(formData);
      onToast?.success('Tạo thông báo thành công', `Thông báo "${formData.title}" đã được tạo.`);
      setShowAddModal(false);
      resetForm();
      fetchAnnouncements(1, searchQuery, typeFilter);
    } catch (err) {
      onToast?.error('Lỗi', getApiErrorMessage(err, 'Không thể tạo thông báo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;

    setIsSubmitting(true);

    try {
      await updateAnnouncement(editingAnnouncement.id, formData);
      onToast?.success('Cập nhật thành công', `Thông báo đã được cập nhật.`);
      setEditingAnnouncement(null);
      resetForm();
      fetchAnnouncements(currentPage, searchQuery, typeFilter);
    } catch (err) {
      onToast?.error('Lỗi', getApiErrorMessage(err, 'Không thể cập nhật thông báo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!confirm(`Bạn có chắc muốn xoá thông báo "${announcement.title}"?`)) return;

    setDeletingId(announcement.id);

    try {
      await deleteAnnouncement(announcement.id);
      onToast?.success('Xoá thành công', `Thông báo đã bị xoá.`);
      fetchAnnouncements(currentPage, searchQuery, typeFilter);
    } catch (err) {
      onToast?.error('Lỗi', getApiErrorMessage(err, 'Không thể xoá thông báo.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await updateAnnouncement(announcement.id, { is_active: !announcement.is_active });
      onToast?.success(
        announcement.is_active ? 'Đã tắt thông báo' : 'Đã bật thông báo',
        `Thông báo "${announcement.title}" đã ${announcement.is_active ? 'tắt' : 'bật'}.`
      );
      fetchAnnouncements(currentPage, searchQuery, typeFilter);
    } catch (err) {
      onToast?.error('Lỗi', getApiErrorMessage(err, 'Không thể cập nhật thông báo.'));
    }
  };

  const openEditModal = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      target_role: announcement.target_role,
      is_active: announcement.is_active,
      start_date: announcement.start_date ? announcement.start_date.split('T')[0] : '',
      end_date: announcement.end_date ? announcement.end_date.split('T')[0] : '',
    });
    setEditingAnnouncement(announcement);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <AdminTabHeader
        icon="MegaphoneIcon"
        title="Quản lý thông báo"
        subtitle={`${totalCount} thông báo trong hệ thống`}
        actions={
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className={`${ADMIN_ACTION_BTN} text-white bg-primary hover:bg-primary-dark shadow-glow-red`}
          >
            <Icon name="PlusIcon" size={16} />
            Tạo thông báo
          </button>
        }
      />
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
        >
          <option value="">Tất cả loại</option>
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ ...ADMIN_CARD_STYLE, padding: 0 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Tiêu đề
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4 hidden sm:table-cell">
                  Loại
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4 hidden md:table-cell">
                  Mục tiêu
                </th>
                <th className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4 hidden lg:table-cell">
                  Trạng thái
                </th>
                <th className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-white/5 animate-pulse">
                      <td className="px-5 py-4">
                        <div className="h-4 w-48 bg-slate-500/10 rounded-full" />
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="h-6 w-20 bg-slate-500/10 rounded-full" />
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="h-6 w-16 bg-slate-500/10 rounded-full" />
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="h-6 w-16 bg-slate-500/10 rounded-full mx-auto" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 w-16 bg-slate-500/10 rounded mx-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : hasError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="ExclamationTriangleIcon" size={32} className="text-red-400" />
                      <p className="font-bold text-white">Không thể tải dữ liệu</p>
                      <button
                        onClick={() => fetchAnnouncements(1, searchQuery, typeFilter)}
                        className="text-xs font-semibold text-primary"
                      >
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="MegaphoneIcon" size={32} className="text-slate-600" />
                      <p className="font-bold text-white">Chưa có thông báo nào</p>
                      <p className="text-xs text-slate-500">Tạo thông báo đầu tiên</p>
                    </div>
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => {
                  const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
                  return (
                    <tr
                      key={announcement.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-white">{announcement.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {announcement.content}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className={typeConfig.cls}>{typeConfig.label}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-slate-400">
                          {ROLE_OPTIONS.find((r) => r.value === announcement.target_role)?.label ||
                            announcement.target_role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-center">
                        <button
                          onClick={() => handleToggleActive(announcement)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                            announcement.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                          }`}
                        >
                          {announcement.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(announcement)}
                            className="w-7 h-7 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center transition-colors"
                            title="Sửa"
                          >
                            <Icon name="PencilIcon" size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement)}
                            disabled={deletingId === announcement.id}
                            className="w-7 h-7 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                            title="Xoá"
                          >
                            <Icon name="TrashIcon" size={14} />
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

        {totalCount > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-white/5 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AnnouncementModal
          title="Tạo thông báo mới"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddAnnouncement}
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Modal */}
      {editingAnnouncement && (
        <AnnouncementModal
          title={`Sửa thông báo`}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdateAnnouncement}
          onClose={() => {
            setEditingAnnouncement(null);
            resetForm();
          }}
          isSubmitting={isSubmitting}
          isEditing
        />
      )}
    </div>
  );
}

// Announcement Form Modal Component
function AnnouncementModal({
  title,
  formData,
  setFormData,
  onSubmit,
  onClose,
  isSubmitting,
  isEditing = false,
}: {
  title: string;
  formData: {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'promotion' | 'system';
    target_role: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border"
        style={{ ...ADMIN_CARD_STYLE, background: '#1E293B' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-colors"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              Tiêu đề <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder="Nhập tiêu đề thông báo"
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              Nội dung <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
              placeholder="Nhập nội dung thông báo"
              rows={4}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Loại thông báo
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    type: e.target.value as Announcement['type'],
                  }))
                }
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Mục tiêu
              </label>
              <select
                value={formData.target_role}
                onChange={(e) => setFormData((p) => ({ ...p, target_role: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white [color-scheme:dark] focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white [color-scheme:dark] focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 text-primary border-white/20 rounded focus:ring-primary bg-slate-900/60"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">
              Hiển thị ngay sau khi tạo
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.content}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Đang xử lý...
                </>
              ) : isEditing ? (
                'Lưu thay đổi'
              ) : (
                'Tạo thông báo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
