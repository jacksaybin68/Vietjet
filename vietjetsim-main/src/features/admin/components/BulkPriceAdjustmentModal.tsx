'use client';
import React, { useState } from 'react';
import { Icon } from '@/shared/components/ui';
import { AIRPORT_CITIES } from '@/shared/constants';
import {
  adjustAdminFlightPrices,
  type BulkPriceAdjustPayload,
  type BulkPriceAdjustPreviewSample,
  type PriceAdjustAction,
} from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';

interface ToastAPI {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

interface BulkPriceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onToast?: ToastAPI;
}

const AIRPORTS = Object.entries(AIRPORT_CITIES).map(([code, city]) => ({ code, city }));

const ACTION_OPTIONS: Array<{
  value: PriceAdjustAction;
  label: string;
  desc: string;
  unit: string;
  defaultVal: number;
  badge: string;
}> = [
  {
    value: 'discount_fixed',
    label: 'Giảm giá cố định (VND)',
    desc: 'Mỗi vé sẽ được giảm bớt một số tiền cố định (mặc định 200.000đ rẻ hơn Vietjet)',
    unit: 'VND',
    defaultVal: 200000,
    badge: '-200.000đ',
  },
  {
    value: 'increase_fixed',
    label: 'Tăng giá cố định (VND)',
    desc: 'Tăng thêm một số tiền cố định cho mỗi vé',
    unit: 'VND',
    defaultVal: 100000,
    badge: '+VND',
  },
  {
    value: 'discount_percent',
    label: 'Giảm theo phần trăm (%)',
    desc: 'Chiết khấu giá vé theo tỷ lệ phần trăm',
    unit: '%',
    defaultVal: 10,
    badge: '-%',
  },
  {
    value: 'increase_percent',
    label: 'Tăng theo phần trăm (%)',
    desc: 'Tăng giá vé theo tỷ lệ phần trăm',
    unit: '%',
    defaultVal: 10,
    badge: '+%',
  },
  {
    value: 'set_fixed',
    label: 'Đặt giá cố định (VND)',
    desc: 'Đặt giá vé đồng giá cho tất cả chuyến bay thoả mãn bộ lọc',
    unit: 'VND',
    defaultVal: 899000,
    badge: 'Đồng giá',
  },
];

const vnd = (n: number) => n.toLocaleString('vi-VN');

export default function BulkPriceAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  onToast,
}: BulkPriceAdjustmentModalProps) {
  // Bộ lọc
  const [fromCode, setFromCode] = useState('all');
  const [toCode, setToCode] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [flightNo, setFlightNo] = useState('');
  const [seatClass, setSeatClass] = useState<'all' | 'economy' | 'business'>('all');

  // Hành động điều chỉnh
  const [action, setAction] = useState<PriceAdjustAction>('discount_fixed');
  const [amount, setAmount] = useState<number>(200000);

  // Trạng thái preview và thực thi
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewSamples, setPreviewSamples] = useState<BulkPriceAdjustPreviewSample[] | null>(null);
  const [matchedCount, setMatchedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleActionChange = (newAction: PriceAdjustAction) => {
    setAction(newAction);
    const opt = ACTION_OPTIONS.find((o) => o.value === newAction);
    if (opt) setAmount(opt.defaultVal);
    setPreviewSamples(null);
    setMatchedCount(null);
  };

  const getPayload = (dryRun = false): BulkPriceAdjustPayload => ({
    filter: {
      from_code: fromCode,
      to_code: toCode,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      flight_no: flightNo || undefined,
      class: seatClass,
    },
    action,
    amount: Number(amount) || 0,
    dryRun,
  });

  const handlePreview = async () => {
    if (!amount || amount <= 0) {
      onToast?.error('Lỗi', 'Vui lòng nhập số tiền hoặc tỷ lệ điều chỉnh hợp lệ.');
      return;
    }
    setIsPreviewLoading(true);
    setPreviewSamples(null);
    setMatchedCount(null);

    try {
      const res = await adjustAdminFlightPrices(getPayload(true));
      setMatchedCount(res.matchedCount ?? 0);
      setPreviewSamples(res.samples ?? []);
      if ((res.matchedCount ?? 0) === 0) {
        onToast?.warning('Không tìm thấy', 'Không có chuyến bay nào khớp với bộ lọc.');
      } else {
        onToast?.info(
          'Xem trước',
          `Tìm thấy ${res.matchedCount?.toLocaleString('vi-VN')} chuyến bay phù hợp.`
        );
      }
    } catch (err) {
      onToast?.error('Lỗi xem trước', getApiErrorMessage(err, 'Không thể tải dữ liệu xem trước.'));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!amount || amount <= 0) {
      onToast?.error('Lỗi', 'Vui lòng nhập số tiền hoặc tỷ lệ điều chỉnh hợp lệ.');
      return;
    }

    const confirmMsg =
      matchedCount !== null
        ? `Bạn có chắc chắn muốn điều chỉnh giá vé cho ${matchedCount.toLocaleString('vi-VN')} chuyến bay?`
        : 'Bạn có chắc chắn muốn thực hiện điều chỉnh giá vé theo các tiêu chí đã chọn?';

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const res = await adjustAdminFlightPrices(getPayload(false));
      onToast?.success('Thành công', res.message || 'Đã cập nhật giá vé hàng loạt.');
      onSuccess?.();
      onClose();
    } catch (err) {
      onToast?.error('Lỗi điều chỉnh giá', getApiErrorMessage(err, 'Không thể cập nhật giá vé.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Icon name="CurrencyDollarIcon" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Điều Chỉnh Giá Vé Hàng Loạt</h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Rẻ hơn Vietjet 200K
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cập nhật giá vé theo chặng, khoảng ngày hoặc áp dụng chính sách chiết khấu toàn hệ
                thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* 1. Bộ lọc phạm vi */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Icon name="FunnelIcon" size={14} className="text-indigo-400" />
              1. Phạm Vi Áp Dụng (Bộ lọc)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nơi đi (From)</label>
                <select
                  value={fromCode}
                  onChange={(e) => {
                    setFromCode(e.target.value);
                    setPreviewSamples(null);
                  }}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả sân bay đi</option>
                  {AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nơi đến (To)</label>
                <select
                  value={toCode}
                  onChange={(e) => {
                    setToCode(e.target.value);
                    setPreviewSamples(null);
                  }}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả sân bay đến</option>
                  {AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Số hiệu chuyến bay</label>
                <input
                  type="text"
                  placeholder="Ví dụ: VJ121 hoặc để trống"
                  value={flightNo}
                  onChange={(e) => {
                    setFlightNo(e.target.value.toUpperCase());
                    setPreviewSamples(null);
                  }}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500 placeholder:text-slate-600 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Từ ngày khởi hành</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPreviewSamples(null);
                  }}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Đến ngày khởi hành</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPreviewSamples(null);
                  }}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Hạng vé áp dụng</label>
                <select
                  value={seatClass}
                  onChange={(e) => {
                    setSeatClass(e.target.value as 'all' | 'economy' | 'business');
                    setPreviewSamples(null);
                  }}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả hạng vé</option>
                  <option value="economy">Chỉ Phổ thông (Economy)</option>
                  <option value="business">Chỉ Thương gia (Business)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Phương thức điều chỉnh giá */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Icon name="AdjustmentsHorizontalIcon" size={14} className="text-amber-400" />
              2. Phương Thức Điều Chỉnh Giá
            </h3>

            {/* Quick Action Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleActionChange(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    action === opt.value
                      ? 'bg-amber-500/10 border-amber-500/50 text-white ring-1 ring-amber-500/30'
                      : 'bg-slate-800/60 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        action === opt.value
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Amount Input */}
            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-300">
                  {action.includes('percent') ? 'Tỷ lệ điều chỉnh (%)' : 'Số tiền điều chỉnh (VND)'}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {action === 'discount_fixed'
                    ? 'Nhập 200.000 để tự động rẻ hơn giá vé Vietjet 200K'
                    : action.includes('percent')
                      ? 'Nhập số % nguyên (ví dụ: 10 nghĩa là 10%)'
                      : 'Số tiền tính bằng Đồng Việt Nam'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={action.includes('percent') ? 1 : 10000}
                  value={amount}
                  onChange={(e) => {
                    setAmount(Number(e.target.value));
                    setPreviewSamples(null);
                  }}
                  className="w-40 bg-slate-800 border border-amber-500/30 text-amber-300 font-bold text-sm rounded-lg px-3 py-2 text-right outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
                <span className="text-xs text-slate-400 font-bold min-w-[32px]">
                  {action.includes('percent') ? '%' : 'VND'}
                </span>
              </div>
            </div>

            {/* Note & Policy */}
            <div className="text-[11px] text-slate-400 flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5">
              <Icon
                name="InformationCircleIcon"
                size={15}
                className="text-indigo-400 shrink-0 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-300">Quy tắc bảo toàn giá:</span> Giá vé
                sau khi giảm luôn được đảm bảo không thấp hơn mức sàn tối thiểu{' '}
                <span className="text-indigo-400 font-bold">99.000 VND</span>. Giá vé hạng Thương
                gia được tự động chuẩn hóa theo hệ số 2.77x vé Phổ thông theo chuẩn hãng.
              </div>
            </div>
          </div>

          {/* 3. Bảng Xem trước (Dry Run Result) */}
          {matchedCount !== null && (
            <div className="bg-slate-950/80 border border-white/10 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Kết Quả Xem Trước
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {matchedCount.toLocaleString('vi-VN')} chuyến bay khớp
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Hiển thị mẫu 10 chuyến đầu tiên</span>
              </div>

              {previewSamples && previewSamples.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="pb-2 font-semibold">Chuyến bay</th>
                        <th className="pb-2 font-semibold">Chặng</th>
                        <th className="pb-2 font-semibold">Khởi hành</th>
                        <th className="pb-2 font-semibold text-right">Giá Eco cũ</th>
                        <th className="pb-2 font-semibold text-right text-emerald-400">
                          Giá Eco mới
                        </th>
                        <th className="pb-2 font-semibold text-right">Chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewSamples.map((s) => (
                        <tr key={s.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 font-bold text-white">{s.flight_no}</td>
                          <td className="py-2.5 text-slate-300">{s.route}</td>
                          <td className="py-2.5 text-slate-400">{s.depart_time}</td>
                          <td className="py-2.5 text-right text-slate-400 line-through">
                            {vnd(s.old_economy_price)}đ
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-400">
                            {vnd(s.new_economy_price)}đ
                          </td>
                          <td
                            className={`py-2.5 text-right font-semibold ${
                              s.diff < 0 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {s.diff < 0 ? `-${vnd(Math.abs(s.diff))}đ` : `+${vnd(s.diff)}đ`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  Không có chuyến bay nào thoả mãn bộ lọc đã chọn.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-slate-950/80">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewLoading || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-white/10 transition-all shadow-sm"
          >
            {isPreviewLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang quét chuyến bay...
              </>
            ) : (
              <>
                <Icon name="EyeIcon" size={14} />
                Xem trước thay đổi (Dry Run)
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold rounded-xl hover:bg-white/5 transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang cập nhật DB...
                </>
              ) : (
                <>
                  <Icon name="CheckIcon" size={14} />
                  Xác nhận cập nhật giá
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
