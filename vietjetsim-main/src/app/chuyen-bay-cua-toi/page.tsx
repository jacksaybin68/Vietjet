'use client';

// Chuyến bay của tôi — Vietjet Air Manage Booking
// Sao chép + bổ sung từ vietjetair.com/en/my/search-booking

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/shared/components/navigation';
import {
  MdFlight as FlightIcon,
  MdSearch,
  MdLogin,
  MdCheckCircle,
  MdPhone,
  MdEmail,
  MdAccessTime,
  MdLocationOn,
  MdAirlineSeatReclineNormal,
  MdLuggage,
  MdPrint,
  MdQrCodeScanner,
} from 'react-icons/md';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import MyFlightsStats from './components/MyFlightsStats';

const TABS = [
  { id: 'booking', label: 'Đặt chỗ của tôi' },
  { id: 'eticket', label: 'Vé điện tử (VDT)' },
];

const AIRPORTS: Record<string, string> = {
  HAN: 'Hà Nội (Nội Bài)',
  SGN: 'TP. Hồ Chí Minh (Tân Sơn Nhất)',
  DAD: 'Đà Nẵng',
  PQC: 'Phú Quốc',
  CXR: 'Nha Trang (Cam Ranh)',
  HPH: 'Hải Phòng (Cát Bi)',
  HUI: 'Huế (Phú Bài)',
  VDO: 'Quảng Ninh (Vân Đồn)',
  VII: 'Vinh',
};

interface FlightInfo {
  flight_no?: string;
  from_code?: string;
  to_code?: string;
  depart_time?: string;
  arrive_time?: string;
}

interface RecentBooking {
  id: string;
  flight_no?: string;
  from_code?: string;
  to_code?: string;
  depart_time?: string;
  arrive_time?: string;
  flight?: FlightInfo | null;
  flights?: FlightInfo[] | null;
  passengers?: Array<{ name?: string; seat_number?: string }> | null;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  created_at: string;
  has_check_in?: boolean;
  check_in_number?: string | null;
  check_in_status?: string | null;
  boarding_pass_number?: string | null;
  seat_number?: string | null;
  check_in_time?: string | null;
}

// Flatten nested flight data (API may return flight object)
function getFlight(b: RecentBooking): FlightInfo {
  if (b.flight) return b.flight;
  if (b.flights && b.flights.length > 0) return b.flights[0];
  return {
    flight_no: b.flight_no,
    from_code: b.from_code,
    to_code: b.to_code,
    depart_time: b.depart_time,
    arrive_time: b.arrive_time,
  };
}

const STATUS_LABELS: Record<RecentBooking['status'], { label: string; color: string; bg: string }> =
  {
    pending: {
      label: 'Chờ thanh toán',
      color: 'text-[var(--vj-red)]',
      bg: 'bg-[var(--vj-yellow)]/25',
    },
    confirmed: { label: 'Đã xác nhận', color: 'text-[var(--vj-red)]', bg: 'bg-[var(--vj-red)]/10' },
    completed: {
      label: 'Hoàn thành',
      color: 'text-[var(--vj-blue)]',
      bg: 'bg-[var(--vj-blue)]/10',
    },
    cancelled: {
      label: 'Đã hủy',
      color: 'text-[var(--foreground-muted)]',
      bg: 'bg-[var(--foreground-muted)]/15',
    },
    refunded: {
      label: 'Đã hoàn tiền',
      color: 'text-[var(--vj-purple)]',
      bg: 'bg-[var(--vj-purple)]/15',
    },
  };

export default function MyFlightsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'booking' | 'eticket'>('booking');
  const [bookingCode, setBookingCode] = useState('');
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [eticketCode, setEticketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/dat-ve?limit=100', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setBookings([]);
        return;
      }
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      const data = await res.json();

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

  // Thống kê
  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const completedFlights = bookings.filter((b) => b.status === 'completed').length;
    const pendingFlights = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'confirmed'
    ).length;
    const totalSpent = bookings
      .filter((b) => b.status !== 'cancelled' && b.status !== 'refunded')
      .reduce((sum, b) => sum + b.total_price, 0);
    const destCount: Record<string, number> = {};
    bookings.forEach((b) => {
      const f = getFlight(b);
      const code = f.to_code || 'N/A';
      destCount[code] = (destCount[code] || 0) + 1;
    });
    const frequentDestinations = Object.entries(destCount)
      .map(([code, count]) => ({ code, city: AIRPORTS[code] || code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { totalBookings, completedFlights, pendingFlights, totalSpent, frequentDestinations };
  }, [bookings]);

  const formatDate = (iso?: string) => {
    try {
      return new Date(iso || '').toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '--';
    }
  };

  const formatTime = (iso?: string) => {
    try {
      return new Date(iso || '').toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--';
    }
  };

  const formatDuration = (d?: string, a?: string) => {
    try {
      const diff = new Date(a || '').getTime() - new Date(d || '').getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return `${h}h ${String(m).padStart(2, '0')}ph`;
    } catch {
      return '--';
    }
  };

  const handleSearchBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCode.trim()) {
      toast.show({
        title: 'Vui lòng nhập mã đặt chỗ',
        message: 'Mã đặt chỗ là bắt buộc (ví dụ VD-12345678)',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/checkin?bookingCode=${encodeURIComponent(bookingCode)}&lastName=${encodeURIComponent(surname)}&firstName=${encodeURIComponent(givenName)}`
      );
      const data = await res.json();
      if (data.success) {
        toast.success('Đặt chỗ tìm thấy!', `Mã: ${bookingCode}`);
        router.push(`/lam-thu-tuc?code=${bookingCode}`);
      } else {
        toast.show({
          title: 'Không tìm thấy đặt chỗ',
          message: data.message || 'Vui lòng kiểm tra mã đặt chỗ và họ tên bạn',
        });
      }
    } catch {
      toast.error('Lỗi mạng', 'Vui lòng thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-bg)]">
      <Header />

      {/* ===== HERO: Tra cứu đặt chỗ — light theme theo spec DevTools ===== */}
      <section
        className="relative overflow-hidden bg-[#fff5f5]"
        style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' }}
      >
        {/* Decorative flight arcs (slate cho nền sáng) */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1440 300">
            <path
              fill="none"
              stroke="#1e293b"
              strokeWidth="1.5"
              d="M100,280 C300,180 600,120 980,200 1300,90"
            />
            <path
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
              d="M200,60 C420,140 760,90 1100,220 1420,70"
            />
          </svg>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#1e293b]/15 bg-[#1e293b]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#1e293b]">
            <span className="h-2 w-2 rounded-full bg-[var(--vj-yellow)]" />
            Bay là thích ngay!
          </p>
          <h1 className="mt-5 text-3xl font-black italic leading-tight text-[#1e293b] sm:text-4xl lg:text-5xl">
            Chuyến bay của tôi
          </h1>

          {/* Form tra cứu đặt chỗ — bố cục dọc, nền sáng */}
          <form
            onSubmit={handleSearchBooking}
            className="mt-7 rounded-2xl border border-[#1e293b]/10 bg-white/95 p-5 shadow-[0_10px_30px_rgba(30,41,59,0.12)]"
          >
            <div className="flex flex-col gap-4">
              <div className="w-full">
                <label
                  htmlFor="booking-code"
                  className="block text-[11px] font-bold uppercase tracking-wide text-black mb-1"
                >
                  Mã đặt chỗ <span className="text-[var(--vj-red)]">*</span>
                </label>
                <input
                  id="booking-code"
                  type="text"
                  required
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="VD-12345678"
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--vj-red)]/50 uppercase"
                />
              </div>
              <div className="w-full">
                <label
                  htmlFor="surname"
                  className="block text-[11px] font-bold uppercase tracking-wide text-black mb-1"
                >
                  Họ
                </label>
                <input
                  id="surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Nguyễn"
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--vj-red)]/50"
                />
              </div>
              <div className="w-full">
                <label
                  htmlFor="given-name"
                  className="block text-[11px] font-bold uppercase tracking-wide text-black mb-1"
                >
                  Tên đệm &amp; Tên
                </label>
                <input
                  id="given-name"
                  type="text"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  placeholder="Van A"
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--vj-red)]/50"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 justify-center py-3 rounded-xl bg-[var(--vj-yellow)] text-black font-black inline-flex items-center gap-2 hover:bg-[var(--vj-yellow-2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MdSearch className="h-4 w-4" />
                {loading ? 'Đang tìm…' : 'Tìm kiếm'}
              </button>
            </div>
          </form>

          {/* Dịch vụ nhanh */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[#1e293b]/80 text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <MdCheckCircle className="h-4 w-4 text-[var(--vj-red)]" /> Quản lý đặt chỗ
            </span>
            <span className="opacity-40">•</span>
            <span className="inline-flex items-center gap-1.5">
              <MdLuggage className="h-4 w-4 text-[var(--vj-red)]" /> Mua hành lý
            </span>
            <span className="opacity-40">•</span>
            <span className="inline-flex items-center gap-1.5">
              <MdAirlineSeatReclineNormal className="h-4 w-4 text-[var(--vj-red)]" /> Chọn ghế
            </span>
            <span className="opacity-40">•</span>
            <span className="inline-flex items-center gap-1.5">
              <MdAirlineSeatReclineNormal className="h-4 w-4 text-[var(--vj-red)]" /> Đổi chỗ
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        {bookings.length > 0 && (
          <section className="mb-8">
            <MyFlightsStats {...stats} />
          </section>
        )}

        {/* Onglets */}
        <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)] dark:border-[var(--dark-border)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'booking' | 'eticket')}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'text-[var(--vj-red)] dark:text-[var(--vj-red)] border-b-2 border-[var(--vj-red)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] border-b-2 border-transparent'
              }`}
            >
              {t.label}
              {bookings.length > 0 && tab === t.id && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-[var(--vj-red)]/10 text-[var(--vj-red)]">
                  {bookings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ===== Liste des réservations (cartes façon billet) ===== */}
        {tab === 'booking' && (
          <section>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-[var(--surface)] animate-pulse" />
                ))}
              </div>
            ) : bookings.length > 0 ? (
              <div className="space-y-5">
                {bookings.map((b) => {
                  const f = getFlight(b);
                  const st = STATUS_LABELS[b.status];
                  return (
                    <article
                      key={b.id}
                      className="overflow-hidden rounded-2xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Biller header (perforé) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--vj-navy)] text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--vj-red)]/80 text-white">
                            <FlightIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[var(--vj-yellow)]">
                              {f.flight_no || '—'}
                            </p>
                            <p className="text-[11px] text-white/70">Đặt chỗ: {b.id}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${st.color}`} />
                          {st.label}
                        </span>
                      </div>

                      {/* Corps du billet */}
                      <div className="px-4 py-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Departure */}
                          <div className="text-center sm:text-left w-24">
                            <p className="text-2xl font-black text-[var(--foreground)]">
                              {f.from_code || '--'}
                            </p>
                            <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                              {AIRPORTS[f.from_code || '']?.split('(')[0] || '—'}
                            </p>
                            <p className="text-sm font-bold text-[var(--vj-red)] mt-1">
                              {formatTime(f.depart_time)}
                            </p>
                          </div>

                          {/* Flight line */}
                          <div className="flex-1 text-center">
                            <p className="text-[10px] text-[var(--foreground-muted)]">
                              {formatDate(f.depart_time)}
                            </p>
                            <div className="flex items-center gap-1">
                              <div className="h-px w-2 h-2 rounded-full bg-[var(--foreground-muted)]" />
                              <div className="flex-1 border-t-2 border-dashed border-[var(--foreground-muted)]" />
                              <FlightIcon className="h-5 w-5 text-[var(--vj-red)]" />
                              <div className="flex-1 border-t-2 border-dashed border-[var(--foreground-muted)]" />
                              <div className="h-2 w-2 rounded-full bg-[var(--foreground-muted)]" />
                            </div>
                            <p className="text-[11px] font-medium text-[var(--foreground-muted)] mt-1">
                              {formatDuration(f.depart_time, f.arrive_time)} · Trực tiếp
                            </p>
                          </div>

                          {/* Arrival */}
                          <div className="text-center sm:text-right w-24">
                            <p className="text-2xl font-black text-[var(--foreground)]">
                              {f.to_code || '--'}
                            </p>
                            <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                              {AIRPORTS[f.to_code || '']?.split('(')[0] || '—'}
                            </p>
                            <p className="text-sm font-bold text-[var(--vj-red)] mt-1">
                              {formatTime(f.arrive_time)}
                            </p>
                          </div>
                        </div>

                        {/* Check-in / détails */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {b.seat_number ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[var(--vj-blue)]/10 text-[var(--vj-blue)]">
                              <MdAirlineSeatReclineNormal className="h-3.5 w-3.5" /> Ghế{' '}
                              {b.seat_number}
                            </span>
                          ) : null}
                          {b.has_check_in ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[var(--vj-green)]/10 text-[var(--vj-green)]">
                              <MdCheckCircle className="h-3.5 w-3.5" /> Đã check-in
                              {b.check_in_number ? ` · ${b.check_in_number}` : ''}
                            </span>
                          ) : null}
                          {b.passengers && b.passengers.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[var(--vj-yellow)]/25 text-[var(--vj-red)] font-bold">
                              <MdLogin className="h-3.5 w-3.5" /> {b.passengers.length} hành khach
                            </span>
                          )}
                        </div>

                        {/* Prix */}
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-[var(--foreground-muted)]">
                            Đặt: {new Date(b.created_at).toLocaleDateString('vi-VN')}
                          </p>
                          <p className="text-xl font-black text-[var(--vj-red)]">
                            {b.total_price.toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      </div>

                      {/* Perforation footer */}
                      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[var(--surface)] dark:bg-[var(--dark-surface)] border-t">
                        <div className="flex gap-2">
                          {!b.has_check_in && b.status === 'confirmed' && (
                            <Link
                              href={`/lam-thu-tuc?code=${b.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--vj-yellow)] text-[var(--vj-red)] font-black hover:bg-[var(--vj-yellow-2)] transition-colors"
                            >
                              <MdAirlineSeatReclineNormal className="h-3.5 w-3.5" /> Check-in
                            </Link>
                          )}
                          {b.has_check_in && (
                            <Link
                              href={`/lam-thu-tuc?code=${b.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--vj-yellow)]/25 text-[var(--vj-red)] font-bold hover:bg-[var(--vj-yellow)]/40 transition-colors"
                            >
                              ✅ Thẻ lên tàu
                            </Link>
                          )}
                          <Link
                            href={`/lam-thu-tuc?code=${b.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] font-semibold hover:bg-[var(--vj-yellow)]/10 transition-colors"
                          >
                            <MdPrint className="h-3.5 w-3.5" /> In vé / Đổi
                          </Link>
                        </div>
                        <Link
                          href={`/lam-thu-tuc?code=${b.id}`}
                          className="text-xs text-[var(--vj-red)] font-bold hover:underline"
                        >
                          Xem chi tiết →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
</section>
        )}

        {/* ===== Onglet Vé điện tử ===== */}
        {tab === 'eticket' && (
          <section className="mx-auto max-w-[900px]">
            {bookings.length > 0 ? (
              <div className="space-y-5">
                {bookings.map((b) => {
                  const f = getFlight(b);
                  const st = STATUS_LABELS[b.status];
                  const vdt = `VDT-${String(Math.abs([...b.id].reduce((a, c) => a + c.charCodeAt(0), 0))).slice(0, 6)}`;
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-[var(--border)] dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-surface)] p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-[var(--vj-yellow)]">{vdt}</p>
                          <p className="text-[11px] text-[var(--foreground-muted)]">
                            {f.flight_no || '—'} · {f.from_code || '--'} → {f.to_code || '--'}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-6 text-[13px]">
                        <div>
                          <p className="text-[10px] text-[var(--foreground-muted)]">Ngày</p>
                          <p className="font-medium text-[var(--foreground)]">
                            {formatDate(f.depart_time)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--foreground-muted)]">Giờ</p>
                          <p className="font-medium text-[var(--foreground)]">
                            {formatTime(f.depart_time)} - {formatTime(f.arrive_time)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--foreground-muted)]">Trạng thái</p>
                          <p className="font-medium text-[var(--foreground)]">
                            {b.status === 'completed'
                              ? 'Hoàn thành'
                              : b.status === 'confirmed'
                                ? 'Đã xác nhận'
                                : st.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--foreground-muted)]">Giá</p>
                          <p className="font-black text-[var(--vj-red)]">
                            {b.total_price.toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--vj-yellow)] text-[var(--vj-red)] font-black hover:bg-[var(--vj-yellow-2)] transition-colors"
                        >
                          <MdPrint className="h-3.5 w-3.5" /> In vé
                        </button>
                        <Link
                          href={`/lam-thu-tuc?ticket=${b.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] font-semibold hover:bg-[var(--vj-yellow)]/10 transition-colors"
                        >
                          <MdQrCodeScanner className="h-3.5 w-3.5" /> Xem QR
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <section className="vj-card p-10 text-center">
                <div className="mx-auto mb-4 text-6xl opacity-30">🎫</div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">Chưa có vé điện tử</h3>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Vé điện tử của đặt chỗ sẽ hiển thị tại đây.
                </p>
              </section>
            )}
          </section>
        )}
      </div>

      <Footer />
      <ToastContainer toasts={[]} onDismiss={(id: string) => {}} />
    </div>
  );
}
