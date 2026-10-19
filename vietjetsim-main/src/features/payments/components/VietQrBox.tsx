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
    <div className="bg-white border-2 border-primary/15 rounded-2xl overflow-hidden shadow-lg">
      {/* Bank identity — logo thụ hưởng (fallback: badge chữ). */}
      {showBankHeader && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-[var(--surface)] to-[var(--background)] border-b border-[var(--border)]">
          {data?.bank.logoUrl ? (
            // Logo ngân hàng do admin cấu hình — không đoán được domain nên dùng img thường.

            <img
              src={data.bank.logoUrl}
              alt={`Ngân hàng ${data.bank.name}`}
              className="w-10 h-10 rounded-xl object-contain bg-white border border-[var(--border)] p-1"
            />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0">
              {(data?.bank.name ?? 'VJ').substring(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
              Ngân hàng thụ hưởng
            </div>
            <div className="font-black text-[var(--foreground)] text-sm truncate">
              {data?.bank.name ?? 'Đang tải...'}
            </div>
            <div className="text-xs text-[var(--foreground-muted)] truncate">
              {data?.bank.accountHolder} · {data?.bank.accountNumber}
            </div>
          </div>
        </div>
      )}

      {/* QR payload EMVCo render cục bộ. */}
      <div className="flex flex-col items-center p-4">
        <div className="p-2 bg-white rounded-2xl border-2 border-primary/20 shadow-md">
          {qrSvg ? (
            <div
              className="w-44 h-44 sm:w-52 sm:h-52 [&>svg]:w-full [&>svg]:h-full"
              data-testid="vietqr-svg"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="w-44 h-44 sm:w-52 sm:h-52 bg-[var(--surface-2)] rounded-xl animate-pulse flex items-center justify-center">
              <Icon name="QrCodeIcon" size={40} className="text-[var(--foreground-subtle)]" />
            </div>
          )}
        </div>

        {/* PNR + số tiền + addInfo (nội dung CK chứa mã đặt chỗ). */}
        <div className="w-full mt-4 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground-muted)] text-xs">Mã đặt chỗ</span>
            <span className="font-mono font-black text-[var(--foreground)] tracking-wider">
              {data?.pnr ?? '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground-muted)] text-xs">Số tiền</span>
            <span className="font-black text-primary">
              {(data?.amount ?? 0).toLocaleString('vi-VN')}₫
            </span>
          </div>
          <button
            type="button"
            onClick={copyAddInfo}
            className="w-full flex justify-between items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 hover:bg-primary/10 transition-colors"
          >
            <span className="text-left min-w-0">
              <span className="block text-xs font-bold text-primary/60 uppercase tracking-widest">
                Nội dung CK (PNR)
              </span>
              <span className="block font-mono font-bold text-primary text-sm truncate">
                {data?.addInfo ?? '—'}
              </span>
            </span>
            <Icon name="ClipboardDocumentIcon" size={16} className="text-primary shrink-0" />
          </button>
        </div>

        {/* Polling status. */}
        <div
          data-testid="vietqr-poll-status"
          className={`mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
            pollState === 'paid'
              ? 'bg-[rgb(var(--vj-green-rgb))]/10 text-[var(--vj-green)] border border-[rgb(var(--vj-green-rgb))]/30'
              : 'bg-primary/5 text-primary border border-primary/20'
          }`}
        >
          {pollState === 'paid' ? (
            <>
              <Icon name="CheckCircleIcon" size={14} />
              Đã nhận được thanh toán — đang mở vé...
            </>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full bg-primary ${pollState === 'checking' ? 'animate-ping' : 'animate-pulse'}`}
              />
              Đang tự động kiểm tra giao dịch (mỗi {Math.round(pollIntervalMs / 1000)} giây)...
            </>
          )}
        </div>
        <p className="text-xs text-[var(--foreground-subtle)] text-center mt-2 max-w-xs">
          Mở app ngân hàng (VCB, MB, Techcombank, VPBank...) quét mã — hệ thống tự nhận giao dịch,
          không cần bấm xác nhận.
        </p>
      </div>
    </div>
  );
}
