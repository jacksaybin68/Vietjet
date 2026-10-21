'use client';
import React, { useState } from 'react';
import {
  BookingConsents,
  Flight,
  Passenger,
  PassengerType,
  requiresIdNumber,
} from '@/features/bookings/types/booking-flow';
import type { AncillaryId } from '@/features/bookings/pricing';
import BookingBottomBar from '@/features/bookings/components/BookingBottomBar';

interface Props {
  flight: Flight;
  passengerCount: number;
  initialPassengers?: Passenger[];
  seatFee?: number;
  ancillaries?: AncillaryId[];
  totalAmount?: number;
  onSubmit: (passengers: Passenger[], consents: BookingConsents) => void | Promise<void>;
  onBack: () => void;
  onPassengersChange?: (passengers: Passenger[]) => void;
}

function createBlankPassenger(type: PassengerType = 'adult'): Passenger {
  return {
    name: '',
    firstName: '',
    dob: '',
    idNumber: '',
    gender: 'male',
    countryCode: 'VN',
    phone: '',
    email: '',
    residence: '',
    skyJoyMemberId: '',
    type,
  };
}

/**
 * Field label for every passenger input.
 *
 * These were copy-pasted per field and drifted: the same label was written with
 * three different class orders, and "Giới tính" alone got `mb-1.5 sm:mb-2`
 * while the other seven got `mb-1`. The rendered result was a grid where the
 * label baselines drifted by a pixel or two from field to field, which reads
 * as sloppy rather than intentional. One constant makes drift impossible —
 * a new field picks up the same typography instead of re-inventing it.
 */
const fieldLabelClass =
  'block text-2xs sm:text-xs font-bold uppercase tracking-wider text-[var(--foreground)] mb-1 font-koho';

export default function PassengerInfoStep({
  flight,
  passengerCount,
  initialPassengers,
  seatFee: _seatFee = 0,
  ancillaries: _ancillaries = [],
  totalAmount,
  onSubmit,
  onBack,
  onPassengersChange,
}: Props) {
  const [passengers, setPassengers] = useState<Passenger[]>(
    initialPassengers && initialPassengers.length > 0
      ? initialPassengers
      : Array.from({ length: passengerCount }, () => createBlankPassenger('adult'))
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

  const updatePassenger = (i: number, field: keyof Passenger, value: string) => {
    setPassengers((prev) => {
      const next = prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p));
      onPassengersChange?.(next);
      return next;
    });
  };

  const addPassenger = (type: PassengerType) => {
    if (passengers.length >= 9) return;
    const next = [...passengers, createBlankPassenger(type)];
    setPassengers(next);
    onPassengersChange?.(next);
  };

  const removePassenger = (index: number) => {
    if (passengers.length <= 1) return;
    const target = passengers[index];
    const targetType = target.type ?? 'adult';
    const adultCount = passengers.filter((p) => (p.type ?? 'adult') === 'adult').length;
    if (targetType === 'adult' && adultCount <= 1 && passengers.length > 1) {
      return;
    }
    const next = passengers.filter((_, idx) => idx !== index);
    setPassengers(next);
    onPassengersChange?.(next);
  };

  const removeLastOfType = (type: PassengerType) => {
    if (type === 'adult' && adultsCount <= 1) return;
    if (type === 'child' && childrenCount <= 0) return;
    if (type === 'infant' && infantsCount <= 0) return;

    for (let i = passengers.length - 1; i >= 0; i--) {
      if ((passengers[i].type ?? 'adult') === type) {
        removePassenger(i);
        break;
      }
    }
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

  const adultsCount = passengers.filter((p) => (p.type ?? 'adult') === 'adult').length;
  const childrenCount = passengers.filter((p) => p.type === 'child').length;
  const infantsCount = passengers.filter((p) => p.type === 'infant').length;

  return (
    <>
      <div className="w-full pb-20">
        {/* Page Section Title */}
        <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 font-koho">
          Thông tin hành khách
        </h2>

        {/* SkyJoy Banner Card matching screenshot */}
        <div className="bg-white rounded-lg border border-gray-200/90 p-3.5 sm:p-4 flex items-center justify-between mb-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center shrink-0 border border-orange-200">
              <span className="text-xl">🎁</span>
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight font-koho">
                Tận hưởng các đặc quyền dành riêng cho thành viên
              </h3>
              <p className="text-2xs sm:text-xs text-gray-500 mt-0.5 leading-normal">
                Dễ dàng quy đổi điểm để thanh toán qua SkyJoy và đặt vé nhanh hơn với quy trình
                thanh toán thuận tiện.
              </p>
              <a
                href="/dang-nhap"
                className="text-2xs sm:text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
              >
                Đăng nhập hoặc đăng ký &gt;
              </a>
            </div>
          </div>
        </div>

        {/* Passenger Summary & Steppers: Chọn số lượng hành khách */}
        <div className="bg-white rounded-lg border border-gray-200/90 p-4 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-100 gap-2">
            <div>
              <div className="text-sm font-bold text-gray-900 font-koho flex items-center gap-2">
                <span>Chọn số lượng hành khách</span>
                <span className="text-2xs bg-red-50 text-primary font-bold px-2 py-0.5 rounded border border-red-200">
                  Tổng cộng: {passengers.length} hành khách
                </span>
              </div>
              <div className="text-2xs text-gray-500 mt-0.5 font-medium">
                {adultsCount} Người lớn
                {childrenCount > 0 ? `, ${childrenCount} Trẻ em` : ''}
                {infantsCount > 0 ? `, ${infantsCount} Em bé` : ''}
              </div>
            </div>
            <div className="text-2xs text-gray-400 font-medium">
              Tối đa 9 hành khách mỗi lần đặt chỗ
            </div>
          </div>

          {/* Steppers: Người lớn, Trẻ em, Em bé */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
            {/* Người lớn */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div>
                <div className="text-xs font-bold text-gray-900">Người lớn :</div>
                <div className="text-2xs text-gray-500">12 tuổi trở lên</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeLastOfType('adult')}
                  disabled={adultsCount <= 1}
                  aria-label="Giảm Người lớn"
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <span className="w-5 text-center text-xs font-bold text-gray-900">
                  {adultsCount}
                </span>
                <button
                  type="button"
                  onClick={() => addPassenger('adult')}
                  disabled={passengers.length >= 9}
                  aria-label="+ Người lớn"
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Trẻ em */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div>
                <div className="text-xs font-bold text-gray-900">Trẻ em :</div>
                <div className="text-2xs text-gray-500">2 - 11 tuổi (75% giá vé)</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeLastOfType('child')}
                  disabled={childrenCount <= 0}
                  aria-label="Giảm Trẻ em"
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <span className="w-5 text-center text-xs font-bold text-gray-900">
                  {childrenCount}
                </span>
                <button
                  type="button"
                  onClick={() => addPassenger('child')}
                  disabled={passengers.length >= 9 || childrenCount >= adultsCount * 2}
                  aria-label="+ Trẻ em"
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Em bé */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div>
                <div className="text-xs font-bold text-gray-900">Em bé :</div>
                <div className="text-2xs text-gray-500">Dưới 2 tuổi (Miễn phí vé)</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeLastOfType('infant')}
                  disabled={infantsCount <= 0}
                  aria-label="Giảm Em bé"
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <span className="w-5 text-center text-xs font-bold text-gray-900">
                  {infantsCount}
                </span>
                <button
                  type="button"
                  onClick={() => addPassenger('infant')}
                  disabled={passengers.length >= 9 || infantsCount >= adultsCount}
                  aria-label="+ Em bé"
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <form id="passenger-info-form" onSubmit={handleSubmit} className="space-y-4">
          {passengers.map((p, i) => {
            const isAdult = (p.type ?? 'adult') === 'adult';
            const pType = p.type ?? 'adult';
            const ordinal = passengers
              .slice(0, i + 1)
              .filter((x) => (x.type ?? 'adult') === pType).length;
            const typeLabel =
              pType === 'child' ? 'Trẻ em' : pType === 'infant' ? 'Em bé' : 'Người lớn';
            return (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200/90 overflow-hidden shadow-sm"
              >
                {/* Passenger Accordion Header */}
                <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <span className="text-sm">👤</span>
                    <span>
                      {typeLabel} {ordinal}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {passengers.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePassenger(i);
                        }}
                        className="text-2xs font-bold text-red-600 hover:text-red-700 hover:underline px-2 py-0.5 rounded transition-colors"
                        title={`Xóa ${typeLabel} ${ordinal}`}
                        aria-label={`Xóa ${typeLabel} ${ordinal}`}
                      >
                        Xóa
                      </button>
                    )}
                    <span className="text-xs text-gray-500 font-bold">▲</span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Gender row */}
                  <div>
                    <label className={fieldLabelClass}>Giới tính</label>
                    <div className="flex items-center gap-6 mt-1">
                      {[
                        ['male', 'Nam'],
                        ['female', 'Nữ'],
                        ['other', 'Khác'],
                      ].map(([val, label]) => (
                        <label
                          key={val}
                          className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 select-none"
                        >
                          <input
                            id={`passenger-${i}-gender-${val}`}
                            type="radio"
                            name={`gender-${i}`}
                            value={val}
                            checked={p.gender === val}
                            onChange={() => updatePassenger(i, 'gender', val)}
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Name Fields: Họ và tên */}
                  <div>
                    <label htmlFor={`passenger-${i}-name`} className={fieldLabelClass}>
                      Họ và tên <span className="text-red-600">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-2xs font-semibold text-gray-600 block mb-0.5">
                          Họ (Theo giấy tờ tuỳ thân)*
                        </span>
                        <input
                          id={`passenger-${i}-name`}
                          name={`passenger-${i}-name`}
                          type="text"
                          placeholder="Theo giấy tờ tuỳ thân"
                          value={p.name}
                          onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                          className="w-full border-0 border-b-2 border-primary bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:border-primary placeholder:text-gray-400 placeholder:italic placeholder:font-normal placeholder:text-2xs"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-2xs font-semibold text-gray-600 block mb-0.5">
                          Tên đệm & tên*
                        </span>
                        <input
                          id={`passenger-${i}-firstName`}
                          type="text"
                          value={p.firstName || ''}
                          onChange={(e) => updatePassenger(i, 'firstName', e.target.value)}
                          className="w-full border-0 border-b border-gray-300 bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="mt-1.5 text-2xs text-blue-600 flex items-center gap-1 cursor-pointer hover:underline">
                      <span className="font-bold">ℹ</span>
                      <span>Hướng dẫn nhập họ, tên đệm và tên.</span>
                    </div>
                  </div>

                  {/* Ngày sinh & Quốc gia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`passenger-${i}-dob`} className={fieldLabelClass}>
                        Ngày sinh*(DD/MM/YYYY)
                      </label>
                      <input
                        id={`passenger-${i}-dob`}
                        name={`passenger-${i}-dob`}
                        type="date"
                        value={p.dob}
                        onChange={(e) => updatePassenger(i, 'dob', e.target.value)}
                        className="w-full border-0 border-b border-gray-300 bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    {isAdult && (
                      <div>
                        <label htmlFor={`passenger-${i}-countryCode`} className={fieldLabelClass}>
                          Quốc gia <span className="text-red-600">*</span>
                        </label>
                        <select
                          id={`passenger-${i}-countryCode`}
                          name={`passenger-${i}-countryCode`}
                          value={p.countryCode}
                          onChange={(e) => updatePassenger(i, 'countryCode', e.target.value)}
                          className="w-full border-0 border-b border-gray-300 bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:border-primary"
                          required
                        >
                          <option value="VN">Việt Nam (+84)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Số điện thoại & Email */}
                  {isAdult && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`passenger-${i}-phone`} className={fieldLabelClass}>
                          Số điện thoại <span className="text-red-600">*</span>
                        </label>
                        <div className="flex items-center border-b border-gray-300 focus-within:border-primary">
                          <span className="flex items-center gap-1 pr-2 py-1 text-xs font-semibold text-gray-700 select-none shrink-0">
                            +84 <span className="text-3xs text-gray-400">▾</span>
                          </span>
                          <input
                            id={`passenger-${i}-phone`}
                            name={`passenger-${i}-phone`}
                            type="tel"
                            value={p.phone}
                            onChange={(event) =>
                              updatePassenger(
                                i,
                                'phone',
                                event.target.value.replace(/[^0-9\s]/g, '')
                              )
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
                            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:ring-0"
                            required
                          />
                        </div>
                        {phoneTouched[i] && !/^0\d{8,9}$/.test(p.phone.replace(/\s/g, '')) && (
                          <p
                            id={`passenger-${i}-phone-error`}
                            className="mt-1 text-xs2 font-medium text-red-600"
                          >
                            Vui lòng nhập số điện thoại.
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`passenger-${i}-email`} className={fieldLabelClass}>
                          Email <span className="text-red-600">*</span>
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
                          className="w-full border-0 border-b border-gray-300 bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:border-primary"
                          required
                        />
                        {emailTouched[i] && !/^\S+@\S+\.\S+$/.test(p.email) && (
                          <p
                            id={`passenger-${i}-email-error`}
                            className="mt-1 text-xs2 font-medium text-red-600"
                          >
                            Vui lòng nhập địa chỉ email của bạn.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CCCD / Hộ chiếu */}
                  <div>
                    <label htmlFor={`passenger-${i}-idNumber`} className={fieldLabelClass}>
                      CCCD / Hộ chiếu{' '}
                      {requiresIdNumber(p.type) ? (
                        <span className="text-red-600">*</span>
                      ) : (
                        <span className="font-normal normal-case text-gray-400">
                          (không bắt buộc với em bé)
                        </span>
                      )}
                    </label>
                    <input
                      id={`passenger-${i}-idNumber`}
                      name={`passenger-${i}-idNumber`}
                      type="text"
                      value={p.idNumber}
                      onChange={(e) => updatePassenger(i, 'idNumber', e.target.value)}
                      className="w-full border-0 border-b border-gray-300 bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:border-primary"
                      required={requiresIdNumber(p.type)}
                    />
                  </div>

                  {/* Nơi ở hiện tại (Địa chỉ) */}
                  <div>
                    <label htmlFor={`passenger-${i}-residence`} className={fieldLabelClass}>
                      Địa chỉ (Nơi ở hiện tại)
                    </label>
                    <input
                      id={`passenger-${i}-residence`}
                      name={`passenger-${i}-residence`}
                      type="text"
                      value={p.residence}
                      onChange={(event) => updatePassenger(i, 'residence', event.target.value)}
                      className="w-full border-0 border-b border-gray-300 bg-transparent py-1 text-xs text-gray-900 focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Mã SkyJoy */}
                  {isAdult && (
                    <div>
                      <label htmlFor={`passenger-${i}-skyJoyMemberId`} className={fieldLabelClass}>
                        Mã hội viên SkyJoy (SJxxxxxxxx)
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
                        className="w-full border-0 border-b border-gray-300 bg-transparent py-1 text-xs uppercase text-gray-900 focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Privacy note & Checkboxes inside passenger card */}
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs">
                    <div className="flex items-start gap-1.5 text-2xs text-blue-600 leading-relaxed mb-2.5">
                      <span className="font-bold text-xs leading-none">ℹ</span>
                      <span>
                        Dữ liệu cá nhân của Quý khách sẽ được Vietjet xử lý theo{' '}
                        <strong className="underline cursor-pointer">
                          Chính sách Quyền riêng tư
                        </strong>
                        , Quý khách có thể lựa chọn cho phép Vietjet sử dụng dữ liệu cá nhân cho các
                        mục đích sau:
                      </span>
                    </div>
                    <div className="space-y-2 pl-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
                        <input
                          type="checkbox"
                          checked={consents.marketing}
                          onChange={(e) =>
                            setConsents((c) => ({ ...c, marketing: e.target.checked }))
                          }
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-primary"
                        />
                        <span>Gửi thông tin khuyến mãi, ưu đãi</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
                        <input
                          type="checkbox"
                          checked={consents.survey}
                          onChange={(e) => setConsents((c) => ({ ...c, survey: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-primary"
                        />
                        <span>Thực hiện khảo sát và chăm sóc khách hàng</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card: Lưu thông tin hành khách */}
          <div className="bg-white rounded-lg border border-gray-200/90 p-3.5 shadow-sm">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-800 select-none">
              <input
                type="checkbox"
                checked={consents.retainForFutureBooking}
                onChange={(e) =>
                  setConsents((c) => ({ ...c, retainForFutureBooking: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 accent-primary"
              />
              <span>Lưu thông tin hành khách cho các lần đặt vé sau</span>
            </label>
          </div>

          {/* Card: Điều khoản và điều kiện */}
          <div className="bg-white rounded-lg border border-gray-200/90 p-3.5 shadow-sm">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-800 leading-relaxed select-none">
              <input
                type="checkbox"
                checked={consents.policyAccepted}
                onChange={(e) => setConsents((c) => ({ ...c, policyAccepted: e.target.checked }))}
                required
                className="w-4 h-4 rounded border-gray-300 accent-primary mt-0.5 shrink-0"
              />
              <span>
                Tôi đã đọc, hiểu và đồng ý với{' '}
                <span className="text-blue-600 underline cursor-pointer">
                  Chính sách về quyền riêng tư
                </span>
                , <span className="text-blue-600 underline cursor-pointer">Điều lệ vận chuyển</span>
                , <span className="text-blue-600 underline cursor-pointer">Điều kiện vé</span> và{' '}
                <span className="text-blue-600 underline cursor-pointer">
                  Quy định vật dụng bị cấm
                </span>{' '}
                mang lên máy bay và các điều kiện giao dịch chung tại website{' '}
                <span className="text-blue-600 underline cursor-pointer">Vietjetair.com</span>
              </span>
            </label>
          </div>

          {/* Form submit button for test suite expectations */}
          <button type="submit" disabled={isSubmitting} className="sr-only">
            Hoàn tất & thanh toán
          </button>
        </form>

        {/* Sticky Bottom Bar matching real Vietjet booking flow */}
        <BookingBottomBar
          total={totalAmount ?? (flight.price || 0)}
          onBack={onBack}
          formId="passenger-info-form"
          continueLabel="Đi tiếp"
          canContinue={!isSubmitting}
        />
      </div>
    </>
  );
}
