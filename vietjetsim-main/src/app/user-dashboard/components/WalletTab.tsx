'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  cardBrand: string | null;
  lastFour: string | null;
  cardHolderName: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  bankId: string | null;
  bankName: string | null;
  bankCode: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

// ─── Card Brand Icons ─────────────────────────────────────────────────────────

const CARD_BRANDS: Record<string, { name: string; color: string }> = {
  Visa: { name: ' CREDIT CARD', color: '#1A1F71' },
  Mastercard: { name: 'CARD', color: '#EB001B' },
  Amex: { name: 'CARD', color: '#2E77BC' },
  JCB: { name: 'CARD', color: '#003087' },
};

function getCardBrandLabel(brand: string | null): string {
  if (!brand) return 'CARD';
  return CARD_BRANDS[brand]?.name || brand.toUpperCase();
}

function getCardBrandColor(brand: string | null): string {
  if (!brand) return '#1A2948';
  return CARD_BRANDS[brand]?.color || '#1A2948';
}

// ─── Add Payment Method Modal ───────────────────────────────────────────────

function AddPaymentMethodModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (method: PaymentMethod) => void;
}) {
  const toast = useToast();
  const [methodType, setMethodType] = useState<'card' | 'bank'>('card');
  const [loading, setLoading] = useState(false);

  // Card fields
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');

  // Bank fields
  const [bankName, setBankName] = useState('');
  const [bankId, setBankId] = useState('');

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (methodType === 'card') {
        if (!cardNumber || cardNumber.replace(/\D/g, '').length < 13) {
          toast.error('Lỗi', 'Số thẻ không hợp lệ');
          return;
        }
        if (!cardHolder.trim()) {
          toast.error('Lỗi', 'Vui lòng nhập tên chủ thẻ');
          return;
        }
      } else {
        if (!bankName.trim()) {
          toast.error('Lỗi', 'Vui lòng nhập tên ngân hàng');
          return;
        }
      }

      const payload: Record<string, any> = { type: methodType };

      if (methodType === 'card') {
        payload.cardBrand = cardBrand;
        payload.lastFour = cardNumber.replace(/\D/g, '').slice(-4);
        payload.cardHolderName = cardHolder;
        payload.expiryMonth = parseInt(expiryMonth) || 0;
        payload.expiryYear = parseInt(expiryYear) || 0;
      } else {
        payload.bankName = bankName;
        payload.bankId = bankId;
      }

      const res = await fetch('/api/wallet/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error('Lỗi', data.error || 'Không thể thêm phương thức thanh toán');
        return;
      }

      const method: PaymentMethod = {
        id: data.paymentMethod.id,
        type: data.paymentMethod.type,
        cardBrand: data.paymentMethod.card_brand,
        lastFour: data.paymentMethod.last_four,
        cardHolderName: data.paymentMethod.card_holder_name,
        expiryMonth: data.paymentMethod.expiry_month,
        expiryYear: data.paymentMethod.expiry_year,
        bankId: data.paymentMethod.bank_id,
        bankName: data.paymentMethod.bank_name,
        bankCode: data.paymentMethod.bank_code,
        isDefault: data.paymentMethod.is_default,
        isActive: data.paymentMethod.is_active,
        createdAt: data.paymentMethod.created_at,
      };

      toast.success('Thành công', 'Phương thức thanh toán đã được thêm.');
      onSuccess(method);
      onClose();
    } catch {
      toast.error('Lỗi', 'Đã xảy ra lỗi khi thêm phương thức thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#EC2029]/20 focus:border-[#EC2029]';
  const labelClass = 'block text-sm font-semibold mb-1.5 text-[#1A2948] font-[KoHo,sans-serif]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Thêm phương thức thanh toán
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            <Icon name="XMarkIcon" size={20} className="text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Tabs */}
          <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMethodType('card')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-[KoHo,sans-serif] transition-all ${
                methodType === 'card'
                  ? 'bg-white text-[#EC2029] shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Icon name="CreditCardIcon" size={16} className="inline mr-1.5" />
              Thẻ tín dụng
            </button>
            <button
              type="button"
              onClick={() => setMethodType('bank')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-[KoHo,sans-serif] transition-all ${
                methodType === 'bank'
                  ? 'bg-white text-[#EC2029] shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Icon name="BuildingColumnsIcon" size={16} className="inline mr-1.5" />
              Tài khoản ngân hàng
            </button>
          </div>

          {methodType === 'card' ? (
            <>
              {/* Card Brand */}
              <div>
                <label className={labelClass}>Loại thẻ</label>
                <select
                  value={cardBrand}
                  onChange={(e) => setCardBrand(e.target.value)}
                  className={inputClass}
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">American Express</option>
                  <option value="JCB">JCB</option>
                </select>
              </div>

              {/* Card Number */}
              <div>
                <label className={labelClass}>Số thẻ</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className={inputClass}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>

              {/* Card Holder */}
              <div>
                <label className={labelClass}>Tên chủ thẻ</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="NGUYEN VAN A"
                />
              </div>

              {/* Expiry */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tháng hết hạn</label>
                  <select
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString().padStart(2, '0')}>
                        {m.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Năm hết hạn</label>
                  <select
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">YYYY</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Bank Name */}
              <div>
                <label className={labelClass}>Tên ngân hàng</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="VietinBank">VietinBank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="Agribank">Agribank</option>
                  <option value="ACB">ACB</option>
                  <option value="TPBank">TPBank</option>
                  <option value="MBBank">MBBank</option>
                  <option value="VPBank">VPBank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="Sacombank">Sacombank</option>
                  <option value="Shinhan Bank">Shinhan Bank</option>
                  <option value="Citibank">Citibank</option>
                  <option value="HSBC">HSBC</option>
                </select>
              </div>

              {/* Bank ID */}
              <div>
                <label className={labelClass}>Số tài khoản</label>
                <input
                  type="text"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                  placeholder="1234567890"
                  maxLength={14}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#EC2029] text-white rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Icon name="CheckIcon" size={18} />
                  Thêm ngay
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-stone-200 transition-all"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── WalletTab Component ─────────────────────────────────────────────────────

interface WalletTabProps {
  user: { id: string; email: string; fullName: string };
}

export default function WalletTab({ user }: WalletTabProps) {
  const toast = useToast();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, methodsRes] = await Promise.all([
        fetch('/api/wallet', { credentials: 'include' }),
        fetch('/api/wallet/payment-methods', { credentials: 'include' }),
      ]);

      const walletData = await walletRes.json();
      const methodsData = await methodsRes.json();

      if (walletRes.ok && walletData.wallet) {
        setWallet(walletData.wallet);
      }
      if (methodsRes.ok && methodsData.paymentMethods) {
        setMethods(
          methodsData.paymentMethods.map((m: any) => ({
            id: m.id,
            type: m.type,
            cardBrand: m.card_brand,
            lastFour: m.last_four,
            cardHolderName: m.card_holder_name,
            expiryMonth: m.expiry_month,
            expiryYear: m.expiry_year,
            bankId: m.bank_id,
            bankName: m.bank_name,
            bankCode: m.bank_code,
            isDefault: m.is_default,
            isActive: m.is_active,
            createdAt: m.created_at,
          }))
        );
      }
    } catch {
      toast.error('Lỗi', 'Không thể tải dữ liệu ví.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) {
      toast.error('Lỗi', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }

    setTopupLoading(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'topup',
          amount,
          description: 'Nạp tiền vào ví VietjetSim',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error('Lỗi', data.error || 'Nạp tiền thất bại.');
        return;
      }

      setWallet((prev) =>
        prev ? { ...prev, balance: data.wallet.balance } : null
      );
      setTopupAmount('');
      toast.success('Thành công', `Đã nạp ${amount.toLocaleString('vi-VN')} VND vào ví.`);
    } catch {
      toast.error('Lỗi', 'Nạp tiền thất bại. Vui lòng thử lại.');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const res = await fetch(`/api/wallet/payment-methods/${methodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'setDefault' }),
      });

      if (res.ok) {
        setMethods((prev) =>
          prev.map((m) => ({ ...m, isDefault: m.id === methodId }))
        );
        toast.success('Thành công', 'Đã đặt làm phương thức mặc định.');
      }
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật.');
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Bạn có chắc muốn xóa phương thức thanh toán này?')) return;

    setDeletingId(methodId);
    try {
      const res = await fetch(`/api/wallet/payment-methods/${methodId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMethods((prev) => prev.filter((m) => m.id !== methodId));
        toast.success('Đã xóa', 'Phương thức thanh toán đã được xóa.');
      }
    } catch {
      toast.error('Lỗi', 'Không thể xóa phương thức.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMethodAdded = (method: PaymentMethod) => {
    setMethods((prev) =>
      method.isDefault
        ? [method, ...prev.map((m) => ({ ...m, isDefault: false }))]
        : [method, ...prev]
    );
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-48 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Ví VietjetSim
          </h2>
          <p className="text-sm text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
            Quản lý số dư và phương thức thanh toán
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #EC2029 0%, #C41017 50%, #991B1B 100%)',
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="WalletIcon" size={20} className="text-white/70" />
            <span className="text-sm text-white/70 font-[Be Vietnam Pro,sans-serif]">
              Số dư ví
            </span>
          </div>

          <div className="text-4xl font-bold font-[KoHo,sans-serif] mb-6">
            {formatCurrency(wallet?.balance || 0)}
          </div>

          {/* Topup Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={topupAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTopupAmount(val ? parseInt(val).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="Nhập số tiền nạp"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 font-[Be Vietnam Pro,sans-serif]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 text-sm">VND</span>
              </div>
              <button
                onClick={handleTopup}
                disabled={topupLoading || !topupAmount}
                className="px-6 py-3 bg-white text-[#EC2029] rounded-xl font-bold text-sm font-[KoHo,sans-serif] hover:bg-white/90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {topupLoading ? (
                  <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                ) : (
                  'Nạp tiền'
                )}
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              {[100000, 200000, 500000, 1000000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt.toLocaleString('vi-VN'))}
                  className="flex-1 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold text-white transition-colors font-[Be Vietnam Pro,sans-serif]"
                >
                  {amt >= 1000000
                    ? `${(amt / 1000000).toFixed(0)}M`
                    : `${(amt / 1000).toFixed(0)}K`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="CreditCardIcon" size={20} className="text-[#EC2029]" />
            <h3 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948]">
              Phương thức thanh toán
            </h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#EC2029] text-white rounded-lg text-sm font-semibold font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all active:scale-95 shadow-sm"
          >
            <Icon name="PlusIcon" size={16} />
            Thêm mới
          </button>
        </div>

        <div className="divide-y divide-stone-100">
          {methods.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="CreditCardIcon" size={28} className="text-stone-400" />
              </div>
              <p className="text-stone-500 text-sm font-[Be Vietnam Pro,sans-serif]">
                Chưa có phương thức thanh toán nào.
              </p>
              <p className="text-stone-400 text-xs mt-1 font-[Be Vietnam Pro,sans-serif]">
                Thêm thẻ hoặc tài khoản ngân hàng để thanh toán nhanh hơn.
              </p>
            </div>
          ) : (
            methods.map((method) => (
              <div key={method.id} className="p-4 flex items-center gap-4">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${getCardBrandColor(method.cardBrand)}15` }}
                >
                  {method.type === 'card' ? (
                    <Icon
                      name="CreditCardIcon"
                      size={22}
                      style={{ color: getCardBrandColor(method.cardBrand) }}
                    />
                  ) : (
                    <Icon name="BuildingColumnsIcon" size={22} className="text-[#1A2948]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1A2948] font-[KoHo,sans-serif]">
                      {method.type === 'card'
                        ? `${getCardBrandLabel(method.cardBrand)} •••• ${method.lastFour}`
                        : method.bankName || 'Ngân hàng'}
                    </span>
                    {method.isDefault && (
                      <span className="px-2 py-0.5 bg-[#FFD400]/20 text-[#1A2948] rounded-full text-xs font-semibold font-[Be Vietnam Pro,sans-serif]">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 font-[Be Vietnam Pro,sans-serif]">
                    {method.type === 'card'
                      ? `${method.cardHolderName || ''}${method.expiryMonth ? ` · Hết hạn ${method.expiryMonth.toString().padStart(2, '0')}/${method.expiryYear}` : ''}`
                      : method.bankId
                      ? `Số TK: ${method.bankId}`
                      : 'Tài khoản ngân hàng'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="px-3 py-1.5 text-xs text-stone-500 hover:text-[#EC2029] hover:bg-stone-100 rounded-lg transition-colors font-semibold font-[Be Vietnam Pro,sans-serif]"
                    >
                      Đặt mặc định
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(method.id)}
                    disabled={deletingId === method.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Icon
                      name="TrashIcon"
                      size={16}
                      className={deletingId === method.id ? 'animate-spin' : ''}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <AddPaymentMethodModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMethodAdded}
        />
      )}
    </div>
  );
}
