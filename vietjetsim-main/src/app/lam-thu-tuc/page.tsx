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
  MdInfoOutline,
  MdQrCode2,
  MdAccessTime,
  MdConfirmationNumber,
  MdChair,
  MdPassword,
} from 'react-icons/md';
import { AppImage } from '@/shared/components/ui';

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
  /** Whether this booking is already checked in */
  hasCheckIn?: boolean;
  /** Check-in number (e.g. VN-XXXX) issued after check-in */
  checkInNumber?: string;
  /** Boarding pass number issued after check-in */
  boardingPassNumber?: string;
}

// Couleurs officielles Vietjet (tokens du thème)
const RED = 'var(--vj-red)';
const RED_DARK = 'var(--vj-red-dark)';
const GOLD = 'var(--vj-yellow)';
const NAVY = 'var(--vj-navy)';

const STEPS = [
  { id: 'search', n: 1, label: 'Tìm đặt chỗ' },
  { id: 'confirm', n: 2, label: 'Xác nhận thông tin' },
  { id: 'success', n: 3, label: 'Thẻ lên máy bay' },
];

function CheckInContent({ prefillBookingId }: { prefillBookingId: string }) {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<'search' | 'confirm' | 'success'>(
    prefillBookingId ? 'confirm' : 'search'
  );
  const [bookingCode, setBookingCode] = useState(prefillBookingId);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
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
      if (!firstName.trim()) {
        toast.error('Lỗi', 'Vui lòng nhập tên đệm và tên');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/checkin?bookingCode=${encodeURIComponent(bookingCode.trim())}` +
            `&lastName=${encodeURIComponent(lastName.trim())}` +
            `&firstName=${encodeURIComponent(firstName.trim())}`,
          { cache: 'no-store' }
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(
            'Không tìm thấy',
            data?.message || 'Mã đặt chỗ hoặc họ tên hành khách không đúng'
          );
          return;
        }

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

        setCheckInData({
          bookingId: b.id,
          flightNo: flight.flight_no || '--',
          from: flight.from_code || '--',
          to: flight.to_code || '--',
          fromCity: flight.from_city || '',
          toCity: flight.to_city || '',
          departTime: fmt(departTime),
          arriveTime: fmt(arriveTime),
          date: departTime
            ? departTime.toLocaleDateString('vi-VN')
            : '',
          passengerName: data.passengers?.[0]?.name || '',
          seat: data.checkIn?.seat_number || 'Chọn tại quầy',
          class: 'Phổ thông',
          status: data.hasCheckIn ? 'checked_in' : (b.status || 'confirmed'),
          gate: data.checkIn?.gate || undefined,
          terminal: data.checkIn?.terminal || undefined,
          boardingTime: departTime
            ? new Date(departTime.getTime() - 25 * 60 * 1000).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined,
          departTimeRaw: flight.depart_time || undefined,
          hasCheckIn: data.hasCheckIn,
          checkInNumber: data.checkIn?.check_in_number || undefined,
          boardingPassNumber: data.checkIn?.boarding_pass_number || undefined,
        });
        setStep('confirm');
      } catch {
        toast.error('Lỗi', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
    [bookingCode, lastName, firstName, toast]
  );

  const handleCheckIn = useCallback(async () => {
    if (!agreed) {
      toast.warning('Chưa đồng ý', 'Vui lòng xác nhận đồng ý với quy định an toàn bay');
      return;
    }
    if (!checkInData) return;

    setLoading(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: checkInData.bookingId,
          seatNumber: checkInData.seat,
          flightNo: checkInData.flightNo,
          fromCode: checkInData.from,
          toCode: checkInData.to,
          departTime: checkInData.departTimeRaw || `${checkInData.date} ${checkInData.departTime}`,
          passengerName: checkInData.passengerName,
          gate: checkInData.gate || null,
          terminal: checkInData.terminal || null,
        }),
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        toast.error('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thực hiện check-in online.');
        router.push('/dang-nhap?next=/lam-thu-tuc');
        return;
      }

      if (res.status === 400 && data.checkInNumber) {
        // Already checked in — show existing boarding pass
        setStep('success');
        toast.info('Đã check-in trước đó', `Mã thẻ lên máy bay: ${data.checkInNumber}`);
        return;
      }

      if (!res.ok || !data.success) {
        toast.error('Check-in thất bại', data?.message || 'Vui lòng thử lại sau.');
        return;
      }

      setCheckInData((prev) =>
        prev
          ? {
              ...prev,
              hasCheckIn: true,
              gate: data.checkIn?.gate || prev.gate,
              terminal: data.checkIn?.terminal || prev.terminal,
              checkInNumber: data.checkIn?.check_in_number || prev.checkInNumber,
              boardingPassNumber:
                data.checkIn?.boarding_pass_number || prev.boardingPassNumber,
            }
          : prev
      );
      setStep('success');
      toast.success('Check-in thành công!', 'Thẻ lên máy bay đã sẵn sàng.');
    } catch {
      toast.error('Lỗi', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [agreed, checkInData, toast, router]);

  const fieldClass =
    'w-full rounded-lg border border-[var(--vj-navy)]/20 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--vj-text)] placeholder:text-[var(--vj-text-muted)] focus:border-[var(--vj-red)] focus:outline-none focus:ring-2 focus:ring-[var(--vj-red)]/20 font-koho';

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen bg-[var(--vj-sky)] flex flex-col">
      <Header />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* ===== HERO RED — official Vietjet ===== */}
      <section className="relative overflow-hidden bg-[var(--vj-red)]">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <img src="/images/hero/banner-2-skyboss.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="relative mx-auto max-w-[1000px] px-4 py-12 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 border border-white/30 text-white mb-4">
            <FlightIcon className="h-9 w-9" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-white italic">
            Check-In <span className="text-[var(--vj-yellow)]">Online</span>
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-white/90">
            Dịch vụ áp dụng cho tất cả các chuyến bay của Vietjet. Mở trước 24 giờ đến 60 phút trước giờ bay.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[12px] font-semibold text-white bg-white/10 rounded-full px-4 py-1.5">
            <span>⏰ Mở: trước 24 giờ → đóng: trước 60 phút</span>
            <span>·</span>
            <span>🪑 Chọn chỗ ngồi miễn phí</span>
            <span>·</span>
            <span>🎫 Thẻ lên máy bay mobile</span>
          </div>
        </div>
        <svg className="absolute left-0 right-0 bottom-0 h-6 w-full text-white" viewBox="0 0 1440 24" preserveAspectRatio="none"><path d="M0,24L48,20C96,10,192,2,288,13C384,20,480,24,576,15C672,6,768,2,864,18C960,24,1056,16,1152,3C1248,2,1344,12,1392,20L1440,24L1440,24L1392,24C1344,24,1248,24,1152,24C1056,24,960,24,864,24C768,24,672,24,576,24C480,24,384,24,288,24C192,24,96,24,48,24L0,24Z"/></svg>
      </section>

      {/* ===== STEPPER horizontal ===== */}
      <div className="mx-auto max-w-[700px] mt-[-10px] px-4">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                    i < stepIndex
                      ? 'bg-[var(--vj-blue)] text-white'
                      : i === stepIndex
                        ? 'bg-[var(--vj-red)] text-white'
                        : 'bg-[var(--surface-2)] text-[var(--vj-text-muted)]'
                  }`}
                >
                  {i < stepIndex ? '✓' : s.n}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    i === stepIndex ? 'text-[var(--vj-red)]' : i < stepIndex ? 'text-[var(--vj-blue)]' : 'text-[var(--vj-text-muted)]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    i < stepIndex ? 'bg-[var(--vj-blue)]' : 'bg-[var(--border)]'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-[1000px] flex-1 px-4 py-6">
        {/* ============ BƯỚC 1: TRA CỨU ============ */}
        {step === 'search' && (
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
            {/* Thẻ form tra cứu */}
            <div className="overflow-hidden rounded-xl border border-[var(--vj-sky)] bg-white shadow-md">
              <div className="bg-[var(--vj-navy)] px-5 py-3 text-white font-black text-sm uppercase flex items-center gap-2">
                <MdConfirmationNumber className="h-4 w-4 text-[var(--vj-yellow)]" />
                Tra cứu đặt chỗ
              </div>
              <form onSubmit={handleSearch} className="p-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[var(--vj-text-gray)]">
                    Mã đặt chỗ <span className="text-[var(--vj-red)]">*</span>
                  </label>
                  <div className="relative">
                    <MdConfirmationNumber className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--vj-text-muted)]" />
                    <input
                      type="text"
                      required
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                      placeholder="VD-12345678"
                      className={`${fieldClass} pl-9 uppercase`}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--vj-text-muted)]">Exemple : VD-12345678 (sur votre confirmation email)</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-[var(--vj-text-gray)]">
                      Họ (Surname) <span className="text-[var(--vj-red)]">*</span>
                    </label>
                    <MdPassword className="pointer-events-none absolute right-3 top-7 h-4 w-4 text-[var(--vj-text-muted)]" />
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="NGUYEN"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-[var(--vj-text-gray)]">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="VAN A"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--vj-yellow)] py-3.5 text-base font-black uppercase text-[var(--vj-red)] shadow-lg hover:bg-[var(--vj-yellow-2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? <MdAccessTime className="h-4 w-4 animate-spin" /> : <MdCheckCircle className="h-4 w-4" />}
                  {loading ? 'Đang tra cứu…' : 'Tìm đặt chỗ của tôi'}
                </button>
              </form>
            </div>

            {/* Card sidebar : cách thức hoạt động */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--vj-sky)] bg-white shadow-sm">
                <h3 className="px-4 py-3 text-sm font-black text-[var(--vj-text)] uppercase border-b border-[var(--vj-sky)] flex items-center gap-2">
                  <MdInfoOutline className="h-4 w-4 text-[var(--vj-red)]" />
                  Comment funciona
                </h3>
                <ol className="p-4 space-y-3 text-sm text-[var(--vj-text-gray)]">
                  {[
                    ['Nhập mã đặt chỗ và Họ của hành khách.', '1'],
                    ['Chọn chỗ ngồi miễn phí và mua thêm dịch vụ (hành lý, suất ăn).', '2'],
                    ['Tải xuống và lưu thẻ lên máy bay trên điện thoại.', '3'],
                  ].map(([txt, num]) => (
                    <li key={num} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--vj-red)]/10 text-[var(--vj-red)] text-sm font-black">{num}</div>
                      <span>{txt}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl border border-[var(--vj-yellow)]/40 bg-[#FFF8E1] p-4 text-[13px] text-[#7a6a00]">
                <div className="flex items-center gap-2 font-bold text-[#8a6d00]">
                  <MdInfoOutline className="h-4 w-4 text-[var(--vj-red)]" />
                  Lưu ý quan trọng
                </div>
                <ul className="mt-2 list-disc space-y-1.5 pl-5">
                  <li>Check-in web mở 24 giờ, đóng 60 phút trước giờ bay.</li>
                  <li>Hành khách có hành lý ký gửi cần đến quầy làm thủ tục sớm.</li>
                  <li>Chuẩn bị giấy tờ tùy thân (CCCD / hộ chiếu).</li>
                  <li>Với chuyến bay nối chuyến, kiểm tra tại quầy làm thủ tục.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ============ BƯỚC 2: XÁC NHẬN ============ */}
        {step === 'confirm' && checkInData && (
          <div className="mx-auto max-w-[700px]">
            <div className="overflow-hidden rounded-xl border border-[var(--vj-sky)] bg-white shadow-lg">
              <div className="bg-[var(--vj-navy)] px-5 py-3 text-white font-black text-sm uppercase flex items-center gap-2">
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
                    <p className="text-lg font-bold text-[var(--vj-red)]">{checkInData.departTime}</p>
                  </div>
                  <div className="flex-1 mx-4 text-center text-xs text-[var(--vj-text-muted)]">
                    <p className="font-semibold">~2h 10min</p>
                    <div className="mt-1 relative h-px bg-[var(--border)]"><div className="absolute -left-1 -top-1 h-2 w-2 rounded-full border border-[var(--vj-red)]"/><FlightIcon className="absolute -top-3 left-1/2 -translate-x-1/2 text-[var(--vj-red)]" /><div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--vj-red)]/40"/></div>
                    <p className="mt-1 text-[var(--vj-text-muted)]">Trực tiếp · Sans escale</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[var(--vj-text)]">{checkInData.to}</p>
                    <p className="text-xs text-[var(--vj-text-muted)]">{checkInData.toCity}</p>
                    <p className="text-lg font-bold text-[var(--vj-red)]">{checkInData.arriveTime}</p>
                  </div>
                </div>
              </div>

              {/* Info passager + siège */}
              <div className="p-5 grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--vj-text-muted)]">Hành khách</p>
                  <p className="font-bold text-[var(--vj-text)]">{checkInData.passengerName}</p>
                  <p className="text-xs text-[var(--vj-text-muted)]">{checkInData.class}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--vj-text-muted)]">Siège attribué</p>
                  <p className="text-2xl font-black text-[var(--vj-red)]">{checkInData.seat}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--vj-text-muted)]">Porte & Terminal</p>
                  <p className="font-bold text-[var(--vj-text)]">{checkInData.gate} · {checkInData.terminal}</p>
                  <p className="text-xs text-[var(--vj-text-muted)]">Embarquement : {checkInData.boardingTime}</p>
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
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--vj-red)] focus:ring-[var(--vj-red)]"
                  />
                  <label htmlFor="agree" className="text-xs text-[var(--vj-text-gray)] cursor-pointer leading-relaxed">
                    Tôi xác nhận thông tin cá nhân của tôi là chính xác và cam kết không vận chuyển các vật phẩm nguy hiểm/cấm mang lên máy bay.
                  </label>
                </div>

                <div className="flex gap-4 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep('search')}
                    className="w-1/3 rounded-lg border border-[var(--vj-navy)]/20 bg-white py-3 text-sm font-bold uppercase text-[var(--vj-text-gray)] hover:bg-gray-50"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="w-2/3 rounded-xl bg-[var(--vj-yellow)] py-3 text-sm font-black uppercase text-[var(--vj-red)] shadow-lg hover:bg-[var(--vj-yellow-2)] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? <MdAccessTime className="h-4 w-4 animate-spin" /> : <MdCheckCircle className="h-4 w-4" />}
                    {loading ? 'Đang xử lý...' : "Xác nhận làm thủ tục"}
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
              <h2 className="mt-2 text-2xl font-black text-[var(--vj-text)] uppercase">Check-in !</h2>
              <p className="text-sm text-[var(--vj-text-gray)]">Thẻ lên máy bay của bạn: tải xuống và xuất trình khi lên máy bay.</p>
            </div>

            {/* Boarding pass style Vietjet */}
            <div className="mx-auto max-w-md overflow-hidden rounded-2xl bg-white shadow-xl border border-[var(--vj-sky)]">
              {/* top stamp */}
              <div className="px-5 py-4 bg-[var(--vj-navy)]">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black italic text-[var(--vj-yellow)]">Vietjet Air</span>
                  <span className="ml-auto text-[10px] uppercase text-white/70">Boarding Pass · {checkInData.flightNo}</span>
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
                    <p className="text-[11px] text-[var(--vj-text-muted)]">{checkInData.departTime} · {checkInData.date}</p>
                  </div>
                  <FlightIcon className="h-8 w-8 text-[var(--vj-red)]" />
                  <div className="text-right">
                    <p className="text-3xl font-black text-[var(--vj-text)]">{checkInData.to}</p>
                    <p className="text-[11px] text-[var(--vj-text-muted)]">{checkInData.arriveTime}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">Hành khách</p>
                    <p className="text-[13px] font-bold text-[var(--vj-text)]">{checkInData.passengerName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">Mã đặt chỗ</p>
                    <p className="text-[13px] font-bold text-[var(--vj-text)]">{checkInData.bookingId}</p>
                  </div>
                </div>
                {(checkInData.checkInNumber || checkInData.boardingPassNumber) && (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">Check-in No.</p>
                      <p className="text-[13px] font-bold text-[var(--vj-red)]">
                        {checkInData.checkInNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[var(--vj-text-muted)]">Boarding Pass</p>
                      <p className="text-[13px] font-bold text-[var(--vj-red)]">
                        {checkInData.boardingPassNumber || '—'}
                      </p>
                    </div>
                  </div>
                )}
                {/* QR */}
                <div className="mt-4 flex justify-center">
                  <MdQrCode2 className="text-8xl text-[#111827]" />
                </div>
                <div className="flex border-t border-dashed border-[var(--vj-navy)]/20 mt-4">
                  <p className="w-full border-b-0" />
                </div>
                <p className="mt-2 text-[11px] text-[var(--vj-text-gray)]">
                  Vui lòng lưu QR code này (chụp màn hình) và xuất trình tại sân bay để lên máy bay nhanh chóng.
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-[var(--vj-navy)]/20 bg-white px-6 py-2.5 text-sm font-bold uppercase text-[var(--vj-text-gray)] hover:bg-gray-50"
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
