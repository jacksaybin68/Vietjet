'use client';

import React from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import {
  RiArmchairLine,
  RiSuitcaseLine,
  RiRestaurantLine,
  RiTaxiLine,
  RiShieldCheckLine,
  RiUserSharedLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { MdPets } from 'react-icons/md';
import BookingBottomBar from './BookingBottomBar';

interface AncillaryServicesStepProps {
  flight: Flight;
  returnFlight?: Flight | null;
  isRoundTrip?: boolean;
  passengerName?: string;
  selectedSeats?: string[];
  returnSeats?: string[];
  seatFee?: number;
  baggageLabel?: string;
  returnBaggageLabel?: string;
  baggageFee?: number;
  hasInsurance?: boolean;
  insuranceFee?: number;
  mealFee?: number;
  mealCount?: number;
  totalAmount: number;
  onOpenSeatDrawer: () => void;
  onOpenBaggageDrawer: () => void;
  onOpenMealDrawer: () => void;
  onOpenTaxiDrawer: () => void;
  onOpenInsuranceDrawer: () => void;
  onOpenPassengerServicesDrawer: () => void;
  onOpenPetDrawer: () => void;
  onBack: () => void;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export default function AncillaryServicesStep({
  flight,
  returnFlight,
  isRoundTrip = false,
  passengerName: _passengerName = 'LONG CHIN',
  selectedSeats = [],
  returnSeats = [],
  seatFee = 0,
  baggageLabel,
  returnBaggageLabel,
  baggageFee = 0,
  hasInsurance = false,
  insuranceFee = 72000,
  mealFee = 0,
  mealCount = 0,
  totalAmount,
  onOpenSeatDrawer,
  onOpenBaggageDrawer,
  onOpenMealDrawer,
  onOpenTaxiDrawer,
  onOpenInsuranceDrawer,
  onOpenPassengerServicesDrawer,
  onOpenPetDrawer,
  onBack,
  onContinue,
  isSubmitting = false,
}: AncillaryServicesStepProps) {
  return (
    <div className="space-y-4 pb-28">
      {/* Title matching Screenshots 1, 4, 7, 8 */}
      <div className="mb-2">
        <h2 className="text-sm sm:text-base font-bold text-green-700 tracking-tight">
          Đừng quên mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa...
        </h2>
      </div>

      {/* 7 Services in EXACT order of Vietjet reference */}
      <div className="space-y-3">
        {/* 1. Chọn chỗ ngồi yêu thích (Screenshot 8) */}
        <div
          onClick={onOpenSeatDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200 p-4 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#FBB612] flex items-center justify-center text-red-600 shadow-sm shrink-0">
              <RiArmchairLine size={28} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                Chọn chỗ ngồi yêu thích
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Hãy chọn chỗ ngồi yêu thích của bạn
              </p>
              <div className="text-xs font-black text-red-600 mt-0.5">
                {seatFee > 0 ? `${seatFee.toLocaleString('vi-VN')} VND` : '0 VND'}
              </div>
              <div className="flex items-center gap-3 text-3xs font-bold text-gray-700 mt-1 border-t border-gray-100 pt-1">
                <span>{flight.from} ✈ {flight.to}</span>
                {isRoundTrip && <span>{returnFlight?.from || flight.to} ✈ {returnFlight?.to || flight.from}</span>}
              </div>
            </div>
          </div>
          <RiArrowRightSLine
            size={22}
            className="text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
          />
        </div>

        {/* 2. Chọn hành lý/Dịch vụ nối chuyến (Screenshot 8) */}
        <div
          onClick={onOpenBaggageDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200 p-4 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#FBB612] flex items-center justify-center text-red-600 shadow-sm shrink-0">
              <RiSuitcaseLine size={28} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                Chọn hành lý/Dịch vụ nối chuyến
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Hãy lựa chọn gói hành lý phù hợp
              </p>
              <div className="text-xs font-black text-red-600 mt-0.5">
                {baggageFee > 0 ? `${baggageFee.toLocaleString('vi-VN')} VND` : '0 VND'}
              </div>
              <div className="flex items-center gap-3 text-3xs font-bold text-gray-700 mt-1 border-t border-gray-100 pt-1">
                <span>
                  {flight.from} ✈ {flight.to} {baggageLabel ? `(${baggageLabel})` : ''}
                </span>
                {isRoundTrip && (
                  <span>
                    {returnFlight?.from || flight.to} ✈ {returnFlight?.to || flight.from}{' '}
                    {returnBaggageLabel ? `(${returnBaggageLabel})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <RiArrowRightSLine
            size={22}
            className="text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
          />
        </div>

        {/* 3. Chọn suất ăn (Screenshot 8) */}
        <div
          onClick={onOpenMealDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200 p-4 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#FBB612] flex items-center justify-center text-red-600 shadow-sm shrink-0">
              <RiRestaurantLine size={28} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                Chọn suất ăn
              </h3>
              <p className="text-xs font-bold italic text-red-600 mt-0.5">
                jet café
              </p>
              <div className="text-xs font-black text-red-600 mt-0.5">
                {mealFee > 0 ? `${mealFee.toLocaleString('vi-VN')} VND` : '0 VND'}
              </div>
              <div className="flex items-center gap-3 text-3xs font-bold text-gray-700 mt-1 border-t border-gray-100 pt-1">
                <span>{flight.from} ✈ {flight.to}</span>
                {isRoundTrip && <span>{returnFlight?.from || flight.to} ✈ {returnFlight?.to || flight.from}</span>}
              </div>
            </div>
          </div>
          <RiArrowRightSLine
            size={22}
            className="text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
          />
        </div>

        {/* 4. Dịch vụ Taxi */}
        <div
          onClick={onOpenTaxiDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-100/80 border border-amber-300 flex items-center justify-center text-primary-dark shadow-sm shrink-0">
              <RiTaxiLine size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-dark transition-colors">
                Dịch vụ Taxi
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Đưa đón sân bay thuận tiện, giá ưu đãi</p>
            </div>
          </div>
          <RiArrowRightSLine
            size={20}
            className="text-gray-400 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all"
          />
        </div>

        {/* 5. Bảo hiểm du lịch Vietjet Travel Safe */}
        <div
          onClick={onOpenInsuranceDrawer}
          className={`group cursor-pointer rounded-2xl border p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between ${
            hasInsurance
              ? 'bg-red-50/30 border-primary-dark'
              : 'bg-white border-gray-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3.5 flex-1 pr-2">
            <div className="w-11 h-11 rounded-full bg-amber-100/80 border border-amber-300 flex items-center justify-center text-primary-dark shadow-sm shrink-0">
              <RiShieldCheckLine size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-dark transition-colors">
                  Bảo hiểm du lịch Vietjet Travel Safe
                </h3>
                <span className="text-xs font-black text-primary-dark">
                  {insuranceFee.toLocaleString('vi-VN')} VND
                </span>
              </div>
              <div className="text-xs2 text-gray-500 mt-0.5 space-y-0.5">
                <span className="font-bold text-gray-700 block">
                  {flight.from} ✈ {flight.to}
                </span>
                <p className="line-clamp-2">
                  Bảo hiểm du lịch. Giấy chứng nhận bảo hiểm sẽ được cấp cùng vé máy bay, và không
                  thể cấp lại sau chuyến bay.
                </p>
              </div>
            </div>
          </div>
          <RiArrowRightSLine
            size={20}
            className="text-gray-400 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all shrink-0"
          />
        </div>

        {/* 6. Dịch vụ theo hành khách [New] */}
        <div
          onClick={onOpenPassengerServicesDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-100/80 border border-amber-300 flex items-center justify-center text-primary-dark shadow-sm shrink-0">
              <RiUserSharedLine size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-dark transition-colors">
                  Dịch vụ theo hành khách
                </h3>
                <span className="text-2xs bg-primary-dark text-white font-bold px-1.5 py-0.2 rounded italic">
                  New
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Hãy chọn dịch vụ</p>
            </div>
          </div>
          <RiArrowRightSLine
            size={20}
            className="text-gray-400 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all"
          />
        </div>

        {/* 7. Mang theo thú cưng [New] */}
        <div
          onClick={onOpenPetDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-100/80 border border-amber-300 flex items-center justify-center text-primary-dark shadow-sm shrink-0">
              <MdPets size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-dark transition-colors">
                  Mang theo thú cưng
                </h3>
                <span className="text-2xs bg-primary-dark text-white font-bold px-1.5 py-0.2 rounded italic">
                  New
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Thú cưng ơi, bay thôi! Dịch vụ vận chuyển thú cưng trên chuyến bay
              </p>
            </div>
          </div>
          <RiArrowRightSLine
            size={20}
            className="text-gray-400 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <BookingBottomBar
        total={totalAmount}
        onBack={onBack}
        onContinue={onContinue}
        continueLabel="Đi tiếp"
        canContinue={!isSubmitting}
      />
    </div>
  );
}
