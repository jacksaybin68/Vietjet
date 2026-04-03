'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ToastAPI {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

interface SstkToolDef {
  key: string;
  label: string;
  description: string;
  category: string;
}

interface SstkLog {
  id: string;
  tool_key: string;
  tool_label: string;
  executed_by: string;
  params_json: string;
  result_summary: string;
  status: 'success' | 'error' | 'partial';
  created_at: string;
}

interface ToolResult {
  success: boolean;
  toolKey: string;
  label: string;
  summary: string;
  status: 'success' | 'error' | 'partial';
  executedAt: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  booking: 'TicketIcon',
  flight: 'PaperAirplaneIcon',
  user: 'UsersIcon',
  chat: 'ChatBubbleLeftRightIcon',
  refund: 'BanknotesIcon',
  report: 'ChartBarIcon',
  notification: 'BellIcon',
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  booking: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' },
  flight: { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' },
  user: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
  chat: { bg: '#FDF4FF', border: '#F0ABFC', text: '#A21CAF' },
  refund: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  report: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  notification: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  success: { label: 'Thành công', cls: 'badge-success' },
  error: { label: 'Lỗi', cls: 'badge-error' },
  partial: { label: 'Một phần', cls: 'badge-warning' },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SstkTab({ onToast }: { onToast?: ToastAPI }) {
  const [tools, setTools] = useState<SstkToolDef[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [logs, setLogs] = useState<SstkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingKey, setExecutingKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);
  const [showParamsModal, setShowParamsModal] = useState<string | null>(null);
  const [customParams, setCustomParams] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<'tools' | 'logs'>('tools');
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch tools ───────────────────────────────────────────────────────

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/sstk');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTools(data.tools || []);
      setCategories(data.categories || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải công cụ SSTK');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch logs ────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sstk?action=logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchTools();
    fetchLogs();
  }, [fetchTools, fetchLogs]);

  // ─── Execute tool ──────────────────────────────────────────────────────

  const executeTool = async (toolKey: string, params?: Record<string, string>) => {
    setExecutingKey(toolKey);
    setLastResult(null);
    try {
      const res = await fetch('/api/admin/sstk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolKey, params: params || {} }),
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(data as ToolResult);
        onToast?.success(data.label, data.summary);
      } else {
        onToast?.error('Lỗi thực thi', data.message || 'Unknown error');
        setLastResult({
          success: false,
          toolKey,
          label: toolKey,
          summary: data.message || 'Unknown error',
          status: 'error',
          executedAt: new Date().toISOString(),
        });
      }
      fetchLogs(); // refresh logs
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message);
    } finally {
      setExecutingKey(null);
      setShowParamsModal(null);
      setCustomParams({});
    }
  };

  // ─── Filtered tools ────────────────────────────────────────────────────

  const filteredTools =
    activeCategory === 'all' ? tools : tools.filter((t) => t.category === activeCategory);

  // ─── Param fields per tool (for modal) ─────────────────────────────────

  const getParamFields = (
    toolKey: string
  ): { key: string; label: string; type: string; placeholder: string }[] => {
    switch (toolKey) {
      case 'sync-prices':
        return [
          { key: 'basePrice', label: 'Giá cơ sở (VNĐ)', type: 'number', placeholder: '850000' },
        ];
      case 'bulk-cancel-flights':
        return [
          { key: 'dateFrom', label: 'Từ ngày (YYYY-MM-DD)', type: 'date', placeholder: '' },
          { key: 'dateTo', label: 'Đến ngày (YYYY-MM-DD)', type: 'date', placeholder: '' },
        ];
      default:
        return [];
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-koho">Đang tải SSTK...</p>
        </div>
      </div>
    );
  }

  if (error && tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="ExclamationTriangleIcon" size={40} className="text-gray-400" />
        <p className="text-gray-500 font-koho">{error}</p>
        <button
          onClick={fetchTools}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-primary-solid"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-navy">
            <Icon name="WrenchScrewdriverIcon" size={22} className="text-primary" />
            Self-Service Toolkit (SSTK)
          </h2>
          <p className="text-sm mt-1 font-koho">
            Các công cụ tự động hóa tác vụ quản trị thường xuyên
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => setActiveView('tools')}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              activeView === 'tools' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            style={{
              background: activeView === 'tools' ? '#EC2029' : undefined,
            }}
          >
            <span className="flex items-center gap-1.5">
              <Icon name="WrenchScrewdriverIcon" size={15} /> Công cụ
            </span>
          </button>
          <button
            onClick={() => setActiveView('logs')}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              activeView === 'logs' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            style={{
              background: activeView === 'logs' ? '#EC2029' : undefined,
            }}
          >
            <span className="flex items-center gap-1.5">
              <Icon name="ClockIcon" size={15} /> Lịch sử ({logs.length})
            </span>
          </button>
        </div>
      </div>

      {/* Last execution result banner */}
      {lastResult && (
        <div
          className={`rounded-xl p-4 flex items-start gap-3 ${
            lastResult.success ? 'bg-green-50 border' : 'bg-red-50 border'
          }`}
          style={{ borderColor: lastResult.success ? '#86EFAC' : '#FCA5A5' }}
        >
          <Icon
            name={lastResult.success ? 'CheckCircleIcon' : 'XCircleIcon'}
            size={20}
            className={lastResult.success ? 'text-green-600' : 'text-red-600'}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold text-sm"
              style={{ color: lastResult.success ? '#166534' : '#991B1B' }}
            >
              {lastResult.label} — {STATUS_BADGE[lastResult.status]?.label || lastResult.status}
            </div>
            <div className="text-sm mt-0.5" style={{ color: '#4B5563' }}>
              {lastResult.summary}
            </div>
            <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              {new Date(lastResult.executedAt).toLocaleString('vi-VN')}
            </div>
          </div>
          <button onClick={() => setLastResult(null)} className="text-gray-400 hover:text-gray-600">
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>
      )}

      {/* ─── TOOLS VIEW ──────────────────────────────────────────────────── */}
      {activeView === 'tools' && (
        <>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === 'all'
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              style={{
                background: activeCategory === 'all' ? '#EC2029' : undefined,
              }}
            >
              Tất cả ({tools.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                  activeCategory === cat
                    ? 'text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
                style={{
                  background:
                    activeCategory === cat ? CATEGORY_COLORS[cat]?.text || '#EC2029' : undefined,
                }}
              >
                {cat} ({tools.filter((t) => t.category === cat).length})
              </button>
            ))}
          </div>

          {/* Tools grid */}
          {filteredTools.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon name="MagnifyingGlassIcon" size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-koho">Không có công cụ nào trong danh mục này</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTools.map((tool) => {
                const catStyle = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.report;
                const hasParams = getParamFields(tool.key).length > 0;
                const isRunning = executingKey === tool.key;

                return (
                  <div
                    key={tool.key}
                    className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200 hover:border-red-200"
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: catStyle.bg, border: `1px solid ${catStyle.border}` }}
                      >
                        <Icon
                          name={(CATEGORY_ICONS[tool.category] as any) || 'WrenchScrewdriverIcon'}
                          size={18}
                          style={{ color: catStyle.text }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate text-navy">{tool.label}</h3>
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize mt-1"
                          style={{
                            background: catStyle.bg,
                            color: catStyle.text,
                            border: `1px solid ${catStyle.border}`,
                          }}
                        >
                          {tool.category}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs mt-3 leading-relaxed font-koho">{tool.description}</p>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                      {hasParams ? (
                        <button
                          onClick={() => {
                            setShowParamsModal(tool.key);
                            setCustomParams({});
                          }}
                          disabled={isRunning}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50 transition-all hover:shadow-sm"
                          style={{ background: isRunning ? '#9CA3AF' : '#EC2029' }}
                        >
                          {isRunning ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Đang chạy...
                            </>
                          ) : (
                            <>
                              <Icon name="CogIcon" size={14} /> Cấu hình & Chạy
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => executeTool(tool.key)}
                          disabled={isRunning}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50 transition-all hover:shadow-sm"
                          style={{ background: isRunning ? '#9CA3AF' : '#EC2029' }}
                        >
                          {isRunning ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Đang chạy...
                            </>
                          ) : (
                            <>
                              <Icon name="PlayIcon" size={14} /> Chạy ngay
                            </>
                          )}
                        </button>
                      )}

                      {/* Quick info */}
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title={`Tool key: ${tool.key}`}
                      >
                        <Icon name="InformationCircleIcon" size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── LOGS VIEW ───────────────────────────────────────────────────── */}
      {activeView === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-sm font-heading-sm">Lịch sử thực thi công cụ</h3>
            <button
              onClick={fetchLogs}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-koho"
            >
              <Icon name="ArrowPathIcon" size={13} className="inline mr-1" /> Làm mới
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon name="ClockIcon" size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-koho">Chưa có lịch sử thực thi</p>
              <p className="text-xs mt-1">Chạy một công cụ để xem log tại đây</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => {
                const badge = STATUS_BADGE[log.status];
                return (
                  <div key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-navy">{log.tool_label}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badge?.cls || ''}`}
                          >
                            {badge?.label || log.status}
                          </span>
                        </div>
                        <p className="text-xs mt-1 truncate text-vj-gray">{log.result_summary}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Icon name="UserIcon" size={11} /> {log.executed_by.slice(0, 8)}...
                          </span>
                          <span>{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PARAMS MODAL ─────────────────────────────────────────────────── */}
      {showParamsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowParamsModal(null)}
          />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            {/* Modal header */}
            <div
              className="px-5 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #EC2029 0%, #B91C1C 100%)' }}
            >
              <h3 className="text-white font-bold text-base font-heading-sm">Cấu hình tham số</h3>
              <p className="text-white/70 text-xs mt-0.5 font-koho">
                {tools.find((t) => t.key === showParamsModal)?.label}
              </p>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {getParamFields(showParamsModal).map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold mb-1.5 font-koho">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={customParams[field.key] || ''}
                    onChange={(e) =>
                      setCustomParams((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all font-koho"
                  />
                </div>
              ))}

              {/* Warning note */}
              <div
                className="rounded-lg p-3 flex items-start gap-2"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
              >
                <Icon
                  name="ExclamationTriangleIcon"
                  size={16}
                  className="text-yellow-600 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs" style={{ color: '#92400E' }}>
                  Hành động này sẽ ảnh hưởng đến dữ liệu hệ thống. Vui lòng kiểm tra lại tham số
                  trước khi xác nhận.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowParamsModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-koho"
              >
                Huỷ
              </button>
              <button
                onClick={() => showParamsModal && executeTool(showParamsModal, customParams)}
                disabled={executingKey !== null}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all bg-primary-solid"
              >
                {executingKey ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang chạy...
                  </>
                ) : (
                  <>
                    <Icon name="PlayIcon" size={14} /> Xác nhận chạy
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
