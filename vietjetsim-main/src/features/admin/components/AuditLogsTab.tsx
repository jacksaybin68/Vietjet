'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/shared/components/ui';
import { Pagination } from '@/shared/components/ui';
import { listAuditLogs } from '@/features/admin';
import { AdminTabHeader, ADMIN_CARD_STYLE, ADMIN_ACTION_BTN } from './AdminSection';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  details: unknown;
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


const ACTION_COLORS: Record<string, { label: string; cls: string }> = {
  create: { label: 'Tạo mới', cls: 'bg-emerald-500/15 text-emerald-400' },
  update: { label: 'Cập nhật', cls: 'bg-blue-500/15 text-blue-400' },
  delete: { label: 'Xoá', cls: 'bg-red-500/15 text-red-400' },
  login: { label: 'Đăng nhập', cls: 'bg-blue-500/15 text-blue-400' },
  logout: { label: 'Đăng xuất', cls: 'bg-slate-500/15 text-slate-300' },
  approve: { label: 'Duyệt', cls: 'bg-emerald-500/15 text-emerald-400' },
  reject: { label: 'Từ chối', cls: 'bg-amber-500/15 text-amber-400' },
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

  const fetchLogs = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setHasError(false);

      try {
        const data = await listAuditLogs({
          page,
          limit: PAGE_SIZE,
          search: searchQuery || undefined,
          action: actionFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });

        setLogs((data.logs || []) as unknown as AuditLog[]);
        setTotalCount(data.pagination?.total || 0);
        setCurrentPage(page);
        if (data.filters?.actions) {
          setAvailableActions(data.filters.actions);
        }
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, actionFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (page: number) => {
    fetchLogs(page);
  };

  const handleExportCSV = () => {
    const headers = ['Thời gian', 'Hành động', 'Tài nguyên', 'Người dùng', 'Email', 'IP'];
    const rows = logs.map((log) => [
      new Date(log.created_at).toLocaleString('vi-VN'),
      log.action,
      log.resource,
      log.user_name || 'N/A',
      log.user_email || 'N/A',
      log.ip_address || 'N/A',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
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
      <AdminTabHeader
        icon="ClipboardDocumentListIcon"
        title="Nhật ký hoạt động"
        subtitle={`${totalCount} bản ghi trong hệ thống`}
        actions={
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className={`${ADMIN_ACTION_BTN} text-white bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Icon name="ArrowDownTrayIcon" size={14} />
            Xuất CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm kiếm hành động, tài nguyên..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50 min-w-[150px]"
        >
          <option value="">Tất cả hành động</option>
          {availableActions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon
              name="CalendarDaysIcon"
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white [color-scheme:dark] focus:outline-none focus:border-indigo-500/50 w-36"
              title="Từ ngày"
            />
          </div>
          <span className="text-slate-500 text-sm">–</span>
          <div className="relative">
            <Icon
              name="CalendarDaysIcon"
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white [color-scheme:dark] focus:outline-none focus:border-indigo-500/50 w-36"
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
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors px-3 py-2.5 rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/10"
          >
            <Icon name="XMarkIcon" size={13} />
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ ...ADMIN_CARD_STYLE, padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Thời gian
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Hành động
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4 hidden sm:table-cell">
                  Tài nguyên
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4 hidden md:table-cell">
                  Người dùng
                </th>
                <th className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-white/5 animate-pulse">
                      <td className="px-5 py-4">
                        <div className="h-4 w-32 bg-slate-500/10 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 w-20 bg-slate-500/10 rounded-full" />
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="h-4 w-24 bg-slate-500/10 rounded-full" />
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="h-4 w-28 bg-slate-500/10 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 w-8 bg-slate-500/10 rounded mx-auto" />
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
                        onClick={() => fetchLogs(1)}
                        className="text-xs font-semibold text-primary"
                      >
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="ClipboardDocumentListIcon" size={32} className="text-slate-600" />
                      <p className="font-bold text-white">Không có nhật ký nào</p>
                      <p className="text-xs text-slate-500">
                        Các hoạt động sẽ được ghi lại tại đây
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const actionConfig = getActionConfig(log.action);
                  const isExpanded = expandedLog === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-400 font-medium">
                            {formatDate(log.created_at)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={actionConfig.cls}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-xs text-slate-400">
                            {log.resource}
                            {log.resource_id && (
                              <span className="text-slate-500 ml-1">
                                #{log.resource_id.slice(0, 8)}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <div>
                            <p className="text-xs font-medium text-white">
                              {log.user_name || 'Hệ thống'}
                            </p>
                            {log.user_email && (
                              <p className="text-[11px] text-slate-500">{log.user_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="w-7 h-7 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg flex items-center justify-center transition-colors"
                            title={isExpanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                          >
                            <Icon
                              name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                              size={14}
                            />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-white/[0.03]">
                          <td colSpan={5} className="px-5 py-3">
                            <div className="rounded-lg p-4 border border-white/10 bg-slate-900/40">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">ID bản ghi</p>
                                  <p className="font-mono text-slate-300">{log.id}</p>
                                </div>
                                {log.resource_id && (
                                  <div>
                                    <p className="text-slate-500 font-medium mb-1">ID tài nguyên</p>
                                    <p className="font-mono text-slate-300">{log.resource_id}</p>
                                  </div>
                                )}
                                {log.ip_address && (
                                  <div>
                                    <p className="text-slate-500 font-medium mb-1">Địa chỉ IP</p>
                                    <p className="font-mono text-slate-300">{log.ip_address}</p>
                                  </div>
                                )}
                                {log.user_role && (
                                  <div>
                                    <p className="text-slate-500 font-medium mb-1">Vai trò</p>
                                    <p className="text-slate-300">{log.user_role}</p>
                                  </div>
                                )}
                              </div>
                              {log.details != null && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                  <p className="text-slate-500 font-medium mb-1">Chi tiết</p>
                                  <pre className="text-xs text-slate-300 bg-slate-900/60 rounded p-2 overflow-x-auto">
                                    {typeof log.details === 'string'
                                      ? log.details
                                      : (JSON.stringify(log.details, null, 2) ?? '')}
                                  </pre>
                                </div>
                              )}
                              {log.user_agent && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                  <p className="text-slate-500 font-medium mb-1">Trình duyệt</p>
                                  <p className="text-xs text-slate-400 truncate">
                                    {log.user_agent}
                                  </p>
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
          <div className="px-5 py-3 border-t border-white/5 flex justify-center">
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
