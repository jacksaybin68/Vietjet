'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MdLuggage, MdAdd, MdCheckCircle, MdPayment } from 'react-icons/md';
import { apiRequest, ApiRequestError } from '@/shared/services';
import type { BaggagePackage } from '../pricing';

interface BaggagePurchaseModalProps {
  /** UUID (hoặc PNR) của booking. */
  bookingId: string;
  /** PNR hiển thị cho khách. */
  pnr: string;
  /** Danh sách gói hành lý — giá do server tính lại, client không gửi giá. */
  packages: readonly BaggagePackage[];
  onClose: () => void;
  /** Gọi lại sau khi mua, kèm số tiền cần thanh toán bổ sung. */
  onPurchased: (pendingAmount: number) => void;
}

interface BaggageRecord {
  id: string;
  package_id: string;
  weight_kg: number;
  unit_price: number;
  quantity: number;
  status: string;
}

/**
 * Mua thêm hành lý ký gửi sau khi đã đặt vé.
 *
 * Client chỉ gửi `package_id` — giá luôn do server tính lại từ
 * `pricing.ts`, nếu không client sửa giá sẽ bán hành lý với giá 1₫.
 */
export default function BaggagePurchaseModal({
  bookingId,
  pnr,
  packages,
  onClose,
  onPurchased,
}: BaggagePurchaseModalProps) {
  const [selected, setSelected] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [owned, setOwned] = useState<BaggageRecord[]>([]);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<{ baggage: BaggageRecord[]; pendingAmount: number }>(
          `/api/dat-ve/${encodeURIComponent(bookingId)}/dich-vu`
        );
        if (cancelled) return;
        setOwned(data.baggage ?? []);
        setPendingAmount(data.pendingAmount ?? 0);
      } catch {
        // Danh sách đã mua không tải được thì vẫn mua được — không chặn modal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const handleAdd = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ pendingAmount: number }>(
        `/api/dat-ve/${encodeURIComponent(bookingId)}/dich-vu`,
        {
          method: 'POST',
          body: { package_id: selected, quantity },
        }
      );
      setPendingAmount(data.pendingAmount ?? 0);
      onPurchased(data.pendingAmount ?? 0);
      // Thêm lại vào danh sách để khách thấy ngay gói vừa chọn.
      setOwned((prev) => [
        ...prev,
        {
          id: `${selected}-${Date.now()}`,
          package_id: selected,
          weight_kg: packages.find((p) => p.id === selected)?.weight ?? 0,
          unit_price: packages.find((p) => p.id === selected)?.price ?? 0,
          quantity,
          status: 'pending',
        },
      ]);
      setSelected('');
      setQuantity(1);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Không thêm được hành lý.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selected, quantity, bookingId, packages, onPurchased]);

  /**
   * Thanh toán ngay phần hành lý đang chờ.
   *
   * Số tiền KHÔNG gửi lên — server tự tính từ `booking_baggage`. Gửi số tiền
   * của client là cách bán hành lý 20kg với giá 1₫.
   */
  const handlePay = useCallback(async () => {
    setPaying(true);
    setError(null);
    try {
      await apiRequest<{ amount: number; message: string }>(
        `/api/dat-ve/${encodeURIComponent(bookingId)}/dich-vu/thanh-toan`,
        { method: 'POST', body: { method: 'wallet' } }
      );
      setPendingAmount(0);
      setOwned((prev) => prev.map((record) => ({ ...record, status: 'paid' })));
      onPurchased(0);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Không thanh toán được.';
      setError(message);
    } finally {
      setPaying(false);
    }
  }, [bookingId, onPurchased]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-vj bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-primary via-red-600 to-primary px-5 py-4 text-white">
          <div>
            <h3 className="font-black uppercase tracking-wide">Mua thêm hành lý ký gửi</h3>
            <p className="mt-0.5 text-2xs text-white/85">
              Mã đặt chỗ: <strong className="text-white">{pnr || '—'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
          {error && (
            <p className="rounded-vj border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-gray-600">Chọn gói hành lý</p>
            <div className="grid gap-2">
              {packages.map((pkg) => {
                const active = selected === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelected(active ? '' : pkg.id)}
                    className={`flex items-center justify-between rounded-vj border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-primary bg-[rgb(var(--vj-red-rgb))]/5'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MdLuggage className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-gray-900">{pkg.label}</span>
                    </span>
                    <span className="text-xs font-black text-primary">
                      {pkg.price.toLocaleString('vi-VN')}₫
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-vj border border-gray-200 bg-white px-3 py-2.5">
            <span className="text-xs font-bold uppercase text-gray-600">Số lượng</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-7 w-7 rounded-full border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                aria-label="Giảm số lượng"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-black text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(5, q + 1))}
                className="h-7 w-7 rounded-full border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>
          </div>

          {owned.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-600">Đã mua thêm</p>
              {owned.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-vj border border-gray-200 bg-white px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <MdCheckCircle className="h-4 w-4 text-emerald-600" />
                    {packages.find((p) => p.id === record.package_id)?.label ?? record.package_id}
                    {record.quantity > 1 ? ` × ${record.quantity}` : ''}
                  </span>
                  <span className="font-black text-gray-900">
                    {(record.unit_price * record.quantity).toLocaleString('vi-VN')}₫
                  </span>
                </div>
              ))}
            </div>
          )}

          {pendingAmount > 0 && (
            <div className="space-y-2">
              <p className="rounded-vj border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                Cần thanh toán bổ sung: {pendingAmount.toLocaleString('vi-VN')}₫
              </p>
              <button
                type="button"
                disabled={paying}
                onClick={() => void handlePay()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-vj bg-[var(--vj-red)] px-4 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-vj-red-dark disabled:opacity-50"
              >
                <MdPayment className="h-4 w-4" />
                {paying
                  ? 'Đang thanh toán...'
                  : `Thanh toán ngay ${pendingAmount.toLocaleString('vi-VN')}₫`}
              </button>
              <p className="text-2xs text-[var(--foreground-muted)]">
                Thanh toán bằng ví Vietjet hoặc thẻ. Số tiền do hệ thống xác nhận.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4">
          <p className="text-2xs text-gray-500">
            Giá do hệ thống xác nhận. Hành lý chưa thanh toán sẽ được tính tiền khi làm thủ tục tại
            sân bay.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-vj bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-200"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={!selected || loading}
              onClick={() => void handleAdd()}
              className="inline-flex items-center gap-1.5 rounded-vj bg-primary px-5 py-2 text-xs font-black text-white shadow-md transition-all hover:bg-primary-dark disabled:opacity-50"
            >
              <MdAdd className="h-4 w-4" />
              {loading ? 'Đang thêm...' : 'Thêm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
