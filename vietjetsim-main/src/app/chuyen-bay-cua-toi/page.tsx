'use client';

// Chuyến bay của tôi — Vietjet Air Manage Booking
// Sao chép + bổ sung từ vietjetair.com/en/my/search-booking

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Footer, SubpageHeader } from '@/shared/components/navigation';
import {
  MdPrint,
  MdQrCodeScanner,
  MdLuggage,
  MdConfirmationNumber,
  MdPayment,
} from 'react-icons/md';
import { useToast } from '@/hooks/useToast';
import { useAuthModal } from '@/features/auth/components';
import { ToastContainer } from '@/shared/components/feedback';
import { AppImage } from '@/shared/components/ui';
import { MyFlightsStats, TripCard, type Trip, type TripLeg } from '@/features/bookings';
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

/**
 * Một booking trong danh sách, đã gộp sẵn check-in từ query danh sách.
 *
 * `trip_id` + `leg_role` (migration 045) là thứ nhóm hai chặng của một chuyến
 * khứ hồi thành MỘT thẻ trip.
 */
interface RecentBooking {
  id: string;
  booking_code?: string | null;
  trip_id?: string | null;
  leg_role?: 'outbound' | 'inbound';
  flight_no?: string;
  from_code?: string;
  to_code?: string;
  depart_time?: string;
  arrive_time?: string;
  flight?: FlightInfo | null;
  flights?: FlightInfo[] | null;
  passengers?: Array<{ id?: string; name?: string; seat_number?: string | null }> | null;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  created_at: string;
  flight_id?: string;
  flight_status?: string;
  gate?: string | null;
  terminal?: string | null;
  check_ins?: Array<{
    id: string;
    passenger_id: string | null;
    passenger_name: string;
    seat_number: string;
    check_in_number: string;
    boarding_pass_number: string | null;
    gate: string | null;
    terminal: string | null;
    check_in_time?: string | null;
  }>;
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
  const { openAuthModal } = useAuthModal();
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

      // Không còn gọi `/api/checkin/status/<id>` cho TỪNG booking: check-in đã
      // được gộp vào query danh sách (`getBookingsByUserId` join `check_in`),
      // nên 100 đặt chỗ vẫn chỉ là 1 request thay vì 101.
      setBookings((records || []) as unknown as RecentBooking[]);
      if ((records || []).length > 0 && !viewPinned.current) setView('list');
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

  /**
   * Gom các booking theo `trip_id` để mỗi hành trình khứ hồi thành MỘT thẻ.
   *
   * Booking không có `trip_id` (dữ liệu cũ trước migration 045) thì tự thành
   * một trip riêng — vẫn hiển thị đầy đủ, chỉ không gộp với chặng kia.
   */
  const trips = useMemo<Trip[]>(() => {
    const byTrip = new Map<string, Trip>();
    for (const booking of bookings) {
      const tripId = booking.trip_id || `single-${booking.id}`;
      const f = getFlight(booking);
      const leg: TripLeg = {
        id: booking.id,
        bookingCode: booking.booking_code ?? null,
        legRole: booking.leg_role ?? 'outbound',
        status: booking.status,
        totalPrice: booking.total_price,
        createdAt: booking.created_at,
        flightId: booking.flight_id ?? '',
        flight: {
          flight_no: f.flight_no ?? '--',
          from_code: f.from_code ?? '--',
          to_code: f.to_code ?? '--',
          depart_time: f.depart_time ?? '',
          arrive_time: f.arrive_time ?? '',
        },
        flight_status: booking.flight_status,
        gate: booking.gate ?? null,
        terminal: booking.terminal ?? null,
        passengers: (booking.passengers ?? [])
          .filter((p) => !!p.id)
          .map((p) => ({ id: p.id!, name: p.name ?? '', seat_number: p.seat_number ?? null })),
        check_ins: (booking.check_ins ?? []).map((ci) => ({
          id: ci.id,
          passenger_id: ci.passenger_id,
          passenger_name: ci.passenger_name,
          seat_number: ci.seat_number,
          check_in_number: ci.check_in_number,
          boarding_pass_number: ci.boarding_pass_number,
          gate: ci.gate,
          terminal: ci.terminal,
        })),
      };

      const existing = byTrip.get(tripId);
      if (existing) {
        existing.legs.push(leg);
      } else {
        byTrip.set(tripId, { tripId, legs: [leg] });
      }
    }

    // Chặng đi luôn trước chặng về trong cùng một thẻ.
    for (const trip of byTrip.values()) {
      trip.legs.sort((a, b) =>
        a.legRole === b.legRole ? a.id.localeCompare(b.id) : a.legRole === 'outbound' ? -1 : 1
      );
    }
    return Array.from(byTrip.values());
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

  const handleSearchBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = bookingCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.show({
        title: 'Vui lòng nhập mã đặt chỗ',
        message: 'Mã đặt chỗ gồm 6 ký tự chữ và số (ví dụ FG7KH9)',
      });
      return;
    }
    setLoading(true);
    try {
      let foundBooking: {
        id: string;
        booking_code?: string | null;
        status: string;
      } | null = null;

      // 1. Thử tra cứu qua /api/checkin nếu có nhập Họ
      if (surname.trim()) {
        try {
          const data = await apiRequest<{
            booking?: {
              id: string;
              booking_code: string | null;
              status: string;
            };
          }>(
            `/api/checkin?bookingCode=${encodeURIComponent(cleanCode)}&lastName=${encodeURIComponent(surname.trim())}&firstName=${encodeURIComponent(givenName.trim())}`
          );
          if (data?.booking) {
            foundBooking = data.booking;
          }
        } catch {
          // Bỏ qua lỗi để thử fallback
        }
      }

      // 2. Tra cứu tiếp qua /api/dat-ve/[id] (hỗ trợ cả khi không nhập họ tên)
      if (!foundBooking) {
        try {
          const detailData = await apiRequest<{
            booking?: {
              id: string;
              booking_code: string | null;
              status: string;
            };
          }>(`/api/dat-ve/${encodeURIComponent(cleanCode)}`);
          if (detailData?.booking) {
            foundBooking = detailData.booking;
          }
        } catch {
          // Xử lý thông báo không tìm thấy bên dưới
        }
      }

      if (foundBooking) {
        const code = foundBooking.booking_code || cleanCode;
        if (foundBooking.status === 'pending') {
          toast.success(
            'Tìm thấy đặt chỗ!',
            `Mã: ${code} (Chưa thanh toán). Chuyển đến trang thanh toán...`
          );
          router.push(`/thanh-toan?bookingId=${code}`);
        } else {
          toast.success('Đặt chỗ tìm thấy!', `Mã: ${code}`);
          router.push(`/dat-ve/${code}`);
        }
      } else {
        toast.show({
          title: 'Không tìm thấy đặt chỗ',
          message: 'Vui lòng kiểm tra mã đặt chỗ và họ tên của bạn',
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

        {/* Header TRẮNG 74px giống site thật (`/vi/my/search-booking`), ở mobile
            dùng băng đỏ với H1 trắng `16px/700` uppercase. */}
        <SubpageHeader title="CHUYẾN BAY CỦA TÔI" mobileRed />

        {/* Thanh Tab Mobile: "Tìm kiếm mã đặt chỗ" | "Chuyến bay của tôi" khớp 100% Ảnh tham chiếu */}
        <div className="xl:hidden w-full bg-white border-b border-gray-200 shadow-xs relative z-20">
          <div className="flex">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'search'}
              onClick={() => {
                viewPinned.current = true;
                setView('search');
              }}
              className={`flex-1 py-3 text-center text-sm font-bold transition-all border-b-2 cursor-pointer ${
                view === 'search'
                  ? 'text-primary border-primary'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Tìm kiếm mã đặt chỗ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              onClick={() => {
                viewPinned.current = true;
                setView('list');
              }}
              className={`flex-1 py-3 text-center text-sm font-bold transition-all border-b-2 cursor-pointer ${
                view === 'list'
                  ? 'text-primary border-primary'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Chuyến bay của tôi
            </button>
          </div>
        </div>

        <main id="main-content" className="relative z-10 flex flex-1 flex-col">
          {/* ===== Khung tra cứu =====
              Bố cục đo được ở `newweb.vietjetair.com/vi/my/search-booking`
              (1440×900):
              - Dải "Dịch vụ tra cứu": `x=120`, `y=82`, `1200×69`, bo `16px`,
                padding `16px`; bên trong là 2 pill `164×36` bo `18px` —
                "Chuyến bay của tôi" (active, nền `#FFDD32`, chữ
                `rgb(115,62,10)`) và "Đơn hàng SkyShop" (nền trong suốt).
              - Cột trái `x=120` rộng `600`, khối form `x=220` rộng `400`.
              - H2 `x=225`, `20px/600` uppercase; mô tả `16px/500`.
              - 3 ô nhập `x=240`, rộng `360`, cao `40`.
              - Nút "Tìm kiếm" `127×39`; "Đăng nhập" `137×48` bo `12px`.
              - Cột phải `x=720` rộng `600`, banner `570×496` bo `5px`. */}
          <section className="relative flex-1">
            {/* Dải "Dịch vụ tra cứu" rộng đúng `1200px` ở desktop (không padding
                ngang — site thật: `x=120`, `w=1200`), chỉ chừa padding ở mobile. */}
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-0">
              <div className="pt-4">
                {/* Dải pill "Dịch vụ tra cứu" — 2 pill 164×36 bo 18px. */}
                <nav aria-label="Dịch vụ tra cứu" className="vj-pill-tabs">
                  <button
                    type="button"
                    className="vj-pill-tab"
                    role="tab"
                    aria-selected={view === 'search'}
                    onClick={() => {
                      viewPinned.current = true;
                      setView('search');
                    }}
                  >
                    Chuyến bay của tôi
                  </button>
                  <button
                    type="button"
                    className="vj-pill-tab"
                    role="tab"
                    aria-selected={view === 'list'}
                    onClick={() => {
                      viewPinned.current = true;
                      setView('list');
                    }}
                  >
                    Đơn hàng SkyShop
                  </button>
                </nav>

                {/* Tab 1: Form tra cứu đặt chỗ */}
                {view === 'search' && (
                  <>
                    {/* Giao diện Mobile khớp 100% Ảnh mẫu tham chiếu */}
                    <div className="xl:hidden w-full max-w-[540px] mx-auto pt-2 pb-16">
                      <p className="mb-4 font-koho text-base font-medium leading-[24px] text-[var(--vj-text)]">
                        Bạn muốn xem chuyến bay đã đặt, đổi lịch trình bay hay mua thêm dịch vụ hành
                        lý, chỗ ngồi, suất ăn..., vui lòng điền thông tin bên dưới:
                      </p>

                      <form onSubmit={handleSearchBooking} noValidate>
                        <div className="w-[290px] space-y-[20px]">
                          <div className="vj-lookup-field">
                            <input
                              id="mobi-booking-code"
                              type="text"
                              required
                              autoComplete="off"
                              autoCapitalize="characters"
                              value={bookingCode}
                              onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                              placeholder=" "
                              className="vj-lookup-input font-heading-800 uppercase tracking-wide"
                            />
                            <label htmlFor="mobi-booking-code" className="vj-lookup-label">
                              Mã đặt chỗ <span className="text-[var(--vj-red)]">*</span>
                            </label>
                          </div>

                          <div className="vj-lookup-field">
                            <input
                              id="mobi-surname"
                              type="text"
                              required
                              autoComplete="family-name"
                              value={surname}
                              onChange={(e) => setSurname(e.target.value)}
                              placeholder=" "
                              className="vj-lookup-input"
                            />
                            <label htmlFor="mobi-surname" className="vj-lookup-label">
                              Họ <span className="text-[var(--vj-red)]">*</span>
                            </label>
                          </div>

                          <div className="vj-lookup-field">
                            <input
                              id="mobi-given-name"
                              type="text"
                              required
                              autoComplete="given-name"
                              value={givenName}
                              onChange={(e) => setGivenName(e.target.value)}
                              placeholder=" "
                              className="vj-lookup-input"
                            />
                            <label htmlFor="mobi-given-name" className="vj-lookup-label">
                              Tên đệm & Tên <span className="text-[var(--vj-red)]">*</span>
                            </label>
                          </div>
                        </div>

                        <div className="mt-[30px] flex flex-col">
                          <button
                            type="submit"
                            disabled={loading}
                            className="vj-lookup-btn self-center"
                          >
                            {loading ? 'Đang tìm…' : 'Tìm kiếm'}
                          </button>

                          <div className="mt-[26px] flex flex-col">
                            <button
                              type="button"
                              onClick={() =>
                                openAuthModal('login', { redirectTo: '/chuyen-bay-cua-toi' })
                              }
                              className="vj-skyjoy-login-btn self-center"
                            >
                              Đăng nhập
                            </button>
                            <p className="vj-skyjoy-line mt-4">
                              Bạn đã biết về Vietjet SkyJoy?{' '}
                              <Link href="/dang-ky" className="vj-skyjoy-register-link">
                                Đăng ký ngay
                              </Link>
                            </p>
                          </div>
                        </div>
                      </form>

                      {/* Banner ngang Ngoại tệ sẵn sàng - Hành trình an tâm */}
                      <div className="w-full overflow-hidden rounded-xl shadow-md border border-white/60 mb-6">
                        <img
                          src="/images/hero/banner-chuyenbay-mobile.png"
                          alt="Mua ngoại tệ dễ dàng khi đặt vé"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>

                    {/* Giao diện Desktop — bám bố cục đo được ở
                        `newweb.vietjetair.com/vi/my/search-booking` (1440×900):
                        container `x=120` rộng `1200`;
                        - H2 "CHUYẾN BAY CỦA TÔI" `x=225`, `20px/600` uppercase;
                        - 3 ô nhập `x=240`, rộng `360`, cao `40`, cách nhau `17px`;
                        - nút "Tìm kiếm" `x=357` (căn giữa cột ô nhập), `127×39`;
                        - nút "Đăng nhập" `x=352`, `137×48` bo `12px`;
                        - dòng "Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay" lề trái
                          tại `x=240`, link `x=473` rộng `84`;
                        - banner cột phải `x=735`, `570×496` bo `5px`. */}
                    <form
                      onSubmit={handleSearchBooking}
                      className="hidden xl:grid xl:grid-cols-[600px_600px] xl:gap-0 animate-fadeIn"
                    >
                      {/* Cột trái: tiêu đề + mô tả + ba trường nhập.
                          Cột bắt đầu tại `x=120`; H2 lệch `+105px`, khối ô nhập
                          lệch thêm `+15px` (site thật `x=240`). */}
                      <div className="flex flex-col pt-[42px] xl:pl-[105px]">
                        <h2 className="text-xl font-semibold uppercase tracking-tight text-gray-900">
                          CHUYẾN BAY CỦA TÔI
                        </h2>
                        <p className="mt-3 font-koho text-base font-medium leading-[24px] text-[var(--vj-text)]">
                          Bạn muốn xem chuyến bay đã đặt, đổi lịch trình bay hay mua thêm dịch vụ
                          hành lý, chỗ ngồi, suất ăn..., vui lòng điền thông tin bên dưới:
                        </p>

                        <div className="mt-[28px] w-[360px] space-y-[17px] xl:ml-[15px]">
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

                        <div className="mt-[30px] flex flex-col xl:ml-[15px] xl:w-[360px]">
                          <button
                            type="submit"
                            disabled={loading}
                            className="vj-lookup-btn self-center"
                          >
                            {loading ? 'Đang tìm…' : 'Tìm kiếm'}
                          </button>

                          {/* "Đăng nhập" 137×48 bo 12px (căn giữa cột ô nhập)
                              + "Đăng ký ngay" 84×20 lề trái tại `x=240`. */}
                          <div className="mt-[26px] flex flex-col">
                            <button
                              type="button"
                              onClick={() =>
                                openAuthModal('login', { redirectTo: '/chuyen-bay-cua-toi' })
                              }
                              className="vj-skyjoy-login-btn self-center"
                            >
                              Đăng nhập
                            </button>
                            <p className="vj-skyjoy-line mt-4">
                              Bạn đã biết về Vietjet SkyJoy?{' '}
                              <Link href="/dang-ky" className="vj-skyjoy-register-link">
                                Đăng ký ngay
                              </Link>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cột phải: banner `570×496` bo `5px` — đo được ở site thật
                          (`x=735`, tức lệch `+15px` so với mép cột `x=720`). */}
                      <div className="flex items-start pt-[42px] xl:pl-[15px]">
                        <div className="relative h-[496px] w-[570px] overflow-hidden rounded-[5px] shadow-[0_12px_32px_rgba(36,73,120,0.16)]">
                          <AppImage
                            src="/images/hero/banner-chuyenbay-ngoai-te.jpg"
                            alt="Mua ngoại tệ dễ dàng khi đặt vé"
                            fill
                            priority
                            quality={95}
                            sizes="570px"
                          />
                        </div>
                      </div>
                    </form>
                  </>
                )}

                {/* Tab 2: Chuyến bay sắp tới (khi khách chưa đăng nhập -> hiển thị form đăng nhập theo Ảnh 2 & 4) */}
                {view === 'list' && !authUser && (
                  <div className="rounded-[12px] bg-[rgba(248,251,255,0.95)] px-4 pb-8 pt-6 shadow-[0_18px_50px_rgba(36,73,120,0.14)] ring-1 ring-white/70 backdrop-blur-[2px] sm:px-6 xl:rounded-l-[12px] xl:pb-[39px] xl:pl-[46px] xl:pr-[3px] xl:pt-[34px] animate-fadeIn">
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[458px_minmax(0,1fr)] xl:gap-[60px]">
                      {/* Cột trái: Đăng nhập bằng số điện thoại / SkyJoy ID */}
                      <div className="flex flex-col justify-center py-6">
                        <h2 className="text-center text-base sm:text-lg font-black uppercase tracking-wide text-gray-900">
                          Đăng nhập
                        </h2>

                        <div className="mt-6 mx-auto w-full max-w-[340px] space-y-4">
                          <div className="flex rounded-md border border-gray-300 bg-white overflow-hidden focus-within:border-primary">
                            <span className="inline-flex items-center px-3 py-2 bg-gray-50 border-r border-gray-200 text-xs font-bold text-gray-700 select-none">
                              (+84) <span className="text-3xs text-gray-400 ml-1">▼</span>
                            </span>
                            <input
                              type="tel"
                              placeholder="Số điện thoại"
                              className="flex-1 px-3 py-2 text-xs font-bold outline-none text-gray-900 bg-transparent"
                            />
                          </div>

                          <div className="flex justify-center">
                            <Link
                              href="/dang-nhap?redirect=/chuyen-bay-cua-toi"
                              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-vjyellow text-gray-400 hover:text-gray-900 text-center font-black text-xs border border-gray-200 transition-colors shadow-sm"
                            >
                              Đăng nhập
                            </Link>
                          </div>

                          <p className="text-center text-xs text-gray-600">
                            Bạn chưa có tài khoản?{' '}
                            <Link
                              href="/dang-ky?redirect=/chuyen-bay-cua-toi"
                              className="font-bold text-blue-600 underline hover:text-blue-700"
                            >
                              Đăng ký ngay
                            </Link>
                          </p>

                          <div className="pt-6 border-t border-gray-100 text-center space-y-2">
                            <p className="text-xs2 text-gray-500">
                              Được cung cấp và xác thực bởi SkyJoy ID
                            </p>
                            <div className="flex items-center justify-center gap-4 text-xs font-black select-none">
                              <span>
                                <span className="text-primary">Sky</span>
                                <span className="text-vjamber">Joy</span>
                              </span>
                              <span className="text-primary italic">vietjetAir.com</span>
                              <span>
                                <span className="text-primary">Sky</span>
                                <span className="text-amber-800">Pay</span>
                              </span>
                            </div>
                            <div>
                              <Link
                                href="/gioi-thieu"
                                className="inline-flex items-center gap-1 text-xs2 font-bold text-blue-600 hover:underline"
                              >
                                <span className="text-xs">ℹ</span>
                                <span>Bạn đã biết về Vietjet SkyJoy?</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cột phải: cùng banner quảng cáo ngoại tệ như Ảnh 2 & Ảnh 4 */}
                      <div className="flex items-center justify-center">
                        <div className="relative aspect-[480/648] w-full max-w-[420px] overflow-hidden rounded-[6px] shadow-[0_12px_32px_rgba(36,73,120,0.16)] sm:max-w-[460px] xl:max-w-[505px]">
                          <AppImage
                            src="/images/hero/banner-chuyenbay-ngoai-te.jpg"
                            alt="Mua ngoại tệ dễ dàng khi đặt vé"
                            fill
                            priority
                            quality={95}
                            sizes="(min-width: 1280px) 505px, (min-width: 640px) 460px, 420px"
                          />
                        </div>
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
                    {trips.map((trip) => (
                      <TripCard key={trip.tripId} trip={trip} />
                    ))}
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
                          <div className="mt-4 flex flex-wrap gap-2">
                            {b.status === 'pending' && (
                              <Link
                                href={`/thanh-toan?bookingId=${b.booking_code || b.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--vj-red)] text-white font-black hover:bg-vj-red-dark shadow-xs transition-colors"
                              >
                                <MdPayment className="h-3.5 w-3.5" /> Thanh toán ngay
                              </Link>
                            )}
                            <button
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--vj-yellow)] text-[var(--vj-red)] font-black hover:bg-[var(--vj-yellow-2)] transition-colors"
                            >
                              <MdPrint className="h-3.5 w-3.5" /> In vé
                            </button>
                            <Link
                              href={`/dat-ve/${b.booking_code || b.id}`}
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

          {/* Amy Mascot với tooltip "Xin chào!" khớp 100% Ảnh tham chiếu */}
          <div className="absolute right-3 bottom-2 z-40 flex items-end pointer-events-none select-none">
            <div className="relative mb-14 -mr-1">
              <div className="bg-white text-gray-800 text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg border border-gray-200">
                Xin chào!
              </div>
              <div className="w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45 ml-auto mr-4 -mt-1.5 shadow-xs" />
            </div>
            <img
              src="/images/hero/amy-mascot.png"
              alt="Mascot Amy"
              className="w-24 sm:w-28 h-auto drop-shadow-lg"
              loading="lazy"
            />
          </div>

          {/* Dải sóng cong 3 màu đặc trưng Vietjet: Xanh lá - Vàng - Đỏ ở góc dưới cùng bên phải */}
          <svg
            className="absolute bottom-0 right-0 w-48 h-48 sm:w-56 sm:h-56 pointer-events-none z-30 overflow-hidden"
            viewBox="0 0 200 200"
            fill="none"
          >
            <path
              d="M 10 200 C 60 195 150 165 200 45 L 200 85 C 145 170 55 196 25 200 Z"
              fill="#84CC16"
            />
            <path
              d="M 0 200 C 50 195 140 160 185 85 L 175 110 C 130 170 45 197 0 200 Z"
              fill="#EAB308"
            />
            <path d="M 0 200 C 45 195 130 165 160 120 L 200 200 Z" fill="#D71920" />
          </svg>
        </main>
      </div>

      <div className="hidden xl:block">
        <Footer />
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </div>
  );
}
