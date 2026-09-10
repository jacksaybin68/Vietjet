'use client';

// Last updated: 2026-09-09 - Fixed MdFlight import

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/shared/components/navigation';
import {
  MdFlight as FlightIcon,
  MdSearch,
  MdLogin,
  MdCheckCircle,
  MdPhone,
  MdEmail,
  MdAccessTime,
} from 'react-icons/md';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';

const TABS = [
  { id: 'booking', label: 'Mã đặt chỗ' },
  { id: 'eticket', label: 'Mã vé điện tử' },
];

interface RecentBooking {
  id: string;
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  created_at: string;
  // Check-in status (added)
  has_check_in?: boolean;
  check_in_number?: string;
  check_in_status?: string;
  boarding_pass_number?: string;
  seat_number?: string;
  check_in_time?: string;
}

const STATUS_LABELS: Record<RecentBooking['status'], { label: string; color: string }> = {
  pending: {
    label: 'Chờ thanh toán',
    color: 'text-[var(--vj-yellow)] dark:text-[var(--vj-yellow)]',
  },
  confirmed: { label: 'Đã xác nhận', color: 'text-[var(--vj-red)] dark:text-[var(--vj-red)]' },
  completed: { label: 'Hoàn thành', color: 'text-[var(--vj-blue)] dark:text-[var(--vj-blue)]' },
  cancelled: {
    label: 'Đã hủy',
    color: 'text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]',
  },
  refunded: {
    label: 'Đã hoàn tiền',
    color: 'text-[var(--vj-purple)] dark:text-[var(--vj-purple)]',
  },
};

export default function MyFlightsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'booking' | 'eticket'>('booking');
  const [bookingCode, setBookingCode] = useState('');
  const [eticketCode, setEticketCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/dat-ve?limit=10', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setBookings([]);
        return;
      }
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      const data = await res.json();

      // Fetch check-in status for each booking
      const bookingsWithCheckIn = await Promise.all(
        (data.bookings || []).map(async (booking: any) => {
          try {
            const checkInRes = await fetch(`/api/checkin/status/${booking.id}`, {
              cache: 'no-store',
              credentials: 'include',
            });
            if (checkInRes.ok) {
              const checkInData = await checkInRes.json();
              return {
                ...booking,
                has_check_in: checkInData.checkInStatus?.has_check_in || false,
                check_in_number: checkInData.checkInStatus?.check_in_number || null,
                check_in_status: checkInData.checkInStatus?.status || null,
                boarding_pass_number: checkInData.checkInStatus?.boarding_pass_number || null,
                seat_number: checkInData.checkInStatus?.seat_number || null,
                check_in_time: checkInData.checkInStatus?.check_in_time || null,
              };
            }
            return booking;
          } catch {
            return booking;
          }
        })
      );

      setBookings(bookingsWithCheckIn);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (dep: string, arr: string) => {
    const ms = new Date(arr).getTime() - new Date(dep).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

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
    router.push(`/dat-ve/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-bg)]">
      <Header />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* Page header */}
      <div className="relative overflow-hidden bg-gradient-vj pt-[100px] pb-[80px] text-center">
        <div className="relative mx-auto max-w-[1200px] px-4">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-sm">
            <FlightIcon className="text-4xl" />
          </div>
          <h1 className="mb-3 text-3xl sm:text-4xl font-heading-800 leading-none tracking-[-0.02em] text-white dark:text-white">
            CHUYẾN BAY CỦA TÔI
          </h1>
          <p className="mx-auto max-w-[900px] text-base leading-relaxed text-white/90 dark:text-white/90 sm:text-lg">
            Xem chi tiết hành trình đã đặt, đổi lịch trình, mua thêm hành lý, chỗ ngồi và dịch vụ
            tiện ích. Vui lòng điền thông tin bên dưới để tra cứu.
          </p>
        </div>
      </div>

      {/* Quick actions hub */}
      <div className="mx-auto max-w-[900px] px-4 pb-8">
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--vj-red)]/20 bg-[var(--vj-red)]/5 p-5 text-center sm:flex-row sm:justify-center sm:gap-4">
          <span className="order-1 text-xs font-bold uppercase tracking-wide text-[var(--vj-red)] sm:order-none">
            Hành động nhanh
          </span>
          <Link
            href="/chuyen-bay-cua-toi"
            className="flex-1 rounded-lg border border-vj-red/20 bg-[var(--surface)] dark:bg-[var(--dark-surface)] py-3 text-sm font-bold text-[var(--foreground)] dark:text-[var(--foreground)] transition-all hover:border-vj-red hover:bg-vj-red/10 text-center sm:flex-none sm:w-auto sm:px-6 sm:py-2.5"
          >
            ✈️ Trang chủ hành trình
          </Link>
          <Link
            href="/lam-thu-tuc"
            className="flex-1 rounded-lg border border-vj-yellow/20 bg-[var(--surface)] dark:bg-[var(--dark-surface)] py-3 text-sm font-bold text-[var(--vj-yellow)] dark:text-[var(--vj-yellow)] transition-all hover:border-vj-yellow hover:bg-vj-yellow/10 text-center sm:flex-none sm:w-auto sm:px-6 sm:py-2.5"
          >
            ✅ Check-in Online
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-[900px] px-4 py-10">
        <div className="vj-card">
          {/* Tabs - styled as segmented control */}
          <div className="flex border-b border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as 'booking' | 'eticket')}
                className={`flex-1 py-5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  tab === t.id
                    ? 'bg-[var(--surface)] dark:bg-[var(--dark-surface)] text-[var(--vj-red)] dark:text-[var(--vj-red)] border-b-2 border-[var(--vj-red)]'
                    : 'text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] hover:text-[var(--vj-red)] hover:bg-[var(--surface-2)] dark:hover:bg-[var(--dark-surface-2)]'
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
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]">
                  {tab === 'booking' ? 'Mã đặt chỗ (PNR)' : 'Mã vé điện tử'}
                  <span className="ml-1 text-[var(--vj-red)] dark:text-[var(--vj-red)]">*</span>
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
                    className="w-full vj-input-field px-5 py-3 text-sm text-[var(--foreground)] dark:text-[var(--foreground)] placeholder-[var(--foreground-subtle)] dark:placeholder-[var(--foreground-subtle)] focus:border-[var(--vj-red)] focus:ring-2 focus:ring-[var(--vj-red)]/20 transition-all duration-200"
                    maxLength={tab === 'booking' ? 10 : 14}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)]">
                    {tab === 'booking' ? `${bookingCode.length}/7` : `${eticketCode.length}/13`}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]/60">
                  {tab === 'booking'
                    ? 'Mã đặt chỗ gồm 6–7 ký tự, có trong email xác nhận đặt vé.'
                    : 'Mã vé điện tử gồm 13 chữ số, có trên vé điện tử.'}
                </p>
              </div>

              {/* Họ */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]">
                  Họ<span className="ml-1 text-[var(--vj-red)] dark:text-[var(--vj-red)]">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: NGUYEN"
                  className="w-full vj-input-field px-5 py-3 text-sm text-[var(--foreground)] dark:text-[var(--foreground)] placeholder-[var(--foreground-subtle)] dark:placeholder-[var(--foreground-subtle)] focus:border-[var(--vj-red)] focus:ring-2 focus:ring-[var(--vj-red)]/20 transition-all duration-200"
                />
              </div>

              {/* Tên đệm và tên */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]">
                  Tên đệm và tên
                  <span className="ml-1 text-[var(--vj-red)] dark:text-[var(--vj-red)]">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: VAN AN"
                  className="w-full vj-input-field px-5 py-3 text-sm text-[var(--foreground)] dark:text-[var(--foreground)] placeholder-[var(--foreground-subtle)] dark:placeholder-[var(--foreground-subtle)] focus:border-[var(--vj-red)] focus:ring-2 focus:ring-[var(--vj-red)]/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* Info box */}
            <div className="mt-6 rounded-xl border border-[var(--vj-yellow)]/20 bg-[var(--vj-yellow)]/5 dark:bg-[var(--vj-yellow)]/10 px-5 py-4 text-sm text-[var(--vj-yellow)] dark:text-[var(--vj-yellow)]">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div>
                  <p className="font-semibold">Lưu ý quan trọng:</p>
                  <ul className="mt-2 space-y-1 leading-6 list-disc pl-5">
                    <li>
                      • Họ và tên phải khớp chính xác với thông tin khi đặt vé (không dấu, chữ hoa).
                    </li>
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
              className="mt-6 w-full vj-btn-primary py-4 text-sm font-bold uppercase tracking-wide text-white dark:text-white flex items-center justify-center gap-3"
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
          <div className="border-t border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--surface-2)] dark:bg-[var(--dark-surface-2)] px-8 py-8">
            <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]/50">
              Hoặc thực hiện một trong các thao tác dưới đây
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dang-nhap"
                className="group flex flex-1 items-center justify-center gap-3 rounded-xl border border-[var(--vj-red)]/20 bg-[var(--surface)] dark:bg-[var(--dark-surface)] py-4 text-sm font-semibold text-[var(--foreground)] dark:text-[var(--foreground)] transition-all hover:border-[var(--vj-red)] hover:bg-[var(--vj-red)]/5 hover:text-[var(--vj-red)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-red)]/10 text-[var(--vj-red)] group-hover:bg-[var(--vj-red)]/20 group-hover:text-[var(--vj-red)] transition-colors">
                  <MdLogin className="text-lg" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Đăng nhập tài khoản</div>
                  <div className="text-[11px] text-[var(--foreground-muted)]/50 group-hover:text-[var(--vj-red)]/70">
                    Xem lịch sử & quản lý đặt chỗ
                  </div>
                </div>
              </Link>
              <Link
                href="/lam-thu-tuc"
                className="group flex flex-1 items-center justify-center gap-3 rounded-xl border border-[var(--vj-yellow)]/20 bg-[var(--surface)] dark:bg-[var(--dark-surface)] py-4 text-sm font-semibold text-[var(--foreground)] dark:text-[var(--foreground)] transition-all hover:border-[var(--vj-yellow)] hover:bg-[var(--vj-yellow)]/5 hover:text-[var(--vj-yellow)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-yellow)]/10 text-[var(--vj-yellow)] group-hover:bg-[var(--vj-yellow)]/20 group-hover:text-[var(--vj-yellow)] transition-colors">
                  <MdCheckCircle className="text-lg" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Check-in trực tuyến</div>
                  <div className="text-[11px] text-[var(--foreground-muted)]/50 group-hover:text-[var(--vj-yellow)]/70">
                    Chọn chỗ và in vé ngay
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Help */}
          <div className="mt-8 overflow-hidden rounded-xl bg-[var(--surface)] dark:bg-[var(--dark-surface)]">
            <div className="bg-gradient-to-r from-[var(--vj-red)] to-[var(--vj-red-dark)] px-6 py-4 text-white dark:text-white">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <MdPhone className="text-lg" /> Cần hỗ trợ?
              </h2>
            </div>
            <div className="px-6 py-5">
              <p className="mb-4 text-sm text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]/60 leading-relaxed">
                Nếu không tìm thấy mã đặt chỗ hoặc gặp sự cố khi tra cứu, vui lòng liên hệ bộ phận
                hỗ trợ của chúng tôi:
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:19001886"
                  className="group flex items-center gap-3 rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] px-4 py-3 hover:border-[var(--vj-red)] transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-red)]/10 text-[var(--vj-red)]">
                    <MdPhone className="text-lg" />
                  </div>
                  <div>
                    <div className="text-xs text-[var(--foreground-muted)]/40">Tổng đài hỗ trợ</div>
                    <div className="font-bold text-[var(--vj-red)]">1900 1886</div>
                  </div>
                </a>
                <a
                  href="mailto:support@vietjetair.com"
                  className="group flex items-center gap-3 rounded-xl border border-[var(--border)] dark:border-[var(--dark-border)] px-4 py-3 hover:border-[var(--vj-red)] transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vj-red)]/10 text-[var(--vj-red)]">
                    <MdEmail className="text-lg" />
                  </div>
                  <div>
                    <div className="text-xs text-[var(--foreground-muted)]/40">Email hỗ trợ</div>
                    <div className="font-bold text-[var(--vj-red)]">support@vietjetair.com</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {bookingsLoading ? (
        <div className="mx-auto max-w-[900px] px-4 pb-16 text-center">
          <div className="vj-card p-8">
            <div className="flex items-center justify-center gap-3 text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]">
              <MdAccessTime className="text-xl animate-spin" />
              <span>Đang tải danh sách chuyến bay...</span>
            </div>
          </div>
        </div>
      ) : bookings.length > 0 ? (
        <section className="mx-auto max-w-[900px] px-4 pb-16">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[var(--foreground)] dark:text-[var(--foreground)]">
            <FlightIcon className="text-[var(--vj-red)] dark:text-[var(--vj-red)]" /> Chuyến bay của
            tôi
          </h2>
          <div className="space-y-4">
            {bookings.map((b) => {
              const st = STATUS_LABELS[b.status];
              const hasCheckIn = b.has_check_in || false;
              const checkInStatus = b.check_in_status;

              // Determine check-in status color
              const getCheckInStatusColor = () => {
                if (!hasCheckIn) return 'text-[var(--vj-yellow)] dark:text-[var(--vj-yellow)]';
                switch (checkInStatus) {
                  case 'confirmed':
                    return 'text-[var(--vj-green)] dark:text-[var(--vj-green)]';
                  case 'completed':
                    return 'text-[var(--vj-blue)] dark:text-[var(--vj-blue)]';
                  case 'cancelled':
                    return 'text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]';
                  default:
                    return 'text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]';
                }
              };

              const getCheckInStatusLabel = () => {
                if (!hasCheckIn) return 'Chưa check-in';
                switch (checkInStatus) {
                  case 'confirmed':
                    return 'Đã check-in';
                  case 'completed':
                    return 'Đã hoàn thành';
                  case 'cancelled':
                    return 'Đã hủy check-in';
                  default:
                    return checkInStatus;
                }
              };

              return (
                <div
                  key={b.id}
                  className="vj-card block p-6 transition-all hover:border-[var(--vj-red)] hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--vj-red)]/10 text-[var(--vj-red)]">
                        <FlightIcon className="text-lg" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[var(--vj-red)]">{b.flight_no}</span>
                          <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-[var(--foreground)] dark:text-[var(--foreground)]">
                          {b.from_code} → {b.to_code}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]/60">
                          {formatDate(b.depart_time)} · {formatTime(b.depart_time)} -{' '}
                          {formatTime(b.arrive_time)} (
                          {formatDuration(b.depart_time, b.arrive_time)})
                        </p>
                        {/* Check-in status badge */}
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCheckInStatusColor()}`}
                          >
                            {getCheckInStatusLabel()}
                          </span>
                          {hasCheckIn && b.check_in_number && (
                            <span className="text-xs text-[var(--foreground-muted)]/50">
                              Số: {b.check_in_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--vj-red)]">
                        {b.total_price.toLocaleString('vi-VN')}₫
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]/50">
                        {new Date(b.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {/* Quick actions for check-in */}
                  {hasCheckIn && checkInStatus === 'confirmed' && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)] dark:border-[var(--dark-border)] flex flex-wrap gap-2">
                      <Link
                        href={`/lam-thu-tuc?code=${b.id}`}
                        className="text-xs px-3 py-1.5 rounded bg-[var(--vj-yellow)]/10 text-[var(--vj-yellow)] dark:text-[var(--vj-yellow)] hover:bg-[var(--vj-yellow)]/20 transition-colors"
                      >
                        ✅ Xem thẻ lên tàu
                      </Link>
                    </div>
                  )}

                  {!hasCheckIn && b.status === 'confirmed' && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)] dark:border-[var(--dark-border)] flex flex-wrap gap-2">
                      <Link
                        href={`/lam-thu-tuc?code=${b.id}`}
                        className="text-xs px-3 py-1.5 rounded bg-[var(--vj-red)]/10 text-[var(--vj-red)] dark:text-[var(--vj-red)] hover:bg-[var(--vj-red)]/20 transition-colors"
                      >
                        🎫 Làm thủ tục Check-in
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-[900px] px-4 pb-16 text-center">
          <div className="vj-card p-8">
            <div className="mb-4 text-5xl opacity-20">📋</div>
            <h3 className="mb-2 text-lg font-bold text-[var(--foreground)] dark:text-[var(--foreground)]">
              Chưa có chuyến bay nào
            </h3>
            <p className="text-sm text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]">
              Các chuyến bay bạn đã đặt sẽ hiển thị ở đây. Đăng nhập để xem lịch sử đặt chỗ chi
              tiết.
            </p>
            <Link
              href="/dang-nhap"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--vj-red)] dark:text-[var(--vj-red)] hover:underline"
            >
              <MdLogin /> Đăng nhập ngay
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
