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
        message: 'Mã đặt chỗ gồm 6 ký tự chữ và số (ví dụ FG7KH9)',
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
    <div className="flex flex-col bg-[var(--background)]">
      {/* Nền mây phủ trọn vùng header + nội dung chính và chiếm đúng một
          viewport (`min-h-screen`), khớp ảnh chụp màn hình thực tế. */}
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-rose-50 bg-[url('/images/hero/hero-window-clouds.jpg')] bg-cover bg-center bg-no-repeat">
        {/* Dải ruy-băng xanh/vàng/đỏ ở góc dưới phải, nằm sau thẻ tra cứu. */}
        <img
          src="/images/hero/chuyen-bay-ribbon.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 z-0 w-[min(720px,58vw)] select-none opacity-90"
        />

        <Header variant="compact" />

        <main id="main-content" className="relative z-10 flex flex-1 flex-col">
          {/* ===== Khung tra cứu: hai tab nằm trên thẻ, thẻ rộng 1368px ở
              màn hình tham chiếu 2048 (viền trái 340px). ===== */}
          <section className="relative flex-1">
            <div className="mx-auto w-full max-w-[1368px] px-4 sm:px-6 min-[1368px]:px-0">
              <div className="pt-8 xl:pt-[65px]">
                <div
                  role="tablist"
                  aria-label="Chuyến bay của tôi"
                  className="flex items-end overflow-hidden rounded-t-[10px] xl:overflow-visible gap-2"
                >
                  {(
                    [
                      {
                        id: 'search',
                        label: 'TRA CỨU MÃ ĐẶT CHỖ',
                        TabIcon: MdConfirmationNumber,
                      },
                      { id: 'list', label: 'CHUYẾN BAY SẮP TỚI', TabIcon: FlightIcon },
                    ] as const
                  ).map((chip) => {
                    const active = view === chip.id;
                    const TabIcon = chip.TabIcon;
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
                        className={`relative flex h-12 items-center gap-2 rounded-t-[10px] px-5 text-sm font-black uppercase tracking-wider transition-all sm:h-[52px] sm:px-6 sm:text-base2 ${
                          active
                            ? 'bg-white text-[var(--vj-red)] shadow-[0_-4px_16px_rgba(36,73,120,0.08)] border-t-2 border-[var(--vj-red)]'
                            : 'bg-white/60 text-gray-500 hover:bg-white/80 hover:text-[var(--vj-red)] backdrop-blur-sm'
                        }`}
                      >
                        <TabIcon aria-hidden="true" className="text-xl" />
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab 1: Form tra cứu đặt chỗ — desktop: cột nhập 458px + banner 800px. */}
                {view === 'search' && (
                  <form
                    onSubmit={handleSearchBooking}
                    className="rounded-[12px] bg-[rgba(248,251,255,0.95)] px-4 pb-8 pt-6 shadow-[0_18px_50px_rgba(36,73,120,0.14)] ring-1 ring-white/70 backdrop-blur-[2px] sm:px-6 xl:rounded-l-[12px] xl:pb-[39px] xl:pl-[46px] xl:pr-[3px] xl:pt-[34px] animate-fadeIn"
                  >
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[458px_minmax(0,1fr)] xl:gap-[60px]">
                      {/* Cột trái: tiêu đề + mô tả + ba trường nhập. */}
                      <div className="flex flex-col">
                        <h1 className="text-xl2 font-extrabold uppercase leading-[1.15] tracking-[-0.01em] text-[var(--foreground)] sm:text-xl3">
                          Tra cứu mã đặt chỗ
                        </h1>
                        <p className="mt-[14px] max-w-[450px] text-base2 leading-[22px] text-[var(--foreground-muted)]">
                          Vui lòng nhập thông tin theo vé đã đặt để xem hoặc thay đổi thông tin vé
                          của quý khách.
                        </p>

                        <div className="mt-[22px] space-y-[18px]">
                          <div className="vj-lookup-field">
                            <input
                              id="booking-code"
                              type="text"
                              required
                              autoComplete="off"
                              autoCapitalize="characters"
                              value={bookingCode}
                              onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                              placeholder=" "
                              className="vj-lookup-input font-heading-800 uppercase tracking-wide"
                            />
                            <label htmlFor="booking-code" className="vj-lookup-label">
                              Mã đặt chỗ <span className="text-[var(--vj-red)]">*</span>
                            </label>
                          </div>

                          <div className="vj-lookup-field">
                            <input
                              id="surname"
                              type="text"
                              required
                              autoComplete="family-name"
                              value={surname}
                              onChange={(e) => setSurname(e.target.value)}
                              placeholder=" "
                              className="vj-lookup-input"
                            />
                            <label htmlFor="surname" className="vj-lookup-label">
                              Họ <span className="text-[var(--vj-red)]">*</span>
                            </label>
                          </div>

                          <div className="vj-lookup-field">
                            <input
                              id="given-name"
                              type="text"
                              required
                              autoComplete="given-name"
                              value={givenName}
                              onChange={(e) => setGivenName(e.target.value)}
                              placeholder=" "
                              className="vj-lookup-input"
                            />
                            <label htmlFor="given-name" className="vj-lookup-label">
                              Tên đệm & Tên <span className="text-[var(--vj-red)]">*</span>
                            </label>
                          </div>
                        </div>

                        <div className="mt-[26px] flex justify-center">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-[45px] w-[146px] items-center justify-center rounded-[12px] bg-[linear-gradient(90deg,#FFB000_0%,#FFD500_100%)] text-lg font-black italic text-black shadow-[0_2px_10px_rgba(255,176,0,0.35)] transition-[filter,box-shadow] duration-150 hover:brightness-[1.03] hover:shadow-[0_4px_16px_rgba(255,176,0,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-vjblue/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loading ? 'Đang tìm…' : 'Tìm kiếm'}
                          </button>
                        </div>
                      </div>

                      {/* Cột phải: banner ngoại tệ thực tế theo Ảnh 1 & Ảnh 2 */}
                      <div className="relative aspect-[750/650] w-full overflow-hidden rounded-[6px] min-[1368px]:aspect-auto min-[1368px]:h-[682px]">
                        <AppImage
                          src="/images/hero/hero-airport-exchange.jpg"
                          alt="Mua ngoại tệ dễ dàng khi đặt vé"
                          fill
                          priority
                          quality={90}
                          sizes="(min-width: 1280px) 800px, 100vw"
                        />
                      </div>
                    </div>
                  </form>
                )}

                {/* Tab 2: Chuyến bay sắp tới (khi khách chưa đăng nhập -> hiển thị form đăng nhập theo Ảnh 2 & 4) */}
                {view === 'list' && !authUser && (
                  <div className="rounded-[12px] bg-[rgba(248,251,255,0.95)] px-4 pb-8 pt-6 shadow-[0_18px_50px_rgba(36,73,120,0.14)] ring-1 ring-white/70 backdrop-blur-[2px] sm:px-6 xl:rounded-l-[12px] xl:pb-[39px] xl:pl-[46px] xl:pr-[3px] xl:pt-[34px] animate-fadeIn">
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[458px_minmax(0,1fr)] xl:gap-[60px]">
                      {/* Cột trái: Đăng nhập bằng số điện thoại / SkyJoy ID */}
                      <div className="flex flex-col justify-center py-6">
                        <h2 className="text-center text-xl2 font-extrabold uppercase leading-[1.15] tracking-[-0.01em] text-[var(--foreground)] sm:text-xl3">
                          Đăng nhập
                        </h2>

                        <div className="mt-8 mx-auto w-full max-w-[360px]">
                          <div className="flex rounded-md border border-[var(--border)] bg-white overflow-hidden focus-within:border-[var(--vj-red)] focus-within:ring-2 focus-within:ring-red-100 transition-all">
                            <span className="inline-flex items-center px-3.5 bg-gray-50 border-r border-[var(--border)] text-sm font-bold text-gray-700">
                              (+84)
                            </span>
                            <input
                              type="tel"
                              placeholder="Số điện thoại"
                              className="flex-1 px-3.5 py-3 text-sm font-medium outline-none text-gray-900"
                            />
                          </div>

                          <div className="mt-6 flex justify-center">
                            <Link
                              href="/dang-nhap?redirect=/chuyen-bay-cua-toi"
                              className="text-base2 font-bold text-vjblue hover:underline"
                            >
                              Đăng nhập
                            </Link>
                          </div>

                          <p className="mt-6 text-center text-xs text-gray-600">
                            Bạn chưa có tài khoản?{' '}
                            <Link
                              href="/dang-nhap?tab=register&redirect=/chuyen-bay-cua-toi"
                              className="font-bold text-vjblue hover:underline"
                            >
                              Đăng ký ngay
                            </Link>
                          </p>

                          <div className="mt-10 pt-6 border-t border-gray-200/80 text-center">
                            <p className="text-xs2 text-gray-500">
                              Được cung cấp và xác thực bởi SkyJoy ID
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <span className="text-xs font-black italic text-[var(--vj-red)]">
                                vietjet
                              </span>
                              <span className="text-xs font-black text-amber-500">SkyJoy</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cột phải: cùng banner quảng cáo ngoại tệ như Ảnh 2 & Ảnh 4 */}
                      <div className="relative aspect-[750/650] w-full overflow-hidden rounded-[6px] min-[1368px]:aspect-auto min-[1368px]:h-[682px]">
                        <AppImage
                          src="/images/hero/hero-airport-exchange.jpg"
                          alt="Mua ngoại tệ dễ dàng khi đặt vé"
                          fill
                          priority
                          quality={90}
                          sizes="(min-width: 1280px) 800px, 100vw"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Danh sách chỉ hiện ở chip "Chuyến bay của tôi"; form tra cứu nằm ở chip đầu. */}
          <div
            className={`mx-auto w-full max-w-[1368px] px-4 py-8 sm:px-6 lg:px-0 ${view === 'list' ? '' : 'hidden'}`}
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
                    <h3 className="text-xl font-bold text-[var(--foreground)]">
                      Chưa có đặt chỗ nào
                    </h3>
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
                                <p className="text-xs2 text-white/75">Đặt chỗ: {b.id}</p>
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
                                <p className="text-2xs text-[var(--foreground-muted)] mt-0.5">
                                  {f.from_code ? getAirportCity(f.from_code) : '—'}
                                </p>
                                <p className="text-sm font-bold text-[var(--vj-red)] mt-1">
                                  {formatTime(f.depart_time)}
                                </p>
                              </div>

                              {/* Flight line */}
                              <div className="flex-1 text-center">
                                <p className="text-2xs text-[var(--foreground-muted)]">
                                  {formatDate(f.depart_time)}
                                </p>
                                <div className="flex items-center gap-1">
                                  <div className="h-px w-2 h-2 rounded-full bg-[var(--foreground-muted)]" />
                                  <div className="flex-1 border-t-2 border-dashed border-[var(--foreground-muted)]" />
                                  <FlightIcon className="h-5 w-5 text-[var(--vj-red)]" />
                                  <div className="flex-1 border-t-2 border-dashed border-[var(--foreground-muted)]" />
                                  <div className="h-2 w-2 rounded-full bg-[var(--foreground-muted)]" />
                                </div>
                                <p className="text-xs2 font-medium text-[var(--foreground-muted)] mt-1">
                                  {formatDuration(f.depart_time, f.arrive_time)} · Trực tiếp
                                </p>
                              </div>

                              {/* Arrival */}
                              <div className="text-center sm:text-right w-24">
                                <p className="text-2xl font-black text-[var(--foreground)]">
                                  {f.to_code || '--'}
                                </p>
                                <p className="text-2xs text-[var(--foreground-muted)] mt-0.5">
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
                                <span className="inline-flex items-center gap-1 text-xs2 px-2 py-1 rounded-lg bg-[rgb(var(--vj-blue-rgb))]/10 text-[var(--vj-blue)]">
                                  <MdAirlineSeatReclineNormal className="h-3.5 w-3.5" /> Ghế{' '}
                                  {b.seat_number}
                                </span>
                              ) : null}
                              {b.has_check_in ? (
                                <span className="inline-flex items-center gap-1 text-xs2 px-2 py-1 rounded-lg bg-[rgb(var(--vj-green-rgb))]/10 text-[var(--vj-green)]">
                                  <MdCheckCircle className="h-3.5 w-3.5" /> Đã check-in
                                  {b.check_in_number ? ` · ${b.check_in_number}` : ''}
                                </span>
                              ) : null}
                              {b.passengers && b.passengers.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs2 px-2 py-1 rounded-lg bg-[rgb(var(--vj-yellow-rgb))]/25 text-[var(--vj-red)] font-bold">
                                  <MdLogin className="h-3.5 w-3.5" /> {b.passengers.length} hành
                                  khach
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
                              <p className="text-xs2 text-[var(--foreground-muted)]">
                                {f.flight_no || '—'} · {f.from_code || '--'} → {f.to_code || '--'}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}
                            >
                              {st.label}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-x-6 text-sm2">
                            <div>
                              <p className="text-2xs text-[var(--foreground-muted)]">Ngày</p>
                              <p className="font-medium text-[var(--foreground)]">
                                {formatDate(f.depart_time)}
                              </p>
                            </div>
                            <div>
                              <p className="text-2xs text-[var(--foreground-muted)]">Giờ</p>
                              <p className="font-medium text-[var(--foreground)]">
                                {formatTime(f.depart_time)} - {formatTime(f.arrive_time)}
                              </p>
                            </div>
                            <div>
                              <p className="text-2xs text-[var(--foreground-muted)]">Trạng thái</p>
                              <p className="font-medium text-[var(--foreground)]">
                                {b.status === 'completed'
                                  ? 'Hoàn thành'
                                  : b.status === 'confirmed'
                                    ? 'Đã xác nhận'
                                    : st.label}
                              </p>
                            </div>
                            <div>
                              <p className="text-2xs text-[var(--foreground-muted)]">Giá</p>
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
                    <h3 className="text-xl font-bold text-[var(--foreground)]">
                      Chưa có vé điện tử
                    </h3>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Vé điện tử của đặt chỗ sẽ hiển thị tại đây.
                    </p>
                  </section>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      <Footer />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </div>
  );
}
