'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { getAirportCity } from '@/features/flights';

export interface ItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    booking_code: string | null;
    status: string;
    created_at: string;
    total_price: number;
    contact_name?: string;
    contact_email?: string;
    flight?: {
      flight_no?: string;
      from_code?: string;
      to_code?: string;
      depart_time?: string;
      arrive_time?: string;
      class?: string;
    } | null;
    passengers?: Array<{
      id?: string;
      name?: string;
      seat_number?: string;
      email?: string;
    }> | null;
    seats?: Array<{
      seat_number?: string;
    }> | null;
    payment?: {
      status?: string;
      method?: string;
    } | null;
  } | null;
}

export default function ItineraryModal({ isOpen, onClose, booking }: ItineraryModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const printContentRef = useRef<HTMLDivElement>(null);

  const bookingCode = booking?.booking_code || booking?.id?.slice(0, 6).toUpperCase() || 'VJ-PNR';
  const isPaid =
    booking?.status === 'confirmed' ||
    booking?.status === 'completed' ||
    booking?.payment?.status === 'completed';

  // Sinh mã QR 2D
  useEffect(() => {
    if (!bookingCode) return;
    let cancelled = false;
    QRCode.toDataURL(
      `VIETJET:${bookingCode}`,
      {
        margin: 1,
        width: 140,
        color: { dark: '#111827', light: '#FFFFFF' },
      },
      (err, url) => {
        if (!cancelled && !err && url) {
          setQrDataUrl(url);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [bookingCode]);

  if (!isOpen || !booking) return null;

  const firstPassenger = booking.passengers && booking.passengers[0];
  const primaryName = (
    booking.contact_name ||
    firstPassenger?.name ||
    'QUÝ KHÁCH'
  ).toUpperCase();

  const rawEmail = booking.contact_email || firstPassenger?.email || '';
  const maskedEmail = rawEmail
    ? (() => {
        const [u, d] = rawEmail.split('@');
        if (!d) return rawEmail;
        if (u.length <= 2) return `${u[0]}*@${d}`;
        return `${u[0]}${'*'.repeat(Math.max(4, u.length - 2))}${u.slice(-1)}@${d}`;
      })()
    : 'x******@vietjetair.vn';

  const bookingDate = new Date(booking.created_at || Date.now());
  const bookingDateStr = `${String(bookingDate.getHours()).padStart(2, '0')}:${String(
    bookingDate.getMinutes()
  ).padStart(2, '0')}, ${String(bookingDate.getDate()).padStart(2, '0')}/${String(
    bookingDate.getMonth() + 1
  ).padStart(2, '0')}/${bookingDate.getFullYear()} (Giờ địa phương)`;

  // Hạn thanh toán: 3 tiếng sau khi đặt
  const expireDate = new Date(bookingDate.getTime() + 3 * 3600 * 1000);
  const expireDateStr = `${String(expireDate.getHours()).padStart(2, '0')}:${String(
    expireDate.getMinutes()
  ).padStart(2, '0')} | ${String(expireDate.getDate()).padStart(2, '0')}/${String(
    expireDate.getMonth() + 1
  ).padStart(2, '0')}/${expireDate.getFullYear()} | (GMT +7)`;

  const flight = booking.flight;
  const flightNo = flight?.flight_no || 'VJ121';
  const fromCode = flight?.from_code || 'HAN';
  const toCode = flight?.to_code || 'SGN';
  const fromCity = getAirportCity(fromCode);
  const toCity = getAirportCity(toCode);

  const departDateObj = flight?.depart_time ? new Date(flight.depart_time) : bookingDate;
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
    : '08:30';

  const arriveTimeFormatted = flight?.arrive_time
    ? new Date(flight.arrive_time).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '10:45';

  const fareClassLabel = flight?.class
    ? flight.class.charAt(0).toUpperCase() + flight.class.slice(1)
    : 'Eco';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Thông tin hành trình của bạn"
    >
      <div className="relative w-full max-w-3xl my-6 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
        {/* Thanh tiêu đề Modal màu đỏ */}
        <div className="bg-[#ED1B24] text-white px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <h3 className="font-bold text-sm sm:text-base tracking-wide flex items-center gap-2">
            <span>Thông tin hành trình của bạn</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-white/90 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors text-lg font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Nội dung tài liệu hành trình */}
        <div ref={printContentRef} className="p-4 sm:p-6 space-y-4 text-gray-900 bg-white">
          {/* Header tài liệu: Logo Vietjet bên trái + Hotline 1900 1886 bên phải */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#ED1B24] tracking-tight font-serif italic">
                vietjet<span className="text-[#FFCC00]">Air</span>.com
              </span>
            </div>
            <div className="bg-[#FFCC00] text-gray-950 font-black px-3.5 py-1 rounded-full text-xs sm:text-sm tracking-wide shadow-2xs">
              1900 1886
            </div>
          </div>

          {/* Dải băng đỏ: THÔNG TIN HÀNH TRÌNH CỦA BẠN */}
          <div className="bg-[#ED1B24] text-white font-black text-center py-2 text-sm sm:text-base uppercase tracking-wider rounded-xs">
            THÔNG TIN HÀNH TRÌNH CỦA BẠN
          </div>

          {/* 1. THÔNG TIN ĐẶT CHỖ */}
          <div>
            <div className="bg-[#ED1B24] text-white font-bold text-xs uppercase px-3 py-1.5">
              1. THÔNG TIN ĐẶT CHỖ
            </div>
            <div className="border border-gray-200 border-t-0 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 items-center">
              {/* Cột trái */}
              <div className="space-y-1.5 text-xs">
                <div className="grid grid-cols-[130px_1fr] items-start">
                  <span className="text-gray-600 font-medium">Họ và tên:</span>
                  <span className="font-bold text-gray-900">{primaryName}</span>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-start">
                  <span className="text-gray-600 font-medium">Email:</span>
                  <span className="font-mono text-gray-800">{maskedEmail}</span>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-start">
                  <span className="text-gray-600 font-medium">Ngày đặt chỗ:</span>
                  <span className="text-gray-800">{bookingDateStr}</span>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-start">
                  <span className="text-gray-600 font-medium">Trạng thái đặt chỗ:</span>
                  <div>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Đã xác nhận
                    </span>
                    {!isPaid && (
                      <p className="text-3xs text-gray-600 mt-0.5 leading-snug">
                        Vé máy bay đã xác nhận. Mã đặt chỗ này sẽ bị hủy nếu không thanh toán trước
                        TS: <span className="font-semibold text-gray-800">{expireDateStr}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-start">
                  <span className="text-gray-600 font-medium">Trạng thái thanh toán:</span>
                  <span className={isPaid ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                    {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </span>
                </div>
              </div>

              {/* Cột phải: Mã QR và PNR */}
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${bookingCode}`}
                    className="w-28 h-28 object-contain bg-white p-1 rounded-sm border border-gray-200"
                  />
                ) : (
                  <div className="w-28 h-28 bg-gray-200 animate-pulse rounded-sm" />
                )}
                <span className="text-3xs font-bold text-gray-500 uppercase tracking-widest mt-1.5">
                  MÃ ĐẶT CHỖ
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#ED1B24] tracking-wider font-mono">
                  {bookingCode}
                </span>
              </div>
            </div>
          </div>

          {/* 2. THÔNG TIN HÀNH KHÁCH */}
          <div>
            <div className="bg-[#ED1B24] text-white font-bold text-xs uppercase px-3 py-1.5">
              2. THÔNG TIN HÀNH KHÁCH
            </div>
            <div className="border border-gray-200 border-t-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                  <tr>
                    <th className="py-2 px-3 sm:px-4">Tên hành khách</th>
                    <th className="py-2 px-3 sm:px-4 text-right">Chỗ ngồi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {booking.passengers && booking.passengers.length > 0 ? (
                    booking.passengers.map((p, idx) => {
                      const seat = p.seat_number || booking.seats?.[idx]?.seat_number || '--';
                      return (
                        <tr key={p.id || idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 sm:px-4 font-bold text-gray-900 uppercase">
                            {p.name || 'HÀNH KHÁCH'}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-gray-700">
                            {flightNo} {seat}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="py-2.5 px-3 sm:px-4 font-bold text-gray-900 uppercase">
                        {primaryName}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-gray-700">
                        {flightNo} --
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. THÔNG TIN CHUYẾN BAY */}
          <div>
            <div className="bg-[#ED1B24] text-white font-bold text-xs uppercase px-3 py-1.5">
              3. THÔNG TIN CHUYẾN BAY
            </div>
            <div className="border border-gray-200 border-t-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                  <tr>
                    <th className="py-2 px-2.5 sm:px-3">Số hiệu chuyến bay</th>
                    <th className="py-2 px-2.5 sm:px-3">Ngày</th>
                    <th className="py-2 px-2.5 sm:px-3">Loại vé</th>
                    <th className="py-2 px-2.5 sm:px-3">Khởi hành</th>
                    <th className="py-2 px-2.5 sm:px-3">Đến</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-2.5 sm:px-3 font-black text-gray-900 font-mono">
                      {flightNo}
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-gray-800">{departDateFormatted}</td>
                    <td className="py-2.5 px-2.5 sm:px-3 font-semibold text-gray-800">
                      {fareClassLabel}
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-gray-900">
                      <span className="font-bold">{departTimeFormatted}</span> - {fromCity} ({fromCode})
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-gray-900">
                      <span className="font-bold">{arriveTimeFormatted}</span> - {toCity} ({toCode})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Nút Print / Tải xuống PDF */}
          <div className="pt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2 bg-[#FFCC00] hover:bg-[#E6B800] text-gray-950 font-bold rounded-md text-xs sm:text-sm tracking-wide shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2 bg-[#FFCC00] hover:bg-[#E6B800] text-gray-950 font-bold rounded-md text-xs sm:text-sm tracking-wide shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Tải xuống PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

