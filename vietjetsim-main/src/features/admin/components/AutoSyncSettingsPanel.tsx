'use client';
/**
 * AutoSyncSettingsPanel — Cấu hình tự động đồng bộ OpenClaw
 *
 * Tính năng tự động:
 * 1. Bật/Tắt tự động hóa hoàn toàn.
 * 2. Tự động đồng bộ mạng lưới sân bay CMS theo chu kỳ (mỗi 12h/24h/48h).
 * 3. Tự động thu thập trước lịch bay cho N ngày tới (1 - 7 ngày) của các chặng bay trọng điểm.
 * 4. Tự động nhập chuyến bay mới vào DB (tự bỏ qua chuyến trùng).
 * 5. Nút "Chạy đồng bộ ngay bây giờ" on-demand.
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@/shared/components/ui';
import { AIRPORT_CITIES } from '@/shared/constants';
import {
  getAdminAutoSyncConfig,
  updateAdminAutoSyncConfig,
  triggerAdminAutoSyncRunNow,
  triggerAdminSolveWaf,
  type AutoSyncConfigData,
  type AutoSyncReportData,
} from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';

interface ToastAPI {
  success: (title: string, msg?: string) => void;
  error: (title: string, msg?: string) => void;
  warning: (title: string, msg?: string) => void;
  info: (title: string, msg?: string) => void;
}

const AIRPORTS = Object.entries(AIRPORT_CITIES).map(([code, city]) => ({ code, city }));

export default function AutoSyncSettingsPanel({
  onToast,
  onFlightsUpdated,
}: {
  onToast?: ToastAPI;
  onFlightsUpdated?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState<AutoSyncConfigData>({
    enabled: true,
    networkIntervalHours: 24,
    scheduleDaysAhead: 3,
    keyRoutes: [
      { from: 'HAN', to: 'SGN' },
      { from: 'SGN', to: 'HAN' },
      { from: 'HAN', to: 'DAD' },
      { from: 'DAD', to: 'HAN' },
    ],
    autoImport: true,
  });
  const [report, setReport] = useState<AutoSyncReportData | null>(null);

  useEffect(() => {
    getAdminAutoSyncConfig()
      .then((res) => {
        if (res.config) setConfig(res.config);
      })
      .catch((err) => {
        onToast?.error(
          'Lỗi tải cấu hình tự động',
          getApiErrorMessage(err, 'Không thể đọc cấu hình')
        );
      })
      .finally(() => setLoading(false));
  }, [onToast]);

  const handleSave = async (updatedConfig: Partial<AutoSyncConfigData>) => {
    setSaving(true);
    try {
      const res = await updateAdminAutoSyncConfig(updatedConfig);
      if (res.config) {
        setConfig(res.config);
        onToast?.success(
          'Đã lưu cấu hình tự động',
          'Hệ thống sẽ tự động đồng bộ theo lịch trình mới.'
        );
      }
    } catch (err) {
      onToast?.error('Lỗi lưu cấu hình', getApiErrorMessage(err, 'Không thể lưu'));
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setReport(null);
    try {
      const res = await triggerAdminAutoSyncRunNow(true);
      if (res.report) {
        setReport(res.report);
        const { schedule, network } = res.report;
        const msg = `Mạng lưới: ${network.status === 'success' ? `+${network.airportsAdded} sân bay` : 'Bỏ qua/Đã mới'}. Lịch bay: Đã nhập ${schedule.importedFlights} chuyến (${schedule.successfulCombos}/${schedule.totalCombos} chặng).`;
        onToast?.success('Đồng bộ tự động hoàn tất', msg);
        onFlightsUpdated?.();
      }
    } catch (err) {
      onToast?.error('Lỗi đồng bộ tự động', getApiErrorMessage(err, 'Không thể thực thi'));
    } finally {
      setRunning(false);
    }
  };

  const addRoute = () => {
    const updated = [...config.keyRoutes, { from: 'HAN', to: 'SGN' }];
    setConfig({ ...config, keyRoutes: updated });
  };

  const removeRoute = (index: number) => {
    const updated = config.keyRoutes.filter((_, i) => i !== index);
    setConfig({ ...config, keyRoutes: updated });
  };

  const updateRoute = (index: number, field: 'from' | 'to', value: string) => {
    const updated = config.keyRoutes.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    setConfig({ ...config, keyRoutes: updated });
  };

  const [solvingWaf, setSolvingWaf] = useState(false);

  const handleSolveWaf = async () => {
    setSolvingWaf(true);
    try {
      const res = await triggerAdminSolveWaf();
      if (res.success) {
        onToast?.success('Đã giải WAF thành công', res.message);
      } else {
        onToast?.error('Giải WAF thất bại', res.message);
      }
    } catch (err) {
      onToast?.error('Lỗi khi giải WAF', getApiErrorMessage(err, 'Không thể mở trình duyệt'));
    } finally {
      setSolvingWaf(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Đang tải cấu hình tự động...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Banner trạng thái tự động hóa ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}
          >
            <Icon name="CpuChipIcon" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">
                Chế độ Tự Động Hóa (Background Auto-Pilot)
              </p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}
              >
                {config.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự động thu thập chuyến bay Vietjet, cập nhật giá vé và mạng lưới sân bay theo lịch
              trình định kỳ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => {
                const nextVal = e.target.checked;
                setConfig({ ...config, enabled: nextVal });
                handleSave({ enabled: nextVal });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>

          <button
            type="button"
            onClick={handleSolveWaf}
            disabled={solvingWaf}
            title="Mở Google Chrome ngầm để vượt WAF và lưu token mới"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 disabled:opacity-50 rounded-lg text-xs font-bold transition-all shadow-md ml-2"
          >
            {solvingWaf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                Đang giải WAF...
              </>
            ) : (
              <>
                <Icon name="ShieldCheckIcon" size={13} />
                Lấy WAF Token
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRunNow}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md ml-1"
          >
            {running ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang chạy...
              </>
            ) : (
              <>
                <Icon name="PlayIcon" size={13} />
                Chạy ngay
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Cài đặt chu kỳ & phạm vi ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Khối 1: Chu kỳ sân bay & Lịch bay */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-white flex items-center gap-2">
            <Icon name="ClockIcon" size={14} className="text-indigo-400" />
            Tần suất &amp; Phạm vi tự động
          </p>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Cập nhật mạng lưới sân bay CMS
            </label>
            <select
              value={config.networkIntervalHours}
              onChange={(e) => {
                const v = Number(e.target.value);
                setConfig({ ...config, networkIntervalHours: v });
              }}
              className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value={12}>Mỗi 12 giờ</option>
              <option value={24}>Mỗi 24 giờ (Khuyên dùng)</option>
              <option value={48}>Mỗi 48 giờ</option>
              <option value={168}>Mỗi tuần 1 lần</option>
            </select>
            {config.lastNetworkSync && (
              <p className="text-[10px] text-slate-500 mt-1">
                Lần cuối: {new Date(config.lastNetworkSync).toLocaleString('vi-VN')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Số ngày quét trước (tính từ hôm nay)
            </label>
            <select
              value={config.scheduleDaysAhead}
              onChange={(e) => {
                const v = Number(e.target.value);
                setConfig({ ...config, scheduleDaysAhead: v });
              }}
              className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value={1}>1 ngày tới (hôm nay + ngày mai)</option>
              <option value={2}>2 ngày tới</option>
              <option value={3}>3 ngày tới (Khuyên dùng)</option>
              <option value={5}>5 ngày tới</option>
              <option value={7}>7 ngày tới (1 tuần)</option>
            </select>
            {config.lastScheduleSync && (
              <p className="text-[10px] text-slate-500 mt-1">
                Lần quét lịch bay gần nhất:{' '}
                {new Date(config.lastScheduleSync).toLocaleString('vi-VN')}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={config.autoImport}
              onChange={(e) => setConfig({ ...config, autoImport: e.target.checked })}
              className="w-4 h-4 accent-indigo-500"
            />
            <span className="text-xs text-slate-300">
              Tự động lưu chuyến bay mới vào DB (bỏ qua chuyến đã tồn tại)
            </span>
          </label>
        </div>

        {/* Khối 2: Danh sách các tuyến bay trọng điểm */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Icon name="ArrowsRightLeftIcon" size={14} className="text-indigo-400" />
                Các chặng bay trọng điểm cần tự động thu thập ({config.keyRoutes.length})
              </p>
              <button
                type="button"
                onClick={addRoute}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 border border-indigo-500/30 px-2 py-0.5 rounded-lg hover:bg-indigo-500/10"
              >
                <Icon name="PlusIcon" size={12} /> Thêm
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {config.keyRoutes.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={r.from}
                    onChange={(e) => updateRoute(idx, 'from', e.target.value)}
                    className="flex-1 bg-slate-800 border border-white/10 text-white text-[11px] rounded px-2 py-1.5"
                  >
                    {AIRPORTS.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.city}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-500 text-xs">→</span>
                  <select
                    value={r.to}
                    onChange={(e) => updateRoute(idx, 'to', e.target.value)}
                    className="flex-1 bg-slate-800 border border-white/10 text-white text-[11px] rounded px-2 py-1.5"
                  >
                    {AIRPORTS.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.city}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRoute(idx)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Icon name="TrashIcon" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex justify-end">
            <button
              type="button"
              onClick={() => handleSave(config)}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow transition-all"
            >
              {saving ? 'Đang lưu...' : 'Lưu cấu hình tự động'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Báo cáo lần chạy gần nhất ───────────────────────────────────────── */}
      {report && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-white flex items-center gap-2">
            <Icon name="DocumentChartBarIcon" size={14} className="text-indigo-400" />
            Kết quả đợt chạy tự động vừa thực thi
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-400 text-[10px]">Mạng lưới CMS</div>
              <div className="font-bold text-emerald-400 mt-1">
                {report.network.status === 'success'
                  ? `+${report.network.airportsAdded} sân bay`
                  : 'Không thay đổi'}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-400 text-[10px]">Chặng thành công</div>
              <div className="font-bold text-white mt-1">
                {report.schedule.successfulCombos} / {report.schedule.totalCombos}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-400 text-[10px]">Chuyến bay đã nhập</div>
              <div className="font-bold text-indigo-400 mt-1">
                {report.schedule.importedFlights}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-400 text-[10px]">Chuyến đã tồn tại</div>
              <div className="font-bold text-slate-400 mt-1">{report.schedule.skippedFlights}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
