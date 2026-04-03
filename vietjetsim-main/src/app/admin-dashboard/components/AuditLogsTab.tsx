'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination from '@/components/ui/Pagination';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
}

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
}

const PAGE_SIZE = 20;

const ACTION_COLORS: Record<string, { label: string; color: string; bgColor: string }> = {
  create: { label: 'Tạo mới', color: 'text-green-700', bgColor: 'bg-green-100' },
  update: { label: 'Cập nhật', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  delete: { label: 'Xoá', color: 'text-red-700', bgColor: 'bg-red-100' },
  login: { label: 'Đăng nhập', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  logout: { label: 'Đăng xuất', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  approve: { label: 'Duyệt', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  reject: { label: 'Từ chối', color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

export default function AuditLogsTab({ onToast }: { onToast?: ToastAPI }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setHasError(false);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (searchQuery) params.append('q', searchQuery);
      if (actionFilter) params.append('action', actionFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await fetch(`/api/admin/audit-logs?${params}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalCount(data.pagination?.total || 0);
        setCurrentPage(page);
        if (data.filters?.actions) {
          setAvailableActions(data.filters.actions);
        }
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (page: number) => {
    fetchLogs(page);
  };

  const handleExportCSV = () => {
    const headers = ['Thời gian', 'Hành động', 'Tài nguyên', 'Người dùng', 'Email', 'IP'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString('vi-VN'),
      log.action,
      log.resource,
      log.user_name || 'N/A',
      log.user_email || 'N/A',
      log.ip_address || 'N/A',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    onToast?.success('Xuất thành công', 'Dữ liệu đã được xuất ra file CSV.');
  };

  const getActionConfig = (action: string) => {
    const actionType = action.split('.')[1] || action;
    return ACTION_COLORS[actionType] || ACTION_COLORS.update;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-stone-900">Nhật ký hoạt động</h2>
          <p className="text-sm text-stone-400">{totalCount} bản ghi trong hệ thống</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="ArrowDownTrayIcon" size={16} />
          Xuất CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
            placeholder="Tìm kiếm hành động, tài nguyên..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input min-w-[150px]"
        >
          <option value="">Tất cả hành động</option>
          {availableActions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>

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
              className="pl-8 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input w-36"
              title="Từ ngày"
            />
          </div>
          <span className="text-stone-400 text-sm">–</span>
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
              className="pl-8 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input w-36"
              title="Đến ngày"
            />
          </div>
        </div>

        {(searchQuery || actionFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setActionFilter('');
              setDateFrom('');
              setDateTo('');
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-red-500 transition-colors px-3 py-2.5 rounded-xl border border-stone-200 hover:border-red-200 hover:bg-red-50"
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
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Thời gian
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Hành động
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Tài nguyên
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Người dùng
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-stone-50 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 w-32 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="h-6 w-20 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-24 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-28 bg-stone-200 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="h-6 w-8 bg-stone-200 rounded mx-auto" /></td>
                    </tr>
                  ))}
                </>
              ) : hasError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="ExclamationTriangleIcon" size={32} className="text-red-400" />
                      <p className="font-bold text-stone-700">Không thể tải dữ liệu</p>
                      <button onClick={() => fetchLogs(1)} className="text-xs font-semibold text-primary">
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="ClipboardDocumentListIcon" size={32} className="text-stone-300" />
                      <p className="font-bold text-stone-700">Không có nhật ký nào</p>
                      <p className="text-xs text-stone-400">Các hoạt động sẽ được ghi lại tại đây</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const actionConfig = getActionConfig(log.action);
                  const isExpanded = expandedLog === log.id;
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`border-b border-stone-50 hover:bg-stone-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}>
                        <td className="px-4 py-3">
                          <span className="text-xs text-stone-600 font-medium">
                            {formatDate(log.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${actionConfig.bgColor} ${actionConfig.color}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-stone-600">
                            {log.resource}
                            {log.resource_id && (
                              <span className="text-stone-400 ml-1">#{log.resource_id.slice(0, 8)}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div>
                            <p className="text-xs font-medium text-stone-700">
                              {log.user_name || 'Hệ thống'}
                            </p>
                            {log.user_email && (
                              <p className="text-[11px] text-stone-400">{log.user_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="w-7 h-7 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg flex items-center justify-center transition-colors"
                            title={isExpanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                          >
                            <Icon name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={14} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="bg-white rounded-lg p-4 border border-stone-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <p className="text-stone-400 font-medium mb-1">ID bản ghi</p>
                                  <p className="font-mono text-stone-700">{log.id}</p>
                                </div>
                                {log.resource_id && (
                                  <div>
                                    <p className="text-stone-400 font-medium mb-1">ID tài nguyên</p>
                                    <p className="font-mono text-stone-700">{log.resource_id}</p>
                                  </div>
                                )}
                                {log.ip_address && (
                                  <div>
                                    <p className="text-stone-400 font-medium mb-1">Địa chỉ IP</p>
                                    <p className="font-mono text-stone-700">{log.ip_address}</p>
                                  </div>
                                )}
                                {log.user_role && (
                                  <div>
                                    <p className="text-stone-400 font-medium mb-1">Vai trò</p>
                                    <p className="text-stone-700">{log.user_role}</p>
                                  </div>
                                )}
                              </div>
                              {log.details && (
                                <div className="mt-3 pt-3 border-t border-stone-100">
                                  <p className="text-stone-400 font-medium mb-1">Chi tiết</p>
                                  <pre className="text-xs text-stone-600 bg-slate-100 rounded p-2 overflow-x-auto">
                                    {typeof log.details === 'string' 
                                      ? log.details 
                                      : JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.user_agent && (
                                <div className="mt-3 pt-3 border-t border-stone-100">
                                  <p className="text-stone-400 font-medium mb-1">User Agent</p>
                                  <p className="text-xs text-stone-500 truncate">{log.user_agent}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
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
    </div>
  );
}
