'use client';
import React, { useState, useEffect } from 'react';
import { Flight, Passenger } from './FlightBookingClient';
import { Icon } from '@/shared/components/ui';
import { PassengerInfoSkeleton } from '@/shared/components/ui';

interface Props {
  flight: Flight;
  passengerCount: number;
  onSubmit: (passengers: Passenger[]) => void;
  onBack: () => void;
}

export default function PassengerInfoStep({ flight, passengerCount, onSubmit, onBack }: Props) {
  const [passengers, setPassengers] = useState<Passenger[]>(
    Array.from({ length: passengerCount }, () => ({
      name: '',
      dob: '',
      idNumber: '',
      gender: 'male',
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const updatePassenger = (i: number, field: keyof Passenger, value: string) => {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSubmit(passengers);
  };

  return (
    <>
      {isLoading ? (
        <PassengerInfoSkeleton count={passengerCount} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* SkyJoy Banner - responsive */}
              <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between text-white shadow-md relative overflow-hidden">
                <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center p-1.5 sm:p-2 shrink-0 shadow-sm">
                    <img src="/logo.png" alt="SkyJoy" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg font-koho leading-tight">
                      Đăng nhập tài khoản SkyJoy
                    </h3>
                    <p className="text-xs sm:text-sm opacity-90 text-red-50 dark:text-red-300">
                      Để hoàn tất thông tin nhanh hơn và tích lũy điểm SkyPoint
                    </p>
                  </div>
                </div>
                <button className="bg-white dark:bg-[var(--dark-surface)] text-red-600 dark:text-red-400 font-bold px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm relative z-10 whitespace-nowrap mt-3 sm:mt-0 sm:ml-4">
                  Đăng nhập
                </button>
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
                  <h2 className="font-black text-[var(--foreground)] dark:text-[var(--foreground)] text-lg sm:text-xl font-koho uppercase tracking-wide">
                    Thông tin hành khách
                  </h2>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white bg-[var(--vj-navy)] dark:bg-[var(--primary)] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md self-start sm:self-auto">
                  {passengerCount} Hành khách
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {passengers.map((p, i) => (
                <div
                  key={i}
                  className="bg-[var(--surface)] dark:bg-[var(--dark-surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] dark:border-[var(--dark-border)] overflow-hidden"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
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
                                  : 'border-[var(--border)] dark:border-[var(--dark-border)] text-[var(--foreground-muted)] hover:border-primary/40 hover:text-primary'
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
                        <label className="block text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1 font-koho">
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
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] border border-[var(--border)] dark:border-[var(--dark-border)] rounded-xl text-[var(--foreground)] dark:text-[var(--foreground)] text-sm font-semibold form-input uppercase tracking-wide ${p.name.trim().length >= 2 ? 'form-input-valid' : ''}`}
                            required
                          />
                          <label className="form-label-float font-koho">NGUYEN VAN A</label>
                        </div>
                      </div>

                      {/* DOB */}
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1 font-koho">
                          Ngày sinh
                        </label>
                        <input
                          id={`passenger-${i}-dob`}
                          name={`passenger-${i}-dob`}
                          type="date"
                          value={p.dob}
                          onChange={(e) => updatePassenger(i, 'dob', e.target.value)}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] border border-[var(--border)] dark:border-[var(--dark-border)] rounded-xl text-[var(--foreground)] text-sm form-input ${p.dob ? 'form-input-valid' : ''}`}
                          required
                        />
                      </div>

                      {/* ID */}
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1 font-koho">
                          Số CMND/Hộ chiếu
                        </label>
                        <div className={`form-field-float ${p.idNumber ? 'has-value' : ''}`}>
                          <input
                            id={`passenger-${i}-idNumber`}
                            name={`passenger-${i}-idNumber`}
                            type="text"
                            value={p.idNumber}
                            onChange={(e) => updatePassenger(i, 'idNumber', e.target.value)}
                            placeholder=" "
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] border border-[var(--border)] dark:border-[var(--dark-border)] rounded-xl text-[var(--foreground)] text-sm form-input ${p.idNumber.replace(/\D/g, '').length >= 9 ? 'form-input-valid' : ''}`}
                            required
                          />
                          <label className="form-label-float">012345678</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

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
                      <svg className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none">
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
                      Tiếp theo: Chọn chỗ ngồi
                      <Icon name="ArrowRightIcon" size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Booking Summary - responsive */}
          <div className="lg:col-span-1">
            <div
              className="bg-[var(--surface)] dark:bg-[var(--dark-surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] dark:border-[var(--dark-border)] overflow-hidden sticky top-[180px] sm:top-[200px] lg:top-[230px]"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              {/* Yellow accent top bar for summary */}
              <div className="h-1 w-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
              <div className="p-3 sm:p-5">
                <h3 className="font-black text-[var(--foreground)] mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 font-koho">
                  <Icon name="ClipboardDocumentListIcon" size={14} className="text-primary" />
                  Tóm tắt đặt chỗ
                </h3>
                <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
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
                  <div className="text-[10px] sm:text-xs text-[var(--foreground-subtle)]">{flight.duration} · Bay thẳng</div>
                </div>
                <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Giá vé ({passengerCount} người)</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {(flight.price * passengerCount).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Thuế & phí</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {Math.round(flight.price * passengerCount * 0.1).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="border-t border-[var(--border)] dark:border-[var(--dark-border)] pt-1.5 sm:pt-2 flex justify-between">
                    <span className="font-black text-[var(--foreground)] font-koho">Tổng cộng</span>
                    <span className="font-black text-primary text-sm sm:text-base font-koho">
                      {Math.round(flight.price * passengerCount * 1.1).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
