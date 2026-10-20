'use client';
/**
 * BulkCollectPanel — Thu thập nhiều chặng bay cùng lúc từ vietjetair.com.
 *
 * Tính năng:
 * - Chọn nhiều chặng (from-to) từ danh sách sân bay
 * - Chọn khoảng ngày (date range) hoặc danh sách ngày cụ thể
 * - Hiển thị tiến độ từng cặp chặng/ngày realtime
 * - Bảng kết quả tổng hợp: thành công / WAF bị chặn / lỗi / trống
 * - Nút nhập hàng loạt (import) sau khi xem trước
 */
import React, { useState, useCallback } from 'react';
import { Icon } from '@/shared/components/ui';
import { AIRPORT_CITIES } from '@/shared/constants';
import {
  collectAdminBulk,
  importCollectedFlights,
  type BulkCollectItem,
  type BulkCollectResponse,
} from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';

interface ToastAPI {
  success: (title: string, msg?: string) => void;
  error: (title: string, msg?: string) => void;
  warning: (title: string, msg?: string) => void;
  info: (title: string, msg?: string) => void;
}

interface RouteEntry {
  id: string;
  from: string;
  to: string;
}

const AIRPORTS = Object.entries(AIRPORT_CITIES).map(([code, city]) => ({ code, city }));

const DEFAULT_ROUTES: RouteEntry[] = [
  { id: '1', from: 'HAN', to: 'SGN' },
  { id: '2', from: 'SGN', to: 'HAN' },
  { id: '3', from: 'HAN', to: 'DAD' },
  { id: '4', from: 'SGN', to: 'PQC' },
];

/** Tạo danh sách ngày từ ngày bắt đầu đến ngày kết thúc (inclusive). */
function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  if (isNaN(cur.getTime()) || isNaN(end.getTime())) return [];
  while (cur <= end && dates.length < 14) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const statusLabel: Record<BulkCollectItem['status'], { text: string; cls: string; icon: string }> =
  {
    success: {
      text: 'Thành công',
      cls: 'text-emerald-400 bg-emerald-500/10',
      icon: 'CheckCircleIcon',
    },
    empty: {
      text: 'Không có chuyến',
      cls: 'text-slate-400 bg-slate-500/10',
      icon: 'InformationCircleIcon',
    },
    waf_blocked: {
      text: 'WAF chặn',
      cls: 'text-amber-400 bg-amber-500/10',
      icon: 'ShieldExclamationIcon',
    },
    error: { text: 'Lỗi', cls: 'text-red-400 bg-red-500/10', icon: 'XCircleIcon' },
  };

const vnd = (n: number) => n.toLocaleString('vi-VN');

export default function BulkCollectPanel({
  onToast,
  onFlightsImported,
}: {
  onToast?: ToastAPI;
  onFlightsImported?: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [routes, setRoutes] = useState<RouteEntry[]>(DEFAULT_ROUTES);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(tomorrow);
  const [wafCookie, setWafCookie] = useState('');
  const [importOnSuccess, setImportOnSuccess] = useState(false);
  const [updateExistingPrices, setUpdateExistingPrices] = useState(true);
  const [concurrency, setConcurrency] = useState(4);

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BulkCollectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // ── Route management ────────────────────────────────────────────────────────
  const addRoute = () => {
    setRoutes((prev) => [...prev, { id: Date.now().toString(), from: 'HAN', to: 'SGN' }]);
  };

  const removeRoute = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRoute = (id: string, field: 'from' | 'to', value: string) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const swapRoute = (id: string) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, from: r.to, to: r.from } : r)));
  };

  // ── Thu thập hàng loạt ──────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    const dates = dateRange(dateFrom, dateTo);
    if (dates.length === 0) {
      onToast?.warning('Ngày không hợp lệ', 'Kiểm tra lại ngày bắt đầu và kết thúc.');
      return;
    }
    const validRoutes = routes.filter((r) => r.from && r.to && r.from !== r.to);
    if (validRoutes.length === 0) {
      onToast?.warning('Chưa có chặng hợp lệ', 'Thêm ít nhất một chặng bay hợp lệ.');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await collectAdminBulk({
        routes: validRoutes.map(({ from, to }) => ({ from, to })),
        dates,
        wafCookie: wafCookie.trim() || undefined,
        importOnSuccess,
        updateExisting: updateExistingPrices,
        concurrency,
      });
      setResult(res);
      if (res.succeeded > 0) {
        const extra =
          res.imported > 0 || res.updated > 0
            ? `, thêm mới ${res.imported} chuyến, cập nhật ${res.updated || 0} chuyến`
            : '';
        onToast?.success(
          'Thu thập hoàn tất',
          `${res.succeeded}/${res.total} chặng thành công${extra}.`
        );
        if (res.imported > 0 || (res.updated && res.updated > 0)) onFlightsImported?.();
      } else {
        onToast?.warning('Không lấy được chuyến nào', `${res.blocked} chặng bị WAF chặn.`);
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Không thể kết nối đến máy chủ');
      setError(msg);
      onToast?.error('Lỗi thu thập hàng loạt', msg);
    } finally {
      setIsRunning(false);
    }
  }, [
    routes,
    dateFrom,
    dateTo,
    wafCookie,
    importOnSuccess,
    updateExistingPrices,
    concurrency,
    onToast,
    onFlightsImported,
  ]);

  // ── Nhập thủ công từng cặp kết quả ─────────────────────────────────────────
  const handleImportItem = async (item: BulkCollectItem) => {
    if (!item.flights.length) return;
    const key = `${item.route}-${item.date}`;
    setImportingId(key);
    try {
      const res = await importCollectedFlights({
        from: item.from,
        to: item.to,
        date: item.date,
        flights: item.flights,
        updateExisting: updateExistingPrices,
      });
      const importedCount = res.imported?.length ?? 0;
      const updatedCount = res.updated?.length ?? 0;
      onToast?.success(
        'Đồng bộ thành công',
        `Chặng ${item.route}: thêm mới ${importedCount} chuyến, cập nhật giá vé ${updatedCount} chuyến.`
      );
      // Cập nhật kết quả local
      setResult((prev) =>
        prev
          ? {
              ...prev,
              imported: prev.imported + importedCount,
              updated: (prev.updated || 0) + updatedCount,
              results: prev.results.map((r) =>
                r.route === item.route && r.date === item.date
                  ? {
                      ...r,
                      imported: res.imported,
                      updated: res.updated,
                      skipped: res.skipped,
                    }
                  : r
              ),
            }
          : prev
      );
      if (importedCount > 0 || updatedCount > 0) onFlightsImported?.();
    } catch (err) {
      onToast?.error('Lỗi nhập chuyến bay', getApiErrorMessage(err, 'Không thể nhập chuyến bay'));
    } finally {
      setImportingId(null);
    }
  };

  const dates = dateRange(dateFrom, dateTo);
  const totalCombos = routes.filter((r) => r.from && r.to && r.from !== r.to).length * dates.length;

  return (
    <div className="space-y-5">
      {/* ── Cấu hình chặng ─────────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Icon name="MapPinIcon" size={15} className="text-indigo-400" />
            Danh sách chặng bay
          </p>
          <button
            type="button"
            onClick={addRoute}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 border border-indigo-500/30 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all"
          >
            <Icon name="PlusIcon" size={13} /> Thêm chặng
          </button>
        </div>

        <div className="space-y-2">
          {routes.map((route) => (
            <div key={route.id} className="flex items-center gap-2">
              <select
                value={route.from}
                onChange={(e) => updateRoute(route.id, 'from', e.target.value)}
                className="flex-1 bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:border-indigo-500 outline-none"
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.city}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => swapRoute(route.id)}
                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                title="Hoán đổi"
              >
                <Icon name="ArrowsRightLeftIcon" size={14} />
              </button>

              <select
                value={route.to}
                onChange={(e) => updateRoute(route.id, 'to', e.target.value)}
                className="flex-1 bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:border-indigo-500 outline-none"
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.city}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => removeRoute(route.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                disabled={routes.length <= 1}
              >
                <Icon name="TrashIcon" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cấu hình ngày ──────────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Icon name="CalendarDaysIcon" size={15} className="text-indigo-400" />
          Khoảng ngày
          <span className="text-xs font-normal text-slate-400 ml-1">(tối đa 14 ngày)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
        {dates.length > 0 && (
          <p className="text-xs text-slate-400">
            📅 {dates.length} ngày:{' '}
            <span className="text-indigo-400">
              {dates.slice(0, 5).join(', ')}
              {dates.length > 5 ? ` ... +${dates.length - 5}` : ''}
            </span>
          </p>
        )}
      </div>

      {/* ── Tùy chọn nâng cao ──────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Icon name="Cog6ToothIcon" size={15} className="text-indigo-400" />
          Tùy chọn nâng cao
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Đồng thời (concurrency)</label>
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:border-indigo-500 outline-none"
            >
              {[1, 2, 3, 4, 5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} request song song
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">WAF Cookie (tuỳ chọn)</label>
            <input
              type="text"
              value={wafCookie}
              onChange={(e) => setWafCookie(e.target.value)}
              placeholder="aws-waf-token=..."
              className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:border-indigo-500 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={updateExistingPrices}
              onChange={(e) => setUpdateExistingPrices(e.target.checked)}
              className="w-4 h-4 accent-emerald-500"
            />
            <span className="text-xs font-semibold text-emerald-400">
              Cập nhật giá vé thực tế cho các chuyến đã có
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={importOnSuccess}
              onChange={(e) => setImportOnSuccess(e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            <span className="text-xs text-slate-300">
              Tự động nhập/cập nhật vào DB khi thu thập thành công
            </span>
          </label>
        </div>
      </div>

      {/* ── Tổng hợp và nút chạy ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
        <div className="text-xs text-slate-300">
          <span className="text-white font-bold text-sm">{totalCombos}</span> tổ hợp sẽ được thu
          thập
          <span className="text-slate-500 ml-2">
            ({routes.filter((r) => r.from !== r.to).length} chặng × {dates.length} ngày)
          </span>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning || totalCombos === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all shadow-lg"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang thu thập...
            </>
          ) : (
            <>
              <Icon name="BoltIcon" size={15} />
              Thu thập hàng loạt
            </>
          )}
        </button>
      </div>

      {/* ── Lỗi ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4">
          <span className="font-bold">Lỗi: </span>
          {error}
        </div>
      )}

      {/* ── Kết quả ────────────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Thành công', value: result.succeeded, cls: 'text-emerald-400' },
              { label: 'WAF chặn', value: result.blocked, cls: 'text-amber-400' },
              { label: 'Đã thêm mới', value: result.imported, cls: 'text-indigo-400' },
              { label: 'Đã cập nhật giá', value: result.updated || 0, cls: 'text-cyan-400' },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center"
              >
                <div className={`text-2xl font-black ${card.cls}`}>{card.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Results table */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/5 flex items-center gap-2">
              <Icon name="TableCellsIcon" size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold text-white">
                Kết quả chi tiết ({result.total} tổ hợp)
              </span>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400 border-b border-white/5">
                    <th className="text-left px-3 py-2">Chặng</th>
                    <th className="text-left px-3 py-2">Ngày</th>
                    <th className="text-left px-3 py-2">Trạng thái</th>
                    <th className="text-right px-3 py-2">Chuyến</th>
                    <th className="text-right px-3 py-2">Giá thấp nhất</th>
                    <th className="text-right px-3 py-2">Đã nhập</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((item, idx) => {
                    const st = statusLabel[item.status];
                    const lowestPrice = item.flights.length
                      ? Math.min(...item.flights.map((f) => f.price).filter((p) => p > 0))
                      : null;
                    const key = `${item.route}-${item.date}`;
                    const alreadyImported =
                      (item.imported?.length ?? 0) > 0 || (item.skipped?.length ?? 0) > 0;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-3 py-2 font-mono font-bold text-white">
                          {item.route || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{item.date || '—'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}
                          >
                            <Icon name={st.icon as never} size={10} />
                            {st.text}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-white">
                          {item.flights.length || '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400">
                          {lowestPrice ? `${vnd(lowestPrice)}₫` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-indigo-400">
                          {alreadyImported ? (item.imported?.length ?? 0) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.status === 'success' &&
                            item.flights.length > 0 &&
                            !alreadyImported && (
                              <button
                                type="button"
                                onClick={() => handleImportItem(item)}
                                disabled={importingId === key}
                                className="text-[10px] px-2 py-1 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg transition-all disabled:opacity-50"
                              >
                                {importingId === key ? 'Đang nhập...' : 'Nhập'}
                              </button>
                            )}
                          {alreadyImported && (
                            <span className="text-[10px] text-emerald-500">✓ Đã nhập</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
