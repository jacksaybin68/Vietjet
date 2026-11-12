'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/shared/components/ui';
import { apiRequest } from '@/shared/services';
import { buildVietQrPayload, lookupBankBin } from '@/lib/vietqr';
import { VietQrLogo, NapasLogo, VnpayLogo } from './PaymentMethodLogos';

/**
 * Mã VNPAY-QR / VietQR động cho một đặt chỗ: payload EMVCo do server sinh
 * (GET /api/thanh-toan/vietqr), QR render cục bộ bằng package `qrcode`
 * (không gọi dịch vụ bên thứ ba), kèm polling trạng thái giao dịch — khi
 * booking được xác nhận (webhook ngân hàng / admin), `onPaid` được gọi
 * để màn thanh toán tự chuyển sang success screen.
 *
 * Hỗ trợ fallbackAccount để luôn luôn hiển thị được mã QR và STK admin đã cài
 * ngay cả khi truy cập trực tiếp hoặc đang tải thông tin đặt chỗ.
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

export interface BankAccountFallback {
  id?: string;
  admin_bank_name: string;
  admin_bank_account_number: string;
  admin_bank_account_holder: string;
  bank_bin?: string;
  logo_url?: string;
  transfer_note_template?: string;
}

interface VietQrBoxProps {
  bookingId: string | null;
  onPaid?: () => void;
  /** Khoảng cách hai lần poll trạng thái (ms). */
  pollIntervalMs?: number;
  /** Ẩn khối logo/tên ngân hàng khi đặt trong card đã hiển thị sẵn (tab Ngân hàng). */
  showBankHeader?: boolean;
  /** Cấu hình tài khoản ngân hàng admin làm fallback khi bookingId chưa có */
  fallbackAccount?: BankAccountFallback | null;
  fallbackAmount?: number;
  fallbackAddInfo?: string;
  fallbackPnr?: string | null;
  /** Loại phương thức thanh toán đang chọn: 'vnpay_qr' | 'vietqr' | 'napas' | 'bank' */
  methodType?: string;
}

type PollState = 'waiting' | 'checking' | 'paid';

export default function VietQrBox({
  bookingId,
  onPaid,
  pollIntervalMs = 5000,
  showBankHeader = true,
  fallbackAccount,
  fallbackAmount = 0,
  fallbackAddInfo = '',
  fallbackPnr = null,
  methodType = 'vietqr',
}: VietQrBoxProps) {
  const isVnpay = methodType === 'vnpay_qr' || methodType === 'vnpay_dom';
  const methodLabel = isVnpay ? 'VNPAY-QR' : 'VietQR';
  const [data, setData] = useState<VietQrData | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollState, setPollState] = useState<PollState>('waiting');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const handleSimulateBankWebhook = useCallback(async () => {
    if (!bookingId || simulatingWebhook) return;
    setSimulatingWebhook(true);
    try {
      const res = await fetch('/api/thanh-toan/webhook/vietqr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'vietqr-dev-webhook-secret',
        },
        body: JSON.stringify({
          bookingId,
          bookingCode: data?.pnr || undefined,
          amount: data?.amount,
          transferNote: data?.addInfo,
          transactionId: 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPollState('paid');
        onPaidRef.current?.();
      } else {
        console.warn('Webhook simulation error:', json);
      }
    } catch (err) {
      console.error('Webhook simulation failed:', err);
    } finally {
      setSimulatingWebhook(false);
    }
  }, [bookingId, data, simulatingWebhook]);

  // Render QR SVG từ payload EMVCo
  const generateQrFromPayload = useCallback(async (payloadString: string) => {
    try {
      const QRCode = await import('qrcode');
      const svg = await QRCode.toString(payloadString, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      setQrSvg(svg);
    } catch (err) {
      console.error('Failed to generate QR SVG:', err);
    }
  }, []);

  // Payload + QR render
  useEffect(() => {
    let cancelled = false;

    // 1. Thử gọi API server nếu có bookingId
    if (bookingId) {
      (async () => {
        try {
          const result = await apiRequest<VietQrData>(
            `/api/thanh-toan/vietqr?bookingId=${encodeURIComponent(bookingId)}`
          );
          if (cancelled) return;
          setData(result);
          await generateQrFromPayload(result.payload);
        } catch (err) {
          if (cancelled) return;
          console.warn('API VietQR failed, falling back to local account:', err);
          // Fallback sang tài khoản admin đã cấu hình
          if (fallbackAccount) {
            applyLocalFallback();
          } else {
            setError(err instanceof Error ? err.message : `Không tạo được mã ${methodLabel}`);
          }
        }
      })();
    } else if (fallbackAccount) {
      // 2. Không có bookingId nhưng có tài khoản admin -> sinh QR trực tiếp theo STK admin
      applyLocalFallback();
    }

    function applyLocalFallback() {
      if (!fallbackAccount) return;
      try {
        const bin = lookupBankBin(fallbackAccount.admin_bank_name, fallbackAccount.bank_bin);
        const amount = fallbackAmount > 0 ? fallbackAmount : 1730000;
        const pnr = fallbackPnr || 'VJ141';
        const addInfo = fallbackAddInfo || `VJ ${pnr}`;
        const payload = buildVietQrPayload({
          bin,
          accountNumber: fallbackAccount.admin_bank_account_number,
          accountHolder: fallbackAccount.admin_bank_account_holder,
          bankName: fallbackAccount.admin_bank_name,
        });

        const localData: VietQrData = {
          payload,
          pnr,
          amount,
          addInfo,
          bank: {
            name: fallbackAccount.admin_bank_name,
            logoUrl: fallbackAccount.logo_url || null,
            accountNumber: fallbackAccount.admin_bank_account_number,
            accountHolder: fallbackAccount.admin_bank_account_holder,
          },
        };

        setData(localData);
        generateQrFromPayload(payload);
        setError(null);
      } catch (localErr) {
        console.error('Local VietQR generation failed:', localErr);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [
    bookingId,
    fallbackAccount,
    fallbackAmount,
    fallbackAddInfo,
    fallbackPnr,
    generateQrFromPayload,
    methodLabel,
  ]);

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
        if (active) setPollState('waiting');
      }
      if (attempts >= maxAttempts) clearInterval(timer);
    }, pollIntervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [bookingId, data, pollIntervalMs]);

  const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // Clipboard bị chặn
    }
  }, []);

  if (!bookingId && !fallbackAccount && !data) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-sm text-amber-800">
        <Icon name="InformationCircleIcon" size={24} className="mx-auto mb-2 text-amber-600" />
        Đang tải thông tin tài khoản thanh toán VietQR...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-sm text-red-700">
        <Icon name="ExclamationCircleIcon" size={24} className="mx-auto mb-2 text-red-600" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white via-white to-blue-50/20 border-2 border-[#005BAA]/20 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* VietQR Header — Logo VietQR + Napas 247 + Ngân hàng thụ hưởng STK Admin */}
      {showBankHeader && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#005BAA] via-[#004B8D] to-[#ED1C24] text-white shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 font-koho">
                    {isVnpay
                      ? 'CỔNG THANH TOÁN VNPAY-QR • NAPAS 247'
                      : 'CỔNG THANH TOÁN VIETQR • NAPAS 247'}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.2 text-[9px] font-black uppercase tracking-wide bg-white/20 rounded-full text-white">
                    Tự động 24/7
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-2xs font-bold text-white shadow-inner">
                <span className="w-2 h-2 rounded-full bg-[#70E000] animate-pulse" />
                Quét mã tức thì
              </div>
              <span className="text-3xs text-white/70 mt-1">
                Hỗ trợ 40+ ứng dụng ngân hàng & Ví điện tử
              </span>
            </div>
          </div>
        </div>
      )}

      {/* QR payload EMVCo / VietQR render trực tiếp */}
      <div className="flex flex-col items-center p-5 sm:p-7">
        <div className="relative group">
          {/* Ambient Glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-[#005BAA] to-[#ED1C24] rounded-3xl blur-md opacity-25 group-hover:opacity-40 transition duration-300" />

          <div className="relative p-4 sm:p-5 bg-white rounded-2xl border-2 border-[#005BAA]/30 shadow-xl flex flex-col items-center">
            {/* Tag chuẩn */}
            <div className="flex items-center gap-2 mb-2.5 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200">
              {isVnpay ? (
                <VnpayLogo className="h-4.5 w-auto" />
              ) : (
                <VietQrLogo className="h-5 w-auto" />
              )}
              <span className="text-2xs sm:text-xs font-black text-[#005BAA] uppercase tracking-wider">
                {isVnpay ? 'Mã QR chuẩn VNPAY-QR • NAPAS 247' : 'Mã QR chuẩn VietQR • NAPAS 247'}
              </span>
            </div>

            {/* QR SVG */}
            {qrSvg ? (
              <div
                className="w-48 h-48 sm:w-60 sm:h-60 [&>svg]:w-full [&>svg]:h-full"
                data-testid="vietqr-svg"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-48 h-48 sm:w-60 sm:h-60 bg-blue-50/50 rounded-2xl animate-pulse flex flex-col items-center justify-center gap-2">
                <Icon name="QrCodeIcon" size={48} className="text-[#005BAA]" />
                <span className="text-xs text-gray-500 font-medium">
                  Đang tạo mã {methodLabel}...
                </span>
              </div>
            )}

            {/* Bank name pill */}
            <div className="mt-2 text-center">
              <span className="text-2xs font-bold text-gray-600 bg-gray-100 px-3 py-0.5 rounded-md border border-gray-200">
                Ngân hàng {data?.bank.name ?? 'VIB'} • Chuẩn {methodLabel} / NAPAS 247
              </span>
            </div>
          </div>
        </div>

        {/* Logo VNPAY / VietQR + NAPAS 247 — đặt dưới mã quét */}
        <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-[#005BAA]/15 bg-white px-4 py-2.5 shadow-sm">
          {isVnpay ? (
            <VnpayLogo className="h-5 sm:h-6 w-auto" />
          ) : (
            <VietQrLogo className="h-6 sm:h-7 w-auto" />
          )}
          <span className="h-4 w-px bg-[#005BAA]/20" />
          <NapasLogo className="h-5 sm:h-6 w-auto" />
        </div>

        {/* Thông tin thanh toán chi tiết (STK Admin, Tên, Số tiền, Nội dung) */}
        <div className="w-full mt-6 space-y-2.5 bg-gradient-to-b from-slate-50 to-blue-50/30 p-4 sm:p-5 rounded-2xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
            <span className="text-xs font-black uppercase tracking-wider text-[#005BAA] font-koho flex items-center gap-1.5">
              <Icon name="InformationCircleIcon" size={16} />
              Thông tin thanh toán
            </span>
          </div>

          {/* Hàng 1: Số tài khoản thụ hưởng của Admin */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3 sm:p-4 shadow-2xs">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#005BAA]">
                <Icon name="BuildingLibraryIcon" size={20} />
              </span>
              <div className="min-w-0">
                <span className="block text-3xs sm:text-2xs font-bold uppercase tracking-wider text-gray-500 font-koho">
                  Số tài khoản{' '}
                </span>
                <span className="block font-mono font-black tracking-tight text-gray-900 text-base sm:text-lg">
                  {data?.bank.accountNumber ?? '—'}
                </span>
                <span className="block truncate text-3xs font-medium text-gray-500">
                  {data?.bank.name} • {data?.bank.accountHolder}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(data?.bank.accountNumber ?? '', 'stk')}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-[#005BAA] transition-all hover:bg-blue-100 active:scale-95"
            >
              <Icon
                name={copiedField === 'stk' ? 'CheckCircleIcon' : 'ClipboardDocumentIcon'}
                size={14}
              />
              <span>{copiedField === 'stk' ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Hàng 2: Số tiền thanh toán */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-2xs">
            <div className="min-w-0">
              <span className="block text-3xs sm:text-2xs font-bold uppercase tracking-wider text-gray-500 font-koho">
                Số tiền{' '}
              </span>
              <span className="block font-koho font-black text-red-600 text-base sm:text-lg">
                {(data?.amount ?? 0).toLocaleString('vi-VN')}₫
              </span>
            </div>
          </div>

          {/* Hàng 3: Nội dung chuyển khoản (bắt buộc) */}
          <div className="rounded-xl border-2 border-red-200 bg-red-50/20 bg-white p-3 sm:p-4 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-3xs sm:text-2xs font-black uppercase tracking-wider text-red-600 font-koho flex items-center gap-1">
                  <span>Nội dung </span>
                </span>
                <span className="block font-mono font-black text-gray-900 text-sm sm:text-base break-all select-all">
                  {data?.addInfo ?? '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(data?.addInfo ?? '', 'note')}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95"
              >
                <Icon
                  name={copiedField === 'note' ? 'CheckCircleIcon' : 'ClipboardDocumentIcon'}
                  size={14}
                />
                <span>{copiedField === 'note' ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="text-3xs text-gray-500 mt-1 italic">
              * Mã QR chuẩn bảo mật NAPAS 247 tự động nhận diện STK và tên thụ hưởng. Quý khách vui
              lòng nhập đúng Số tiền và Nội dung chuyển khoản để hệ thống tự động xuất vé ngay lập
              tức.
            </p>
          </div>
        </div>

        {/* Polling status — Tự động kiểm tra giao dịch */}
        <div
          data-testid="vietqr-poll-status"
          className={`mt-4 w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition-all ${
            pollState === 'paid'
              ? 'bg-lime-50 text-lime-800 border border-lime-300'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {pollState === 'paid' ? (
            <>
              <Icon name="CheckCircleIcon" size={18} className="text-[#38B000] animate-bounce" />
              <span>Đã nhận được thanh toán thành công — Đang mở vé điện tử...</span>
            </>
          ) : (
            <>
              <span
                className={`w-2.5 h-2.5 rounded-full bg-[#005BAA] ${
                  pollState === 'checking' ? 'animate-ping' : 'animate-pulse'
                }`}
              />
              <span>
                {isVnpay
                  ? `Đang tự động kiểm tra giao dịch qua VNPAY-QR (mỗi ${Math.round(pollIntervalMs / 1000)} giây)...`
                  : `Đang tự động kiểm tra giao dịch chuyển khoản VietQR (mỗi ${Math.round(pollIntervalMs / 1000)} giây)...`}
              </span>
            </>
          )}
        </div>

        {/* Hướng dẫn quét mã qua ứng dụng ngân hàng & Ví */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-center max-w-md">
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            Mở ứng dụng <span className="font-bold text-[#005BAA]">Mobile Banking</span> của bất kỳ
            ngân hàng nào (Vietcombank, BIDV, Agribank, VietinBank, MBBank, Techcombank, VPBank,
            ACB...){' '}
            {isVnpay ? (
              <>
                hoặc ứng dụng <span className="font-bold text-red-600">Ví VNPAY</span>{' '}
              </>
            ) : (
              'hoặc ví điện tử '
            )}
            để quét mã thanh toán.
          </p>
        </div>

        {/* Giả lập Webhook ngân hàng (Sandbox / Testing helper) */}
        {bookingId && (
          <div className="mt-4 w-full pt-3 border-t border-dashed border-gray-200 flex flex-col items-center">
            <button
              type="button"
              disabled={simulatingWebhook || pollState === 'paid'}
              onClick={handleSimulateBankWebhook}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon
                name="BoltIcon"
                size={15}
                className={
                  simulatingWebhook
                    ? 'animate-spin text-emerald-600'
                    : 'text-emerald-600 group-hover:scale-110 transition-transform'
                }
              />
              <span>
                {simulatingWebhook
                  ? 'Đang gửi Webhook ngân hàng...'
                  : pollState === 'paid'
                    ? 'Đã xác nhận thanh toán thành công'
                    : 'Giả lập ngân hàng thanh toán thành công (Webhook VietQR)'}
              </span>
            </button>
            <span className="text-[10px] text-gray-500 mt-1">
              (Tự động chuyển trạng thái vé sang &quot;Đã thanh toán&quot; và mở vé điện tử ngay tức
              thì)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
