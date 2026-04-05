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
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Booking>>({});
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    method: 'bank',
    amount: 0,
    status: 'completed'
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const retryLoad = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => setIsLoading(false), 50);
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

  const handleSaveEdit = () => {
    if (selectedBooking && editForm) {
      setBookings((prev) =>
        prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...editForm } as Booking : b))
      );
      setSelectedBooking({ ...selectedBooking, ...editForm } as Booking);
      setIsEditing(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedBooking) return;
    setIsProcessingInvoice(true);
    try {
      const res = await fetch('/api/admin/bookings/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          amount: invoiceForm.amount || selectedBooking.amount,
          method: invoiceForm.method,
          status: invoiceForm.status
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update local state
        const newStatus = invoiceForm.status === 'completed' ? 'confirmed' : selectedBooking.status;
        setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: newStatus as BookingStatus, payMethod: invoiceForm.method } : b));
        setSelectedBooking(prev => prev ? { ...prev, status: newStatus as BookingStatus, payMethod: invoiceForm.method } : null);
        setShowInvoiceModal(false);
        // Assuming toast is available via props if integrated like other tabs, but BookingsTab doesn't have it in props yet.
        // For consistency with other parts of the app:
        alert('Tạo hóa đơn & Xác nhận thành công!');
      } else {
        alert('Lỗi: ' + data.message);
      }
    } catch (error) {
      alert('Lỗi kết nối hệ thống');
    } finally {
      setIsProcessingInvoice(false);
    }
  };

  const printSingleInvoice = (booking: Booking) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn ${booking.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #D0021B; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { color: #D0021B; font-size: 24px; font-weight: 900; }
            .invoice-title { font-size: 20px; font-weight: bold; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
            .value { font-weight: bold; font-size: 16px; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; pt: 20px; text-align: center; color: #999; font-size: 12px; }
            .amount { font-size: 24px; color: #D0021B; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">VIETJET SIM</div>
            <div class="invoice-title">HÓA ĐƠN ĐẶT VÉ</div>
          </div>
          <div class="grid">
            <div>
              <div class="label">Mã đặt chỗ</div>
              <div class="value">${booking.id}</div>
            </div>
            <div>
              <div class="label">Ngày đặt</div>
              <div class="value">${booking.createdAt}</div>
            </div>
            <div>
              <div class="label">Khách hàng</div>
              <div class="value">${booking.userName}</div>
            </div>
            <div>
              <div class="label">Chuyến bay</div>
              <div class="value">${booking.flightNo} (${booking.route})</div>
            </div>
            <div>
              <div class="label">Hình thức thanh toán</div>
              <div class="value">${booking.payMethod}</div>
            </div>
            <div>
              <div class="label">Trạng thái</div>
              <div class="value">${STATUS_MAP[booking.status].label}</div>
            </div>
          </div>
          <div style="text-align: right; margin-top: 40px;">
            <div class="label">Tổng tiền (VNĐ)</div>
            <div class="amount">${booking.amount.toLocaleString('vi-VN')} ₫</div>
          </div>
          <div class="footer">
            Cảm ơn bạn đã sử dụng dịch vụ của VietjetSim. Liên hệ 1900 xxxx để được hỗ trợ.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Icon name="TicketIcon" size={24} className="text-indigo-400" />
            Quản lý đặt vé
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            {bookings.length} đơn đặt vé tổng cộng trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl transition-all hover:translate-y-[-1px] active:scale-95"
              >
                <Icon name="TableCellsIcon" size={14} />
                Xuất CSV
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl transition-all hover:translate-y-[-1px] active:scale-95"
              >
                <Icon name="DocumentArrowDownIcon" size={14} />
                Xuất PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đơn', value: bookings.length, color: 'from-slate-700/50 to-slate-800/50 text-white border-white/5 shadow-lg' },
          {
            label: 'Xác nhận',
            value: bookings.filter((b) => b.status === 'confirmed').length,
            color: 'from-emerald-500/10 to-emerald-600/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
          },
          {
            label: 'Chờ duyệt',
            value: bookings.filter((b) => b.status === 'pending').length,
            color: 'from-amber-500/10 to-amber-600/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
          },
          {
            label: 'Đã huỷ',
            value: bookings.filter((b) => b.status === 'cancelled').length,
            color: 'from-rose-500/10 to-rose-600/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-5 transition-all duration-300 hover:translate-y-[-2px] group relative overflow-hidden`}
          >
            <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="text-3xl font-black tracking-tighter relative z-10">{stat.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 opacity-60 relative z-10">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 group">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
            placeholder="Tìm mã đặt chỗ, khách hàng, hành trình..."
            className="w-full pl-12 pr-4 py-3 bg-slate-800/40 border border-white/5 rounded-2xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all focus:bg-slate-800/60"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-800/40 border border-white/5 rounded-2xl p-1 gap-1">
            <div className="relative">
              <Icon
                name="CalendarDaysIcon"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-2 bg-transparent border-none rounded-xl text-xs font-bold text-slate-300 focus:ring-0 w-36 uppercase"
                title="Từ ngày"
              />
            </div>
            <span className="text-slate-600 px-1 font-bold">→</span>
            <div className="relative">
              <Icon
                name="CalendarDaysIcon"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-2 bg-transparent border-none rounded-xl text-xs font-bold text-slate-300 focus:ring-0 w-36 uppercase"
                title="Đến ngày"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => handleFilterChange(searchQuery, e.target.value as 'all' | BookingStatus)}
            className="px-4 py-3 bg-slate-800/40 border border-white/5 rounded-2xl text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500/50 appearance-none min-w-[140px] transition-all"
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
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-2xl transition-all hover:bg-rose-500/20"
            >
              <Icon name="XMarkIcon" size={14} />
              Xoá bộ lọc
            </button>
          )}
        </div>
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
                <th
                  className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('id')}
                >
                  Mã đặt chỗ
                  <SortIcon col="id" />
                </th>
                <th
                  className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('userName')}
                >
                  Khách hàng
                  <SortIcon col="userName" />
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 hidden sm:table-cell">
                  Chuyến bay
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 hidden md:table-cell">
                  Thanh toán
                </th>
                <th
                  className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('amount')}
                >
                  Giá trị
                  <SortIcon col="amount" />
                </th>
                <th
                  className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('status')}
                >
                  Trạng thái
                  <SortIcon col="status" />
                </th>
                <th
                  className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 hidden lg:table-cell cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
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
                    <tr key={i} className="border-b border-white/5 animate-pulse">
                      <td className="px-6 py-5">
                        <div className="h-4 w-20 bg-slate-700/50 rounded-full" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-28 bg-slate-700/50 rounded-full mb-2" />
                        <div className="h-3 w-12 bg-slate-800/50 rounded-full" />
                      </td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <div className="h-4 w-16 bg-slate-700/50 rounded-full mb-2" />
                        <div className="h-3 w-28 bg-slate-800/50 rounded-full" />
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <div className="h-5 w-20 bg-slate-800/50 rounded-full" />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="h-4 w-20 bg-slate-700/50 rounded-full ml-auto" />
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="h-7 w-24 bg-slate-700/50 rounded-lg mx-auto" />
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <div className="h-3 w-28 bg-slate-800/50 rounded-full" />
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
                    onClick={() => {
                      setSelectedBooking(booking);
                      setIsEditing(false);
                      setEditForm({});
                    }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.05] transition-all group cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <span className="font-mono font-bold text-sm text-indigo-400">
                        {booking.id}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{booking.userName}</div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Ghế {booking.seat}</div>
                    </td>
                    <td className="px-6 py-5 hidden sm:table-cell">
                      <div className="font-bold text-slate-300 text-sm">{booking.flightNo}</div>
                      <div className="text-[10px] font-bold text-slate-500 tracking-wider">
                        {booking.route} · {booking.date}
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                        {booking.payMethod}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span
                        className={`font-black text-sm tracking-tight ${booking.status === 'cancelled' ? 'text-slate-600 line-through' : 'text-white'}`}
                      >
                        {booking.amount.toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <select
                        value={booking.status}
                        onChange={(e) =>
                          handleStatusChange(booking.id, e.target.value as BookingStatus)
                        }
                        className={`text-[10px] font-black px-3 py-1 rounded-lg border-0 cursor-pointer appearance-none text-center uppercase tracking-wider transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                          booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 focus:ring-emerald-500/50' : 
                          booking.status === 'pending' ? 'bg-amber-500/10 text-amber-400 focus:ring-amber-500/50' : 
                          booking.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 focus:ring-rose-500/50' : 
                          'bg-sky-500/10 text-sky-400 focus:ring-sky-500/50'
                        }`}
                        style={{ border: '1px solid currentColor' }}
                      >
                        <option value="confirmed" className="bg-slate-800 text-emerald-400">Xác nhận</option>
                        <option value="pending" className="bg-slate-800 text-amber-400">Chờ duyệt</option>
                        <option value="completed" className="bg-slate-800 text-sky-400">Hoàn thành</option>
                        <option value="cancelled" className="bg-slate-800 text-rose-400">Huỷ</option>
                      </select>
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell text-right">
                      <span className="text-xs font-medium text-slate-500">{booking.createdAt}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-white/5 border-t border-white/5">
                <td colSpan={4} className="px-6 py-5 text-sm font-black text-slate-400 uppercase tracking-widest">
                  Tổng ({sorted.filter((b) => b.status !== 'cancelled').length} đơn hợp lệ)
                </td>
                <td className="px-6 py-5 text-right font-black text-rose-400 text-lg tracking-tight">
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

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div 
            className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
            style={{ 
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1)'
            }}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                  <Icon name="TicketIcon" size={24} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Chi tiết đặt vé</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Mã: <span className="text-indigo-400">{selectedBooking.id}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditForm({
                        userName: selectedBooking.userName,
                        seat: selectedBooking.seat,
                        route: selectedBooking.route,
                        flightNo: selectedBooking.flightNo,
                        amount: selectedBooking.amount,
                        payMethod: selectedBooking.payMethod,
                      });
                    }}
                    className="px-4 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-xl text-xs font-bold transition-all"
                  >
                    Chỉnh sửa
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-all"
                    >
                      Huỷ
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
                >
                  <Icon name="XMarkIcon" size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Guest & Flight */}
                <div className="space-y-6">
                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Thông tin khách hàng</label>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Tên khách hàng</label>
                            <input
                              type="text"
                              value={editForm.userName || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, userName: e.target.value }))}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs text-slate-400 block mb-1">Ghế</label>
                              <input
                                type="text"
                                value={editForm.seat || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, seat: e.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-500/20">
                              {selectedBooking.userName.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-200">{selectedBooking.userName}</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium tracking-tight">ID Người dùng</span>
                              <span className="text-slate-300 font-bold">#{selectedBooking.userId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium tracking-tight">Số ghế</span>
                              <span className="text-emerald-400 font-black px-2 py-0.5 bg-emerald-500/10 rounded-md">{selectedBooking.seat}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Hành trình</label>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Hành trình (VD: HAN → SGN)</label>
                            <input
                              type="text"
                              value={editForm.route || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, route: e.target.value }))}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Chuyến bay</label>
                            <input
                              type="text"
                              value={editForm.flightNo || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, flightNo: e.target.value }))}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-center">
                              <div className="text-lg font-black text-white">{selectedBooking.route.split(' → ')[0]}</div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Khởi hành</div>
                            </div>
                            <div className="flex-1 flex items-center justify-center px-4 relative">
                              <div className="h-[2px] w-full bg-indigo-500/20" />
                              <Icon name="PaperAirplaneIcon" size={14} className="absolute text-indigo-400 rotate-90" />
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-black text-white">{selectedBooking.route.split(' → ')[1] || ''}</div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Điểm đến</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <p className="text-slate-500 mb-0.5">Chuyến bay</p>
                              <p className="font-black text-indigo-300">{selectedBooking.flightNo}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-500 mb-0.5">Ngày khởi hành</p>
                              <p className="font-black text-slate-200">{selectedBooking.date}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Column: Payment & History */}
                <div className="space-y-6">
                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Thanh toán</label>
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 overflow-hidden relative group">
                      <div className="absolute top-[-20%] right-[-10%] w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                      {isEditing ? (
                        <div className="relative z-10 space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Số tiền (VND)</label>
                            <input
                              type="number"
                              value={editForm.amount || 0}
                              onChange={(e) => setEditForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Phương thức thanh toán</label>
                            <select
                              value={editForm.payMethod || 'Thẻ tín dụng'}
                              onChange={(e) => setEditForm(prev => ({ ...prev, payMethod: e.target.value }))}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            >
                              <option value="Thẻ tín dụng">Thẻ tín dụng</option>
                              <option value="Ngân hàng">Ngân hàng</option>
                              <option value="MoMo">MoMo</option>
                              <option value="ZaloPay">ZaloPay</option>
                              <option value="VNPay">VNPay</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                              <p className="text-xs font-bold text-slate-500 mb-1 tracking-tight">Tổng cộng cần thanh toán</p>
                              <p className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                {selectedBooking.amount.toLocaleString('vi-VN')}₫
                              </p>
                            </div>
                            <div className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                              {selectedBooking.payMethod}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 relative z-10">
                            <div className={`w-2 h-2 rounded-full ${selectedBooking.status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : selectedBooking.status === 'pending' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${selectedBooking.status === 'confirmed' ? 'text-emerald-400' : selectedBooking.status === 'pending' ? 'text-amber-400' : 'text-rose-400'}`}>
                              {STATUS_MAP[selectedBooking.status].label}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Lịch sử đơn hàng</label>
                    <div className="space-y-4">
                      {[
                        { time: selectedBooking.createdAt, event: 'Khách hàng đặt vé thành công', status: 'done' },
                        { time: '16/03/2026 21:05', event: 'Hệ thống xác nhận thanh toán', status: selectedBooking.status === 'confirmed' ? 'done' : 'pending' },
                        { time: 'Chờ xử lý', event: 'Gửi vé điện tử qua Email', status: 'next' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4 relative">
                          {idx !== 2 && <div className="absolute left-[7px] top-[18px] w-[2px] h-full bg-white/5" />}
                          <div className={`w-4 h-4 rounded-full mt-0.5 relative z-10 border-2 ${item.status === 'done' ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_#6366f1]' : item.status === 'pending' ? 'bg-slate-800 border-indigo-500/50' : 'bg-slate-800 border-slate-700'}`} />
                          <div>
                            <p className="text-[11px] font-bold text-slate-200">{item.event}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase mt-0.5 tracking-wider">{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-8 bg-white/5 border-t border-white/5 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-3">
                <button
                  onClick={() => printSingleInvoice(selectedBooking)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/10"
                >
                  <Icon name="PrinterIcon" size={16} />
                  In hoá đơn
                </button>
                {selectedBooking.status === 'pending' && (
                  <button 
                    onClick={() => {
                      setInvoiceForm({ ...invoiceForm, amount: selectedBooking.amount });
                      setShowInvoiceModal(true);
                    }}
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Icon name="CurrencyDollarIcon" size={16} />
                    Tạo hoá đơn thanh toán
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-90"
                >
                  {isEditing ? 'Huỷ chỉnh sửa' : 'Chỉnh sửa nhanh'}
                </button>
                <button 
                  onClick={() => {
                    if(confirm('Bạn có chắc muốn huỷ đơn đặt vé này?')) {
                      handleStatusChange(selectedBooking.id, 'cancelled');
                      setSelectedBooking(prev => prev ? {...prev, status: 'cancelled'} : null);
                    }
                  }}
                  disabled={selectedBooking.status === 'cancelled'}
                  className="w-12 h-12 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
                  title="Huỷ đơn"
                >
                  <Icon name="TrashIcon" size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Invoice Modal */}
      {showInvoiceModal && selectedBooking && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div 
            className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
          >
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="font-black uppercase tracking-widest text-xs text-white">Xử lý thanh toán</h3>
                <p className="text-[10px] font-bold text-indigo-400 mt-0.5">Booking ID: {selectedBooking.id}</p>
              </div>
              <button 
                onClick={() => setShowInvoiceModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center transition-colors"
                >
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Số tiền thanh toán</label>
                <div className="relative group">
                  <input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                    className="w-full pl-5 pr-14 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-base font-black text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">VNĐ</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Phương thức ghi nhận</label>
                <div className="relative group">
                  <select
                    value={invoiceForm.method}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, method: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-sm font-bold text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="bank">Chuyển khoản (Bank Transfer)</option>
                    <option value="cash">Tiền mặt (Direct Cash)</option>
                    <option value="wallet">Ví điện tử cá nhân</option>
                    <option value="other">Hệ thống đối tác</option>
                  </select>
                  <Icon name="ChevronDownIcon" size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="pt-4">
                <button
                  onClick={handleCreateInvoice}
                  disabled={isProcessingInvoice}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                >
                  {isProcessingInvoice ? (
                    <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                  ) : (
                    <Icon name="CheckCircleIcon" size={18} />
                  )}
                  {isProcessingInvoice ? 'Đang xác thực...' : 'Xác nhận đặt vé ngay'}
                </button>
                <p className="text-[10px] text-center text-slate-500 mt-6 leading-relaxed px-4 font-medium italic">
                  Thao tác này đồng nghĩa với việc bạn xác nhận đã nhận đủ số tiền và tự động thay đổi trạng thái Booking sang <strong>Confirmed</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
