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
  const [viewingAirport, setViewingAirport] = useState<Airport | null>(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Icon name="BuildingOfficeIcon" size={24} className="text-primary" />
            Quản lý sân bay
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            {totalCount} sân bay trong hệ thống
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.2em] px-6 py-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
        >
          <Icon name="PlusIcon" size={16} />
          Thêm sân bay
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Icon
          name="MagnifyingGlassIcon"
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Tìm theo mã, tên, thành phố..."
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
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Mã IATA</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Tên sân bay</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left hidden sm:table-cell">Thành phố</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left hidden md:table-cell">Quốc gia</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-6 bg-slate-800/50 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : hasError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Icon name="ExclamationTriangleIcon" size={32} className="text-red-400 opacity-50" />
                      <p className="font-black text-slate-400">Không thể tải dữ liệu</p>
                      <button onClick={() => fetchAirports(1, searchQuery)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Thử lại</button>
                    </div>
                  </td>
                </tr>
              ) : airports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Icon name="InboxIcon" size={32} className="text-slate-600" />
                      <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Sân bay trống</p>
                    </div>
                  </td>
                </tr>
              ) : (
                airports.map((airport, i) => (
                  <tr 
                    key={airport.id} 
                    onClick={() => setViewingAirport(airport)}
                    className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <span className="font-mono font-black text-sm text-primary group-hover:scale-110 inline-block transition-transform">
                        {airport.code}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                      {airport.name}
                    </td>
                    <td className="px-6 py-5 hidden sm:table-cell text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {airport.city}
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {airport.country}
                    </td>
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(airport)}
                          className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center transition-all active:scale-95"
                          title="Sửa"
                        >
                          <Icon name="PencilIcon" size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(airport)}
                          disabled={deletingId === airport.id}
                          className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
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
          <div className="px-6 py-5 border-t border-white/5 bg-white/[0.02] flex justify-center">
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

      {/* Detail Modal */}
      {viewingAirport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div 
             className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
             style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)' }}
           >
              <div className="px-8 py-8 border-b border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                       <Icon name="BuildingOfficeIcon" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{viewingAirport.name}</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Mã IATA: {viewingAirport.code}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingAirport(null)} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center transition-all border border-white/5">
                    <Icon name="XMarkIcon" size={20} />
                 </button>
              </div>

              <div className="p-8 space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">Thành phố</label>
                       <p className="text-sm font-black text-slate-200">{viewingAirport.city}</p>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">Quốc gia</label>
                       <p className="text-sm font-black text-slate-200">{viewingAirport.country}</p>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">Ngày tạo</label>
                       <p className="text-xs font-bold text-slate-400">{new Date(viewingAirport.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">ID Hệ thống</label>
                       <p className="text-[10px] font-mono text-slate-500 uppercase truncate">{viewingAirport.id}</p>
                    </div>
                 </div>

                 <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-6 flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                       <Icon name="GlobeAltIcon" size={24} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Vị trí kết nối</p>
                       <p className="text-xs font-bold text-slate-300">Đang phục vụ mạng lưới đường bay nội địa & quốc tế.</p>
                    </div>
                 </div>
              </div>

              <div className="p-8 pt-0 flex gap-4">
                 <button onClick={() => { setViewingAirport(null); openEditModal(viewingAirport); }} className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all active:scale-95">Chỉnh sửa</button>
                 <button onClick={() => setViewingAirport(null)} className="flex-1 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20">Đóng</button>
              </div>
           </div>
        </div>
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
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl flex items-center justify-center transition-all">
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Mã sân bay <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="HAN"
              maxLength={3}
              disabled={isEditing}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-mono font-black uppercase text-white placeholder-slate-700 focus:outline-none focus:border-primary/50 transition-all disabled:opacity-40"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Tên sân bay <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Sân bay Nội Bài"
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder-slate-700 focus:outline-none focus:border-primary/50 transition-all"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Thành phố <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                placeholder="Hà Nội"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder-slate-700 focus:outline-none focus:border-primary/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Quốc gia
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))}
                placeholder="Vietnam"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder-slate-700 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all border border-white/5 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.code || !formData.name || !formData.city}
              className="flex-[2] bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
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
