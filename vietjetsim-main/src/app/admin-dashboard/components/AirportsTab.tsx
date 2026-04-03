'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination from '@/components/ui/Pagination';

interface Airport {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  created_at: string;
}

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
}

const PAGE_SIZE = 10;

export default function AirportsTab({ onToast }: { onToast?: ToastAPI }) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city: '',
    country: 'Vietnam',
  });

  const fetchAirports = useCallback(async (page = 1, search = '') => {
    setIsLoading(true);
    setHasError(false);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (search) params.append('q', search);

      const res = await fetch(`/api/admin/airports?${params}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setAirports(data.airports || []);
        setTotalCount(data.pagination?.total || 0);
        setCurrentPage(page);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAirports(1, searchQuery);
  }, [fetchAirports, searchQuery]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    fetchAirports(page, searchQuery);
  };

  const resetForm = () => {
    setFormData({ code: '', name: '', city: '', country: 'Vietnam' });
  };

  const handleAddAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/airports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        onToast?.success('Thêm sân bay thành công', `Sân bay ${formData.code} đã được tạo.`);
        setShowAddModal(false);
        resetForm();
        fetchAirports(1, searchQuery);
      } else {
        onToast?.error('Lỗi', data.message || 'Không thể thêm sân bay.');
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message || 'Kết nối thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAirport) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/airports/${editingAirport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        onToast?.success('Cập nhật thành công', `Sân bay ${formData.code} đã được cập nhật.`);
        setEditingAirport(null);
        resetForm();
        fetchAirports(currentPage, searchQuery);
      } else {
        onToast?.error('Lỗi', data.message || 'Không thể cập nhật sân bay.');
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message || 'Kết nối thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (airport: Airport) => {
    if (!confirm(`Bạn có chắc muốn xoá sân bay ${airport.code}?`)) return;

    setDeletingId(airport.id);

    try {
      const res = await fetch(`/api/admin/airports/${airport.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok) {
        onToast?.success('Xoá thành công', `Sân bay ${airport.code} đã bị xoá.`);
        fetchAirports(currentPage, searchQuery);
      } else {
        onToast?.error('Lỗi', data.message || 'Không thể xoá sân bay.');
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message || 'Kết nối thất bại.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (airport: Airport) => {
    setFormData({
      code: airport.code,
      name: airport.name,
      city: airport.city,
      country: airport.country,
    });
    setEditingAirport(airport);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-stone-900">Quản lý sân bay</h2>
          <p className="text-sm text-stone-400">{totalCount} sân bay trong hệ thống</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-glow-red hover:shadow-none text-sm"
        >
          <Icon name="PlusIcon" size={16} />
          Thêm sân bay
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon
          name="MagnifyingGlassIcon"
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Tìm theo mã, tên, thành phố..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Mã
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Tên sân bay
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Thành phố
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Quốc gia
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-stone-50 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-24 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-20 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="h-6 w-16 bg-stone-200 rounded mx-auto" /></td>
                    </tr>
                  ))}
                </>
              ) : hasError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="ExclamationTriangleIcon" size={32} className="text-red-400" />
                      <p className="font-bold text-stone-700">Không thể tải dữ liệu</p>
                      <button onClick={() => fetchAirports(1, searchQuery)} className="text-xs font-semibold text-primary">
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : airports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="BuildingOfficeIcon" size={32} className="text-stone-300" />
                      <p className="font-bold text-stone-700">Chưa có sân bay nào</p>
                      <p className="text-xs text-stone-400">Thêm sân bay đầu tiên</p>
                    </div>
                  </td>
                </tr>
              ) : (
                airports.map((airport, i) => (
                  <tr key={airport.id} className={`border-b border-stone-50 hover:bg-stone-50 ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-sm bg-red-50 text-primary px-2 py-1 rounded-lg">
                        {airport.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-stone-900">{airport.name}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-stone-600">{airport.city}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-stone-500">{airport.country}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(airport)}
                          className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center transition-colors"
                          title="Sửa"
                        >
                          <Icon name="PencilIcon" size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(airport)}
                          disabled={deletingId === airport.id}
                          className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                          title="Xoá"
                        >
                          <Icon name="TrashIcon" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-stone-100 bg-stone-50/50 flex justify-center">
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
        <AirportModal
          title="Thêm sân bay mới"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddAirport}
          onClose={() => { setShowAddModal(false); resetForm(); }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Modal */}
      {editingAirport && (
        <AirportModal
          title={`Sửa sân bay ${editingAirport.code}`}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdateAirport}
          onClose={() => { setEditingAirport(null); resetForm(); }}
          isSubmitting={isSubmitting}
          isEditing
        />
      )}
    </div>
  );
}

// Airport Form Modal Component
function AirportModal({
  title,
  formData,
  setFormData,
  onSubmit,
  onClose,
  isSubmitting,
  isEditing = false,
}: {
  title: string;
  formData: { code: string; name: string; city: string; country: string };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h3 className="font-bold text-stone-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center transition-colors">
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Mã sân bay <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="HAN"
              maxLength={3}
              disabled={isEditing}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm font-mono font-bold uppercase focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-stone-100 disabled:text-stone-500"
              required
            />
            <p className="text-[11px] text-stone-400 mt-1">3 ký tự viết hoa (VD: HAN, SGN, DAD)</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Tên sân bay <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Sân bay Nội Bài"
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Thành phố <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
              placeholder="Hà Nội"
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Quốc gia
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))}
              placeholder="Vietnam"
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border border-stone-300 text-stone-600 font-semibold py-2.5 rounded-xl text-sm transition-all hover:bg-stone-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.code || !formData.name || !formData.city}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xử lý...
                </>
              ) : isEditing ? 'Lưu thay đổi' : 'Thêm sân bay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
