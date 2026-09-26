'use client';

// Chuyến bay của tôi — Vietjet Air Manage Booking
// Sao chép + bổ sung từ vietjetair.com/en/my/search-booking

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header, Footer } from '@/shared/components/navigation';
import {
  MdFlight as FlightIcon,
  MdLogin,
  MdCheckCircle,
  MdAirlineSeatReclineNormal,
  MdPrint,
  MdQrCodeScanner,
  MdLuggage,
  MdConfirmationNumber,
} from 'react-icons/md';
import Icon from '@/shared/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { AppImage } from '@/shared/components/ui';
import { MyFlightsStats } from '@/features/bookings';
import { listBookings } from '@/features/bookings/services';
import { apiRequest, getApiErrorMessage } from '@/shared/services';
import { getAirportCity } from '@/features/flights';

const TABS = [
  { id: 'booking', label: 'Đặt chỗ của tôi' },
  { id: 'eticket', label: 'Vé điện tử (VDT)' },
] as const;

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
      bg: 'bg-[rgb(var(--vj-yellow-rgb))]/25',
    },
    confirmed: {
      label: 'Đã xác nhận',
      color: 'text-[var(--vj-red)]',
      bg: 'bg-[rgb(var(--vj-red-rgb))]/10',
    },
    completed: {
      label: 'Hoàn thành',
      color: 'text-[var(--vj-blue)]',
      bg: 'bg-[rgb(var(--vj-blue-rgb))]/10',
    },
    cancelled: {
      label: 'Đã hủy',
      color: 'text-[var(--foreground-muted)]',
      bg: 'bg-[rgb(var(--foreground-muted-rgb))]/15',
    },
    refunded: {
      label: 'Đã hoàn tiền',
      color: 'text-[var(--vj-purple)]',
      bg: 'bg-[rgb(var(--vj-purple-rgb))]/15',
    },
  };

export default function MyFlightsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'booking' | 'eticket'>('booking');
  // Chip đầu trang "Tìm kiếm mã đặt chỗ" / "Chuyến bay của tôi" — bố cục của
  // vietjetair.com/vi/my/search-booking (khối nào hiện do chip quyết định).
  const [view, setView] = useState<'search' | 'list'>('search');
  // Khách chưa bấm chip thì lần tải danh sách đầu tiên tự mở tab "Chuyến bay của
  // tôi" khi tài khoản đã có đặt chỗ; khách vãng lai vẫn ở lại form tra cứu.
  const viewPinned = useRef(false);
  const [bookingCode, setBookingCode] = useState('');
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  // Chỉ gọi /api/dat-ve khi đã đăng nhập — gọi khi khách vãng lai sẽ nhận 401 và
  // hiện thành lỗi console (badge "Issues" của Next dev overlay).
  const { user: authUser, loading: authLoading } = useAuth();

  const fetchBookings = useCallback(async () => {
    try {
      const { bookings: records } = await listBookings({ limit: 100 });

      const bookingsWithCheckIn = await Promise.all(
        (records || []).map(async (booking) => {
          try {
            const checkInData = await apiRequest<{
              checkInStatus?: {
                has_check_in?: boolean;
                check_in_number?: string | null;
                status?: string | null;
                boarding_pass_number?: string | null;
                seat_number?: string | null;
                check_in_time?: string | null;
              };
            }>(`/api/checkin/status/${booking.id}`);
            return {
              ...booking,
              has_check_in: checkInData.checkInStatus?.has_check_in || false,
              check_in_number: checkInData.checkInStatus?.check_in_number || null,
              check_in_status: checkInData.checkInStatus?.status || null,
              boarding_pass_number: checkInData.checkInStatus?.boarding_pass_number || null,
              seat_number: checkInData.checkInStatus?.seat_number || null,
              check_in_time: checkInData.checkInStatus?.check_in_time || null,
            };
          } catch {
            return booking;
          }
        })
      );

      setBookings(bookingsWithCheckIn);
      if (bookingsWithCheckIn.length > 0 && !viewPinned.current) setView('list');
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return; // chờ AuthContext xác định trạng thái đăng nhập
    if (!authUser) {
      // Khách vãng lai: không có dữ liệu đặt chỗ để tải, tránh request 401.
      setBookings([]);
      setBookingsLoading(false);
      return;
    }
    fetchBookings();
  }, [fetchBookings, authLoading, authUser]);

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
      .map(([code, count]) => ({ code, city: getAirportCity(code), count }))
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
      const data = await apiRequest<{ success: boolean }>(
        `/api/checkin?bookingCode=${encodeURIComponent(bookingCode)}&lastName=${encodeURIComponent(surname)}&firstName=${encodeURIComponent(givenName)}`
      );
      if (data.success) {
        toast.success('Đặt chỗ tìm thấy!', `Mã: ${bookingCode}`);
        router.push(`/lam-thu-tuc?code=${bookingCode}`);
      } else {
        toast.show({
          title: 'Không tìm thấy đặt chỗ',
          message: 'Vui lòng kiểm tra mã đặt chỗ và họ tên bạn',
        });
      }
    } catch (error) {
      toast.show({
        title: 'Không tìm thấy đặt chỗ',
        message: getApiErrorMessage(error, 'Vui lòng kiểm tra mã đặt chỗ và họ tên bạn'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />

      {/* ===== Đầu trang: 2 chip + tiêu đề (bố cục vietjetair.com/vi/my/search-booking) ===== */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-[#d9e9f8] via-[#eef4fa] to-[var(--background)]">
        <div className="relative mx-auto max-w-5xl px-4 pt-8 pb-10 sm:px-6 lg:px-8">
          <div role="tablist" aria-label="Chuyến bay của tôi" className="flex flex-wrap gap-2">
            {(
              [
                { id: 'search', label: 'Tìm kiếm mã đặt chỗ', icon: 'MagnifyingGlassIcon' },
                { id: 'list', label: 'Chuyến bay của tôi', icon: 'TicketIcon' },
              ] as const
            ).map((chip) => {
              const active = view === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    viewPinned.current = true;
                    setView(chip.id);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-white text-[var(--vj-red)] shadow-vj-btn ring-1 ring-white/70'
                      : 'bg-white/50 text-[var(--vj-text-gray)] hover:text-[var(--vj-red)]'
                  }`}
                >
                  <Icon name={chip.icon} size={15} />
                  {chip.label}
                </button>
              );
            })}
          </div>

          <h1 className="mt-6 text-lg font-black uppercase tracking-tight text-[var(--vj-text)] sm:text-xl">
            Chuyến bay của tôi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--vj-text-gray)]">
            Bạn muốn xem chuyến bay đã đặt, đổi lịch trình bay hay mua thêm dịch vụ hành lý, chỗ
            ngồi, suất ăn…, vui lòng điền thông tin bên dưới:
          </p>

          {/* Form tra cứu đặt chỗ — 2 cột: trường nhập + hình ảnh. Chip thứ hai
              ("Chuyến bay của tôi") ẩn khối này đi và mở danh sách đặt chỗ.
              Desktop giữ `min-h` để khung luôn cao thoáng như thiết kế, kể cả
              khi nút đổi chữ sang "Đang tìm…" lúc đang tải. */}
          <form
            onSubmit={handleSearchBooking}
            className={`mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-vj-md md:min-h-[400px] lg:p-8 ${
              view === 'search' ? '' : 'hidden'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cột trái: Trường nhập */}
              <div className="flex flex-col gap-4 md:justify-center">
                <div className="relative">
                  <label
                    htmlFor="booking-code"
                    className="pointer-events-none absolute left-3 top-2 text-[11px] font-medium text-[var(--vj-text-muted)]"
                  >
                    Mã đặt chỗ <span className="text-[var(--vj-red)]">*</span>
                  </label>
                  <input
                    id="booking-code"
                    type="text"
                    required
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                    placeholder=" "
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 pb-2 pt-6 text-base font-black uppercase text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--vj-red-rgb))]/50"
                  />
                </div>
                <div className="relative">
                  <label
                    htmlFor="surname"
                    className="pointer-events-none absolute left-3 top-2 text-[11px] font-medium text-[var(--vj-text-muted)]"
                  >
                    Họ
                  </label>
                  <input
                    id="surname"
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder=" "
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 pb-3.5 pt-8 text-sm font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--vj-red-rgb))]/50"
                  />
                </div>
                <div className="relative">
                  <label
                    htmlFor="given-name"
                    className="pointer-events-none absolute left-3 top-2 text-[11px] font-medium text-[var(--vj-text-muted)]"
                  >
                    Tên đệm &amp; Tên
                  </label>
                  <input
                    id="given-name"
                    type="text"
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                    placeholder=" "
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 pb-3.5 pt-8 text-sm font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--vj-red-rgb))]/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="vj-cta mt-1 inline-flex h-11 items-center justify-center self-start rounded-lg px-7 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Đang tìm…' : 'Tìm kiếm'}
                </button>
              </div>

              {/* Cột phải: Hình ảnh */}
              <div className="flex items-center justify-center">
                <AppImage
                  src="/images/hero/banner-quang-cao-ngoai-te.jpg"
                  alt="Mua ngoại tệ dễ dàng khi đặt vé"
                  width={640}
                  height={360}
                  className="w-full h-auto rounded-xl object-cover max-h-[340px]"
                />
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Danh sách chỉ hiện ở chip "Chuyến bay của tôi"; form tra cứu nằm ở chip đầu. */}
      <div
        className={`mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 ${view === 'list' ? '' : 'hidden'}`}
      >
        {/* Stats */}
        {bookings.length > 0 && (
          <section className="mb-8">
            <MyFlightsStats {...stats} />
          </section>
        )}

        {/* ===== Tabs ===== */}
        <div className="mb-6 border-b border-[var(--border)]">
          <div role="tablist" className="flex gap-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`relative px-4 py-2.5 text-sm font-bold transition-colors ${
                    active
                      ? 'text-[var(--vj-red)]'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t.label}
                  <span
                    className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${
                      active ? 'bg-[var(--vj-red)]' : 'bg-transparent'
                    }`}
                  />
                </button>
              );
            })}
          </div>
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
            ) : bookings.length === 0 ? (
              <section className="vj-card p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--vj-red-rgb))]/10 text-[var(--vj-red)]">
                  <MdLuggage className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">Chưa có đặt chỗ nào</h3>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                  Tra cứu bằng mã đặt chỗ ở trên, hoặc đăng nhập để xem các chuyến bay của bạn.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/dang-nhap?redirect=/chuyen-bay-cua-toi"
                    className="vj-btn vj-btn-primary vj-btn-pill px-5 py-2.5 text-sm"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/tim-ve"
                    className="vj-btn vj-btn-pill border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  >
                    Tìm chuyến bay
                  </Link>
                </div>
              </section>
            ) : (
              <div className="space-y-5">
                {bookings.map((b) => {
                  const f = getFlight(b);
                  const st = STATUS_LABELS[b.status];
                  return (
                    <article
                      key={b.id}
                      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Đầu phiếu: nền đỏ thương hiệu; chip trạng thái đổi sang nền
                          trắng để vẫn đọc được trên nền đỏ. */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--vj-red)] px-4 py-3 text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                            <FlightIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[var(--vj-yellow)]">
                              {f.flight_no || '—'}
                            </p>
                            <p className="text-[11px] text-white/75">Đặt chỗ: {b.id}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[var(--vj-red)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--vj-red)]" />
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
                              {f.from_code ? getAirportCity(f.from_code) : '—'}
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
                              {f.to_code ? getAirportCity(f.to_code) : '—'}
                            </p>
                            <p className="text-sm font-bold text-[var(--vj-red)] mt-1">
                              {formatTime(f.arrive_time)}
                            </p>
                          </div>
                        </div>

                        {/* Check-in / détails */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {b.seat_number ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[rgb(var(--vj-blue-rgb))]/10 text-[var(--vj-blue)]">
                              <MdAirlineSeatReclineNormal className="h-3.5 w-3.5" /> Ghế{' '}
                              {b.seat_number}
                            </span>
                          ) : null}
                          {b.has_check_in ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[rgb(var(--vj-green-rgb))]/10 text-[var(--vj-green)]">
                              <MdCheckCircle className="h-3.5 w-3.5" /> Đã check-in
                              {b.check_in_number ? ` · ${b.check_in_number}` : ''}
                            </span>
                          ) : null}
                          {b.passengers && b.passengers.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[rgb(var(--vj-yellow-rgb))]/25 text-[var(--vj-red)] font-bold">
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
                      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[var(--surface)] border-t border-[var(--border)]">
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[rgb(var(--vj-yellow-rgb))]/25 text-[var(--vj-red)] font-bold hover:bg-[rgb(var(--vj-yellow-rgb))]/40 transition-colors"
                            >
                              <MdCheckCircle className="h-3.5 w-3.5" /> Thẻ lên tàu
                            </Link>
                          )}
                          <Link
                            href={`/lam-thu-tuc?code=${b.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] font-semibold hover:bg-[rgb(var(--vj-yellow-rgb))]/10 transition-colors"
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
            )}
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
                      className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5"
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
                          href={`/lam-thu-tuc?code=${b.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] font-semibold hover:bg-[rgb(var(--vj-yellow-rgb))]/10 transition-colors"
                        >
                          <MdQrCodeScanner className="h-3.5 w-3.5" /> Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <section className="vj-card p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--vj-red-rgb))]/10 text-[var(--vj-red)]">
                  <MdConfirmationNumber className="h-8 w-8" />
                </div>
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
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </div>
  );
}
