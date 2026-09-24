'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/shared/components/navigation';
import { Footer } from '@/shared/components/navigation';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import {
  MdFlight as FlightIcon,
  MdCheckCircle,
  MdQrCode2,
  MdAccessTime,
  MdConfirmationNumber,
  MdChair,
} from 'react-icons/md';
import { apiRequest, ApiRequestError } from '@/shared/services';

interface CheckInData {
  bookingId: string;
  flightNo: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  departTime: string;
  arriveTime: string;
  date: string;
  passengerName: string;
  seat: string;
  class: string;
  status: string;
  gate?: string;
  terminal?: string;
  boardingTime?: string;
  /** Raw ISO depart time from API (for POST payload) */
  departTimeRaw?: string;
  /** Flight duration label, e.g. "2h 10ph" */
  duration: string;
  /** Whether this booking is already checked in */
  hasCheckIn?: boolean;
  /** Check-in number (e.g. VN-XXXX) issued after check-in */
  checkInNumber?: string;
  /** Boarding pass number issued after check-in */
  boardingPassNumber?: string;
}

function CheckInContent({ prefillBookingId }: { prefillBookingId: string }) {
  const router = useRouter();
  const toast = useToast();

  // The URL only carries the booking code; the surname is still required by the
  // lookup API, so we prefill the code and stay on the search step.
  const [step, setStep] = useState<'search' | 'confirm' | 'success'>('search');
  const [bookingCode, setBookingCode] = useState(prefillBookingId);
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [agreed, setAgreed] = useState(false);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!bookingCode.trim()) {
        toast.error('Lỗi', 'Vui lòng nhập mã đặt chỗ');
        return;
      }
      if (!lastName.trim()) {
        toast.error('Lỗi', 'Vui lòng nhập họ');
        return;
      }

      setLoading(true);
      try {
        const data = await apiRequest<{
          success: boolean;
          hasCheckIn?: boolean;
          checkIn?: {
            check_in_number?: string;
            seat_number?: string;
            gate?: string;
            terminal?: string;
            boarding_pass_number?: string;
          };
          booking: { id: string; status?: string; flight?: Record<string, string> };
          passengers?: { name?: string }[];
        }>(
          `/api/checkin?bookingCode=${encodeURIComponent(bookingCode.trim())}` +
            `&lastName=${encodeURIComponent(lastName.trim())}`
        );

        if (data.hasCheckIn) {
          toast.info(
            'Đã check-in',
            `Bạn đã check-in với mã ${data.checkIn?.check_in_number || ''}. Thẻ lên máy bay đã được cấp.`
          );
        }

        const b = data.booking;
        const flight = b.flight || {};
        const departTime = flight.depart_time ? new Date(flight.depart_time) : null;
        const arriveTime = flight.arrive_time ? new Date(flight.arrive_time) : null;
        const fmt = (d: Date | null) =>
          d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';

        // Derive the duration from the real times instead of hardcoding it.
        let duration = '—';
        if (departTime && arriveTime && arriveTime > departTime) {
          const mins = Math.round((arriveTime.getTime() - departTime.getTime()) / 60000);
          duration = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}ph`;
        }

        setCheckInData({
          bookingId: b.id,
          flightNo: flight.flight_no || '--',
          from: flight.from_code || '--',
          to: flight.to_code || '--',
          fromCity: flight.from_city || '',
          toCity: flight.to_city || '',
          departTime: fmt(departTime),
          arriveTime: fmt(arriveTime),
          date: departTime ? departTime.toLocaleDateString('vi-VN') : '',
          passengerName: data.passengers?.[0]?.name || '',
          seat: data.checkIn?.seat_number || 'Chọn tại quầy',
          class: 'Phổ thông',
          status: data.hasCheckIn ? 'checked_in' : b.status || 'confirmed',
          gate: data.checkIn?.gate || undefined,
          terminal: data.checkIn?.terminal || undefined,
          boardingTime: departTime
            ? new Date(departTime.getTime() - 25 * 60 * 1000).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined,
          departTimeRaw: flight.depart_time || undefined,
          duration,
          hasCheckIn: data.hasCheckIn,
          checkInNumber: data.checkIn?.check_in_number || undefined,
          boardingPassNumber: data.checkIn?.boarding_pass_number || undefined,
        });
        setStep('confirm');
      } catch (error) {
        toast.error(
          'Không tìm thấy',
          error instanceof ApiRequestError
            ? error.message
            : 'Không thể kết nối máy chủ. Vui lòng thử lại.'
        );
      } finally {
        setLoading(false);
      }
    },
    [bookingCode, lastName, toast]
  );

  const handleCheckIn = useCallback(async () => {
    if (!agreed) {
      toast.warning('Chưa đồng ý', 'Vui lòng xác nhận đồng ý với quy định an toàn bay');
      return;
    }
    if (!checkInData) return;

    setLoading(true);
    try {
      const data = await apiRequest<{
        success?: boolean;
        checkInNumber?: string;
        checkIn?: {
          gate?: string | null;
          terminal?: string | null;
          check_in_number?: string | null;
          boarding_pass_number?: string | null;
        };
      }>('/api/checkin', {
        method: 'POST',
        body: {
          bookingId: checkInData.bookingId,
          seatNumber: checkInData.seat,
          flightNo: checkInData.flightNo,
          fromCode: checkInData.from,
          toCode: checkInData.to,
          departTime: checkInData.departTimeRaw || `${checkInData.date} ${checkInData.departTime}`,
          passengerName: checkInData.passengerName,
          gate: checkInData.gate || null,
          terminal: checkInData.terminal || null,
        },
      });

      setCheckInData((prev) =>
        prev
          ? {
              ...prev,
              hasCheckIn: true,
              gate: data.checkIn?.gate || prev.gate,
              terminal: data.checkIn?.terminal || prev.terminal,
              checkInNumber: data.checkIn?.check_in_number || prev.checkInNumber,
              boardingPassNumber: data.checkIn?.boarding_pass_number || prev.boardingPassNumber,
            }
          : prev
      );
      setStep('success');
      toast.success('Check-in thành công!', 'Thẻ lên máy bay đã sẵn sàng.');
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        toast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thực hiện check-in online.');
        router.push('/dang-nhap?redirect=/lam-thu-tuc');
        return;
      }

      // 400 with a check-in number means the booking was already checked in.
      const payload =
        error instanceof ApiRequestError
          ? (error.payload as { checkInNumber?: string } | undefined)
          : undefined;
      if (error instanceof ApiRequestError && error.status === 400 && payload?.checkInNumber) {
        setStep('success');
        toast.info('Đã check-in trước đó', `Mã thẻ lên máy bay: ${payload.checkInNumber}`);
        return;
      }

      if (error instanceof ApiRequestError) {
        toast.error('Check-in thất bại', error.message);
        return;
      }

      toast.error('Lỗi', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [agreed, checkInData, toast, router]);

  const fieldClass =
    'w-full rounded-lg border border-[rgb(var(--vj-navy-rgb))]/20 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--vj-text)] placeholder:text-[var(--vj-text-muted)] focus:border-[var(--vj-red)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--vj-red-rgb))]/20 font-koho';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d9e9f8] via-[#eef4fa] to-[var(--background)] flex flex-col">
      <Header />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* ===== Đầu trang: 2 chip + tiêu đề (bố cục vietjetair.com/vi/checkin) ===== */}
      <section className="border-b border-[var(--border)] bg-transparent">
        <div className="mx-auto max-w-[1000px] px-4 pt-7">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[var(--vj-red)] shadow-vj-btn ring-1 ring-white/70">
              <MdConfirmationNumber className="h-3.5 w-3.5" />
              Tìm kiếm mã đặt chỗ
            </span>
            {/* "Chuyến bay sắp tới" của site thật nằm ở trang quản lý đặt chỗ, nên
                chip thứ hai trỏ thẳng tới đó thay vì giả lập một tab rỗng. */}
            <Link
              href="/chuyen-bay-cua-toi"
              className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-xs font-bold text-[var(--vj-text-gray)] transition-colors hover:text-[var(--vj-red)]"
            >
              <FlightIcon className="h-3.5 w-3.5" />
              Chuyến bay sắp tới
            </Link>
          </div>

          <h1 className="mt-5 text-lg font-black uppercase tracking-tight text-[var(--vj-text)] sm:text-xl">
            Check-in
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--vj-text-gray)]">
            Sẵn sàng cho chuyến bay vui vẻ, thoải mái, bạn có thể làm thủ tục chuyến bay trực tuyến
            nhanh chóng và đơn giản.
          </p>
        </div>
      </section>

      {/* Stepper3 bước đã bỏ — site thật không có dải bước ở trang check-in. */}

      <main className="mx-auto max-w-[1000px] flex-1 px-4 py-6">
        {/* ============ BƯỚC 1: TRA CỨU ============ */}
        {step === 'search' && (
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
            {/* Thẻ form tra cứu */}
            <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-white/70 shadow-vj-md">
              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="relative">
                  <label className="pointer-events-none absolute left-3 top-2 text-[11px] font-medium text-[var(--vj-text-muted)]">
                    Mã đặt chỗ <span className="text-[var(--vj-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                    placeholder=" "
                    className={`${fieldClass} pb-2 pt-6 uppercase`}
                  />
                </div>

                <div className="relative">
                  <label className="pointer-events-none absolute left-3 top-2 text-[11px] font-medium text-[var(--vj-text-muted)]">
                    Họ <span className="text-[var(--vj-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder=" "
                    className={`${fieldClass} pb-2 pt-6`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="vj-cta mt-1 inline-flex h-10 items-center justify-center self-start rounded-lg px-7 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Đang tra cứu…' : 'Tìm kiếm'}
                </button>
              </form>
            </div>

            {/* Nội dung hướng dẫn — bám theo vietjetair.com/vi/checkin. Khối "Quy
                trình check-in" cũ đã bỏ vì stepper phía trên đã mô tả quy trình. */}
            <div className="space-y-5 text-[13px] leading-6 text-[var(--vj-text-gray)]">
              <div>
                <p>
                  Quý khách có thể chủ động làm thủ tục chuyến bay trực tuyến (Online Check-in) trên
                  website hoặc ứng dụng Vietjet Air từ{' '}
                  <strong className="text-[var(--vj-text)]">24 giờ đến 60 phút</strong> trước giờ
                  khởi hành (thời gian kết thúc có thể thay đổi tùy sân bay).
                </p>
                <h3 className="mt-4 text-sm font-black text-[var(--vj-text)]">
                  Tiện lợi – nhanh chóng – tiết kiệm thời gian
                </h3>
                <p className="mt-1">
                  Hoàn tất thủ tục mọi lúc, mọi nơi và hạn chế thời gian chờ tại Quầy thủ tục sân
                  bay.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-black text-[var(--vj-text)]">
                    Lưu ý sau khi Online Check-in:
                  </h3>
                  <p className="mt-3 font-bold text-[var(--vj-text)]">Không có hành lý ký gửi:</p>
                  <p className="mt-1">
                    Đối với chuyến bay nội địa tại Việt Nam, Quý khách chuẩn bị hành lý xách tay
                    đúng quy định và di chuyển trực tiếp đến khu vực kiểm tra an ninh.
                  </p>
                  <p className="mt-3 font-bold text-[var(--vj-text)]">Có hành lý ký gửi:</p>
                  <p className="mt-1">
                    Vui lòng đến Quầy Online Check-in/Bag Drop để gửi hành lý. Quầy làm thủ tục
                    chuyến bay nội địa đóng trước 40 phút so với giờ khởi hành (giờ đóng quầy quốc
                    tế tùy sân bay).
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--vj-text)]">Lưu ý quan trọng:</h3>
                  <p className="mt-3">
                    Nếu có thay đổi chuyến bay sau khi đã Online Check-in, Quý khách cần thực hiện
                    Online Check-in lại để nhận Thẻ lên tàu bay mới và sử dụng đúng thẻ lên tàu bay
                    của chuyến bay đang khởi hành.
                  </p>
                  <p className="mt-3">
                    Trong giờ cao điểm hoặc mùa lễ Tết, khu vực an ninh/xuất nhập cảnh có thể đông;
                    Quý khách nên đến sân bay sớm để đảm bảo hành trình thuận lợi.
                  </p>
                </div>
              </div>
            </div>

            {/* Khoản mục site thật:3. Chuyến bay quốc tế + các liên kết TẠI ĐÂY */}
            <div className="mt-6 space-y-3 rounded-2xl bg-white p-6 text-[13px] leading-6 text-[var(--vj-text-gray)] shadow-vj-md">
              <div>
                <h3 className="text-sm font-black text-[var(--vj-text)]">3. Chuyến bay quốc tế:</h3>
                <p className="mt-2 font-bold text-[var(--vj-text)]">
                  Áp dụng các chuyến bay xuất phát từ:
                </p>
                <ul className="mt-1 list-disc pl-5">
                  <li>Việt Nam</li>
                  <li>Úc</li>
                  <li>Ấn Độ</li>
                  <li>Nhật Bản</li>
                  <li>Hàn Quốc</li>
                  <li>Đông Nam A (Ngoài trừ DPS)</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[var(--vj-text)]">Thời gian áp dụng:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    Các chuyến bay khai thác bởi Vietjet: từ 24 tiếng đến 90 phút trước giờ bay.
                  </li>
                  <li>
                    Chuyến bay quốc tế xuất phát từ Úc: từ 24 tiếng đến 04 tiếng trước giờ bay.
                  </li>
                  <li>
                    Chuyến bay khai thác bởi Thai Vietjet: làm thủ tục trực tuyến trên website của
                    Thai Vietjet.
                  </li>
                </ul>
              </div>
              <p className="font-bold text-[var(--vj-text)]">
                *Lưu ý quan trọng dành cho hành khách quốc tế đã hoàn thành làm thủ tục trực tuyến:
                Quy định này chỉ áp dụng đối với các chuyến bay không có hành lý ký gửi.
              </p>
              <p>
                Để đảm bảo hành trình suôn sẻ, Quý khách vui lòng có mặt tại Quầy phục vụ khách làm
                thủ tục trực tuyến trước giờ khởi hành 60 phút để nhân viên xác thực thông tin
                chuyến bay và giấy tờ du lịch, giấy tờ xuất nhập cảnh theo quy định của điểm đến.
              </p>
              <div>
                <p className="font-bold text-[var(--vj-text)]">
                  Xác nhận lại thông tin chuyến bay với nhân viên phụ trách.
                </p>
                <p>
                  Kiểm tra giấy tờ du lịch, giấy tờ xuất nhập cảnh theo yêu cầu của cảnh sát an
                  ninh:{' '}
                  <a href="/gioi-thieu" className="font-bold text-[var(--vj-red)] underline">
                    TẠI ĐÂY
                  </a>
                </p>
              </div>
              <div className="space-y-2 rounded-lg bg-[var(--vj-sky)] p-4">
                <p>
                  <span className="font-bold text-[var(--vj-text)]">
                    II. Các chuyến bay khai thác bởi Thai Vietjet
                  </span>
                  , vui lòng làm thủ tục trực tuyến:{' '}
                  <a href="/lam-thu-tuc" className="font-bold text-[var(--vj-red)] underline">
                    TẠI ĐÂY
                  </a>
                </p>
                <p>
                  <span className="font-bold text-[var(--vj-text)]">
                    III. Làm thủ tục trực tuyến bằng công nghệ nhận diện khuôn mặt
                  </span>
                  , hướng dẫn chi tiết:{' '}
                  <a href="/hoi-dap" className="font-bold text-[var(--vj-red)] underline">
                    TẠI ĐÂY
                  </a>
                </p>
              </div>
              <p className="font-bold text-[var(--vj-text)]">
                Xin cảm ơn &amp; chúc Quý khách có chuyến bay vui vẻ!
              </p>
            </div>
          </div>
        )}

        {/* ============ BƯỚC 2: XÁC NHẬN ============ */}
        {step === 'confirm' && checkInData && (
          <div className="mx-auto max-w-[700px]">
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-lg">
              <div className="bg-[var(--vj-red)] px-5 py-3 text-white font-black text-sm uppercase flex items-center gap-2">
                <MdChair className="h-4 w-4 text-[var(--vj-yellow)]" />
                Xác nhận và chọn chỗ ngồi
              </div>

              {/* Récap vol */}
              <div className="p-5 bg-[var(--vj-sky)] rounded-lg border border-[var(--vj-sky)]">
                <div className="flex items-center justify-between text-xs text-[var(--vj-text-gray)] mb-1">
                  <span className="font-bold text-[var(--vj-red)]">{checkInData.flightNo}</span>
                  <span className="font-bold">{checkInData.date}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-2xl font-black text-[var(--vj-text)]">{checkInData.from}</p>
                    <p className="text-xs text-[var(--vj-text-muted)]">{checkInData.fromCity}</p>
                    <p className="text-lg font-bold text-[var(--vj-red)]">
                      {checkInData.departTime}
                    </p>
                  </div>
                  <div className="flex-1 mx-4 text-center text-xs text-[var(--vj-text-muted)]">
                    <p className="font-semibold">{checkInData.duration}</p>
                    <div className="mt-1 relative h-px bg-[var(--border)]">
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full border border-[var(--vj-red)]" />
                      <FlightIcon className="absolute -top-3 left-1/2 -translate-x-1/2 text-[var(--vj-red)]" />
                      <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[rgb(var(--vj-red-rgb))]/40" />
                    </div>
                    <p className="mt-1 text-[var(--vj-text-muted)]">Bay thẳng · Không dừng</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[var(--vj-text)]">{checkInData.to}</p>
                    <p className="text-xs text-[var(--vj-text-muted)]">{checkInData.toCity}</p>
                    <p className="text-lg font-bold text-[var(--vj-red)]">
                      {checkInData.arriveTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info passager + siège */}
              <div className="p-5 grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--vj-text-muted)]">
                    Hành khách
                  </p>
                  <p className="font-bold text-[var(--vj-text)]">{checkInData.passengerName}</p>
                  <p className="text-xs text-[var(--vj-text-muted)]">{checkInData.class}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--vj-text-muted)]">
                    Ghế đã chọn
                  </p>
                  <p className="text-2xl font-black text-[var(--vj-red)]">{checkInData.seat}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--vj-text-muted)]">
                    Cửa ra máy bay &amp; Nhà ga
                  </p>
                  <p className="font-bold text-[var(--vj-text)]">
                    {checkInData.gate} · {checkInData.terminal}
                  </p>
                  <p className="text-xs text-[var(--vj-text-muted)]">
                    Lên máy bay: {checkInData.boardingTime}
                  </p>
                </div>
              </div>

              {/* Hub confirmar */}
              <div className="p-5 border-t border-[var(--vj-sky)]">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agree"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--vj-red)] focus:ring-[var(--vj-red)]"
                  />
                  <label
                    htmlFor="agree"
                    className="text-xs text-[var(--vj-text-gray)] cursor-pointer leading-relaxed"
                  >
                    Tôi xác nhận thông tin cá nhân của tôi là chính xác và cam kết không vận chuyển
                    các vật phẩm nguy hiểm/cấm mang lên máy bay.
                  </label>
                </div>

                <div className="flex gap-4 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep('search')}
                    className="w-1/3 rounded-full border border-[rgb(var(--vj-navy-rgb))]/20 bg-[var(--background)] py-3 text-sm font-bold uppercase text-[var(--vj-text-gray)] hover:bg-[var(--surface-2)]"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="vj-cta w-2/3 rounded-full py-3 text-sm font-black uppercase text-[var(--vj-red)] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <MdAccessTime className="h-4 w-4 animate-spin" />
                    ) : (
                      <MdCheckCircle className="h-4 w-4" />
                    )}
                    {loading ? 'Đang xử lý...' : 'Xác nhận làm thủ tục'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ BƯỚC 3: THẺ LÊN MÁY BAY ============ */}
        {step === 'success' && checkInData && (
          <div className="space-y-5">
            <div className="text-center">
              <MdCheckCircle className="mx-auto text-6xl text-[var(--vj-blue)]" />
              <h2 className="mt-2 text-2xl font-black text-[var(--vj-text)] uppercase">
                Check-in thành công!
              </h2>
              <p className="text-sm text-[var(--vj-text-gray)]">
                Thẻ lên máy bay của bạn: tải xuống và xuất trình khi lên máy bay.
              </p>
            </div>

            {/* Boarding pass style Vietjet */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-vj-lg">
              {/* top stamp */}
              <div className="vj-menubar px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black italic text-[var(--vj-yellow)]">
                    Vietjet Air
                  </span>
                  <span className="ml-auto text-[10px] uppercase text-white/70">
                    Boarding Pass · {checkInData.flightNo}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3 bg-[var(--vj-red)] text-white text-sm font-bold uppercase">
                <span>Gate {checkInData.gate}</span>
                <span>{checkInData.terminal}</span>
                <span>Seat {checkInData.seat}</span>
              </div>
              <div className="px-5 py-5 border-t border-[var(--vj-sky)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-black text-[var(--vj-text)]">{checkInData.from}</p>
                    <p className="text-[11px] text-[var(--vj-text-muted)]">
                      {checkInData.departTime} · {checkInData.date}
                    </p>
                  </div>
                  <FlightIcon className="h-8 w-8 text-[var(--vj-red)]" />
                  <div className="text-right">
                    <p className="text-3xl font-black text-[var(--vj-text)]">{checkInData.to}</p>
                    <p className="text-[11px] text-[var(--vj-text-muted)]">
                      {checkInData.arriveTime}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">
                      Hành khách
                    </p>
                    <p className="text-[13px] font-bold text-[var(--vj-text)]">
                      {checkInData.passengerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">
                      Mã đặt chỗ
                    </p>
                    <p className="text-[13px] font-bold text-[var(--vj-text)]">
                      {checkInData.bookingId}
                    </p>
                  </div>
                </div>
                {(checkInData.checkInNumber || checkInData.boardingPassNumber) && (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">
                        Check-in No.
                      </p>
                      <p className="text-[13px] font-bold text-[var(--vj-red)]">
                        {checkInData.checkInNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">
                        Boarding Pass
                      </p>
                      <p className="text-[13px] font-bold text-[var(--vj-red)]">
                        {checkInData.boardingPassNumber || '—'}
                      </p>
                    </div>
                  </div>
                )}
                {/* QR */}
                <div className="mt-4 flex justify-center">
                  <MdQrCode2 className="text-8xl text-[var(--vj-navy)]" />
                </div>
                <div className="flex border-t border-dashed border-[rgb(var(--vj-navy-rgb))]/20 mt-4">
                  <p className="w-full border-b-0" />
                </div>
                <p className="mt-2 text-[11px] text-[var(--vj-text-gray)]">
                  Vui lòng lưu QR code này (chụp màn hình) và xuất trình tại sân bay để lên máy bay
                  nhanh chóng.
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-[rgb(var(--vj-navy-rgb))]/20 bg-[var(--background)] px-6 py-2.5 text-sm font-bold uppercase text-[var(--vj-text-gray)] hover:bg-[var(--surface-2)]"
              >
                In thẻ lên máy bay
              </button>
              <Link
                href="/trang-chu"
                className="rounded-xl bg-[var(--vj-yellow)] px-6 py-2.5 text-sm font-black uppercase text-[var(--vj-red)] shadow-lg hover:bg-[var(--vj-yellow-2)] transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function OnlineCheckInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
      <CheckInParamsWrapper />
    </Suspense>
  );
}

function CheckInParamsWrapper() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  return <CheckInContent prefillBookingId={code} />;
}
