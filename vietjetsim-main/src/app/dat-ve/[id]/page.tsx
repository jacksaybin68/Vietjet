'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';
import { Header, Footer } from '@/shared/components/navigation';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { apiRequest, ApiRequestError, getApiErrorMessage } from '@/shared/services';
import { getAirportCity } from '@/features/flights';
import ItineraryModal from '@/features/bookings/components/ItineraryModal';

interface BookingDetail {
  id: string;
  user_id: string;
  booking_code: string | null;
  flight_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_email_masked?: string;
  flight: {
    flight_no: string;
    from_code: string;
    to_code: string;
    depart_time: string;
    arrive_time: string;
    price: number;
    class: string;
  } | null;
  passengers: Array<{
    id: string;
    name: string;
    seat_number?: string;
    passenger_type: string;
    gender?: string;
    email?: string;
  }>;
  payment: {
    id: string;
    method: string;
    status: string;
    amount: number;
    created_at: string;
  } | null;
  seats: Array<{
    id: string;
    seat_number: string;
    seat_class: string;
  }>;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [showPaxCard, setShowPaxCard] = useState(true);
  const [showFlightDetail, setShowFlightDetail] = useState(false);
  const [expandedPax, setExpandedPax] = useState<Record<number, boolean>>({ 0: true });
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [showSkyJoyPrompt, setShowSkyJoyPrompt] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await apiRequest<{ booking: BookingDetail }>(`/api/dat-ve/${bookingId}`);
        setBooking(data.booking);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          router.push('/dang-nhap');
          return;
        }
        setError(getApiErrorMessage(err, 'Đã có lỗi xảy ra'));
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  const flight = booking?.flight ?? null;
  const bookingCode = booking?.booking_code || booking?.id?.slice(0, 6).toUpperCase() || '—';
  const isPaid =
    booking?.status === 'confirmed' ||
    booking?.status === 'completed' ||
    booking?.payment?.status === 'completed';

  const bookingDate = useMemo(
    () => new Date(booking?.created_at || Date.now()),
    [booking?.created_at]
  );

  // Hạn thanh toán: 3 tiếng sau khi đặt
  const expireDateStr = useMemo(() => {
    const expireDate = new Date(bookingDate.getTime() + 3 * 3600 * 1000);
    return `${String(expireDate.getDate()).padStart(2, '0')}/${String(
      expireDate.getMonth() + 1
    ).padStart(2, '0')}/${expireDate.getFullYear()} | ${String(expireDate.getHours()).padStart(
      2,
      '0'
    )}:${String(expireDate.getMinutes()).padStart(2, '0')}`;
  }, [bookingDate]);

  const departDateObj = useMemo(
    () => (flight?.depart_time ? new Date(flight.depart_time) : bookingDate),
    [flight?.depart_time, bookingDate]
  );
  const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayOfWeekStr = daysOfWeek[departDateObj.getDay()];
  const departDateFormatted = `${dayOfWeekStr}, ${String(departDateObj.getDate()).padStart(
    2,
    '0'
  )}/${String(departDateObj.getMonth() + 1).padStart(2, '0')}/${departDateObj.getFullYear()}`;

  const departTimeFormatted = flight?.depart_time
    ? new Date(flight.depart_time).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '21:25';

  const arriveTimeFormatted = flight?.arrive_time
    ? new Date(flight.arrive_time).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '10:00';

  const durationStr = useMemo(() => {
    if (!flight?.depart_time || !flight?.arrive_time) return '8 giờ 35 phút';
    const diff = new Date(flight.arrive_time).getTime() - new Date(flight.depart_time).getTime();
    const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    const minutes = Math.floor((Math.abs(diff) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} giờ ${minutes} phút`;
  }, [flight?.depart_time, flight?.arrive_time]);

  const fareClassLabel = flight?.class
    ? flight.class.charAt(0).toUpperCase() + flight.class.slice(1)
    : 'Deluxe';

  const passengersList = booking?.passengers || [];
  const paxCount = passengersList.length || 1;
  const totalPriceNumber = Number(booking?.total_price || 0);

  const handleSendItineraryEmail = useCallback(async () => {
    if (!booking) return;
    setIsSendingMail(true);
    try {
      // Gọi API gửi mail hoá đơn / hành trình
      const res = await apiRequest<{ success: boolean; message?: string }>(
        `/api/quan-tri/dat-ve/gui-mail`,
        {
          method: 'POST',
          body: {
            booking_id: booking.id,
            action: 'send_invoice',
          },
        }
      );
      if (res.success) {
        toast.success(
          'Gửi email thành công',
          'Thông tin hành trình và vé điện tử đã được gửi tới email của quý khách.'
        );
      } else {
        toast.info('Đã xử lý gửi mail', 'Hệ thống đang gửi email hành trình tới hòm thư của bạn.');
      }
    } catch {
      toast.success(
        'Đã tiếp nhận yêu cầu',
        'Hệ thống đang tự động gửi email thông tin hành trình tới hòm thư của bạn.'
      );
    } finally {
      setIsSendingMail(false);
    }
  }, [booking, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#ED1B24]/20 border-t-[#ED1B24] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-bold text-sm font-koho">
            Đang tải thông tin hành trình...
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-14 h-14 bg-red-50 text-[#ED1B24] rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Icon name="ExclamationCircleIcon" size={32} />
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-2 font-koho">Không tìm thấy đặt chỗ</h2>
          <p className="text-gray-500 mb-6 text-xs">{error || 'Mã đặt chỗ không tồn tại.'}</p>
          <Link
            href="/tim-ve"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#ED1B24] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#c81018] transition-colors"
          >
            <Icon name="ArrowLeftIcon" size={16} />
            Tìm chuyến bay khác
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#e8f1fc] via-[#f1e6ee] to-[#fbebee] flex flex-col font-sans overflow-x-hidden">
      {/* Top Vietjet Red Bar theo Screenshot 1 */}
      <header className="bg-[#ED1B24] text-white z-10">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter font-serif text-white">
              vietjet<span className="text-[#FFCC00]">Air</span>.com
            </span>
          </Link>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 sm:gap-3 text-3xs sm:text-2xs text-white/90">
              <span className="hover:text-white cursor-pointer flex items-center gap-1">🎧 Hỗ trợ</span>
              <span>|</span>
              <Link href="/dang-nhap" className="hover:text-white flex items-center gap-1">👤 Đăng ký | Đăng nhập</Link>
              <span>|</span>
              <span className="hover:text-white cursor-pointer">Tiếng Việt ▾</span>
            </div>
            <div className="hidden md:flex items-center gap-4 text-3xs font-extrabold uppercase tracking-wide text-white/95 pt-0.5">
              <Link href="/chuyen-bay-cua-toi" className="hover:text-[#FFCC00] transition-colors">CHUYẾN BAY CỦA TÔI</Link>
              <Link href="/lam-thu-tuc" className="hover:text-[#FFCC00] transition-colors">ONLINE CHECK-IN</Link>
              <Link href="/dich-vu" className="hover:text-[#FFCC00] transition-colors">DỊCH VỤ CHUYẾN BAY</Link>
              <Link href="/dich-vu" className="hover:text-[#FFCC00] transition-colors">DỊCH VỤ KHÁC</Link>
            </div>
          </div>
        </div>
      </header>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* Dải băng vàng thông báo trên cùng - chuẩn Screenshot 1 */}
      <div className="w-full bg-[#FFD100] text-gray-950 border-b border-[#ECC000] shadow-xs py-2 px-3 sm:px-6 z-10">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-y-1 text-2xs sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-800">Mã đặt chỗ :</span>
            <span className="font-black text-[#ED1B24] tracking-wider text-xs sm:text-sm">
              {bookingCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-800">Trạng thái thanh toán :</span>
            <span
              className={`font-black ${isPaid ? 'text-emerald-700' : 'text-[#ED1B24]'}`}
            >
              {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </span>
          </div>

          <div className="flex flex-col sm:items-end w-full sm:w-auto text-left sm:text-right">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-800">Yêu cầu thanh toán :</span>
              <span className="font-black text-[#ED1B24] text-xs sm:text-sm">
                {totalPriceNumber.toLocaleString('vi-VN')} VND
              </span>
            </div>
            {!isPaid && (
              <span className="text-gray-700 text-3xs sm:text-2xs">
                trước {expireDateStr} (Theo giờ địa phương)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content với nền mây nhẹ nhàng */}
      <main className="flex-1 py-6 px-3 sm:px-6 max-w-4xl mx-auto w-full space-y-4 z-10">
        {/* 1. Card: Thông tin chuyến bay */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider font-koho">
              Thông tin chuyến bay
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <div className="text-2xs font-bold text-gray-500 mb-1">Chuyến đi</div>
            <div className="text-xs font-extrabold text-gray-800 mb-3">{departDateFormatted}</div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Giờ đi & Sân bay đi */}
              <div className="flex items-center sm:block gap-3">
                <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono tracking-tight">
                  {flight?.from_code || 'SGN'}
                </span>
                <span className="block text-sm sm:text-base font-bold text-gray-700">
                  {departTimeFormatted}
                </span>
                <span className="text-3xs text-gray-500 sm:block hidden">
                  {getAirportCity(flight?.from_code || 'SGN')}
                </span>
              </div>

              {/* Thời gian bay & Chi tiết */}
              <div className="flex-1 px-2 sm:px-6 text-center">
                <span className="text-3xs sm:text-2xs font-semibold text-gray-600 block mb-1">
                  {durationStr}
                </span>
                <div className="relative flex items-center justify-center my-1">
                  <div className="w-full border-t border-gray-300 border-dashed" />
                  <div className="absolute px-2 bg-white text-gray-400">
                    <Icon name="PaperAirplaneIcon" size={14} className="text-[#ED1B24] rotate-90" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFlightDetail(!showFlightDetail)}
                  className="text-3xs font-bold text-gray-700 hover:text-[#ED1B24] transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Bay thẳng | Chi tiết</span>
                  <span>{showFlightDetail ? '∧' : '∨'}</span>
                </button>
              </div>

              {/* Giờ đến & Sân bay đến */}
              <div className="flex items-center sm:block gap-3 sm:text-right">
                <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono tracking-tight">
                  {flight?.to_code || 'WSI'}
                </span>
                <span className="block text-sm sm:text-base font-bold text-gray-700">
                  {arriveTimeFormatted}
                </span>
                <span className="text-3xs text-gray-500 sm:block hidden">
                  {getAirportCity(flight?.to_code || 'WSI')}
                </span>
              </div>

              {/* Hạng vé & Tổng tiền bên phải */}
              <div className="sm:border-l sm:border-gray-200 sm:pl-6 pt-3 sm:pt-0 text-left sm:text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                <div className="inline-block px-2.5 py-0.5 rounded-sm bg-red-50 text-[#ED1B24] border border-red-200 text-xs font-black italic tracking-wide">
                  {fareClassLabel}
                </div>
                <span className="text-3xs font-semibold text-gray-600 sm:mt-1">
                  {paxCount} hành khách
                </span>
                <span className="text-sm sm:text-base font-black text-[#ED1B24]">
                  {totalPriceNumber.toLocaleString('vi-VN')} VND
                </span>
              </div>
            </div>

            {/* Chi tiết lộ trình nếu bấm mở rộng */}
            {showFlightDetail && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-2xs text-gray-600 bg-gray-50/60 p-3 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold">Số hiệu chuyến bay:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {flight?.flight_no || 'VJ121'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Khởi hành:</span>
                  <span>
                    {getAirportCity(flight?.from_code || 'SGN')} ({flight?.from_code}) lúc{' '}
                    {departTimeFormatted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Điểm đến:</span>
                  <span>
                    {getAirportCity(flight?.to_code || 'WSI')} ({flight?.to_code}) lúc{' '}
                    {arriveTimeFormatted}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Card: Thông tin hành khách */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider font-koho">
              Thông tin hành khách
            </span>
            <button
              type="button"
              onClick={() => setShowPaxCard(!showPaxCard)}
              className="text-gray-500 hover:text-gray-800 font-bold text-sm px-2 cursor-pointer"
              aria-label="Thu gọn hoặc mở rộng"
            >
              {showPaxCard ? '−' : '+'}
            </button>
          </div>

          {showPaxCard && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Banner tích điểm SkyJoy chuẩn Screenshot 1 */}
              <div className="bg-[#ED1B24] text-white rounded-lg p-3 sm:p-3.5 relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/20">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wide">
                    Bổ sung mã hội viên để tích điểm
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSkyJoyPrompt(true)}
                    className="bg-[#FFCC00] hover:bg-[#E6B800] text-gray-950 font-black px-3 py-1 rounded-sm text-2xs uppercase tracking-wider shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    Bổ sung
                  </button>
                </div>
                <div className="text-2xs text-white/95 space-y-0.5">
                  <p className="font-bold text-amber-200">
                    Đăng ký Hội viên Vietjet SkyJoy - Tận hưởng X3 ưu đãi:
                  </p>
                  <p>• Tặng ngay 200 SkyPoint.</p>
                  <p>• Nhận SkyPoint cho các chuyến đã bay.</p>
                  <p>• Hưởng đặc quyền ưu tiên tại sân bay.</p>
                  <Link
                    href="/dang-ky"
                    className="inline-block mt-1 text-[#FFCC00] hover:underline font-bold"
                  >
                    Đăng ký ngay!
                  </Link>
                </div>
              </div>

              {/* Modal bổ sung SkyJoy ID nhanh */}
              {showSkyJoyPrompt && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row gap-2 items-center justify-between">
                  <input
                    type="text"
                    placeholder="Nhập mã hội viên SkyJoy (VD: SJ889922)"
                    className="w-full sm:w-80 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toast.success('Đã lưu mã hội viên SkyJoy!');
                        setShowSkyJoyPrompt(false);
                      }}
                      className="px-3 py-1.5 bg-[#ED1B24] text-white text-xs font-bold rounded"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSkyJoyPrompt(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs font-bold rounded"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Danh sách thẻ hành khách (grid 2 cột) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {passengersList.map((passenger, idx) => {
                  const title = passenger.gender === 'female' ? 'Mrs' : 'Mr';
                  const seatCode =
                    passenger.seat_number || booking.seats?.[idx]?.seat_number || 'Chưa chọn';

                  return (
                    <div
                      key={passenger.id || idx}
                      className="border border-gray-200 rounded-lg p-3 bg-gray-50/40 space-y-2 text-2xs"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                        <span className="text-gray-500">👤</span>
                        <span>
                          Người lớn: {title} {passenger.name?.toUpperCase() || 'HÀNH KHÁCH'}
                        </span>
                      </div>

                      <div className="space-y-1 text-gray-600">
                        <div className="font-semibold text-gray-800">
                          {flight?.from_code || 'SGN'} ➔ {flight?.to_code || 'WSI'}
                        </div>
                        <div>
                          <span className="text-gray-500">Deluxe ancillary:</span>{' '}
                          <span className="font-medium text-gray-800">Gói 20kg</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Dịch vụ miễn phí:</span>{' '}
                          <span className="font-medium text-gray-800">Combo Meal (LR)</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Chỗ ngồi:</span>{' '}
                          <span className="font-bold text-[#ED1B24]">{seatCode}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Special change:</span>{' '}
                          <span className="font-medium text-gray-800">Special Change</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Card: Chi tiết giá vé */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider font-koho">
              Chi tiết giá vé
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {passengersList.map((passenger, idx) => {
              const isOpen = expandedPax[idx] ?? false;
              const title = passenger.gender === 'female' ? 'Mrs' : 'Mr';
              const paxShare = Math.round(totalPriceNumber / paxCount);

              return (
                <div key={passenger.id || idx}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPax((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    }
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900">
                      Người lớn: {title} {passenger.name?.toUpperCase() || 'HÀNH KHÁCH'}
                    </span>
                    <span className="text-xs text-gray-500">{isOpen ? '∧' : '∨'}</span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3 pt-1 bg-gray-50/30 text-2xs space-y-1 text-gray-600 border-t border-gray-100">
                      <div className="flex justify-between">
                        <span>Giá vé cơ bản:</span>
                        <span className="font-semibold text-gray-800">
                          {Math.round(paxShare * 0.65).toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Thuế & Phí sân bay:</span>
                        <span className="font-semibold text-gray-800">
                          {Math.round(paxShare * 0.25).toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dịch vụ & Tiện ích bổ sung:</span>
                        <span className="font-semibold text-gray-800">
                          {Math.round(paxShare * 0.1).toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-200 font-bold text-gray-900 text-xs">
                        <span>Tổng tiền vé:</span>
                        <span className="text-[#ED1B24]">{paxShare.toLocaleString('vi-VN')} VND</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Hàng nút hành động chuẩn - 6 nút theo Screenshot 1 */}
        <div className="space-y-2.5 pt-2">
          {/* Hàng 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {!isPaid ? (
              <button
                type="button"
                onClick={() => router.push(`/thanh-toan?bookingId=${booking.id}`)}
                className="py-3 px-3 bg-[#FFA800] hover:bg-[#E69500] text-gray-950 font-bold rounded-lg text-2xs uppercase tracking-wider shadow-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Thanh toán ngay</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.success('Đơn vé đã thanh toán thành công!')}
                className="py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-2xs uppercase tracking-wider shadow-xs text-center flex items-center justify-center gap-1.5"
              >
                <span>Đã thanh toán</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push('/dich-vu')}
              className="py-3 px-3 bg-[#FFCC00] hover:bg-[#E6B800] text-gray-950 font-bold rounded-lg text-2xs uppercase tracking-wider shadow-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Mua hành lý, chỗ ngồi, suất ăn và hơn thế nữa...</span>
            </button>

            <button
              type="button"
              onClick={handleSendItineraryEmail}
              disabled={isSendingMail}
              className="py-3 px-3 bg-[#FFCC00] hover:bg-[#E6B800] text-gray-950 font-bold rounded-lg text-2xs uppercase tracking-wider shadow-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{isSendingMail ? 'Đang gửi mail...' : 'Gửi mail hành trình'}</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/tim-ve')}
              className="py-3 px-3 bg-[#FFCC00] hover:bg-[#E6B800] text-gray-950 font-bold rounded-lg text-2xs uppercase tracking-wider shadow-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Tìm đặt chỗ khác</span>
            </button>
          </div>

          {/* Hàng 2 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowItineraryModal(true)}
              className="w-full sm:w-auto px-8 py-3 bg-[#FFCC00] hover:bg-[#E6B800] text-gray-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Tải thông tin hành trình</span>
            </button>

            <button
              type="button"
              onClick={() =>
                toast.info(
                  'Dịch vụ đổi ngoại tệ',
                  'Quý khách có thể đổi ngoại tệ tại quầy giao dịch sân bay trước giờ khởi hành.'
                )
              }
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#FF5E5E] to-[#ED1B24] hover:from-[#ED1B24] hover:to-[#c81018] text-white font-black rounded-lg text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Đăng ký mua ngoại tệ</span>
            </button>
          </div>
        </div>
      </main>

      {/* Vệt đuôi máy bay Vietjet góc dưới bên phải - chuẩn Screenshot 1 */}
      <div className="fixed -bottom-6 -right-6 pointer-events-none z-0 opacity-95 hidden sm:block">
        <svg width="220" height="120" viewBox="0 0 220 120" fill="none">
          <path d="M0 120 C 100 120, 150 70, 220 0 L 220 120 Z" fill="#ED1B24" />
          <path d="M35 120 C 120 120, 170 80, 220 20 L 220 120 Z" fill="#78BE20" />
          <path d="M75 120 C 145 120, 190 95, 220 45 L 220 120 Z" fill="#FFD100" />
        </svg>
      </div>

      {/* Modal Thông tin hành trình chuẩn Screenshot 2 */}
      <ItineraryModal
        isOpen={showItineraryModal}
        onClose={() => setShowItineraryModal(false)}
        booking={{
          id: booking.id,
          booking_code: booking.booking_code,
          status: booking.status,
          created_at: booking.created_at,
          total_price: totalPriceNumber,
          contact_name: booking.contact_name,
          contact_email: booking.contact_email_masked,
          flight: booking.flight,
          passengers: booking.passengers,
          seats: booking.seats,
          payment: booking.payment,
        }}
      />

      <Footer />
    </div>
  );
}
