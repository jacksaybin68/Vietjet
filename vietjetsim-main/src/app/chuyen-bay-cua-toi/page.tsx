'use client';

// Last updated: 2026-09-09 - Fixed MdFlight import

import React, { useState } from 'react';
import Link from 'next/link';
import { MdFlight as FlightIcon, MdSearch, MdLogin, MdCheckCircle, MdPhone, MdEmail } from 'react-icons/md';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';

const TABS = [
  { id: 'booking', label: 'Mã đặt chỗ' },
  { id: 'eticket', label: 'Mã vé điện tử' },
];

export default function MyFlightsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'booking' | 'eticket'>('booking');
  const [bookingCode, setBookingCode] = useState('');
  const [eticketCode, setEticketCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = tab === 'booking' ? bookingCode : eticketCode;
    if (!code.trim()) {
      toast.error(
        'Lỗi',
        tab === 'booking' ? 'Vui lòng nhập mã đặt chỗ' : 'Vui lòng nhập mã vé điện tử'
      );
      return;
    }
    if (!lastName.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập họ');
      return;
    }
    if (!firstName.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập tên đệm và tên');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    window.location.href = `/dat-ve/${code.trim().toUpperCase()}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* Red top banner with gradient overlay */}
      <div className="relative overflow-hidden bg-gradient-vj pt-[80px] pb-[120px] text-center">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-[1200px] px-4">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-sm">
            <FlightIcon className="text-4xl" />
          </div>
          <h1 className="mb-3 text-3xl sm:text-4xl font-heading-800 leading-none tracking-[-0.02em] text-white">
            CHUYẾN BAY CỦA TÔI
          </h1>
          <p className="mx-auto max-w-[900px] text-base leading-relaxed text-white/90 sm:text-lg">
            Xem chi tiết hành trình đã đặt, đổi lịch trình, mua thêm hành lý, chỗ ngồi và dịch vụ tiện ích.
            Vui lòng điền thông tin bên dưới để tra cứu.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-[900px] px-4 py-10">
        <div className="vj-card">
          {/* Tabs - styled as segmented control */}
          <div className="flex border-b border-vj-text-muted/20 bg-vj-text/5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as 'booking' | 'eticket')}
                className={`flex-1 py-5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  tab === t.id
                    ? 'bg-white text-vj-red border-b-2 border-vjred'
                    : 'text-vj-text-muted hover:text-vj-red hover:bg-vj-text/10'
                }`}
              >
                {t.id === 'booking' ? '📋' : '🎫'} {t.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSearch} className="p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Code field */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-vj-text-muted">
                  {tab === 'booking' ? 'Mã đặt chỗ (PNR)' : 'Mã vé điện tử'}
                  <span className="ml-1 text-vj-red">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tab === 'booking' ? bookingCode : eticketCode}
                    onChange={(e) =>
                      tab === 'booking'
                        ? setBookingCode(e.target.value.toUpperCase())
                        : setEticketCode(e.target.value)
                    }
                    placeholder={tab === 'booking' ? 'Ví dụ: VJ8K3M2' : 'Ví dụ: 7382701234567'}
                    className="w-full vj-input-field px-5 py-3 text-sm text-vjtext placeholder-vj-text-muted/50 focus:border-vj-red focus:ring-2 focus:ring-vj-red/20 transition-all duration-200"
                    maxLength={tab === 'booking' ? 10 : 14}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-vj-text-muted/50">
                    {tab === 'booking'
                      ? `${bookingCode.length}/7`
                      : `${eticketCode.length}/13`}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-vj-text-muted/60">
                  {tab === 'booking'
                    ? 'Mã đặt chỗ gồm 6–7 ký tự, có trong email xác nhận đặt vé.'
                    : 'Mã vé điện tử gồm 13 chữ số, có trên vé điện tử.'}
                </p>
              </div>

              {/* Họ */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-vj-text-muted">
                  Họ<span className="ml-1 text-vj-red">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: NGUYEN"
                  className="w-full vj-input-field px-5 py-3 text-sm text-vjtext placeholder-vj-text-muted/50 focus:border-vj-red focus:ring-2 focus:ring-vj-red/20 transition-all duration-200"
                />
              </div>

              {/* Tên đệm và tên */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-vj-text-muted">
                  Tên đệm và tên<span className="ml-1 text-vj-red">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: VAN AN"
                  className="w-full vj-input-field px-5 py-3 text-sm text-vjtext placeholder-vj-text-muted/50 focus:border-vj-red focus:ring-2 focus:ring-vj-red/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* Info box */}
            <div className="mt-6 rounded-xl border border-vj-yellow/20 bg-vj-yellow/5 px-5 py-4 text-sm text-vj-yellow-dark">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div>
                  <p className="font-semibold">Lưu ý quan trọng:</p>
                  <ul className="mt-2 space-y-1 leading-6 list-disc pl-5">
                    <li>• Họ và tên phải khớp chính xác với thông tin khi đặt vé (không dấu, chữ hoa).</li>
                    <li>• Mã PNR có trong email xác nhận sau khi thanh toán thành công.</li>
                    <li>• Nếu không tìm thấy, vui lòng kiểm tra lại ký tự hoặc liên hệ hỗ trợ.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full vj-btn-primary py-4 text-sm font-bold uppercase tracking-wide text-white flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Đang tìm kiếm...
                </>
              ) : (
                <>
                  <MdSearch className="text-lg" />
                  Tìm kiếm hành trình
                </>
              )}
            </button>
          </form>

          {/* Divider + alternatives */}
          <div className="border-t border-vj-text-muted/10 bg-vj-text/5 px-8 py-8">
            <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wide text-vj-text-muted/50">
              Hoặc thực hiện một trong các thao tác dưới đây
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dang-nhap"
                className="group flex flex-1 items-center justify-center gap-3 rounded-xl border border-vj-red/20 bg-white py-4 text-sm font-semibold text-vj-text transition-all hover:border-vj-red hover:bg-vj-red/5 hover:text-vj-red"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vj-red/10 text-vj-red group-hover:bg-vj-red/20 group-hover:text-vj-red transition-colors">
                  <MdLogin className="text-lg" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Đăng nhập tài khoản</div>
                  <div className="text-[11px] text-vj-text-muted/50 group-hover:text-vj-red/70">
                    Xem lịch sử & quản lý đặt chỗ
                  </div>
                </div>
              </Link>
              <Link
                href="/lam-thu-tuc"
                className="group flex flex-1 items-center justify-center gap-3 rounded-xl border border-vj-yellow/20 bg-white py-4 text-sm font-semibold text-vj-text transition-all hover:border-vj-yellow hover:bg-vj-yellow/5 hover:text-vj-yellow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vj-yellow/10 text-vj-yellow group-hover:bg-vj-yellow/20 group-hover:text-vj-yellow transition-colors">
                  <MdCheckCircle className="text-lg" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Check-in trực tuyến</div>
                  <div className="text-[11px] text-vj-text-muted/50 group-hover:text-vj-yellow/70">
                    Chọn chỗ và in vé ngay
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Help */}
          <div className="mt-8 overflow-hidden rounded-xl bg-vj-card">
            <div className="bg-gradient-to-r from-vj-red to-vj-red-dark px-6 py-4 text-white">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <MdPhone className="text-lg" /> Cần hỗ trợ?
              </h2>
            </div>
            <div className="px-6 py-5">
              <p className="mb-4 text-sm text-vj-text-muted/60 leading-relaxed">
                Nếu không tìm thấy mã đặt chỗ hoặc gặp sự cố khi tra cứu, vui lòng liên hệ bộ phận hỗ trợ của chúng tôi:
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:19001886"
                  className="group flex items-center gap-3 rounded-xl border border-vj-text-muted/30 px-4 py-3 hover:border-vj-red transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vj-red/10 text-vj-red">
                    <MdPhone className="text-lg" />
                  </div>
                  <div>
                    <div className="text-xs text-vj-text-muted/40">Tổng đài hỗ trợ</div>
                    <div className="font-bold text-vj-red">1900 1886</div>
                  </div>
                </a>
                <a
                  href="mailto:support@vietjetair.com"
                  className="group flex items-center gap-3 rounded-xl border border-vj-text-muted/30 px-4 py-3 hover:border-vj-red transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vj-red/10 text-vj-red">
                    <MdEmail className="text-lg" />
                  </div>
                  <div>
                    <div className="text-xs text-vj-text-muted/40">Email hỗ trợ</div>
                    <div className="font-bold text-vj-red">support@vietjetair.com</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}