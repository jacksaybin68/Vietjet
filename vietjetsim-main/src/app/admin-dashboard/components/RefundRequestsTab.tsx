'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination from '@/components/ui/Pagination';

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
  warning: (title: string, message?: string, options?: object) => void;
  info: (title: string, message?: string, options?: object) => void;
}

type RefundStatus = 'pending' | 'approved' | 'rejected';

interface RefundRequest {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  flightNo: string;
  route: string;
  flightDate: string;
  amount: number;
  reason: string;
  note: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: RefundStatus;
  adminNote: string;
  createdAt: string;
  processedAt?: string;
}

const STATUS_MAP: Record<RefundStatus, { label: string; cls: string; icon: string }> = {
  pending: {
    label: 'Chờ duyệt',
    cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    icon: 'ClockIcon',
  },
  approved: {
    label: 'Đã duyệt',
    cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    icon: 'CheckCircleIcon',
  },
  rejected: {
    label: 'Từ chối',
    cls: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    icon: 'XCircleIcon',
  },
};

const PAGE_SIZE = 5;

export default function RefundRequestsTab({ onToast }: { onToast?: ToastAPI }) {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | RefundStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<RefundRequest | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapRow = (row: any): RefundRequest => ({
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    userName:
      row.user_profiles?.full_name || row.user_profiles?.email?.split('@')[0] || 'Khách hàng',
    userEmail: row.user_profiles?.email || '',
    flightNo: row.flight_no || '',
    route: row.route || '',
    flightDate: row.flight_date || '',
    amount: row.amount || 0,
    reason: row.reason || '',
    note: row.note || '',
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    accountHolder: row.account_holder || '',
    status: (row.status as RefundStatus) || 'pending',
    adminNote: row.admin_note || '',
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    processedAt: row.processed_at
      ? new Date(row.processed_at).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : undefined,
  });

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/refunds', {
        credentials: 'include',
      });
      const result = await res.json();
      if (!res.ok) {
        console.error('Load refund requests error:', result.error);
        setError(result.error || 'Không thể tải dữ liệu');
        return;
      }
      setRequests((result.refunds || []).map(mapRow));
    } catch (e: any) {
      console.error('Load refund requests error:', e);
      setError('Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    // Poll for changes every 10 seconds
    pollingRef.current = setInterval(loadRequests, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadRequests]);

  const filtered = requests.filter((r) => {
    const matchSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.route.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openModal = (request: RefundRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setModalAction(action);
    setAdminNote('');
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalAction(null);
    setAdminNote('');
  };

  const handleConfirm = async () => {
    if (!selectedRequest || !modalAction) return;
    setProcessingId(selectedRequest.id);
    try {
      const newStatus = modalAction === 'approve' ? 'approved' : 'rejected';
      const res = await fetch(`/api/admin/refunds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          refund_id: selectedRequest.id,
          status: newStatus,
          admin_note: adminNote.trim() || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        console.error('Update refund error:', result.error);
        onToast?.error('Lỗi xử lý', 'Không thể cập nhật trạng thái hoàn tiền. Vui lòng thử lại.');
        return;
      }
      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? {
                ...r,
                status: newStatus as RefundStatus,
                processedAt: new Date().toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                adminNote: adminNote.trim(),
              }
            : r
        )
      );
      if (modalAction === 'approve') {
        onToast?.success(
          'Đã duyệt hoàn tiền',
          `Yêu cầu #${selectedRequest.bookingId} của ${selectedRequest.userName} đã được chấp thuận.`
        );
      } else {
        onToast?.warning(
          'Đã từ chối hoàn tiền',
          `Yêu cầu #${selectedRequest.bookingId} của ${selectedRequest.userName} đã bị từ chối.`
        );
      }
      closeModal();
    } catch (e) {
      console.error('Update refund error:', e);
      onToast?.error('Lỗi hệ thống', 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const totalRefundAmount = requests
    .filter((r) => r.status === 'approved')
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Icon name="BanknotesIcon" size={24} className="text-rose-400" />
            Duyệt phiếu hoàn tiền
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            {requests.length} yêu cầu hoàn tiền tổng cộng
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              {pendingCount} chờ xử lý
            </div>
          )}
          <button
            onClick={loadRequests}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
            title="Tải lại"
          >
            <Icon name="ArrowPathIcon" size={18} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all group">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition-colors">
            Tổng yêu cầu
          </p>
          <p className="text-3xl font-black text-white tabular-nums tracking-tighter">
            {requests.length}
          </p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-5 hover:border-amber-500/20 transition-all group">
          <p className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest mb-1">
            Đang chờ
          </p>
          <p className="text-3xl font-black text-amber-400 tabular-nums tracking-tighter">
            {pendingCount}
          </p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-5 hover:border-emerald-500/20 transition-all group">
          <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">
            Đã duyệt
          </p>
          <p className="text-3xl font-black text-emerald-400 tabular-nums tracking-tighter">
            {approvedCount}
          </p>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-5 hover:border-rose-500/20 transition-all group overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1">
              Đã hoàn tiền
            </p>
            <p className="text-2xl font-black text-white tabular-nums tracking-tighter mt-1">
              {totalRefundAmount.toLocaleString('vi-VN')}₫
            </p>
          </div>
          <Icon
            name="CurrencyDollarIcon"
            size={64}
            className="absolute -right-4 -bottom-4 text-rose-500/5 rotate-12"
          />
        </div>
      </div>

      <div className="flex flex-col lg:row gap-4">
        <div className="relative flex-1 group">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-400 transition-colors"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm mã phiếu, mã đặt chỗ, tên khách hàng..."
            className="w-full pl-12 pr-4 py-3 bg-slate-800/40 border border-white/5 rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/50 transition-all focus:bg-slate-800/60"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as 'all' | RefundStatus);
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-slate-800/40 border border-white/5 rounded-2xl text-sm font-bold text-slate-300 focus:outline-none focus:border-rose-500/50 appearance-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
          {(searchQuery || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setCurrentPage(1);
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-all px-4 py-3 rounded-2xl border border-white/5 hover:border-rose-500/20"
            >
              <Icon name="XMarkIcon" size={14} />
              Xoá bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                  Mã phiếu
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden sm:table-cell whitespace-nowrap">
                  Chuyến bay
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden md:table-cell">
                  Lý do
                </th>
                <th className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                  Số tiền
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-stone-50 animate-pulse">
                    <td className="px-4 py-2.5">
                      <div className="h-4 w-16 bg-stone-200 rounded-full" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-4 w-28 bg-stone-200 rounded-full mb-1.5" />
                      <div className="h-3 w-20 bg-stone-100 rounded-full" />
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <div className="h-4 w-16 bg-stone-200 rounded-full mb-1.5" />
                      <div className="h-3 w-24 bg-stone-100 rounded-full" />
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="h-4 w-40 bg-stone-100 rounded-full" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="h-4 w-20 bg-stone-200 rounded-full ml-auto" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="h-6 w-20 bg-stone-200 rounded-full mx-auto" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="h-6 w-28 bg-stone-100 rounded-full mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col sm:flex-row items-center gap-6 max-w-md mx-auto text-left animate-[fadeInUp_0.35s_ease-out]">
                      {/* Illustrated empty state */}
                      <div className="shrink-0 w-32 h-32 flex items-center justify-center">
                        <img
                          src="/assets/empty-refund-requests.svg"
                          alt="Không có yêu cầu hoàn tiền"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <p className="font-black text-base mb-1.5 text-stone-800">
                          {searchQuery || filterStatus !== 'all'
                            ? 'Không tìm thấy phiếu hoàn tiền'
                            : 'Chưa có yêu cầu hoàn tiền'}
                        </p>
                        <p className="text-xs text-stone-400 mb-4 leading-relaxed max-w-xs">
                          {searchQuery || filterStatus !== 'all'
                            ? 'Bộ lọc hiện tại không khớp với phiếu nào. Hãy thử thay đổi tiêu chí tìm kiếm.'
                            : 'Chưa có yêu cầu hoàn tiền nào từ khách hàng. Các phiếu mới sẽ xuất hiện tại đây khi được gửi.'}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          {(searchQuery || filterStatus !== 'all') && (
                            <button
                              onClick={() => {
                                setSearchQuery('');
                                setFilterStatus('all');
                                setCurrentPage(1);
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl transition-all shadow-glow-red hover:shadow-none"
                            >
                              <Icon name="ArrowPathIcon" size={13} />
                              Đặt lại bộ lọc
                            </button>
                          )}
                          <button
                            onClick={loadRequests}
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
                paginated.map((req, i) => (
                  <tr
                    key={req.id}
                    className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-mono font-bold text-xs text-stone-900">
                        {req.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">#{req.bookingId}</div>
                      <div className="text-xs text-stone-300 mt-0.5">{req.createdAt}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-stone-900 text-sm">{req.userName}</div>
                      <div className="text-xs text-stone-400">{req.userEmail}</div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <div className="font-semibold text-stone-900 text-sm">
                        {req.flightNo || '—'}
                      </div>
                      <div className="text-xs text-stone-500">
                        {req.route}
                        {req.flightDate ? ` · ${req.flightDate}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell max-w-[200px]">
                      <p className="text-xs text-stone-600 line-clamp-2">{req.reason}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-black text-sm text-stone-900">
                        {req.amount > 0 ? req.amount.toLocaleString('vi-VN') + '₫' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_MAP[req.status].cls}`}
                      >
                        <Icon name={STATUS_MAP[req.status].icon as any} size={10} />
                        {STATUS_MAP[req.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openModal(req, 'approve')}
                            disabled={processingId === req.id}
                            className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded-md transition-all disabled:opacity-50"
                          >
                            <Icon name="CheckIcon" size={11} />
                            Duyệt
                          </button>
                          <button
                            onClick={() => openModal(req, 'reject')}
                            disabled={processingId === req.id}
                            className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-md transition-all disabled:opacity-50"
                          >
                            <Icon name="XMarkIcon" size={11} />
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-xs text-stone-400">{req.processedAt}</div>
                          {req.adminNote && (
                            <div
                              className="text-xs text-stone-500 mt-0.5 max-w-[140px] mx-auto line-clamp-1"
                              title={req.adminNote}
                            >
                              {req.adminNote}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 border-t border-stone-100 bg-stone-50/50 gap-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-stone-400 font-medium">
                {filtered.length > pageSize
                  ? `Hiển thị ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} / ${filtered.length} phiếu`
                  : `${filtered.length} phiếu`}
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

      {/* Approve / Reject Confirmation Modal */}
      {selectedRequest && modalAction && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div
              className={`px-8 py-8 border-b border-white/5 flex items-center gap-4 ${modalAction === 'approve' ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${modalAction === 'approve' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
              >
                <Icon
                  name={modalAction === 'approve' ? 'CheckCircleIcon' : 'XCircleIcon'}
                  size={24}
                />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {modalAction === 'approve' ? 'Duyệt hoàn tiền' : 'Từ chối hoàn tiền'}
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                  #{selectedRequest.id.slice(0, 8)} • {selectedRequest.userName}
                </p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60 mb-2">
                  Lời nhắn Admin
                </p>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    modalAction === 'approve'
                      ? 'Ví dụ: Đã đủ điều kiện. Chấp thuận hoàn trả.'
                      : 'Ví dụ: Không đúng chính sách hoàn tiền.'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-white/20 h-24 resize-none transition-all"
                />
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-3 items-center">
                <Icon name="InformationCircleIcon" size={18} className="text-slate-400 shrink-0" />
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                  {modalAction === 'approve'
                    ? 'Số tiền sẽ được chuyển trả về tài khoản đã cung cấp.'
                    : 'Quyết định này sẽ được gửi tới khách hàng.'}
                </p>
              </div>
            </div>

            <div className="p-8 flex gap-3 border-t border-white/5">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Huỷ bỏ
              </button>
              <button
                onClick={handleConfirm}
                disabled={processingId !== null}
                className={`flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 text-white ${modalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'}`}
              >
                {processingId ? 'Đang xử lý...' : 'Xác nhận ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Detail View Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
            style={{
              background:
                'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div className="px-8 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/10">
                  <Icon name="BanknotesIcon" size={28} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Chi tiết yêu cầu
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Phiếu:{' '}
                      <span className="text-rose-400 font-mono tracking-normal">
                        #{viewingRequest.id.slice(0, 8)}
                      </span>
                    </span>
                    <span className="text-slate-700 px-1">•</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${STATUS_MAP[viewingRequest.status].cls}`}
                    >
                      {STATUS_MAP[viewingRequest.status].label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingRequest(null)}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-white/5"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <div className="p-8 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Column: Customer & Case */}
                <div className="space-y-8">
                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">
                      Thông tin khách hàng
                    </label>
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-black text-lg border border-white/10">
                        {viewingRequest.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{viewingRequest.userName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                          {viewingRequest.userEmail}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">
                      Nội dung hoàn tiền
                    </label>
                    <div className="space-y-4">
                      <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">
                          Lý do chính thức
                        </p>
                        <p className="text-xs font-bold text-slate-300 leading-relaxed italic">
                          &ldquo;{viewingRequest.reason}&rdquo;
                        </p>
                        {viewingRequest.note && (
                          <p className="text-[11px] text-slate-500 mt-3 border-t border-white/5 pt-3 leading-relaxed">
                            {viewingRequest.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column: Financial & Flight */}
                <div className="space-y-8">
                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">
                      Chuyến bay liên quan
                    </label>
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Icon name="PaperAirplaneIcon" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-200">
                          #{viewingRequest.bookingId} · {viewingRequest.flightNo}
                        </p>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">
                          {viewingRequest.route}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">
                      Tài khoản nhận tiền
                    </label>
                    <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Ngân hàng
                        </span>
                        <span className="text-xs font-bold text-white">
                          {viewingRequest.bankName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Số tài khoản
                        </span>
                        <span className="text-sm font-mono font-bold text-rose-400 whitespace-nowrap">
                          {viewingRequest.accountNumber}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Chủ tài khoản
                        </span>
                        <span className="text-xs font-bold text-white uppercase">
                          {viewingRequest.accountHolder}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Refund Value Section */}
              <div className="mt-8 bg-slate-950/40 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-all duration-1000" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 text-center md:text-left">
                    Giá trị hoàn trả
                  </p>
                  <p className="text-4xl font-black text-white tabular-nums tracking-tighter text-center md:text-left">
                    {viewingRequest.amount.toLocaleString('vi-VN')}₫
                  </p>
                </div>
                <div className="relative z-10 w-full md:w-auto h-[1px] md:h-12 md:w-[1px] bg-white/10" />
                <div className="relative z-10 flex flex-col items-center md:items-end">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                    Ngày yêu cầu
                  </p>
                  <p className="text-sm font-bold text-slate-300">
                    {viewingRequest.createdAt.split(',')[0]}
                  </p>
                  <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                    {viewingRequest.createdAt.split(',')[1]}
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Note if processed */}
            {viewingRequest.status !== 'pending' && viewingRequest.adminNote && (
              <div className="px-8 pt-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Ghi chú quản trị
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    &ldquo;{viewingRequest.adminNote}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="p-8 flex flex-col sm:flex-row gap-4">
              {viewingRequest.status === 'pending' ? (
                <>
                  <button
                    onClick={() => openModal(viewingRequest, 'approve')}
                    className="flex-1 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    Duyệt hoàn tiền
                  </button>
                  <button
                    onClick={() => openModal(viewingRequest, 'reject')}
                    className="flex-1 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                  >
                    Từ chối yêu cầu
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setViewingRequest(null)}
                  className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Đóng cửa sổ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
