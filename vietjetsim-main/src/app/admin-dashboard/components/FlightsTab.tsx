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

type FlightStatus = 'active' | 'cancelled' | 'delayed';

interface Flight {
  id: string;
  flightNo: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  date: string;
  price: number;
  capacity: number;
  booked: number;
  status: FlightStatus;
}

const INITIAL_FLIGHTS: Flight[] = [
  {
    id: '1',
    flightNo: 'VJ 101',
    from: 'HAN',
    to: 'SGN',
    departTime: '06:00',
    arriveTime: '08:10',
    date: '2026-03-20',
    price: 899000,
    capacity: 180,
    booked: 138,
    status: 'active',
  },
  {
    id: '2',
    flightNo: 'VJ 103',
    from: 'HAN',
    to: 'SGN',
    departTime: '09:30',
    arriveTime: '11:40',
    date: '2026-03-20',
    price: 1299000,
    capacity: 180,
    booked: 165,
    status: 'active',
  },
  {
    id: '3',
    flightNo: 'VJ 105',
    from: 'HAN',
    to: 'SGN',
    departTime: '12:15',
    arriveTime: '14:25',
    date: '2026-03-20',
    price: 749000,
    capacity: 180,
    booked: 112,
    status: 'active',
  },
  {
    id: '4',
    flightNo: 'VJ 107',
    from: 'HAN',
    to: 'SGN',
    departTime: '15:00',
    arriveTime: '17:10',
    date: '2026-03-20',
    price: 2899000,
    capacity: 30,
    booked: 22,
    status: 'active',
  },
  {
    id: '5',
    flightNo: 'VJ 109',
    from: 'HAN',
    to: 'SGN',
    departTime: '18:45',
    arriveTime: '20:55',
    date: '2026-03-20',
    price: 599000,
    capacity: 180,
    booked: 177,
    status: 'delayed',
  },
  {
    id: '6',
    flightNo: 'VJ 201',
    from: 'SGN',
    to: 'PQC',
    departTime: '07:30',
    arriveTime: '08:45',
    date: '2026-03-21',
    price: 499000,
    capacity: 150,
    booked: 95,
    status: 'active',
  },
  {
    id: '7',
    flightNo: 'VJ 301',
    from: 'HAN',
    to: 'DAD',
    departTime: '07:00',
    arriveTime: '08:20',
    date: '2026-03-21',
    price: 449000,
    capacity: 150,
    booked: 120,
    status: 'cancelled',
  },
];

const STATUS_MAP: Record<FlightStatus, { label: string; cls: string }> = {
  active: { label: 'Hoạt động', cls: 'badge-success' },
  cancelled: { label: 'Đã huỷ', cls: 'badge-error' },
  delayed: { label: 'Trễ giờ', cls: 'badge-warning' },
};

const STATUS_TABS: { value: 'all' | FlightStatus; label: string; color: string }[] = [
  { value: 'all', label: 'Tất cả', color: 'text-stone-600 bg-stone-100' },
  { value: 'active', label: 'Hoạt động', color: 'text-green-700 bg-green-100' },
  { value: 'delayed', label: 'Trễ giờ', color: 'text-amber-700 bg-amber-100' },
  { value: 'cancelled', label: 'Đã huỷ', color: 'text-red-700 bg-red-100' },
];

export default function FlightsTab({ onToast }: { onToast?: ToastAPI }) {
  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FlightStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [sortKey, setSortKey] = useState<
    'flightNo' | 'date' | 'price' | 'booked' | 'status' | null
  >(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const retryLoad = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => setIsLoading(false), 1200);
  };

  const [newFlight, setNewFlight] = useState({
    flightNo: '',
    from: 'HAN',
    to: 'SGN',
    departTime: '',
    arriveTime: '',
    date: '',
    price: '',
    capacity: '',
  });

  const activeFilterCount = [statusFilter !== 'all', !!dateFrom, !!dateTo].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const filtered = flights.filter((f) => {
    const matchSearch =
      f.flightNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.to.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchDateFrom = !dateFrom || f.date >= dateFrom;
    const matchDateTo = !dateTo || f.date <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (sortKey === 'flightNo') {
          aVal = a.flightNo;
          bVal = b.flightNo;
        } else if (sortKey === 'date') {
          aVal = a.date;
          bVal = b.date;
        } else if (sortKey === 'price') {
          aVal = a.price;
          bVal = b.price;
        } else if (sortKey === 'booked') {
          aVal = a.booked / a.capacity;
          bVal = b.booked / b.capacity;
        } else if (sortKey === 'status') {
          aVal = a.status;
          bVal = b.status;
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : filtered;

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col)
      return (
        <Icon name="ChevronUpDownIcon" size={13} className="text-stone-300 ml-1 inline-block" />
      );
    return sortDir === 'asc' ? (
      <Icon name="ChevronUpIcon" size={13} className="text-primary ml-1 inline-block" />
    ) : (
      <Icon name="ChevronDownIcon" size={13} className="text-primary ml-1 inline-block" />
    );
  };

  const handleAddFlight = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setTimeout(() => {
      const flight: Flight = {
        id: Date.now().toString(),
        flightNo: newFlight.flightNo,
        from: newFlight.from,
        to: newFlight.to,
        departTime: newFlight.departTime,
        arriveTime: newFlight.arriveTime,
        date: newFlight.date,
        price: parseInt(newFlight.price),
        capacity: parseInt(newFlight.capacity),
        booked: 0,
        status: 'active',
      };
      setFlights((prev) => [flight, ...prev]);
      setShowAddModal(false);
      setNewFlight({
        flightNo: '',
        from: 'HAN',
        to: 'SGN',
        departTime: '',
        arriveTime: '',
        date: '',
        price: '',
        capacity: '',
      });
      onToast?.success(
        'Thêm chuyến bay thành công',
        `Chuyến bay ${flight.flightNo}: ${flight.from} → ${flight.to} đã được tạo.`
      );
      setIsAdding(false);
    }, 600);
  };

  const handleStatusChange = (id: string, status: FlightStatus) => {
    setFlights((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const handleDelete = (id: string) => {
    const flight = flights.find((f) => f.id === id);
    if (confirm('Bạn có chắc muốn xoá chuyến bay này?')) {
      setDeletingId(id);
      setTimeout(() => {
        setFlights((prev) => prev.filter((f) => f.id !== id));
        onToast?.error(
          'Đã xoá chuyến bay',
          `Chuyến bay ${flight?.flightNo ?? ''} đã bị xoá khỏi hệ thống.`
        );
        setDeletingId(null);
      }, 500);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlight) return;
    setIsSavingEdit(true);
    try {
      // Build depart_time and arrive_time ISO strings from date + time
      const departTimeStr = editingFlight.date && editingFlight.departTime
        ? `${editingFlight.date}T${editingFlight.departTime}:00`
        : editingFlight.departTime;
      const arriveTimeStr = editingFlight.date && editingFlight.arriveTime
        ? `${editingFlight.date}T${editingFlight.arriveTime}:00`
        : editingFlight.arriveTime;

      const payload: Record<string, any> = {
        flight_no: editingFlight.flightNo,
        from_code: editingFlight.from,
        to_code: editingFlight.to,
        depart_time: departTimeStr,
        arrive_time: arriveTimeStr,
        status: editingFlight.status,
      };

      const res = await fetch(`/api/admin/flights/${encodeURIComponent(editingFlight.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        // Update local state with server response or optimistic update
        setFlights((prev) =>
          prev.map((f) =>
            f.id === editingFlight.id
              ? {
                  ...f,
                  flightNo: data.flight?.flight_no || editingFlight.flightNo,
                  from: data.flight?.from_code || editingFlight.from,
                  to: data.flight?.to_code || editingFlight.to,
                  departTime: editingFlight.departTime,
                  arriveTime: editingFlight.arriveTime,
                  date: editingFlight.date,
                  status: data.flight?.status || editingFlight.status,
                }
              : f
          )
        );
        setEditingFlight(null);

        const changedFields = (data.changes || [])
          .map((c: any) => c.label)
          .join(', ');
        onToast?.success(
          'Cập nhật chuyến bay thành công',
          changedFields
            ? `Đã cập nhật: ${changedFields}.`
            : `Chuyến bay ${editingFlight.flightNo} đã được cập nhật.`
        );

        // Refresh flight list from server
        try {
          const listRes = await fetch('/api/admin/flights?limit=100');
          if (listRes.ok) {
            const listData = await listRes.json();
            if (listData.flights && Array.isArray(listData.flights)) {
              const mapped = listData.flights.map((f: any) => ({
                id: f.id,
                flightNo: f.flight_no,
                from: f.from_code,
                to: f.to_code,
                departTime: f.depart_time ? new Date(f.depart_time).toTimeString().slice(0, 5) : '',
                arriveTime: f.arrive_time ? new Date(f.arrive_time).toTimeString().slice(0, 5) : '',
                date: f.depart_time ? f.depart_time.split('T')[0] : '',
                price: Number(f.price) || 0,
                capacity: Number(f.available) || 0,
                booked: Math.floor(Math.random() * (Number(f.available) || 1)),
                status: f.status || 'active',
              }));
              setFlights(mapped.length > 0 ? mapped : prev => prev);
            }
          }
        } catch { /* keep local state */ }
      } else {
        onToast?.error(
          'Lỗi cập nhật',
          data.message || 'Không thể lưu thay đổi. Vui lòng thử lại.'
        );
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message || 'Kết nối đến server thất bại.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const AIRPORTS = ['HAN', 'SGN', 'DAD', 'PQC', 'CXR', 'HPH', 'HUI'];

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-stone-900">Quản lý chuyến bay</h2>
          <p className="text-sm text-stone-400">{flights.length} chuyến bay trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-glow-red hover:shadow-none text-sm"
        >
          <Icon name="PlusIcon" size={16} />
          Thêm chuyến bay
        </button>
      </div>

      {/* Search + Date Range */}
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
            placeholder="Tìm theo số hiệu, điểm đi/đến..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon
              name="CalendarDaysIcon"
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input w-40"
              title="Từ ngày"
            />
          </div>
          <span className="text-stone-400 text-sm font-medium">–</span>
          <div className="relative">
            <Icon
              name="CalendarDaysIcon"
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input w-40"
              title="Đến ngày"
            />
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === 'all'
                ? flights.length
                : flights.filter((f) => f.status === tab.value).length;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? `${tab.color} border-transparent shadow-sm`
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/60' : 'bg-stone-100 text-stone-400'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {(activeFilterCount > 0 || searchQuery) && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-full border border-stone-200 hover:border-red-200 hover:bg-red-50"
          >
            <Icon name="XMarkIcon" size={13} />
            Xoá bộ lọc
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th
                  className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('flightNo')}
                >
                  Số hiệu
                  <SortIcon col="flightNo" />
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2">
                  Hành trình
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden sm:table-cell">
                  Giờ bay
                </th>
                <th
                  className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden md:table-cell cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('date')}
                >
                  Ngày
                  <SortIcon col="date" />
                </th>
                <th
                  className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('price')}
                >
                  Giá vé
                  <SortIcon col="price" />
                </th>
                <th
                  className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden lg:table-cell cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('booked')}
                >
                  Tải lượng
                  <SortIcon col="booked" />
                </th>
                <th
                  className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('status')}
                >
                  Trạng thái
                  <SortIcon col="status" />
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-stone-50 animate-pulse">
                      <td className="px-4 py-2.5">
                        <div className="h-4 w-16 bg-stone-200 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="h-4 w-24 bg-stone-200 rounded-full mb-1.5" />
                        <div className="h-3 w-16 bg-stone-100 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <div className="h-4 w-20 bg-stone-200 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <div className="h-4 w-24 bg-stone-200 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="h-4 w-20 bg-stone-200 rounded-full ml-auto" />
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <div className="h-2 w-full bg-stone-200 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="h-6 w-20 bg-stone-200 rounded-full mx-auto" />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="h-6 w-6 bg-stone-200 rounded-md" />
                          <div className="h-6 w-6 bg-stone-200 rounded-md" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : hasError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.35s_ease-out]">
                      <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
                        <Icon name="ExclamationTriangleIcon" size={28} className="text-red-400" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-700 text-sm">Không thể tải dữ liệu</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                          Đã xảy ra lỗi khi tải danh sách chuyến bay. Vui lòng thử lại.
                        </p>
                      </div>
                      <button
                        onClick={retryLoad}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl transition-all shadow-glow-red hover:shadow-none mt-1"
                      >
                        <Icon name="ArrowPathIcon" size={13} />
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.35s_ease-out]">
                      <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-2xl flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite]">
                        <Icon name="PaperAirplaneIcon" size={28} className="text-stone-300" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-700 text-sm">
                          Không tìm thấy chuyến bay
                        </p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                          {searchQuery || statusFilter !== 'all' || dateFrom || dateTo
                            ? 'Bộ lọc hiện tại không khớp với chuyến bay nào. Hãy thử thay đổi tiêu chí tìm kiếm.'
                            : 'Chưa có chuyến bay nào trong hệ thống.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {(searchQuery || statusFilter !== 'all' || dateFrom || dateTo) && (
                          <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl transition-all shadow-glow-red hover:shadow-none"
                          >
                            <Icon name="ArrowPathIcon" size={13} />
                            Đặt lại bộ lọc
                          </button>
                        )}
                        <button
                          onClick={retryLoad}
                          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 px-4 py-2 rounded-xl transition-all"
                        >
                          <Icon name="ArrowPathIcon" size={13} />
                          Tải lại
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((flight, i) => (
                  <tr
                    key={flight.id}
                    className={`vj-table-row border-b border-stone-50 ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-red rounded flex items-center justify-center">
                          <Icon name="PaperAirplaneIcon" size={9} className="text-white" />
                        </div>
                        <span className="font-bold text-sm text-stone-900">{flight.flightNo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                        {flight.from}
                        <Icon name="ArrowRightIcon" size={11} className="text-stone-400" />
                        {flight.to}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <div className="text-sm text-stone-600">
                        {flight.departTime} → {flight.arriveTime}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="text-sm text-stone-600">{flight.date}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-bold text-stone-900 text-sm">
                        {flight.price.toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(flight.booked / flight.capacity) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-stone-500 whitespace-nowrap">
                          {flight.booked}/{flight.capacity}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <select
                        value={flight.status}
                        onChange={(e) =>
                          handleStatusChange(flight.id, e.target.value as FlightStatus)
                        }
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_MAP[flight.status].cls}`}
                      >
                        <option value="active">Hoạt động</option>
                        <option value="delayed">Trễ giờ</option>
                        <option value="cancelled">Huỷ</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingFlight(flight)}
                          className="w-6 h-6 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md flex items-center justify-center transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Icon name="PencilIcon" size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(flight.id)}
                          disabled={deletingId === flight.id}
                          className="w-6 h-6 bg-red-50 hover:bg-red-100 text-red-500 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Xoá"
                        >
                          {deletingId === flight.id ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
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
                          ) : (
                            <Icon name="TrashIcon" size={12} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 0 && (
          <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">
                {sorted.length > pageSize
                  ? `Hiển thị ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} / ${sorted.length} chuyến bay`
                  : `${sorted.length} / ${flights.length} chuyến bay`}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400">Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs font-semibold border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-700 focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs text-stone-400">hàng</span>
              </div>
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                siblingCount={1}
              />
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h3 className="font-bold text-stone-900">Thêm chuyến bay mới</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <Icon name="XMarkIcon" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddFlight} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Số hiệu
                  </label>
                  <div className={`form-field-float ${newFlight.flightNo ? 'has-value' : ''}`}>
                    <input
                      type="text"
                      value={newFlight.flightNo}
                      onChange={(e) => setNewFlight((p) => ({ ...p, flightNo: e.target.value }))}
                      placeholder=" "
                      className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${newFlight.flightNo.length >= 4 ? 'form-input-valid' : ''}`}
                      required
                    />
                    <label className="form-label-float">VJ 999</label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Ngày bay
                  </label>
                  <input
                    type="date"
                    value={newFlight.date}
                    onChange={(e) => setNewFlight((p) => ({ ...p, date: e.target.value }))}
                    className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${newFlight.date ? 'form-input-valid' : ''}`}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Điểm đi
                  </label>
                  <select
                    value={newFlight.from}
                    onChange={(e) => setNewFlight((p) => ({ ...p, from: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input"
                  >
                    {AIRPORTS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Điểm đến
                  </label>
                  <select
                    value={newFlight.to}
                    onChange={(e) => setNewFlight((p) => ({ ...p, to: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input"
                  >
                    {AIRPORTS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Giờ đi
                  </label>
                  <input
                    type="time"
                    value={newFlight.departTime}
                    onChange={(e) => setNewFlight((p) => ({ ...p, departTime: e.target.value }))}
                    className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${newFlight.departTime ? 'form-input-valid' : ''}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Giờ đến
                  </label>
                  <input
                    type="time"
                    value={newFlight.arriveTime}
                    onChange={(e) => setNewFlight((p) => ({ ...p, arriveTime: e.target.value }))}
                    className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${newFlight.arriveTime ? 'form-input-valid' : ''}`}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Giá vé (₫)
                  </label>
                  <div className={`form-field-float ${newFlight.price ? 'has-value' : ''}`}>
                    <input
                      type="number"
                      value={newFlight.price}
                      onChange={(e) => setNewFlight((p) => ({ ...p, price: e.target.value }))}
                      placeholder=" "
                      className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${Number(newFlight.price) > 0 ? 'form-input-valid' : ''}`}
                      required
                    />
                    <label className="form-label-float">499000</label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Sức chứa
                  </label>
                  <div className={`form-field-float ${newFlight.capacity ? 'has-value' : ''}`}>
                    <input
                      type="number"
                      value={newFlight.capacity}
                      onChange={(e) => setNewFlight((p) => ({ ...p, capacity: e.target.value }))}
                      placeholder=" "
                      className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${Number(newFlight.capacity) > 0 ? 'form-input-valid' : ''}`}
                      required
                    />
                    <label className="form-label-float">180</label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isAdding}
                  className="flex-1 border border-stone-300 text-stone-600 font-semibold py-2.5 rounded-xl text-sm transition-all hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAdding ? (
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
                      Đang thêm...
                    </>
                  ) : (
                    'Thêm chuyến bay'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal — Full flight update form */}
      {editingFlight && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div
              className="flex items-center justify-between p-5 border-b border-stone-100"
              style={{ background: 'linear-gradient(135deg, #1A2948 0%, #2D3E5F 100%)' }}
            >
              <div>
                <h3 className="font-bold text-white text-base font-heading-sm">
                  Cập nhật thông tin chuyến bay
                </h3>
                <p className="text-white/60 text-xs mt-0.5">
                  {editingFlight.flightNo} &mdash; {editingFlight.from} → {editingFlight.to}
                </p>
              </div>
              <button
                onClick={() => setEditingFlight(null)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              >
                <Icon name="XMarkIcon" size={16} className="text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {/* ── Field 1: Số hiệu chuyến bay (flight_no) ── */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-red-50 text-red-600 flex items-center justify-center text-[10px] font-bold">1</span>
                  Số hiệu chuyến bay
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editingFlight.flightNo}
                  onChange={(e) =>
                    setEditingFlight((p) => (p ? { ...p, flightNo: e.target.value.toUpperCase() } : p))
                  }
                  placeholder="Ví dụ: VJ 101"
                  maxLength={10}
                  className={`w-full px-3 py-2.5 bg-stone-50 border ${editingFlight.flightNo.length >= 3 ? 'border-green-300' : 'border-stone-200'} rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all`}
                  required
                />
                <p className="text-[11px] text-stone-400 mt-1">Định dạng: VJ 101, VN001, BL 202...</p>
              </div>

              {/* ── Field 2 & 3: Điểm đi / Điểm đến ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">2</span>
                    Điểm đi
                    <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editingFlight.from}
                    onChange={(e) =>
                      setEditingFlight((p) => (p ? { ...p, from: e.target.value.toUpperCase() } : p))
                    }
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                  >
                    {AIRPORTS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">3</span>
                    Điểm đến
                    <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editingFlight.to}
                    onChange={(e) =>
                      setEditingFlight((p) => (p ? { ...p, to: e.target.value.toUpperCase() } : p))
                    }
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                  >
                    {AIRPORTS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Warning if from === to */}
              {editingFlight.from === editingFlight.to && editingFlight.from !== '' && (
                <div className="rounded-lg p-2.5 flex items-center gap-2"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <Icon name="ExclamationTriangleIcon" size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs font-medium" style={{ color: '#991B1B' }}>
                    Điểm đi và điểm đến không được trùng nhau!
                  </p>
                </div>
              )}

              {/* ── Field 4 & 5: Thời gian khởi hành / Thời gian đến ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-amber-50 text-amber-700 flex items-center justify-center text-[10px] font-bold">4</span>
                    Giờ khởi hành
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={editingFlight.departTime}
                    onChange={(e) =>
                      setEditingFlight((p) => (p ? { ...p, departTime: e.target.value } : p))
                    }
                    className={`w-full px-3 py-2.5 bg-stone-50 border ${editingFlight.departTime ? 'border-green-300' : 'border-stone-200'} rounded-lg text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-amber-50 text-amber-700 flex items-center justify-center text-[10px] font-bold">5</span>
                    Giờ đến
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={editingFlight.arriveTime}
                    onChange={(e) =>
                      setEditingFlight((p) => (p ? { ...p, arriveTime: e.target.value } : p))
                    }
                    className={`w-full px-3 py-2.5 bg-stone-50 border ${editingFlight.arriveTime ? 'border-green-300' : 'border-stone-200'} rounded-lg text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all`}
                    required
                  />
                </div>
              </div>

              {/* Date picker for both times */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Icon name="CalendarDaysIcon" size={12} className="text-stone-400" />
                  Ngày bay
                </label>
                <input
                  type="date"
                  value={editingFlight.date}
                  onChange={(e) =>
                    setEditingFlight((p) => (p ? { ...p, date: e.target.value } : p))
                  }
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>

              {/* Time validation warning */}
              {editingFlight.departTime && editingFlight.arriveTime &&
               editingFlight.departTime >= editingFlight.arriveTime && (
                <div className="rounded-lg p-2.5 flex items-center gap-2"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <Icon name="ExclamationTriangleIcon" size={14} className="text-yellow-600 flex-shrink-0" />
                  <p className="text-xs font-medium" style={{ color: '#92400E' }}>
                    Thời gian khởi hành phải sớm hơn thời gian đến!
                  </p>
                </div>
              )}

              {/* ── Field 6: Trạng thái chuyến bay ── */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-bold">6</span>
                  Trạng thái chuyến bay
                  <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'active', label: 'Hoạt động', icon: 'CheckCircleIcon', cls: 'bg-green-50 border-green-300 text-green-700' },
                    { val: 'delayed', label: 'Trễ giờ', icon: 'ClockIcon', cls: 'bg-amber-50 border-amber-300 text-amber-700' },
                    { val: 'cancelled', label: 'Đã huỷ', icon: 'XCircleIcon', cls: 'bg-red-50 border-red-300 text-red-700' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() =>
                        setEditingFlight((p) =>
                          p ? { ...p, status: opt.val as FlightStatus } : p
                        )
                      }
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                        editingFlight.status === opt.val
                          ? `${opt.cls} shadow-sm`
                          : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      <Icon name={opt.icon as any} size={13} />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  Chọn trạng thái hiện tại của chuyến bay trong hệ thống.
                </p>
              </div>

              {/* Change summary preview */}
              <div
                className="rounded-xl p-3 space-y-1.5"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                   style={{ color: '#64748B' }}>
                  <Icon name="EyeIcon" size={12} /> Xem trước thay đổi
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Số hiệu:</span>
                    <span className="font-mono font-bold">{editingFlight.flightNo || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Hành trình:</span>
                    <span className="font-mono font-bold">{editingFlight.from} → {editingFlight.to}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Giờ bay:</span>
                    <span className="font-mono">{editingFlight.departTime || '—'} → {editingFlight.arriveTime || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Trạng thái:</span>
                    <span className={`font-bold ${STATUS_MAP[editingFlight.status]?.cls?.replace('badge-', 'text-') || ''}`}>
                      {STATUS_MAP[editingFlight.status]?.label || editingFlight.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFlight(null)}
                  disabled={isSavingEdit}
                  className="flex-1 border border-stone-300 text-stone-600 font-semibold py-2.5 rounded-xl text-sm transition-all hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed font-koho"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingEdit ||
                    !editingFlight.flightNo ||
                    !editingFlight.from ||
                    !editingFlight.to ||
                    !editingFlight.departTime ||
                    !editingFlight.arriveTime ||
                    editingFlight.from === editingFlight.to ||
                    (editingFlight.departTime >= editingFlight.arriveTime)
                  }
                  className="flex-1 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: isSavingEdit ? '#9CA3AF' : '#EC2029'
                  }}
                >
                  {isSavingEdit ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Icon name="CheckIcon" size={15} />
                      Lưu cập nhật
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
