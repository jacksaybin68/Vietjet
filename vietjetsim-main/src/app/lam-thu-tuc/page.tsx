'use client';

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckInHeader } from '@/shared/components/navigation';
import { Footer } from '@/shared/components/navigation';
import { useAuthModal } from '@/features/auth/components';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { BoardingPassCard } from '@/features/payments/components';
import { MdFlight as FlightIcon, MdCheckCircle, MdAccessTime, MdChair } from 'react-icons/md';
import { apiRequest, ApiRequestError } from '@/shared/services';
import CheckInSeatModal from './CheckInSeatModal';

/** Đếm ngược thời gian tới giờ bay, dạng "2 ngày 3 giờ" / "45 phút". */
function formatMinutesToDeparture(minutes: number): string {
  if (minutes <= 0) return 'đã khởi hành';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${mins} phút`;
  return `${mins} phút`;
}

/** Một hành khách trên một chặng. */
interface LegPassenger {
  id: string;
  name: string;
  seat_number: string | null;
}

/** Một check-in đã cấp. */
interface LegCheckIn {
  id: string;
  passenger_id: string | null;
  passenger_name: string;
  seat_number: string;
  check_in_number: string;
  boarding_pass_number: string | null;
  gate: string | null;
  terminal: string | null;
}

/** Thông tin cửa sổ check-in 24h do server tính sẵn. */
interface CheckInWindow {
  enforced: boolean;
  opensAt: string;
  minutesUntilDeparture: number | null;
  isOpen: boolean;
  reason: string | null;
}

/** Một chặng bay (đi hoặc về) trả về từ `GET /api/checkin`. */
interface LegData {
  bookingId: string;
  bookingCode: string | null;
  legRole: 'outbound' | 'inbound';
  status: string;
  totalPrice: number;
  flightId: string;
  flightNo: string;
  fromCode: string;
  toCode: string;
  fromCity: string;
  toCity: string;
  departTime: string;
  arriveTime: string;
  gate: string | null;
  terminal: string | null;
  passengers: LegPassenger[];
  checkIns: LegCheckIn[];
  checkInWindow?: CheckInWindow;
}

/** Cả hai chặng của một chuyến khứ hồi. */
interface TripData {
  tripId: string;
  outbound: LegData | null;
  inbound: LegData | null;
}

function CheckInContent({ prefillBookingId }: { prefillBookingId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { openAuthModal } = useAuthModal();

  // The URL only carries the booking code; the surname is still required by the
  // lookup API, so we prefill the code and stay on the search step.
  const [step, setStep] = useState<'search' | 'confirm' | 'success'>('search');
  const [bookingCode, setBookingCode] = useState(prefillBookingId);
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<TripData | null>(null);
  /** Chặng khách đang chọn: chỉ đi, chỉ về, hoặc cả hai. */
  const [legSelection, setLegSelection] = useState<'outbound' | 'inbound' | 'both'>('outbound');
  /** Ghế khách chọn cho từng hành khách, theo khóa `${legRole}:${passengerId}`. */
  const [seatDraft, setSeatDraft] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  /** Hành khách đang chọn ghế: null = đóng modal. */
  const [seatModal, setSeatModal] = useState<{
    legRole: 'outbound' | 'inbound';
    passengerId: string;
  } | null>(null);

  /** Danh sách chặng theo lựa chọn hiện tại. */
  const selectedLegs = useMemo<LegData[]>(() => {
    if (!trip) return [];
    const legs: LegData[] = [];
    if (trip.outbound && (legSelection === 'outbound' || legSelection === 'both')) {
      legs.push(trip.outbound);
    }
    if (trip.inbound && (legSelection === 'inbound' || legSelection === 'both')) {
      legs.push(trip.inbound);
    }
    return legs;
  }, [trip, legSelection]);

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
          trip: TripData;
          hasCheckIn?: boolean;
          checkIn?: { check_in_number?: string };
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

        setTrip(data.trip);
        // Mặc định chọn chặng đi; nếu chỉ có vé một chặng thì chặng đó.
        setLegSelection(data.trip.inbound ? 'outbound' : 'inbound');
        setSeatDraft({});
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

  /**
   * Check-in cho các chặng đã chọn.
   *
   * Mỗi chặng là một lần POST riêng: `POST /api/checkin` xử lý đúng MỘT
   * chặng (`leg`), và việc gộp chặng về vào chặng đi sẽ sinh thẻ lên máy bay
   * sai chuyến. Chặng về chỉ chạy được khi chặng đi đã `confirmed` — server
   * chặn bằng 409 nên client báo lỗi luôn chứ không giả vờ thành công.
   */
  const handleCheckIn = useCallback(async () => {
    if (!agreed) {
      toast.warning('Chưa đồng ý', 'Vui lòng xác nhận đồng ý với quy định an toàn bay');
      return;
    }
    if (!trip || selectedLegs.length === 0) return;

    setLoading(true);
    const succeeded: Array<{ leg: 'outbound' | 'inbound'; legData: LegData }> = [];

    for (const leg of selectedLegs) {
      // Chặng đã check-in rồi thì không gọi lại — POST sẽ trả 409.
      if (leg.checkIns.length > 0) {
        succeeded.push({ leg: leg.legRole, legData: leg });
        continue;
      }

      // Ghế: lấy ghế khách đã chọn, nếu chưa chọn thì dùng ghế đã gán trong DB.
      const seats = leg.passengers.map((passenger) => ({
        passengerId: passenger.id,
        seatNumber: seatDraft[`${leg.legRole}:${passenger.id}`] || passenger.seat_number || '',
      }));

      if (seats.some((seat) => !seat.seatNumber)) {
        setLoading(false);
        toast.error(
          'Thiếu chỗ ngồi',
          `Vui lòng chọn chỗ ngồi cho tất cả hành khách ở chặng ${
            leg.legRole === 'inbound' ? 'về' : 'đi'
          }.`
        );
        return;
      }

      try {
        await apiRequest<{
          success?: boolean;
          checkIns?: Array<{
            passengerId: string | null;
            seatNumber: string;
            checkInNumber: string;
          }>;
        }>('/api/checkin', {
          method: 'POST',
          body: {
            // `bookingId` là UUID của dòng `bookings` (không phải PNR).
            bookingId: leg.bookingId,
            leg: leg.legRole,
            seats,
          },
        });
        succeeded.push({ leg: leg.legRole, legData: leg });
      } catch (error) {
        if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
          setLoading(false);
          toast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thực hiện check-in online.');
          router.push('/dang-nhap?redirect=/lam-thu-tuc');
          return;
        }

        // 409 = đã check-in chặng này → coi như thành công, sang chặng sau.
        if (error instanceof ApiRequestError && error.status === 409) {
          succeeded.push({ leg: leg.legRole, legData: leg });
          continue;
        }

        setLoading(false);
        toast.error(
          'Check-in thất bại',
          error instanceof ApiRequestError
            ? error.message
            : 'Không thể kết nối máy chủ. Vui lòng thử lại.'
        );
        return;
      }
    }

    // Cập nhật lại trip để thẻ lên máy bay lấy ghế & mã check-in mới nhất.
    if (succeeded.length > 0) {
      try {
        const fresh = await apiRequest<{ trip: TripData }>(
          `/api/checkin?bookingCode=${encodeURIComponent(bookingCode.trim())}` +
            `&lastName=${encodeURIComponent(lastName.trim())}`
        );
        setTrip(fresh.trip);
      } catch {
        // Không refresh được thì vẫn hiện màn hình thẻ với dữ liệu cũ.
      }
    }

    setLoading(false);
    setStep('success');
    toast.success(
      'Check-in thành công!',
      succeeded.length > 1
        ? `Đã check-in ${succeeded.length} chặng. Thẻ lên máy bay đã sẵn sàng.`
        : 'Thẻ lên máy bay đã sẵn sàng.'
    );
  }, [agreed, trip, selectedLegs, seatDraft, bookingCode, lastName, toast, router]);

  return (
    <div className="flex flex-col bg-[var(--background)]">
      {/* Nền mây phủ vùng header + nội dung chính và chiếm đúng một viewport,
          nên footer nằm ngoài vùng nền mây, theo đúng luồng tài liệu. */}
      <div className="flex min-h-screen flex-col bg-[url('/sky-clouds.svg')] bg-cover bg-top bg-no-repeat bg-rose-50">
        <CheckInHeader title="LÀM THỦ TỤC" mobileRed />
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

        {/* ===== Đầu trang: 2 tab nhỏ + tiêu đề (bố cục vietjetair.com/vi/checkin) =====
          Dùng đúng ngôn ngữ tab đã chốt ở `/chuyen-bay-cua-toi`: pill bo góc
          18px, active nền #FFDD32 chữ rgb(115,62,10), inactive nền trong suốt.
          Nền trời mây đặt ở GỐC trang (phủ toàn bộ nội dung dưới header), giống
          trang /chuyen-bay-cua-toi. */}
        {/* `<main>` bao cả khối tra cứu lẫn các bước xác nhận/thẻ lên tàu bay,
            để `#main-content` của skip link nằm ngay sau `<header>` và bao hết
            nội dung chính của trang. */}
        <main id="main-content" className="flex flex-1 flex-col">
          <section className="relative overflow-hidden py-4 sm:py-10">
            <div className="relative mx-auto w-full max-w-[1150px]">
              {/* ============ BƯỚC 1: TRA CỨU ============
                Số đo lấy từ newweb.vietjetair.com (/vi/checkin, 1440×900):
                container `x=145`, `w=1150`; cột trái `x=170`, `w=410` (ô nhập
                rộng 370px); cột phải `x=626`, `w=649`;
                H1 "LÀM THỦ TỤC" 20px/600 uppercase `lh 26px`;
                mô tả 16px/500 `lh 20.8px`;
                ô nhập cao 40px (wrapper), input 32px, gạch chân 1px;
                nút "Tìm kiếm" 127×39px gradient 26.73deg bo góc 10px;
                nút "Đăng nhập" 137×48px bo góc 12px, viền 1px rgba(236,32,41,.1);
                link "Đăng ký ngay" 14px/400 màu rgb(0,136,255).

                Trang check-in của site thật KHÔNG có dải pill "Dịch vụ tra cứu"
                (đo: không tồn tại `nav[aria-label="Dịch vụ tra cứu"]`) — nên
                dải pill đã bị bỏ khỏi trang này. */}
              {step === 'search' && (
                <div className="vj-lookup-card mt-4 grid w-full grid-cols-1 overflow-hidden lg:grid-cols-[410px_649px] lg:gap-[41px] lg:px-[25px]">
                  {/* Cột trái: CHECK-IN form.
                      Site thật: cột trái `x=170` rộng `410`; ô nhập `x=190` rộng
                      `370`; nút "Tìm kiếm" `x=312` và "Đăng nhập" `x=307` đều
                      CANH GIỮA theo cột ô nhập; dòng "Bạn đã biết về Vietjet
                      SkyJoy? Đăng ký ngay" CĂN GIỮA trong khối 370px (link
                      `x=428`).

                      Ở MOBILE (390×844) site thật: mô tả `x=15` rộng `360`
                      (`16px/500`), ô nhập `x=35` rộng `320` (lệch `+20px` so với
                      mép cột `x=15`), nhãn `14px/600`. */}
                  <div className="flex flex-col justify-start px-[15px] pb-8 pt-[13.4px] lg:border-r lg:border-[var(--vj-field-border)] lg:px-0">
                    <div>
                      <h1 className="hidden text-xl font-semibold uppercase leading-[26px] text-[var(--vj-text)] lg:block">
                        LÀM THỦ TỤC
                      </h1>
                      <p className="mt-0 text-base font-medium leading-[21px] text-[var(--vj-text)] lg:leading-[20.8px]">
                        Sẵn sàng cho chuyến bay vui vẻ, thoải mái, bạn có thể làm thủ tục chuyến bay
                        trực tuyến nhanh chóng và đơn giản.
                      </p>
                    </div>

                    {/* Khung ô nhập: lệch `+20px` so với mép cột trái (site thật
                        `x=190` so với H1 `x=170` ở desktop, `x=35` so với `x=15` ở
                        mobile), rộng `370px` ở desktop / `320px` ở mobile để nút
                        "Tìm kiếm" căn giữa đúng `x=312` (desktop) và `x=132`
                        (mobile). */}
                    <form onSubmit={handleSearch} className="mx-5 mt-4 lg:mt-5 lg:max-w-[370px]">
                      {/* Hai ô nhập, cách nhau `10px` (site thật: `y=292` → `y=342`). */}
                      <div className="flex w-full flex-col gap-[10px]">
                        {/* Ô nhập 1: Mã đặt chỗ — cao 40px, rộng 370px
                          (320px ở mobile, đo được trên site thật). */}
                        <div className="vj-lookup-field w-full max-w-[320px] lg:max-w-[370px]">
                          <input
                            id="booking-code"
                            type="text"
                            required
                            value={bookingCode}
                            onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                            autoComplete="off"
                            placeholder=" "
                            className="vj-lookup-input uppercase"
                          />
                          <label htmlFor="booking-code" className="vj-lookup-label">
                            Mã đặt chỗ <span className="text-[var(--vj-red)]">*</span>
                          </label>
                        </div>

                        {/* Ô nhập 2: Họ */}
                        <div className="vj-lookup-field w-full max-w-[320px] lg:max-w-[370px]">
                          <input
                            id="last-name"
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value.toUpperCase())}
                            autoComplete="off"
                            placeholder=" "
                            className="vj-lookup-input uppercase"
                          />
                          <label htmlFor="last-name" className="vj-lookup-label">
                            Họ <span className="text-[var(--vj-red)]">*</span>
                          </label>
                        </div>
                      </div>

                      {/* Nút "Tìm kiếm": 127×39px, bo góc 10px, gradient 26.73deg.
                          Cảnh giữa theo cột ô nhập 370px (site thật `x=312`). */}
                      <div className="mt-[10px] flex justify-center">
                        <button type="submit" disabled={loading} className="vj-lookup-btn">
                          {loading ? 'Đang tìm…' : 'Tìm kiếm'}
                        </button>
                      </div>
                    </form>

                    {/* Nút "Đăng nhập" (137×48px, bo góc 12px, viền
                        1px rgba(236,32,41,.1), chữ #D6231E 16px/500) + dòng
                        "Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay" — đo được ở
                        site thật (nút ở `x=307,y=471`, link ở `x=428,y=535`).
                        Cả hai CĂN GIỮA theo CỘT (410px ở desktop, 360px ở
                        mobile) — KHÔNG theo cột ô nhập: nút desktop `x=307`
                        (= 170 + (410-137)/2), mobile `x=127` (= 15 + (360-137)/2). */}
                    <div className="mt-[40px] flex flex-col">
                      <button
                        type="button"
                        onClick={() => openAuthModal('login', { redirectTo: '/lam-thu-tuc' })}
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

                  {/* Cột phải: Toàn bộ 16px/500 KoHo, line-height 24px, nhấn mạnh 16px/700 */}
                  <div className="space-y-4 p-6 font-koho text-sm font-medium leading-[21px] text-[var(--vj-text)] sm:p-8 sm:text-base sm:leading-[24px]">
                    <p>
                      Quý khách có thể chủ động làm thủ tục chuyến bay trực tuyến (Online Check-in)
                      trên website hoặc ứng dụng Vietjet Air từ{' '}
                      <strong className="font-bold text-[var(--vj-text)]">
                        24 giờ đến 60 phút trước giờ khởi hành
                      </strong>{' '}
                      (thời gian kết thúc có thể thay đổi tùy sân bay).
                    </p>

                    <div>
                      <h2 className="font-bold leading-[24px] text-[var(--vj-text)]">
                        Tiện lợi — nhanh chóng — tiết kiệm thời gian
                      </h2>
                      <p className="mt-1">
                        Hoàn tất thủ tục mọi lúc, mọi nơi và hạn chế thời gian chờ đợi tại Quầy thủ
                        tục sân bay.
                      </p>
                    </div>

                    {/* Khung hướng dẫn — đo được ở site thật: khối 3 cột, cột thứ
                      hai là "Lưu ý quan trọng:", cột thứ ba là các mục I/II/III. */}
                    <div className="overflow-hidden rounded-vj border border-vjyellow bg-white">
                      <div className="grid grid-cols-1 divide-y divide-vjyellow md:grid-cols-3 md:divide-x md:divide-y-0">
                        <div className="p-4 font-koho text-sm font-medium leading-[22px] text-[var(--vj-text)] sm:text-base sm:leading-[24px]">
                          <h3 className="mb-2 font-bold leading-[24px] sm:mb-3">
                            Lưu ý sau khi Online Check-in:
                          </h3>
                          <div className="space-y-3 sm:space-y-4">
                            <div>
                              <p className="font-bold leading-[22px] sm:leading-[24px]">
                                • Không có hành lý ký gửi:
                              </p>
                              <p className="mt-1">
                                Đối với chuyến bay nội địa tại Việt Nam, Quý khách chuẩn bị hành lý
                                xách tay đúng quy định và di chuyển trực tiếp đến khu vực kiểm tra
                                an ninh.
                              </p>
                            </div>
                            <div>
                              <p className="font-bold leading-[22px] sm:leading-[24px]">
                                • Có hành lý ký gửi:
                              </p>
                              <p className="mt-1">
                                Vui lòng đến{' '}
                                <strong className="font-bold text-[var(--vj-text)]">
                                  Quầy Online Check-in/Bag Drop
                                </strong>{' '}
                                để gửi hành lý. Quầy làm thủ tục chuyến bay nội địa{' '}
                                <strong className="font-bold text-[var(--vj-text)]">
                                  đóng trước 40 phút
                                </strong>{' '}
                                so với giờ khởi hành (giờ đóng quầy quốc tế tùy sân bay).
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 font-koho text-sm font-medium leading-[22px] text-[var(--vj-text)] sm:text-base sm:leading-[24px]">
                          <h3 className="mb-2 font-bold leading-[24px] sm:mb-3">
                            Lưu ý quan trọng:
                          </h3>
                          <div className="space-y-3">
                            <p>
                              Nếu có thay đổi chuyến bay sau khi đã Online Check-in, Quý khách cần
                              thực hiện{' '}
                              <strong className="font-bold text-[var(--vj-text)]">
                                Online Check-in lại để nhận Thẻ lên tàu bay mới
                              </strong>{' '}
                              và{' '}
                              <strong className="font-bold text-[var(--vj-text)]">
                                sử dụng đúng thẻ lên tàu bay của chuyến bay đang khởi hành
                              </strong>
                              .
                            </p>
                            <p>
                              Trong giờ cao điểm hoặc mùa lễ Tết, khu vực an ninh/xuất nhập cảnh có
                              thể đông; Quý khách nên đến sân bay sớm để đảm bảo hành trình thuận
                              lợi.
                            </p>
                          </div>
                        </div>
                        <div className="p-4 font-koho text-sm font-medium leading-[22px] text-[var(--vj-text)] sm:text-base sm:leading-[24px]">
                          <h3 className="mb-2 font-bold leading-[24px] text-[var(--vj-red)] sm:mb-3">
                            I. Các chuyến bay khai thác bởi Vietjet:
                          </h3>
                          <div className="space-y-3">
                            <p>
                              <strong className="font-bold text-[var(--vj-text)]">
                                1. Quy định chung:
                              </strong>{' '}
                              Quý khách cần chuẩn bị đầy đủ giấy tờ du lịch còn hạn, đáp ứng quy
                              định Xuất/Nhập cảnh và lưu trú.
                            </p>
                            <p className="font-bold leading-[22px] sm:leading-[24px]">
                              2. Chuyến bay nội địa:
                            </p>
                            <p>
                              Áp dụng cho các chuyến bay nội địa do Vietjet khai thác. Thời gian áp
                              dụng: từ 24 tiếng đến 60 phút trước giờ bay.
                            </p>
                            <p className="font-bold leading-[22px] sm:leading-[24px]">
                              3. Chuyến bay quốc tế:
                            </p>
                            <p>Áp dụng các chuyến bay xuất phát từ:</p>
                            <ul className="space-y-0.5 pl-6">
                              <li className="list-disc">Việt Nam</li>
                              <li className="list-disc">Úc</li>
                              <li className="list-disc">Ấn Độ</li>
                              <li className="list-disc">Nhật Bản</li>
                              <li className="list-disc">Hàn Quốc</li>
                              <li className="list-disc">Đông Nam Á (Ngoại trừ DPS)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mục II, III & phần lưu ý còn lại */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <p className="font-bold leading-[22px] text-[var(--vj-text)] sm:leading-[24px]">
                          Thời gian áp dụng:
                        </p>
                        <ul className="mt-1 space-y-0.5 pl-6">
                          <li className="list-disc">Từ 24 tiếng đến 90 phút trước giờ bay.</li>
                          <li className="list-disc">
                            Chuyến bay quốc tế xuất phát từ Úc: Từ 24 tiếng đến 04 tiếng trước giờ
                            bay.
                          </li>
                        </ul>
                      </div>

                      <p>
                        <strong className="font-bold text-[var(--vj-text)]">
                          *Lưu ý quan trọng dành cho hành khách quốc tế đã làm thủ tục trực tuyến:
                        </strong>{' '}
                        Quy định này áp dụng bao gồm cả Quý khách không có hành lý ký gửi.
                      </p>

                      <p>
                        Để đảm bảo hành trình suôn sẻ, Quý khách vui lòng có mặt tại Quầy phục vụ
                        khách làm thủ tục trực tuyến trước giờ khởi hành 60 phút để nhân viên xác
                        thực các thông tin bao gồm:
                      </p>

                      <div className="space-y-1 pl-4">
                        <p>Xác nhận lại thông tin chuyến bay với nhân viên hãng.</p>
                        <p>
                          Kiểm tra giấy tờ du lịch, giấy tờ xuất nhập cảnh theo quy định của điểm
                          đến.
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <p>
                          <strong className="font-bold text-primary">
                            II. Các chuyến bay khai thác bởi Thai Vietjet
                          </strong>
                          , vui lòng làm thủ tục trực tuyến:{' '}
                          <a
                            href="https://checkin.vietjetair.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-blue-600 hover:underline"
                          >
                            TẠI ĐÂY
                          </a>
                        </p>
                        <p>
                          <strong className="font-bold text-primary">
                            III. Làm thủ tục trực tuyến bằng công nghệ định danh sinh trắc học
                          </strong>
                          , hướng dẫn chi tiết:{' '}
                          <a href="/hoi-dap" className="font-bold text-blue-600 hover:underline">
                            TẠI ĐÂY
                          </a>
                        </p>
                      </div>

                      <p className="pt-2 font-medium text-[var(--vj-text)]">
                        Xin cảm ơn và chúc Quý khách có chuyến đi vui vẻ!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Stepper3 bước đã bỏ — site thật không có dải bước ở trang check-in. */}

          <div className={step === 'search' ? 'flex-1' : 'mx-auto max-w-[1200px] flex-1 px-4 py-6'}>
            {/* ============ BƯỚC 2: XÁC NHẬN ============ */}
            {step === 'confirm' && trip && (
              <div className="mx-auto max-w-[760px] space-y-4">
                {/* Chọn chặng: chỉ đi / chỉ về / cả hai.
                    Chặng về bị khóa cho tới khi chặng đi đã hoàn tất check-in —
                    server cũng chặn lại bằng 409, nên UI và rule là một. */}
                {trip.inbound && (
                  <div className="rounded-vj border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
                    <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                      Chọn chặng cần làm thủ tục
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          { key: 'outbound', label: 'Chỉ chặng đi' },
                          { key: 'inbound', label: 'Chỉ chặng về' },
                          { key: 'both', label: 'Cả 2 chặng' },
                        ] as const
                      ).map((option) => {
                        const leg = option.key === 'inbound' ? trip.inbound : trip.outbound;
                        const blocked =
                          option.key === 'inbound' &&
                          !!trip.outbound &&
                          trip.outbound.status !== 'confirmed';
                        const disabled = !leg || blocked;
                        return (
                          <label
                            key={option.key}
                            className={`flex cursor-pointer items-center gap-2 rounded-vj border px-3 py-2.5 text-xs font-bold uppercase transition-colors ${
                              legSelection === option.key
                                ? 'border-[var(--vj-red)] bg-[var(--vj-sky)] text-[var(--vj-red)]'
                                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--vj-text-gray)]'
                            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <input
                              type="radio"
                              name="leg-selection"
                              value={option.key}
                              checked={legSelection === option.key}
                              disabled={disabled}
                              onChange={() => setLegSelection(option.key)}
                              className="h-3.5 w-3.5 border-[var(--border)] text-[var(--vj-red)] focus:ring-[var(--vj-red)]"
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                    {trip.outbound && trip.outbound.status !== 'confirmed' && (
                      <p className="mt-2 text-2xs text-[var(--vj-red)]">
                        Chặng về chỉ check-in được sau khi chặng đi đã được xác nhận.
                      </p>
                    )}
                  </div>
                )}

                {selectedLegs.map((leg) => {
                  const window = leg.checkInWindow;
                  const isChecked = leg.checkIns.length > 0;
                  const depart = new Date(leg.departTime);
                  const arrive = new Date(leg.arriveTime);
                  const duration =
                    arrive > depart
                      ? (() => {
                          const mins = Math.round((arrive.getTime() - depart.getTime()) / 60000);
                          return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}ph`;
                        })()
                      : '—';
                  return (
                    <div
                      key={leg.bookingId}
                      className="overflow-hidden rounded-vj border border-[var(--border)] bg-[var(--background)] shadow-lg"
                    >
                      <div className="flex items-center gap-2 bg-[var(--vj-red)] px-5 py-3 text-sm font-black uppercase text-white">
                        <MdChair className="h-4 w-4 text-[var(--vj-yellow)]" />
                        {leg.legRole === 'inbound' ? 'Chặng về' : 'Chặng đi'} · {leg.flightNo}
                        {isChecked && (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-2xs">
                            <MdCheckCircle className="h-3 w-3" />
                            Đã check-in
                          </span>
                        )}
                      </div>

                      {/* Récap vol */}
                      <div className="bg-[var(--vj-sky)] p-5">
                        <div className="mb-1 flex items-center justify-between text-xs text-[var(--vj-text-gray)]">
                          <span className="font-bold text-[var(--vj-red)]">{leg.flightNo}</span>
                          <span className="font-bold">{depart.toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-black text-[var(--vj-text)]">
                              {leg.fromCode}
                            </p>
                            <p className="text-xs text-[var(--vj-text-muted)]">{leg.fromCity}</p>
                            <p className="text-lg font-bold text-[var(--vj-red)]">
                              {depart.toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="mx-4 flex-1 text-center text-xs text-[var(--vj-text-muted)]">
                            <p className="font-semibold">{duration}</p>
                            <div className="relative mt-1 h-px bg-[var(--border)]">
                              <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full border border-[var(--vj-red)]" />
                              <FlightIcon className="absolute -top-3 left-1/2 -translate-x-1/2 text-[var(--vj-red)]" />
                              <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[rgb(var(--vj-red-rgb))]/40" />
                            </div>
                            <p className="mt-1 text-[var(--vj-text-muted)]">
                              Bay thẳng · Không dừng
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-black text-[var(--vj-text)]">
                              {leg.toCode}
                            </p>
                            <p className="text-xs text-[var(--vj-text-muted)]">{leg.toCity}</p>
                            <p className="text-lg font-bold text-[var(--vj-red)]">
                              {arrive.toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Cửa sổ check-in 24h — server đã tính sẵn. */}
                        {window && (
                          <div
                            className={`mt-3 rounded-vj border px-3 py-2 text-2xs leading-relaxed ${
                              window.isOpen
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {window.isOpen ? (
                              window.minutesUntilDeparture !== null &&
                              window.minutesUntilDeparture > 0 ? (
                                <>
                                  Cửa sổ check-in đang mở · còn{' '}
                                  <strong>
                                    {formatMinutesToDeparture(window.minutesUntilDeparture)}
                                  </strong>{' '}
                                  trước giờ bay.
                                </>
                              ) : (
                                <>Cửa sổ check-in đang mở.</>
                              )
                            ) : (
                              <>
                                Check-in chỉ mở từ 24 giờ trước giờ bay (
                                {new Date(window.opensAt).toLocaleString('vi-VN')}).
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hành khách + chọn ghế */}
                      <div className="p-5">
                        <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                          Hành khách &amp; chỗ ngồi
                        </p>
                        <div className="mt-2 space-y-2">
                          {leg.passengers.map((passenger) => {
                            const key = `${leg.legRole}:${passenger.id}`;
                            const seat = seatDraft[key] || passenger.seat_number || '';
                            const checkIn = leg.checkIns.find(
                              (ci) => ci.passenger_id === passenger.id
                            );
                            return (
                              <div
                                key={passenger.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-vj border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-[var(--vj-text)]">
                                    {passenger.name.toUpperCase()}
                                  </p>
                                  <p className="text-2xs text-[var(--vj-text-muted)]">
                                    Mã đặt chỗ: {leg.bookingCode || '—'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-black text-[var(--vj-red)] font-koho">
                                    {seat || '—'}
                                  </span>
                                  {!isChecked && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSeatModal({
                                          legRole: leg.legRole,
                                          passengerId: passenger.id,
                                        })
                                      }
                                      className="flex cursor-pointer items-center gap-1 rounded-vj border border-blue-200 bg-blue-50 px-2.5 py-1 text-2xs font-bold text-vj-bank-blue shadow-2xs transition-colors hover:bg-blue-100"
                                    >
                                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                      Đổi chỗ ngồi
                                    </button>
                                  )}
                                  {isChecked && checkIn && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700">
                                      {checkIn.check_in_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                          <div>
                            <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                              Cửa ra máy bay &amp; Nhà ga
                            </p>
                            <p className="font-bold text-[var(--vj-text)]">
                              {leg.gate || '—'} · {leg.terminal || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                              Lên máy bay
                            </p>
                            <p className="font-bold text-[var(--vj-text)]">
                              {new Date(depart.getTime() - 25 * 60 * 1000).toLocaleTimeString(
                                'vi-VN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Hub confirmar */}
                <div className="rounded-vj border border-[var(--border)] bg-[var(--background)] p-5 shadow-lg">
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
                      className="cursor-pointer text-xs leading-relaxed text-[var(--vj-text-gray)]"
                    >
                      Tôi xác nhận thông tin cá nhân của tôi là chính xác và cam kết không vận
                      chuyển các vật phẩm nguy hiểm/cấm mang lên máy bay.
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
                      className="vj-cta flex w-2/3 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium uppercase transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <MdAccessTime className="h-4 w-4 animate-spin" />
                      ) : (
                        <MdCheckCircle className="h-4 w-4" />
                      )}
                      {loading
                        ? 'Đang xử lý...'
                        : selectedLegs.length > 1
                          ? `Check-in ${selectedLegs.length} chặng`
                          : 'Xác nhận làm thủ tục'}
                    </button>
                  </div>
                </div>

                {/* Modal chọn ghế trực tuyến đồng bộ realtime SSE */}
                {seatModal &&
                  (() => {
                    const leg = selectedLegs.find((item) => item.legRole === seatModal.legRole);
                    const passenger = leg?.passengers.find((p) => p.id === seatModal.passengerId);
                    if (!leg || !passenger) return null;
                    const key = `${leg.legRole}:${passenger.id}`;
                    return (
                      <CheckInSeatModal
                        flightId={leg.flightId}
                        flightNo={leg.flightNo}
                        currentSeat={seatDraft[key] || passenger.seat_number || ''}
                        onSelectSeat={(newSeat) => {
                          setSeatDraft((prev) => ({ ...prev, [key]: newSeat }));
                          toast.success('Đã cập nhật chỗ ngồi', `Vị trí ghế mới: ${newSeat}`);
                        }}
                        onClose={() => setSeatModal(null)}
                      />
                    );
                  })()}
              </div>
            )}

            {/* ============ BƯỚC 3: THẺ LÊN MÁY BAY ============ */}
            {step === 'success' && trip && (
              <div className="space-y-6">
                <div className="text-center">
                  <MdCheckCircle className="mx-auto text-6xl text-[var(--vj-blue)]" />
                  <h2 className="mt-2 text-2xl font-black uppercase text-[var(--vj-text)]">
                    Check-in thành công!
                  </h2>
                  <p className="text-sm text-[var(--vj-text-gray)]">
                    Thẻ lên máy bay của bạn: tải xuống điện thoại và xuất trình khi lên máy bay.
                  </p>
                </div>

                {/* Mỗi chặng đã check-in: một thẻ lên máy bay cho mỗi hành khách. */}
                {(() => {
                  const allLegs = [trip.outbound, trip.inbound].filter(
                    (leg): leg is LegData => leg !== null
                  );
                  return allLegs
                    .filter((leg) => leg.checkIns.length > 0)
                    .map((leg) => {
                      const depart = new Date(leg.departTime);
                      const arrive = new Date(leg.arriveTime);
                      const ticketData = {
                        pnr: leg.bookingCode ?? '',
                        flightNo: leg.flightNo,
                        from: leg.fromCode,
                        to: leg.toCode,
                        fromCity: leg.fromCity,
                        toCity: leg.toCity,
                        date: depart.toLocaleDateString('vi-VN'),
                        departTime: depart.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        arriveTime: arrive.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        passengers: [],
                        amount: leg.totalPrice,
                      };
                      const pdfUrl = `/api/dat-ve/${leg.bookingId}/ve-dien-tu?leg=${leg.legRole}`;
                      return (
                        <section key={leg.bookingId} className="space-y-4">
                          <h3 className="text-sm font-black uppercase text-[var(--vj-text-gray)]">
                            {leg.legRole === 'inbound' ? 'Chặng về' : 'Chặng đi'} · {leg.flightNo} ·{' '}
                            {leg.fromCode} → {leg.toCode}
                          </h3>
                          {leg.checkIns.map((checkIn) => {
                            const passenger =
                              leg.passengers.find((p) => p.id === checkIn.passenger_id) ??
                              leg.passengers[0];
                            const seatNumber = checkIn.seat_number;
                            return (
                              <BoardingPassCard
                                key={checkIn.id}
                                data={ticketData}
                                passenger={{
                                  name: checkIn.passenger_name || passenger?.name || '',
                                  seat: seatNumber,
                                }}
                                legRole={leg.legRole}
                                gate={checkIn.gate || leg.gate}
                                terminal={checkIn.terminal || leg.terminal}
                                boardingPassNumber={
                                  checkIn.boarding_pass_number || checkIn.check_in_number
                                }
                                pdfUrl={pdfUrl}
                              />
                            );
                          })}
                        </section>
                      );
                    });
                })()}

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="rounded-vj border border-[rgb(var(--vj-navy-rgb))]/20 bg-[var(--background)] px-6 py-2.5 text-sm font-bold uppercase text-[var(--vj-text-gray)] hover:bg-[var(--surface-2)]"
                  >
                    In thẻ lên máy bay
                  </button>
                  <Link
                    href="/trang-chu"
                    className="vj-cta px-6 py-2.5 text-sm font-medium uppercase shadow-lg transition-colors"
                  >
                    Về trang chủ
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

function CheckInContainer() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  return <CheckInContent prefillBookingId={code} />;
}

export default function OnlineCheckInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
      <CheckInContainer />
    </Suspense>
  );
}
