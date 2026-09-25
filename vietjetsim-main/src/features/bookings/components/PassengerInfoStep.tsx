'use client';
import React, { useState } from 'react';
import { BookingConsents, Flight, Passenger } from '@/features/bookings/types/booking-flow';
import { Icon, AppImage } from '@/shared/components/ui';
import { TAX_AND_FEE_RATE, getBookingTotals, type AncillaryId } from '@/features/bookings/pricing';
import BookingBottomBar from './BookingBottomBar';

interface Props {
  flight: Flight;
  passengerCount: number;
  initialPassengers?: Passenger[];
  seatFee?: number;
  ancillaries?: AncillaryId[];
  onSubmit: (passengers: Passenger[], consents: BookingConsents) => void | Promise<void>;
  onBack: () => void;
}

export default function PassengerInfoStep({
  flight,
  passengerCount,
  initialPassengers,
  seatFee = 0,
  ancillaries = [],
  onSubmit,
  onBack,
}: Props) {
  const [passengers, setPassengers] = useState<Passenger[]>(
    initialPassengers ??
      Array.from({ length: passengerCount }, () => ({
        name: '',
        dob: '',
        idNumber: '',
        gender: 'male',
        countryCode: 'VN',
        phone: '',
        email: '',
        residence: '',
        skyJoyMemberId: '',
      }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState<boolean[]>([]);
  const [emailTouched, setEmailTouched] = useState<boolean[]>([]);
  const [consents, setConsents] = useState<BookingConsents>({
    marketing: false,
    survey: false,
    retainForFutureBooking: false,
    policyAccepted: false,
  });

  const totals = getBookingTotals({
    farePerPassenger: flight.price,
    passengerCount,
    seatFee,
    ancillaries,
  });

  const updatePassenger = (i: number, field: keyof Passenger, value: string) => {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(passengers, consents);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* pb: keep the last row clear of the sticky bottom totals bar. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pb-16 sm:pb-14">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* SkyJoy Banner - responsive */}
            <div className="bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between text-white shadow-md relative overflow-hidden">
              <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center p-1.5 sm:p-2 shrink-0 shadow-sm">
                  <AppImage
                    src="/logo.png"
                    alt="SkyJoy"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg font-koho leading-tight">
                    Đăng nhập tài khoản SkyJoy
                  </h3>
                  <p className="text-xs sm:text-sm opacity-90 text-white/85">
                    Để hoàn tất thông tin nhanh hơn và tích lũy điểm SkyPoint
                  </p>
                </div>
              </div>
              <a
                href="/dang-nhap"
                className="bg-white text-primary font-bold px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors shadow-sm relative z-10 whitespace-nowrap mt-3 sm:mt-0 sm:ml-4"
              >
                Đăng nhập
              </a>
              {/* Decoration */}
              <div className="absolute right-0 top-0 h-full w-32 sm:w-48 opacity-20 pointer-events-none">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full text-white fill-current"
                  preserveAspectRatio="none"
                >
                  <path d="M50 0 L100 0 L100 100 L0 100 Z" />
                </svg>
              </div>
            </div>

            {/* Section header - responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="inline-block w-1 h-4 sm:w-1.5 sm:h-6 bg-primary rounded-full" />
                <h2 className="font-black text-[var(--foreground)] text-lg sm:text-xl font-koho uppercase tracking-wide">
                  Thông tin hành khách
                </h2>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-white bg-[var(--vj-navy)] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md self-start sm:self-auto">
                {passengerCount} Hành khách
              </span>
            </div>
          </div>

          <form id="passenger-info-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {passengers.map((p, i) => (
              <div
                key={i}
                className="bg-[var(--surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] overflow-hidden shadow-vj-sm"
              >
                {/* Card top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                <div className="p-4 sm:p-6">
                  <h3 className="font-black text-[var(--foreground)] mb-4 sm:mb-5 flex items-center gap-1.5 sm:gap-2 font-koho">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-red text-white text-[10px] sm:text-xs font-black flex items-center justify-center shadow-sm">
                      {i + 1}
                    </div>
                    Hành khách {i + 1}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Gender - responsive */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5 sm:mb-2 font-koho">
                        Giới tính
                      </label>
                      <div className="flex gap-2 sm:gap-3">
                        {[
                          ['male', 'Nam'],
                          ['female', 'Nữ'],
                        ].map(([val, label]) => (
                          <label
                            key={val}
                            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                              p.gender === val
                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-primary/40 hover:text-primary'
                            }`}
                          >
                            <input
                              id={`passenger-${i}-gender-${val}`}
                              type="radio"
                              name={`gender-${i}`}
                              value={val}
                              checked={p.gender === val}
                              onChange={() => updatePassenger(i, 'gender', val)}
                              className="hidden"
                            />
                            <span className="text-[11px] sm:text-sm font-bold">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`passenger-${i}-name`}
                        className="block text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1 font-koho"
                      >
                        Họ và tên{' '}
                        <span className="text-[var(--foreground-subtle)] font-normal normal-case">
                          (như CMND/Hộ chiếu)
                        </span>
                      </label>
                      <div className={`form-field-float ${p.name ? 'has-value' : ''}`}>
                        <input
                          id={`passenger-${i}-name`}
                          name={`passenger-${i}-name`}
                          type="text"
                          value={p.name}
                          onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                          placeholder=" "
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-sm font-semibold form-input uppercase tracking-wide ${p.name.trim().length >= 2 ? 'form-input-valid' : ''}`}
                          required
                        />
                        <label className="form-label-float font-koho">NGUYEN VAN A</label>
                      </div>
                    </div>

                    {/* Country and nationality */}
                    <div>
                      <label
                        htmlFor={`passenger-${i}-countryCode`}
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] font-koho sm:text-xs"
                      >
                        Quốc gia <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                          🇻🇳
                        </span>
                        <select
                          id={`passenger-${i}-countryCode`}
                          name={`passenger-${i}-countryCode`}
                          value={p.countryCode}
                          onChange={(event) =>
                            updatePassenger(i, 'countryCode', event.target.value)
                          }
                          className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none focus:border-primary sm:py-3"
                          required
                        >
                          <option value="VN">Việt Nam (+84)</option>
                        </select>
                      </div>
                    </div>

                    {/* DOB */}
                    <div>
                      <label
                        htmlFor={`passenger-${i}-dob`}
                        className="block text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1 font-koho"
                      >
                        Ngày sinh
                      </label>
                      <input
                        id={`passenger-${i}-dob`}
                        name={`passenger-${i}-dob`}
                        type="date"
                        value={p.dob}
                        onChange={(e) => updatePassenger(i, 'dob', e.target.value)}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-sm form-input ${p.dob ? 'form-input-valid' : ''}`}
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor={`passenger-${i}-phone`}
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] font-koho sm:text-xs"
                      >
                        Số điện thoại <span className="text-primary">*</span>
                      </label>
                      <div className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] focus-within:border-primary">
                        <span className="flex items-center border-r border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground-muted)]">
                          +84
                        </span>
                        <input
                          id={`passenger-${i}-phone`}
                          name={`passenger-${i}-phone`}
                          type="tel"
                          value={p.phone}
                          onChange={(event) =>
                            updatePassenger(i, 'phone', event.target.value.replace(/[^0-9\s]/g, ''))
                          }
                          onBlur={() =>
                            setPhoneTouched((current) => {
                              const next = [...current];
                              next[i] = true;
                              return next;
                            })
                          }
                          aria-describedby={`passenger-${i}-phone-error`}
                          aria-invalid={
                            phoneTouched[i] && !/^0\d{8,9}$/.test(p.phone.replace(/\s/g, ''))
                          }
                          placeholder="0123456789"
                          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--foreground)] outline-none sm:py-3"
                          required
                        />
                      </div>
                      {phoneTouched[i] && !/^0\d{8,9}$/.test(p.phone.replace(/\s/g, '')) && (
                        <p
                          id={`passenger-${i}-phone-error`}
                          className="mt-1 text-[11px] font-medium text-primary"
                        >
                          Vui lòng nhập số điện thoại.
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor={`passenger-${i}-email`}
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] font-koho sm:text-xs"
                      >
                        Email <span className="text-primary">*</span>
                      </label>
                      <input
                        id={`passenger-${i}-email`}
                        name={`passenger-${i}-email`}
                        type="email"
                        value={p.email}
                        onChange={(event) => updatePassenger(i, 'email', event.target.value)}
                        onBlur={() =>
                          setEmailTouched((current) => {
                            const next = [...current];
                            next[i] = true;
                            return next;
                          })
                        }
                        aria-describedby={`passenger-${i}-email-error`}
                        aria-invalid={emailTouched[i] && !/^\S+@\S+\.\S+$/.test(p.email)}
                        placeholder="email@example.com"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-primary sm:px-4 sm:py-3"
                        required
                      />
                      {emailTouched[i] && !/^\S+@\S+\.\S+$/.test(p.email) && (
                        <p
                          id={`passenger-${i}-email-error`}
                          className="mt-1 text-[11px] font-medium text-primary"
                        >
                          Vui lòng nhập địa chỉ email của bạn.
                        </p>
                      )}
                    </div>

                    {/* ID */}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`passenger-${i}-idNumber`}
                        className="block text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1 font-koho"
                      >
                        CCCD / Hộ chiếu <span className="text-primary">*</span>
                        <span className="ml-1 font-normal normal-case text-[var(--foreground-subtle)]">
                          (Theo giấy tờ tuỳ thân)
                        </span>
                      </label>
                      <div className={`form-field-float ${p.idNumber ? 'has-value' : ''}`}>
                        <input
                          id={`passenger-${i}-idNumber`}
                          name={`passenger-${i}-idNumber`}
                          type="text"
                          value={p.idNumber}
                          onChange={(e) => updatePassenger(i, 'idNumber', e.target.value)}
                          placeholder=" "
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-sm form-input ${p.idNumber.replace(/\D/g, '').length >= 9 ? 'form-input-valid' : ''}`}
                          required
                        />
                        <label className="form-label-float">012345678</label>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`passenger-${i}-residence`}
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] font-koho sm:text-xs"
                      >
                        Nơi ở hiện tại
                      </label>
                      <input
                        id={`passenger-${i}-residence`}
                        name={`passenger-${i}-residence`}
                        type="text"
                        value={p.residence}
                        onChange={(event) => updatePassenger(i, 'residence', event.target.value)}
                        placeholder="Tỉnh/thành phố"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-primary sm:px-4 sm:py-3"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`passenger-${i}-skyJoyMemberId`}
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] font-koho sm:text-xs"
                      >
                        Mã hội viên SkyJoy
                      </label>
                      <input
                        id={`passenger-${i}-skyJoyMemberId`}
                        name={`passenger-${i}-skyJoyMemberId`}
                        type="text"
                        value={p.skyJoyMemberId}
                        onChange={(event) =>
                          updatePassenger(
                            i,
                            'skyJoyMemberId',
                            event.target.value.toUpperCase().replace(/\s/g, '')
                          )
                        }
                        placeholder="SJxxxxxxxxxx"
                        pattern="SJ[0-9]{8,10}"
                        title="Mã SkyJoy gồm SJ và 8–10 chữ số"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm uppercase text-[var(--foreground)] outline-none focus:border-primary sm:px-4 sm:py-3"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <h3 className="font-black text-[var(--foreground)]">Quyền riêng tư và đồng ý</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--foreground-muted)]">
                Dữ liệu cá nhân của Quý khách sẽ được Vietjet xử lý theo Chính sách Quyền riêng tư.
                Quý khách có thể lựa chọn cho phép Vietjet sử dụng dữ liệu cá nhân cho các mục đích
                sau:
              </p>
              <div className="mt-3 space-y-2.5">
                {[
                  ['marketing', 'Gửi thông tin khuyến mãi, ưu đãi'],
                  ['survey', 'Thực hiện khảo sát và chăm sóc khách hàng'],
                  ['retainForFutureBooking', 'Lưu thông tin hành khách cho các lần đặt vé sau'],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--foreground)]"
                  >
                    <input
                      type="checkbox"
                      checked={consents[key as keyof Omit<BookingConsents, 'policyAccepted'>]}
                      onChange={(event) =>
                        setConsents((current) => ({ ...current, [key]: event.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-[var(--border)] pt-4 text-sm font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={consents.policyAccepted}
                  onChange={(event) =>
                    setConsents((current) => ({ ...current, policyAccepted: event.target.checked }))
                  }
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span>
                  Tôi đã đọc, hiểu và đồng ý với Chính sách về quyền riêng tư, Điều lệ vận chuyển,
                  Điều kiện vé, Quy định vật dụng bị cấm mang lên máy bay và các điều kiện giao dịch
                  chung tại website Vietjetair.com.
                </span>
              </label>
            </section>

            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="flex-1 vj-btn vj-btn-md vj-btn-outline rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="ArrowLeftIcon" size={14} />
                Quay lại
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 vj-btn vj-btn-md vj-btn-primary rounded-xl shadow-glow-red hover:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    Hoàn tất & thanh toán
                    <Icon name="ArrowRightIcon" size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Booking Summary - responsive */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] overflow-hidden sticky top-[180px] sm:top-[200px] lg:top-[230px] shadow-vj-md">
            {/* Yellow accent top bar for summary */}
            <div className="h-1 w-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
            <div className="p-3 sm:p-5">
              <h3 className="font-black text-[var(--foreground)] mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 font-koho">
                <Icon name="ClipboardDocumentListIcon" size={14} className="text-primary" />
                Tóm tắt đặt chỗ
              </h3>
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-red rounded-lg flex items-center justify-center shadow-sm">
                    <Icon name="PaperAirplaneIcon" size={10} className="text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-primary font-koho">
                    {flight.flightNo}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div>
                    <div className="text-lg sm:text-xl font-black text-[var(--foreground)] font-koho">
                      {flight.departTime}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--foreground-muted)]">
                      {flight.from} · {flight.fromCity}
                    </div>
                  </div>
                  <Icon name="ArrowRightIcon" size={12} className="text-primary flex-shrink-0" />
                  <div>
                    <div className="text-lg sm:text-xl font-black text-[var(--foreground)] font-koho">
                      {flight.arriveTime}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--foreground-muted)]">
                      {flight.to} · {flight.toCity}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] sm:text-xs text-[var(--foreground-subtle)]">
                  {flight.duration} · Bay thẳng
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">
                    Giá vé ({passengerCount} người)
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {totals.fareSubtotal.toLocaleString('vi-VN')}₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">
                    Thuế &amp; phí ({Math.round(TAX_AND_FEE_RATE * 100)}%)
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {totals.taxAndFee.toLocaleString('vi-VN')}₫
                  </span>
                </div>
                {seatFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Phí chọn chỗ</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {totals.seatFee.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                )}
                {totals.ancillaryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Dịch vụ bổ sung</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {totals.ancillaryFee.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                )}
                <div className="border-t border-[var(--border)] pt-1.5 sm:pt-2 flex justify-between">
                  <span className="font-black text-[var(--foreground)] font-koho">Tổng cộng</span>
                  <span className="font-black text-primary text-sm sm:text-base font-koho">
                    {totals.total.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky totals bar — same one the results step pins, so the running total
        and the way forward stay in reach on every wizard step. Submitting the
        form from here keeps the browser's native required-field validation. */}
      <BookingBottomBar
        total={totals.total}
        ctaLabel="Hoàn tất & thanh toán"
        formId="passenger-info-form"
        disabled={isSubmitting}
        testId="pax-bottom-bar"
      />
    </>
  );
}
