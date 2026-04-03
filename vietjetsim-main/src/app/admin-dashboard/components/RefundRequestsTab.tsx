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
    cls: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: 'ClockIcon',
  },
  approved: {
    label: 'Đã duyệt',
    cls: 'bg-green-50 text-green-700 border border-green-200',
    icon: 'CheckCircleIcon',
  },
  rejected: {
    label: 'Từ chối',
    cls: 'bg-red-50 text-red-700 border border-red-200',
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-stone-900">Duyệt phiếu hoàn tiền</h2>
          <p className="text-sm text-stone-400">{requests.length} yêu cầu hoàn tiền tổng cộng</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-xl">
              <Icon name="ClockIcon" size={13} />
              {pendingCount} chờ xử lý
            </div>
          )}
          <button
            onClick={loadRequests}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-primary border border-stone-200 hover:border-primary px-3 py-1.5 rounded-xl transition-all"
            title="Tải lại"
          >
            <Icon name="ArrowPathIcon" size={13} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Icon name="ExclamationTriangleIcon" size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={loadRequests}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-100 text-stone-700 rounded-xl px-4 py-3 hover:-translate-y-1 hover:shadow-vj-sm transition-all duration-200 cursor-default">
          <div className="text-2xl font-black">{requests.length}</div>
          <div className="text-xs font-medium mt-0.5 opacity-70">Tổng yêu cầu</div>
        </div>
        <div className="bg-amber-50 text-amber-700 rounded-xl px-4 py-3 hover:-translate-y-1 hover:shadow-vj-sm transition-all duration-200 cursor-default">
          <div className="text-2xl font-black">{pendingCount}</div>
          <div className="text-xs font-medium mt-0.5 opacity-70">Chờ duyệt</div>
        </div>
        <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 hover:-translate-y-1 hover:shadow-vj-sm transition-all duration-200 cursor-default">
          <div className="text-2xl font-black">{approvedCount}</div>
          <div className="text-xs font-medium mt-0.5 opacity-70">Đã duyệt</div>
        </div>
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 hover:-translate-y-1 hover:shadow-vj-sm transition-all duration-200 cursor-default">
          <div className="text-2xl font-black">{rejectedCount}</div>
          <div className="text-xs font-medium mt-0.5 opacity-70">Từ chối</div>
        </div>
      </div>

      {/* Total approved amount */}
      {approvedCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon name="BanknotesIcon" size={18} className="text-green-600" />
          </div>
          <div>
            <div className="text-xs text-green-600 font-medium">Tổng tiền đã hoàn</div>
            <div className="text-lg font-black text-green-700">
              {totalRefundAmount.toLocaleString('vi-VN')}₫
            </div>
          </div>
        </div>
      )}

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
            placeholder="Tìm mã phiếu, mã đặt chỗ, tên khách hàng..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as 'all' | RefundStatus);
            setCurrentPage(1);
          }}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
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
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-red-500 transition-colors px-3 py-2.5 rounded-xl border border-stone-200 hover:border-red-200 hover:bg-red-50 whitespace-nowrap"
          >
            <Icon name="XMarkIcon" size={13} />
            Xoá bộ lọc
          </button>
        )}
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

      {/* Approve / Reject Modal */}
      {selectedRequest && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[fadeInUp_0.25s_ease-out]">
            {/* Modal header */}
            <div
              className={`px-6 py-4 rounded-t-2xl flex items-center gap-3 ${modalAction === 'approve' ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalAction === 'approve' ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <Icon
                  name={modalAction === 'approve' ? 'CheckCircleIcon' : 'XCircleIcon'}
                  size={22}
                  className={modalAction === 'approve' ? 'text-green-600' : 'text-red-600'}
                />
              </div>
              <div>
                <h3
                  className={`font-bold text-base ${modalAction === 'approve' ? 'text-green-800' : 'text-red-800'}`}
                >
                  {modalAction === 'approve' ? 'Duyệt phiếu hoàn tiền' : 'Từ chối phiếu hoàn tiền'}
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedRequest.userName} · #{selectedRequest.bookingId}
                </p>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 space-y-4">
              {/* Refund info */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-500">Mã đặt chỗ</span>
                  <span className="font-mono font-bold text-sm text-stone-900">
                    {selectedRequest.bookingId}
                  </span>
                </div>
                {selectedRequest.flightNo && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500">Chuyến bay</span>
                    <span className="text-sm font-semibold text-stone-700">
                      {selectedRequest.flightNo} · {selectedRequest.route}
                    </span>
                  </div>
                )}
                {selectedRequest.amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500">Số tiền hoàn</span>
                    <span className="font-black text-base text-primary">
                      {selectedRequest.amount.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                )}
                {selectedRequest.bankName && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500">Ngân hàng</span>
                    <span className="text-sm text-stone-700">
                      {selectedRequest.bankName} · {selectedRequest.accountNumber}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-xs text-stone-500 block mb-1">Lý do khách hàng</span>
                  <p className="text-sm text-stone-700 italic">
                    &ldquo;{selectedRequest.reason}&rdquo;
                  </p>
                  {selectedRequest.note && (
                    <p className="text-xs text-stone-500 mt-1">{selectedRequest.note}</p>
                  )}
                </div>
              </div>

              {/* Admin note */}
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1.5">
                  Ghi chú của Admin <span className="text-stone-400 font-normal">(tuỳ chọn)</span>
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    modalAction === 'approve'
                      ? 'Ví dụ: Đã xác minh, chấp thuận hoàn tiền theo chính sách.'
                      : 'Ví dụ: Không đủ điều kiện hoàn tiền theo điều khoản vé.'
                  }
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm resize-none focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Warning */}
              <div
                className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${modalAction === 'approve' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}
              >
                <Icon name="InformationCircleIcon" size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  {modalAction === 'approve'
                    ? 'Sau khi duyệt, hệ thống sẽ gửi thông báo và xử lý hoàn tiền về tài khoản khách hàng trong 3–5 ngày làm việc.'
                    : 'Sau khi từ chối, khách hàng sẽ nhận được thông báo về quyết định này.'}
                </span>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-all"
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirm}
                disabled={processingId !== null}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60 ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 shadow-sm'
                    : 'bg-red-600 hover:bg-red-700 shadow-sm'
                }`}
              >
                {processingId ? (
                  <>
                    <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Icon name={modalAction === 'approve' ? 'CheckIcon' : 'XMarkIcon'} size={14} />
                    {modalAction === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
