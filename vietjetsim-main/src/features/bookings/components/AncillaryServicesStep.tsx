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
  passengerName?: string;
  selectedSeats?: string[];
  seatFee?: number;
  baggageLabel?: string;
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
  passengerName: _passengerName = 'LONG CHIN',
  selectedSeats = [],
  seatFee = 0,
  baggageLabel,
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
      <div className="space-y-2.5">
        {/* 1. Chọn chỗ ngồi yêu thích */}
        <div
          onClick={onOpenSeatDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-100/80 border border-amber-300 flex items-center justify-center text-primary-dark shadow-sm shrink-0">
              <RiArmchairLine size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-dark transition-colors">
                  Chọn chỗ ngồi yêu thích
                </h3>
                {seatFee > 0 && (
                  <span className="text-xs font-black text-primary-dark">
                    {seatFee.toLocaleString('vi-VN')} VND
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedSeats.length > 0
                  ? `Đã chọn: ${selectedSeats.join(', ')}`
                  : 'Hãy chọn chỗ ngồi yêu thích của bạn'}
              </p>
            </div>
          </div>
          <RiArrowRightSLine
            size={20}
            className="text-gray-400 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all"
          />
        </div>

        {/* 2. Chọn hành lý/Dịch vụ nối chuyến */}
        <div
          onClick={onOpenBaggageDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-100/80 border border-amber-300 flex items-center justify-center text-primary-dark shadow-sm shrink-0">
              <RiSuitcaseLine size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-dark transition-colors">
                  Chọn hành lý/Dịch vụ nối chuyến
                </h3>
                {baggageFee > 0 && (
                  <span className="text-xs font-black text-primary-dark">
                    {baggageFee.toLocaleString('vi-VN')} VND
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {baggageLabel ? (
                  <span className="font-semibold text-gray-700">
                    {flight.from} ✈ {flight.to} ({baggageLabel})
                  </span>
                ) : (
                  'Hãy lựa chọn gói hành lý phù hợp'
                )}
              </p>
            </div>
          </div>
          <RiArrowRightSLine
            size={20}
            className="text-gray-400 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all"
          />
        </div>

        {/* 3. Chọn suất ăn */}
        <div
          onClick={onOpenMealDrawer}
          className="group cursor-pointer rounded-2xl bg-white border border-gray-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-100/80 border border-amber-300 flex items-center justify-center text-primary-dark shadow-sm shrink-0">
              <RiRestaurantLine size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-dark transition-colors">
                  Chọn suất ăn
                </h3>
                {mealFee > 0 && (
                  <span className="text-xs font-black text-primary-dark">
                    {mealFee.toLocaleString('vi-VN')} VND
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {mealCount > 0 ? (
                  <span className="font-semibold text-gray-700">Đã chọn {mealCount} suất ăn</span>
                ) : (
                  <span className="text-primary-dark font-bold">jet café</span>
                )}
              </p>
            </div>
          </div>
          <RiArrowRightSLine
            size={20}
            className="text-gray-400 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all"
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
