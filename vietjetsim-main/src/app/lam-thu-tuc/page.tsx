'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckInHeader } from '@/shared/components/navigation';
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
  /** The PNR, shown on the boarding pass. */
  bookingId: string;
  /** The row id. `POST /api/checkin` resolves this one, not the PNR. */
  bookingUuid: string;
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
          booking: {
            id: string;
            booking_code?: string | null;
            status?: string;
            flight?: Record<string, string>;
          };
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
          bookingUuid: b.id,
          // The PNR, not the row UUID: this is printed on the boarding pass, and
          // the UUID resolves in neither check-in nor booking lookup.
          bookingId: b.booking_code || b.id,
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
          // The row id: `POST /api/checkin` calls `getBookingById`, which matches
          // on `b.id` alone. Sending the PNR here would 404.
          bookingId: checkInData.bookingUuid,
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

  return (
    <div className="flex flex-col bg-[var(--background)]">
      {/* Nền mây phủ vùng header + nội dung chính và chiếm đúng một viewport,
          nên footer nằm ngoài vùng nền mây, theo đúng luồng tài liệu. */}
      <div className="flex min-h-screen flex-col bg-[url('/sky-clouds.svg')] bg-cover bg-top bg-no-repeat bg-rose-50">
        <CheckInHeader />
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

        {/* ===== Đầu trang: 2 tab nhỏ + tiêu đề (bố cục vietjetair.com/vi/checkin) =====
          Dùng đúng ngôn ngữ tab đã chốt ở `/chuyen-bay-cua-toi`: tab đang chọn nền
          trắng pha trong suốt + chữ/icon đỏ, tab còn lại chữ xám không nền; cả
          hai nhỏ gọn, đặt sát nhau. Nền trời mây đặt ở GỐC trang (phủ toàn bộ
          nội dung dưới header), giống trang /chuyen-bay-cua-toi. */}
        <section className="relative overflow-hidden py-8 sm:py-10">
          <div
            className="relative mx-auto max-w-full px-4 sm:px-0"
            style={{ width: 'min(1200px, calc(100vw - 80px))' }}
          >
            {/* Tab active + tab inactive */}
            <div className="flex items-end">
              <div
                className="flex items-center justify-center gap-2 select-none"
                style={{
                  width: '199px',
                  height: '48px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '8px 8px 0 0',
                  color: '#EC2029',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                <MdConfirmationNumber className="h-5 w-5 text-primary" />
                <span>Tìm kiếm mã đặt chỗ</span>
              </div>
              <Link
                href="/chuyen-bay-cua-toi"
                className="flex items-center justify-center gap-2 px-5 text-gray-600 transition-colors hover:text-primary"
                style={{
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                <FlightIcon className="h-5 w-5" />
                <span>Chuyến bay sắp tới</span>
              </Link>
            </div>

            {/* ============ BƯỚC 1: TRA CỨU ============ */}
            {step === 'search' && (
              <div
                className="grid w-full grid-cols-1 overflow-hidden lg:grid-cols-[474px_minmax(0,1fr)]"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '0 10px 10px 10px',
                  boxShadow: '0 3px 12px rgba(0, 31, 62, 0.08)',
                }}
              >
                {/* Cột trái: CHECK-IN form */}
                <div className="flex flex-col justify-start border-b border-gray-200 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-gray-200">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 font-sans">
                      CHECK-IN
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700 font-medium">
                      Sẵn sàng cho chuyến bay vui vẻ, thoải mái, bạn có thể làm thủ tục chuyến bay
                      trực tuyến nhanh chóng và đơn giản.
                    </p>
                  </div>

                  <form onSubmit={handleSearch} className="mt-6 flex flex-col items-center">
                    <div className="flex w-full flex-col items-center gap-[10px]">
                      {/* Ô nhập 1: Mã đặt chỗ (410x40) */}
                      <div
                        className="relative flex h-[40px] items-center rounded-[5px] bg-white px-[20px]"
                        style={{
                          width: '410px',
                          maxWidth: '100%',
                          boxShadow: '0 4px 9px rgba(0, 0, 0, 0.09)',
                        }}
                      >
                        <input
                          id="booking-code"
                          type="text"
                          required
                          value={bookingCode}
                          onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                          autoComplete="off"
                          className="peer z-10 h-full w-full border-0 bg-transparent p-0 text-base font-semibold uppercase text-gray-900 outline-none"
                        />
                        {!bookingCode && (
                          <label
                            htmlFor="booking-code"
                            className="pointer-events-none absolute left-[20px] flex select-none items-center text-base font-semibold text-gray-500 transition-opacity peer-focus:opacity-30"
                          >
                            Mã đặt chỗ<span className="ml-0.5 text-primary">*</span>
                          </label>
                        )}
                      </div>

                      {/* Ô nhập 2: Họ (410x40) */}
                      <div
                        className="relative flex h-[40px] items-center rounded-[5px] bg-white px-[20px]"
                        style={{
                          width: '410px',
                          maxWidth: '100%',
                          boxShadow: '0 4px 9px rgba(0, 0, 0, 0.09)',
                        }}
                      >
                        <input
                          id="last-name"
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value.toUpperCase())}
                          autoComplete="off"
                          className="peer z-10 h-full w-full border-0 bg-transparent p-0 text-base font-semibold uppercase text-gray-900 outline-none"
                        />
                        {!lastName && (
                          <label
                            htmlFor="last-name"
                            className="pointer-events-none absolute left-[20px] flex select-none items-center text-base font-semibold text-gray-500 transition-opacity peer-focus:opacity-30"
                          >
                            Họ<span className="ml-0.5 text-primary">*</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Nút Tìm kiếm 127x39 bo 10 gradient 3 điểm dừng */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-5 flex items-center justify-center border-0 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        width: '127px',
                        height: '39px',
                        borderRadius: '10px',
                        background:
                          'linear-gradient(26.73deg, #F9A51A 0%, #FBB612 50%, #FFDD00 100%)',
                        color: '#000000',
                        fontFamily: 'JambonoMedium, sans-serif',
                        fontSize: '16px',
                        fontWeight: 700,
                        fontStyle: 'italic',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Đang tìm…' : 'Tìm kiếm'}
                    </button>
                  </form>
                </div>

                {/* Cột phải: Toàn bộ 16px/500 KoHo, line-height 24px, nhấn mạnh 16px/700 */}
                <div className="space-y-4 p-6 sm:p-8 font-koho text-base font-medium leading-[24px] text-gray-900">
                  <p>
                    Quý khách có thể chủ động làm thủ tục chuyến bay trực tuyến (Online Check-in)
                    trên website hoặc ứng dụng Vietjet Air từ{' '}
                    <strong className="font-bold text-gray-900">
                      24 giờ đến 60 phút trước giờ khởi hành
                    </strong>{' '}
                    (thời gian kết thúc có thể thay đổi tùy sân bay).
                  </p>

                  <div>
                    <h2 className="font-bold text-base leading-[24px] text-gray-900">
                      Tiện lợi — nhanh chóng — tiết kiệm thời gian
                    </h2>
                    <p className="mt-1">
                      Hoàn tất thủ tục mọi lúc, mọi nơi và hạn chế thời gian chờ đợi tại Quầy thủ
                      tục sân bay.
                    </p>
                  </div>

                  {/* Khung vàng: <table> viền 1px #EDCE00, bo 8, nền trắng */}
                  <div className="overflow-hidden rounded-[8px] border border-vjyellow bg-white">
                    <table
                      className="w-full border-collapse bg-white font-koho text-base font-medium leading-[24px] text-gray-900"
                      style={{ borderSpacing: 0 }}
                    >
                      <tbody>
                        <tr>
                          <td
                            className="block w-full border-b border-vjyellow p-5 align-top md:table-cell md:w-1/2 md:border-b-0 md:border-r"
                            style={{ borderColor: '#EDCE00' }}
                          >
                            <h3 className="mb-3 font-bold text-base leading-[24px] text-gray-900">
                              Lưu ý sau khi Online Check-in:
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <p className="font-bold text-base leading-[24px] text-gray-900">
                                  • Không có hành lý ký gửi:
                                </p>
                                <p className="mt-1">
                                  Đối với chuyến bay nội địa tại Việt Nam, Quý khách chuẩn bị hành
                                  lý xách tay đúng quy định và di chuyển trực tiếp đến khu vực kiểm
                                  tra an ninh.
                                </p>
                              </div>
                              <div>
                                <p className="font-bold text-base leading-[24px] text-gray-900">
                                  • Có hành lý ký gửi:
                                </p>
                                <p className="mt-1">
                                  Vui lòng đến{' '}
                                  <strong className="font-bold text-gray-900">
                                    Quầy Online Check-in/Bag Drop
                                  </strong>{' '}
                                  để gửi hành lý. Quầy làm thủ tục chuyến bay nội địa{' '}
                                  <strong className="font-bold text-gray-900">
                                    đóng trước 40 phút
                                  </strong>{' '}
                                  so với giờ khởi hành (giờ đóng quầy quốc tế tùy sân bay).
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="block w-full p-5 align-top md:table-cell md:w-1/2">
                            <h3 className="mb-3 font-bold text-base leading-[24px] text-gray-900">
                              Lưu ý quan trọng:
                            </h3>
                            <div className="space-y-3">
                              <p>
                                Nếu có thay đổi chuyến bay sau khi đã Online Check-in, Quý khách cần
                                thực hiện{' '}
                                <strong className="font-bold text-gray-900">
                                  Online Check-in lại để nhận Thẻ lên tàu bay mới
                                </strong>{' '}
                                và{' '}
                                <strong className="font-bold text-gray-900">
                                  sử dụng đúng thẻ lên tàu bay của chuyến bay đang khởi hành
                                </strong>
                                .
                              </p>
                              <p>
                                Trong giờ cao điểm hoặc mùa lễ Tết, khu vực an ninh/xuất nhập cảnh
                                có thể đông; Quý khách nên đến sân bay sớm để đảm bảo hành trình
                                thuận lợi.
                              </p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Mục I, II, III & khôi phục toàn bộ nội dung hướng dẫn */}
                  <div className="space-y-4 pt-2">
                    <h3 className="font-bold text-base leading-[24px] text-primary">
                      I. Các chuyến bay khai thác bởi Vietjet:
                    </h3>

                    <div>
                      <p>
                        <strong className="font-bold text-gray-900">1. Quy định chung:</strong> Quý
                        khách cần chuẩn bị đầy đủ giấy tờ du lịch còn hạn, đáp ứng quy định
                        Xuất/Nhập cảnh và lưu trú.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-base leading-[24px] text-gray-900">
                        2. Chuyến bay nội địa:
                      </p>
                      <p className="mt-1">
                        Áp dụng cho các chuyến bay nội địa do Vietjet khai thác.
                      </p>
                      <p className="mt-1">
                        Thời gian áp dụng: từ 24 tiếng đến 60 phút trước giờ bay.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-base leading-[24px] text-gray-900">
                        3. Chuyến bay quốc tế:
                      </p>
                      <p className="mt-1">Áp dụng các chuyến bay xuất phát từ:</p>
                      <ul className="mt-1 space-y-0.5 pl-6">
                        <li className="list-disc">Việt Nam</li>
                        <li className="list-disc">Úc</li>
                        <li className="list-disc">Ấn Độ</li>
                        <li className="list-disc">Nhật Bản</li>
                        <li className="list-disc">Hàn Quốc</li>
                        <li className="list-disc">Đông Nam Á (Ngoại trừ DPS)</li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold text-base leading-[24px] text-gray-900">
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
                      <strong className="font-bold text-gray-900">
                        *Lưu ý quan trọng dành cho hành khách quốc tế đã làm thủ tục trực tuyến:
                      </strong>{' '}
                      Quy định này áp dụng bao gồm cả Quý khách không có hành lý ký gửi.
                    </p>

                    <p>
                      Để đảm bảo hành trình suôn sẻ, Quý khách vui lòng có mặt tại Quầy phục vụ
                      khách làm thủ tục trực tuyến trước giờ khởi hành 60 phút để nhân viên xác thực
                      các thông tin bao gồm:
                    </p>

                    <div className="space-y-1 pl-4">
                      <p>Xác nhận lại thông tin chuyến bay với nhân viên hãng.</p>
                      <p>
                        Kiểm tra giấy tờ du lịch, giấy tờ xuất nhập cảnh theo quy định của điểm đến.
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

                    <p className="pt-2 font-medium text-gray-900">
                      Xin cảm ơn và chúc Quý khách có chuyến đi vui vẻ!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stepper3 bước đã bỏ — site thật không có dải bước ở trang check-in. */}

        <main
          id="main-content"
          className={step === 'search' ? 'flex-1' : 'mx-auto max-w-[1200px] flex-1 px-4 py-6'}
        >
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
                      <p className="text-2xl font-black text-[var(--vj-text)]">
                        {checkInData.from}
                      </p>
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
                    <p className="text-xs2 font-bold uppercase text-[var(--vj-text-muted)]">
                      Hành khách
                    </p>
                    <p className="font-bold text-[var(--vj-text)]">{checkInData.passengerName}</p>
                    <p className="text-xs text-[var(--vj-text-muted)]">{checkInData.class}</p>
                  </div>
                  <div>
                    <p className="text-xs2 font-bold uppercase text-[var(--vj-text-muted)]">
                      Ghế đã chọn
                    </p>
                    <p className="text-2xl font-black text-[var(--vj-red)]">{checkInData.seat}</p>
                  </div>
                  <div>
                    <p className="text-xs2 font-bold uppercase text-[var(--vj-text-muted)]">
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
                    <span className="ml-auto text-2xs uppercase text-white/70">
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
                      <p className="text-3xl font-black text-[var(--vj-text)]">
                        {checkInData.from}
                      </p>
                      <p className="text-xs2 text-[var(--vj-text-muted)]">
                        {checkInData.departTime} · {checkInData.date}
                      </p>
                    </div>
                    <FlightIcon className="h-8 w-8 text-[var(--vj-red)]" />
                    <div className="text-right">
                      <p className="text-3xl font-black text-[var(--vj-text)]">{checkInData.to}</p>
                      <p className="text-xs2 text-[var(--vj-text-muted)]">
                        {checkInData.arriveTime}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 text-center">
                    <div>
                      <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                        Hành khách
                      </p>
                      <p className="text-sm2 font-bold text-[var(--vj-text)]">
                        {checkInData.passengerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                        Mã đặt chỗ
                      </p>
                      <p className="text-sm2 font-bold text-[var(--vj-text)]">
                        {checkInData.bookingId}
                      </p>
                    </div>
                  </div>
                  {(checkInData.checkInNumber || checkInData.boardingPassNumber) && (
                    <div className="mt-3 grid grid-cols-2 gap-x-6 text-center">
                      <div>
                        <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                          Check-in No.
                        </p>
                        <p className="text-sm2 font-bold text-[var(--vj-red)]">
                          {checkInData.checkInNumber || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                          Boarding Pass
                        </p>
                        <p className="text-sm2 font-bold text-[var(--vj-red)]">
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
                  <p className="mt-2 text-xs2 text-[var(--vj-text-gray)]">
                    Vui lòng lưu QR code này (chụp màn hình) và xuất trình tại sân bay để lên máy
                    bay nhanh chóng.
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
      </div>

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
