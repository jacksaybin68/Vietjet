'use client';
import React, { useState, useEffect } from 'react';
import { Flight, Passenger } from './FlightBookingClient';
import Icon from '@/components/ui/AppIcon';
import { PassengerInfoSkeleton } from '@/components/ui/SkeletonLoader';

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="inline-block w-1 h-6 bg-primary rounded-full" />
                <h2
                  className="font-black text-[#1A2948] text-lg font-koho"
                >
                  Thông tin hành khách
                </h2>
              </div>
              <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
                {passengerCount} hành khách
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {passengers.map((p, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  {/* Card top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                  <div className="p-6">
                    <h3
                      className="font-black text-[#1A2948] mb-5 flex items-center gap-2 font-koho"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-red text-white text-xs font-black flex items-center justify-center shadow-sm">
                        {i + 1}
                      </div>
                      Hành khách {i + 1}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Gender */}
                      <div className="sm:col-span-2">
                        <label
                          className="block text-xs font-bold text-[#1A2948] uppercase tracking-wider mb-2 font-koho"
                        >
                          Giới tính
                        </label>
                        <div className="flex gap-3">
                          {[
                            ['male', 'Nam'],
                            ['female', 'Nữ'],
                          ].map(([val, label]) => (
                            <label
                              key={val}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                                p.gender === val
                                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                  : 'border-stone-200 text-stone-600 hover:border-primary/40 hover:text-primary'
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
                              <span className="text-sm font-bold">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Name */}
                      <div className="sm:col-span-2">
                        <label
                          className="block text-xs font-bold text-[#1A2948] uppercase tracking-wider mb-1.5 font-koho"
                        >
                          Họ và tên{' '}
                          <span className="text-stone-400 font-normal normal-case">
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
                            className={`w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold form-input uppercase tracking-wide ${p.name.trim().length >= 2 ? 'form-input-valid' : ''}`}
                            required
                          />
                          <label
                            className="form-label-float font-koho"
                          >
                            NGUYEN VAN A
                          </label>
                        </div>
                      </div>

                      {/* DOB */}
                      <div>
                        <label
                          className="block text-xs font-bold text-[#1A2948] uppercase tracking-wider mb-1.5 font-koho"
                        >
                          Ngày sinh
                        </label>
                        <input
                          id={`passenger-${i}-dob`}
                          name={`passenger-${i}-dob`}
                          type="date"
                          value={p.dob}
                          onChange={(e) => updatePassenger(i, 'dob', e.target.value)}
                          className={`w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm form-input ${p.dob ? 'form-input-valid' : ''}`}
                          required
                        />
                      </div>

                      {/* ID */}
                      <div>
                        <label
                          className="block text-xs font-bold text-[#1A2948] uppercase tracking-wider mb-1.5 font-koho"
                        >
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
                            className={`w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm form-input ${p.idNumber.replace(/\D/g, '').length >= 9 ? 'form-input-valid' : ''}`}
                            required
                          />
                          <label className="form-label-float">012345678</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
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
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
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
                      <Icon name="ArrowRightIcon" size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden sticky top-[230px]"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              {/* Yellow accent top bar for summary */}
              <div className="h-1 w-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
              <div className="p-5">
                <h3
                  className="font-black text-[#1A2948] mb-4 flex items-center gap-2 font-koho"
                >
                  <Icon name="ClipboardDocumentListIcon" size={16} className="text-primary" />
                  Tóm tắt đặt chỗ
                </h3>
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-gradient-red rounded-lg flex items-center justify-center shadow-sm">
                      <Icon name="PaperAirplaneIcon" size={12} className="text-white" />
                    </div>
                    <span
                      className="text-xs font-black text-primary font-koho"
                    >
                      {flight.flightNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <div
                        className="text-xl font-black text-[#1A2948] font-koho"
                      >
                        {flight.departTime}
                      </div>
                      <div className="text-xs text-stone-500">
                        {flight.from} · {flight.fromCity}
                      </div>
                    </div>
                    <Icon name="ArrowRightIcon" size={14} className="text-primary flex-shrink-0" />
                    <div>
                      <div
                        className="text-xl font-black text-[#1A2948] font-koho"
                      >
                        {flight.arriveTime}
                      </div>
                      <div className="text-xs text-stone-500">
                        {flight.to} · {flight.toCity}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-stone-400">{flight.duration} · Bay thẳng</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Giá vé ({passengerCount} người)</span>
                    <span className="font-semibold text-stone-800">
                      {(flight.price * passengerCount).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Thuế & phí</span>
                    <span className="font-semibold text-stone-800">
                      {Math.round(flight.price * passengerCount * 0.1).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="border-t border-stone-100 pt-2 flex justify-between">
                    <span
                      className="font-black text-[#1A2948] font-koho"
                    >
                      Tổng cộng
                    </span>
                    <span
                      className="font-black text-primary text-base font-koho"
                    >
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
