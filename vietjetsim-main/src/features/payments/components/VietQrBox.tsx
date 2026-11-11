'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/shared/components/ui';
import { apiRequest } from '@/shared/services';

/**
 * Mã VietQR động cho một đặt chỗ: payload EMVCo do server sinh
 * (GET /api/thanh-toan/vietqr), QR render cục bộ bằng package `qrcode`
 * (không gọi img.vietqr.io), kèm polling trạng thái giao dịch — khi
 * booking được xác nhận (webhook ngân hàng / admin), `onPaid` được gọi
 * để màn thanh toán tự chuyển sang success screen.
 */

interface VietQrData {
  payload: string;
  pnr: string | null;
  amount: number;
  addInfo: string;
  bank: {
    name: string;
    logoUrl: string | null;
    accountNumber: string;
    accountHolder: string;
  };
}

interface VietQrBoxProps {
  bookingId: string | null;
  onPaid?: () => void;
  /** Khoảng cách hai lần poll trạng thái (ms). */
  pollIntervalMs?: number;
  /** Ẩn khối logo/tên ngân hàng khi đặt trong card đã hiển thị sẵn (tab Ngân hàng). */
  showBankHeader?: boolean;
}

type PollState = 'waiting' | 'checking' | 'paid';

export default function VietQrBox({
  bookingId,
  onPaid,
  pollIntervalMs = 5000,
  showBankHeader = true,
}: VietQrBoxProps) {
  const [data, setData] = useState<VietQrData | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollState, setPollState] = useState<PollState>('waiting');
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  // Payload + QR render một lần khi có bookingId.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await apiRequest<VietQrData>(
          `/api/thanh-toan/vietqr?bookingId=${encodeURIComponent(bookingId)}`
        );
        if (cancelled) return;
        setData(result);
        const QRCode = await import('qrcode');
        const svg = await QRCode.toString(result.payload, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#1A1B26', light: '#FFFFFF' },
        });
        if (!cancelled) setQrSvg(svg);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không tạo được mã VietQR');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // Polling tự thăm dò giao dịch (giới hạn ~15 phút với nhịp 5s).
  useEffect(() => {
    if (!bookingId || !data) return;
    let active = true;
    let attempts = 0;
    const maxAttempts = Math.ceil((15 * 60 * 1000) / pollIntervalMs);
    const timer = setInterval(async () => {
      attempts += 1;
      setPollState('checking');
      try {
        const result = await apiRequest<{ booking: { status: string } }>(
          `/api/thanh-toan/trang-thai?bookingId=${encodeURIComponent(bookingId)}`
        );
        if (!active) return;
        if (result.booking?.status === 'confirmed') {
          setPollState('paid');
          clearInterval(timer);
          onPaidRef.current?.();
        } else {
          setPollState('waiting');
        }
      } catch {
        // Lỗi tạm của polling không được phá màn thanh toán — thử lại lượt sau.
        if (active) setPollState('waiting');
      }
      if (attempts >= maxAttempts) clearInterval(timer);
    }, pollIntervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [bookingId, data, pollIntervalMs]);

  const copyAddInfo = useCallback(async () => {
    if (!data?.addInfo) return;
    try {
      await navigator.clipboard.writeText(data.addInfo);
    } catch {
      // Clipboard bị chặn — khách vẫn thấy nội dung trên màn hình.
    }
  }, [data?.addInfo]);

  if (!bookingId) {
    return (
      <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-center text-sm text-[var(--foreground-muted)]">
        Thiếu mã đặt chỗ — không sinh được mã VietQR. Vui lòng quay lại bước trước.
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[rgb(var(--primary-rgb))]/10 border border-primary/30 rounded-xl p-4 text-center text-sm text-primary">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white via-white to-red-50/20 border-2 border-primary/20 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Bank identity — logo thụ hưởng (fallback: badge chữ). */}
      {showBankHeader && (
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-white shadow-md">
          <div className="flex items-center gap-3.5">
            {data?.bank.logoUrl ? (
              <img
                src={data.bank.logoUrl}
                alt={`Ngân hàng ${data.bank.name}`}
                className="w-12 h-12 rounded-2xl object-contain bg-white shadow-md p-1.5 border border-white/20"
              />
            ) : (
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-inner shrink-0">
                {(data?.bank.name ?? 'VJ').substring(0, 3)}
              </div>
            )}
            <div>
              <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest font-koho">
                Chuyển khoản VietQR
              </div>
              <div className="font-black text-white text-base tracking-wide font-koho">
                {data?.bank.name ?? 'Đang tải...'}
              </div>
              <div className="text-xs text-white/90 font-mono font-semibold">
                {data?.bank.accountNumber} ({data?.bank.accountHolder})
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Nhanh chóng & An toàn
          </div>
        </div>
      )}

      {/* QR payload EMVCo render cục bộ. */}
      <div className="flex flex-col items-center p-6">
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-red-500 to-amber-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
          <div className="relative p-4 bg-white rounded-2xl border-2 border-red-500/20 shadow-xl">
            {qrSvg ? (
              <div
                className="w-48 h-48 sm:w-56 sm:h-56 [&>svg]:w-full [&>svg]:h-full"
                data-testid="vietqr-svg"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-48 h-48 sm:w-56 sm:h-56 bg-red-50/50 rounded-2xl animate-pulse flex items-center justify-center">
                <Icon name="QrCodeIcon" size={48} className="text-red-400" />
              </div>
            )}
            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
              VietQR
            </div>
          </div>
        </div>

        {/* PNR + số tiền + addInfo (nội dung CK chứa mã đặt chỗ). */}
        <div className="w-full mt-6 space-y-3 bg-red-50/40 p-4 rounded-2xl border border-red-500/10">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 font-koho font-semibold">
              Mã đặt chỗ (PNR)
            </span>
            <span className="font-mono font-black text-red-600 text-base tracking-wider bg-white px-2.5 py-0.5 rounded-lg border border-red-200 shadow-sm">
              {data?.pnr ?? '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 font-koho font-semibold">
              Tổng số tiền
            </span>
            <span className="font-black text-red-600 font-koho text-lg bg-white px-2.5 py-0.5 rounded-lg border border-red-200 shadow-sm">
              {(data?.amount ?? 0).toLocaleString('vi-VN')}₫
            </span>
          </div>
          <button
            type="button"
            onClick={copyAddInfo}
            className="w-full flex justify-between items-center gap-2 bg-white hover:bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-sm transition-all group"
          >
            <span className="text-left min-w-0">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-koho">
                Nội dung chuyển khoản (bấm để copy)
              </span>
              <span className="block font-mono font-bold text-slate-800 text-sm truncate group-hover:text-red-600 transition-colors">
                {data?.addInfo ?? '—'}
              </span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors shrink-0">
              <Icon name="ClipboardDocumentIcon" size={18} />
            </div>
          </button>
        </div>

        {/* Polling status. */}
        <div
          data-testid="vietqr-poll-status"
          className={`mt-5 flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold shadow-sm transition-all ${
            pollState === 'paid'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {pollState === 'paid' ? (
            <>
              <Icon name="CheckCircleIcon" size={16} className="text-emerald-600 animate-bounce" />
              Đã nhận được thanh toán thành công — đang mở vé...
            </>
          ) : (
            <>
              <span
                className={`w-2.5 h-2.5 rounded-full bg-red-500 ${pollState === 'checking' ? 'animate-ping' : 'animate-pulse'}`}
              />
              Đang tự động kiểm tra giao dịch (mỗi {Math.round(pollIntervalMs / 1000)} giây)...
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 text-center mt-3 max-w-sm leading-relaxed">
          Mở ứng dụng ngân hàng bất kỳ để quét mã VietQR. Hệ thống sẽ tự động xác nhận ngay khi giao dịch hoàn tất.
        </p>
      </div>
    </div>
  );
}
