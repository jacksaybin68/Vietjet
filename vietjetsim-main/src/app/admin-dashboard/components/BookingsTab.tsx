'use client';
import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination from '@/components/ui/Pagination';

type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

interface Booking {
  id: string;
  userId: string;
  userName: string;
  flightNo: string;
  route: string;
  date: string;
  seat: string;
  amount: number;
  status: BookingStatus;
  payMethod: string;
  createdAt: string;
}

const BOOKINGS: Booking[] = [
  {
    id: 'VJ2B4K9',
    userId: '1',
    userName: 'Nguyễn Văn An',
    flightNo: 'VJ 101',
    route: 'HAN → SGN',
    date: '20/03/2026',
    seat: '14A',
    amount: 1038900,
    status: 'confirmed',
    payMethod: 'Thẻ tín dụng',
    createdAt: '16/03/2026 20:55',
  },
  {
    id: 'VJ7M3P1',
    userId: '2',
    userName: 'Trần Thị Bích',
    flightNo: 'VJ 201',
    route: 'SGN → PQC',
    date: '05/04/2026',
    seat: '8C',
    amount: 598900,
    status: 'confirmed',
    payMethod: 'MoMo',
    createdAt: '16/03/2026 20:48',
  },
  {
    id: 'VJ9X8Y7',
    userId: '3',
    userName: 'Lê Minh Tuấn',
    flightNo: 'VJ 301',
    route: 'HAN → DAD',
    date: '21/03/2026',
    seat: '22F',
    amount: 548900,
    status: 'pending',
    payMethod: 'Ngân hàng',
    createdAt: '16/03/2026 20:32',
  },
  {
    id: 'VJ5Z6W4',
    userId: '4',
    userName: 'Phạm Thu Hà',
    flightNo: 'VJ 109',
    route: 'SGN → HAN',
    date: '18/03/2026',
    seat: '5B',
    amount: 748900,
    status: 'cancelled',
    payMethod: 'ZaloPay',
    createdAt: '16/03/2026 19:15',
  },
  {
    id: 'VJ1A2B3',
    userId: '5',
    userName: 'Hoàng Văn Dũng',
    flightNo: 'VJ 103',
    route: 'HAN → SGN',
    date: '22/03/2026',
    seat: '11D',
    amount: 1448900,
    status: 'confirmed',
    payMethod: 'Thẻ tín dụng',
    createdAt: '16/03/2026 18:30',
  },
  {
    id: 'VJ3C5D7',
    userId: '6',
    userName: 'Vũ Thị Lan',
    flightNo: 'VJ 301',
    route: 'HAN → DAD',
    date: '25/03/2026',
    seat: '7C',
    amount: 449900,
    status: 'completed',
    payMethod: 'VNPay',
    createdAt: '15/03/2026 14:20',
  },
  {
    id: 'VJ8E9F2',
    userId: '1',
    userName: 'Nguyễn Văn An',
    flightNo: 'VJ 105',
    route: 'HAN → SGN',
    date: '10/03/2026',
    seat: '19A',
    amount: 898900,
    status: 'completed',
    payMethod: 'Thẻ tín dụng',
    createdAt: '08/03/2026 09:45',
  },
];

const STATUS_MAP: Record<BookingStatus, { label: string; cls: string }> = {
  confirmed: { label: 'Xác nhận', cls: 'badge-success' },
  pending: { label: 'Chờ duyệt', cls: 'badge-warning' },
  cancelled: { label: 'Đã huỷ', cls: 'badge-error' },
  completed: { label: 'Hoàn thành', cls: 'badge-info' },
};

const PAGE_SIZE = 5;

export default function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | BookingStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState<
    'id' | 'userName' | 'amount' | 'status' | 'createdAt' | null
  >(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const retryLoad = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => setIsLoading(false), 1200);
  };

  const filtered = bookings.filter((b) => {
    const matchSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.route.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchDateFrom = !dateFrom || b.createdAt >= dateFrom;
    const matchDateTo = !dateTo || b.createdAt <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (sortKey === 'id') {
          aVal = a.id;
          bVal = b.id;
        } else if (sortKey === 'userName') {
          aVal = a.userName;
          bVal = b.userName;
        } else if (sortKey === 'amount') {
          aVal = a.amount;
          bVal = b.amount;
        } else if (sortKey === 'status') {
          aVal = a.status;
          bVal = b.status;
        } else if (sortKey === 'createdAt') {
          aVal = a.createdAt;
          bVal = b.createdAt;
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleFilterChange = (newSearch: string, newStatus: 'all' | BookingStatus) => {
    setSearchQuery(newSearch);
    setFilterStatus(newStatus);
    setCurrentPage(1);
  };

  const totalAmount = sorted.reduce((s, b) => s + (b.status !== 'cancelled' ? b.amount : 0), 0);

  const exportCSV = () => {
    const headers = [
      'Mã đặt chỗ',
      'Khách hàng',
      'Chuyến bay',
      'Hành trình',
      'Ngày bay',
      'Ghế',
      'Thanh toán',
      'Giá trị (VND)',
      'Trạng thái',
      'Ngày tạo',
    ];
    const rows = sorted.map((b) => [
      b.id,
      b.userName,
      b.flightNo,
      b.route,
      b.date,
      b.seat,
      b.payMethod,
      b.amount,
      STATUS_MAP[b.status].label,
      b.createdAt,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = sorted
      .map(
        (b) => `
      <tr>
        <td><code>${b.id}</code></td>
        <td>${b.userName}<br/><small style="color:#78716c">Ghế ${b.seat}</small></td>
        <td>${b.flightNo}<br/><small style="color:#78716c">${b.route} · ${b.date}</small></td>
        <td><small>${b.payMethod}</small></td>
        <td style="text-align:right;font-weight:700">${b.status === 'cancelled' ? '<s>' + b.amount.toLocaleString('vi-VN') + '₫</s>' : b.amount.toLocaleString('vi-VN') + '₫'}</td>
        <td><span style="padding:2px 8px;border-radius:999px;font-size:11px;background:${b.status === 'confirmed' ? '#f0fdf4' : b.status === 'pending' ? '#fffbeb' : b.status === 'cancelled' ? '#fee2e2' : '#eff6ff'};color:${b.status === 'confirmed' ? '#16a34a' : b.status === 'pending' ? '#d97706' : b.status === 'cancelled' ? '#dc2626' : '#1d4ed8'}">${STATUS_MAP[b.status].label}</span></td>
        <td><small style="color:#78716c">${b.createdAt}</small></td>
      </tr>`
      )
      .join('');
    const validTotal = sorted
      .filter((b) => b.status !== 'cancelled')
      .reduce((s, b) => s + b.amount, 0);
    const filterDesc = [
      searchQuery ? `Tìm kiếm: "${searchQuery}"` : '',
      filterStatus !== 'all'
        ? `Trạng thái: ${STATUS_MAP[filterStatus as BookingStatus]?.label ?? filterStatus}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ');
    printWindow.document
      .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Danh sách đặt vé</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1c1917; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #78716c; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f5f5f4; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; border-bottom: 2px solid #e7e5e4; }
        td { padding: 8px 10px; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
        tr:nth-child(even) td { background: #fafaf9; }
        tfoot td { background: #f5f5f4; font-weight: bold; border-top: 2px solid #e7e5e4; }
        code { font-family: monospace; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Quản lý đặt vé — VietJet Sim</h1>
      <div class="meta">Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} · ${sorted.filter((b) => b.status !== 'cancelled').length} đơn${filterDesc ? ' · Bộ lọc: ' + filterDesc : ''}</div>
      <table>
        <thead><tr>
          <th>Mã đặt chỗ</th><th>Khách hàng</th><th>Chuyến bay</th><th>Thanh toán</th><th>Giá trị</th><th>Trạng thái</th><th>Ngày tạo</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="4">Tổng (${sorted.filter((b) => b.status !== 'cancelled').length} đơn hợp lệ)</td>
          <td style="text-align:right;color:#e53e3e">${validTotal.toLocaleString('vi-VN')}₫</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleStatusChange = (id: string, status: BookingStatus) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-bold text-stone-900">Quản lý đặt vé</h2>
        <p className="text-sm text-stone-400">{bookings.length} đơn đặt vé tổng cộng</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng đơn', value: bookings.length, color: 'bg-stone-100 text-stone-700' },
          {
            label: 'Xác nhận',
            value: bookings.filter((b) => b.status === 'confirmed').length,
            color: 'bg-green-50 text-green-700',
          },
          {
            label: 'Chờ duyệt',
            value: bookings.filter((b) => b.status === 'pending').length,
            color: 'bg-amber-50 text-amber-700',
          },
          {
            label: 'Đã huỷ',
            value: bookings.filter((b) => b.status === 'cancelled').length,
            color: 'bg-red-50 text-red-700',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.color} rounded-xl px-4 py-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-vj-sm cursor-default`}
          >
            <div className="text-2xl font-black">{stat.value}</div>
            <div className="text-xs font-medium mt-0.5 opacity-70">{stat.label}</div>
          </div>
        ))}
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
            onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
            placeholder="Tìm mã đặt chỗ, tên khách hàng, hành trình..."
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
              title="Từ ngày tạo"
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
              title="Đến ngày tạo"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => handleFilterChange(searchQuery, e.target.value as 'all' | BookingStatus)}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="confirmed">Xác nhận</option>
          <option value="pending">Chờ duyệt</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã huỷ</option>
        </select>
        {(searchQuery || filterStatus !== 'all' || dateFrom || dateTo) && (
          <button
            onClick={() => {
              handleFilterChange('', 'all');
              setDateFrom('');
              setDateTo('');
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-red-500 transition-colors px-3 py-2.5 rounded-xl border border-stone-200 hover:border-red-200 hover:bg-red-50 whitespace-nowrap"
          >
            <Icon name="XMarkIcon" size={13} />
            Xoá bộ lọc
          </button>
        )}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap"
              title="Xuất CSV"
            >
              <Icon name="TableCellsIcon" size={14} />
              Xuất CSV
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap"
              title="Xuất PDF"
            >
              <Icon name="DocumentArrowDownIcon" size={14} />
              Xuất PDF
            </button>
          </div>
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
                  onClick={() => handleSort('id')}
                >
                  Mã đặt chỗ
                  <SortIcon col="id" />
                </th>
                <th
                  className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('userName')}
                >
                  Khách hàng
                  <SortIcon col="userName" />
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden sm:table-cell">
                  Chuyến bay
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden md:table-cell">
                  Thanh toán
                </th>
                <th
                  className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('amount')}
                >
                  Giá trị
                  <SortIcon col="amount" />
                </th>
                <th
                  className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('status')}
                >
                  Trạng thái
                  <SortIcon col="status" />
                </th>
                <th
                  className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden lg:table-cell cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('createdAt')}
                >
                  Ngày tạo
                  <SortIcon col="createdAt" />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-stone-50 animate-pulse">
                      <td className="px-4 py-2.5">
                        <div className="h-4 w-20 bg-stone-200 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="h-4 w-28 bg-stone-200 rounded-full mb-1.5" />
                        <div className="h-3 w-12 bg-stone-100 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <div className="h-4 w-16 bg-stone-200 rounded-full mb-1.5" />
                        <div className="h-3 w-28 bg-stone-100 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <div className="h-5 w-20 bg-stone-100 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="h-4 w-20 bg-stone-200 rounded-full ml-auto" />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="h-6 w-20 bg-stone-200 rounded-full mx-auto" />
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <div className="h-3 w-28 bg-stone-100 rounded-full" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : hasError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.35s_ease-out]">
                      <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
                        <Icon name="ExclamationTriangleIcon" size={28} className="text-red-400" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-700 text-sm">Không thể tải dữ liệu</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                          Đã xảy ra lỗi khi tải danh sách đặt vé. Vui lòng thử lại.
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
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col sm:flex-row items-center gap-6 max-w-md mx-auto text-left animate-[fadeInUp_0.35s_ease-out]">
                      {/* Inline SVG illustration */}
                      <div className="shrink-0 w-32 h-32 flex items-center justify-center">
                        <svg
                          viewBox="0 0 160 160"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-full h-full"
                        >
                          <circle cx="80" cy="80" r="72" fill="#F9FAFB" />
                          {/* Grid dots background */}
                          {[40, 56, 72, 88, 104, 120].map((x) =>
                            [40, 56, 72, 88, 104, 120].map((y) => (
                              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="#E5E7EB" />
                            ))
                          )}
                          {/* Boarding pass outline */}
                          <g style={{ transformOrigin: '80px 84px' }}>
                            <rect
                              x="30"
                              y="54"
                              width="100"
                              height="60"
                              rx="8"
                              fill="white"
                              stroke="#E5E7EB"
                              strokeWidth="1.5"
                            />
                            <rect x="30" y="54" width="10" height="60" rx="8" fill="#1A2948" />
                            <rect x="35" y="54" width="5" height="60" fill="#1A2948" />
                            <line
                              x1="88"
                              y1="60"
                              x2="88"
                              y2="108"
                              stroke="#E5E7EB"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                            />
                            <circle
                              cx="88"
                              cy="54"
                              r="5"
                              fill="#F9FAFB"
                              stroke="#E5E7EB"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="88"
                              cy="114"
                              r="5"
                              fill="#F9FAFB"
                              stroke="#E5E7EB"
                              strokeWidth="1.5"
                            />
                            <rect x="46" y="66" width="34" height="5" rx="2.5" fill="#E5E7EB" />
                            <rect x="46" y="76" width="22" height="4" rx="2" fill="#F3F4F6" />
                            <rect x="46" y="85" width="28" height="4" rx="2" fill="#F3F4F6" />
                            <rect x="46" y="94" width="18" height="4" rx="2" fill="#F3F4F6" />
                            <rect x="96" y="66" width="22" height="5" rx="2.5" fill="#E5E7EB" />
                            <rect x="96" y="76" width="16" height="4" rx="2" fill="#F3F4F6" />
                            <rect x="96" y="85" width="20" height="4" rx="2" fill="#F3F4F6" />
                            <animateTransform
                              attributeName="transform"
                              type="scale"
                              values="1;1.03;1"
                              dur="2.5s"
                              repeatCount="indefinite"
                              additive="sum"
                            />
                          </g>
                          {/* Airplane flying away */}
                          <g>
                            <path
                              d="M118 36v-2l-7-4.5V28c0-.83-.67-1.5-1.5-1.5S108 27.17 108 28v1.5L101 34v2l7-2v4.5l-2 1.5V41.5l3-1 3 1V40l-2-1.5V34l7 2z"
                              fill="#D0021B"
                            />
                            <animateTransform
                              attributeName="transform"
                              type="translate"
                              values="0,0; 4,-4; 0,0"
                              dur="3s"
                              repeatCount="indefinite"
                            />
                          </g>
                          {/* Magnifying glass */}
                          <g transform="translate(28, 110)">
                            <circle
                              cx="9"
                              cy="9"
                              r="7"
                              stroke="#78716c"
                              strokeWidth="2"
                              fill="none"
                            />
                            <line
                              x1="14"
                              y1="14"
                              x2="19"
                              y2="19"
                              stroke="#78716c"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </g>
                          {/* Accent dots */}
                          <circle cx="50" cy="38" r="2.5" fill="#FFC72C" opacity="0.8" />
                          <circle cx="120" cy="48" r="2" fill="#FFC72C" opacity="0.5" />
                          <circle cx="38" cy="52" r="1.5" fill="#D0021B" opacity="0.4" />
                        </svg>
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <p className="font-black text-base mb-1.5 text-stone-800">
                          {searchQuery || filterStatus !== 'all' || dateFrom || dateTo
                            ? 'Không tìm thấy đơn đặt vé'
                            : 'Chưa có đơn đặt vé nào'}
                        </p>
                        <p className="text-xs text-stone-400 mb-4 leading-relaxed max-w-xs">
                          {searchQuery || filterStatus !== 'all' || dateFrom || dateTo
                            ? 'Bộ lọc hiện tại không khớp với đơn nào. Hãy thử thay đổi tiêu chí tìm kiếm.'
                            : 'Chưa có đơn đặt vé nào trong hệ thống. Các đơn mới sẽ xuất hiện tại đây sau khi khách hàng đặt vé.'}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          {(searchQuery || filterStatus !== 'all' || dateFrom || dateTo) && (
                            <button
                              onClick={() => {
                                handleFilterChange('', 'all');
                                setDateFrom('');
                                setDateTo('');
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl transition-all shadow-glow-red hover:shadow-none"
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
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((booking, i) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {booking.id}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-stone-900 text-sm">{booking.userName}</div>
                      <div className="text-xs text-stone-400">Ghế {booking.seat}</div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <div className="font-semibold text-stone-900 text-sm">{booking.flightNo}</div>
                      <div className="text-xs text-stone-500">
                        {booking.route} · {booking.date}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                        {booking.payMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`font-bold text-sm ${booking.status === 'cancelled' ? 'text-stone-400 line-through' : 'text-stone-900'}`}
                      >
                        {booking.amount.toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <select
                        value={booking.status}
                        onChange={(e) =>
                          handleStatusChange(booking.id, e.target.value as BookingStatus)
                        }
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_MAP[booking.status].cls}`}
                      >
                        <option value="confirmed">Xác nhận</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Huỷ</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-stone-400">{booking.createdAt}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-stone-50 border-t border-stone-200">
                <td colSpan={4} className="px-4 py-2.5 text-sm font-bold text-stone-700">
                  Tổng ({sorted.filter((b) => b.status !== 'cancelled').length} đơn hợp lệ)
                </td>
                <td className="px-4 py-2.5 text-right font-black text-primary text-sm">
                  {totalAmount.toLocaleString('vi-VN')}₫
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination footer */}
        {sorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 border-t border-stone-100 bg-stone-50/50 gap-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-stone-400 font-medium">
                {sorted.length > pageSize
                  ? `Hiển thị ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} / ${sorted.length} đơn`
                  : `${sorted.length} đơn`}
              </p>
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
                  <option value={5}>5</option>
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
                onPageChange={handlePageChange}
                siblingCount={1}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
