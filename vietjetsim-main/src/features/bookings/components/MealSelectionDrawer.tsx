'use client';

import React, { useState } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { RiCloseLine, RiRestaurantLine, RiAddLine, RiSubtractLine } from 'react-icons/ri';

export interface SelectedMeal {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const COMBO_MEALS = [
  {
    id: 'meal-my-y',
    name: 'Combo Mỳ Ý và Nước suối và Hạt điều',
    price: 119000,
    desc: 'Mỳ Ý sốt bò bằm đậm đà, hạt điều giòn bùi cùng nước suối tinh khiết.',
    img: '🍝',
  },
  {
    id: 'meal-com-chien-thai',
    name: 'Combo Cơm chiên Thái và Nước suối và Hạt điều',
    price: 119000,
    desc: 'Cơm chiên kiểu Thái chua cay đậm vị, kèm hạt điều và nước suối.',
    img: '🍛',
  },
  {
    id: 'meal-mien-xao-tom-cua',
    name: 'Combo Miến xào Tôm cua và Nước suối và Hạt điều',
    price: 119000,
    desc: 'Miến xào dai mềm hòa quyện tôm thịt cua ngọt lành, hạt điều và nước suối.',
    img: '🍜',
  },
  {
    id: 'meal-bun-xao-singapore',
    name: 'Combo Bún xào Singapore và Nước suối và Hạt điều',
    price: 119000,
    desc: 'Bún xào Singapore sốt cà ri thơm lừng, thịt xá xíu, tôm và rau củ.',
    img: '🥢',
  },
  {
    id: 'meal-com-chien-duong-chau',
    name: 'Combo Cơm chiên dương châu chay và Nước suối và Hạt điều',
    price: 119000,
    desc: 'Cơm chiên thanh đạm cùng nấm, rau củ tươi ngon phù hợp ăn chay.',
    img: '🥗',
  },
  {
    id: 'meal-xoi-khuc-gio',
    name: 'Combo Xôi khúc giò, hạt điều và nước suối',
    price: 119000,
    desc: 'Xôi khúc dẻo thơm đậu xanh hạt tiêu ăn kèm giò lụa thơm ngậy.',
    img: '🍚',
  },
];

interface MealSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  passengerName?: string;
  initialMeals?: Record<string, number>;
  onConfirmMeals: (meals: Record<string, number>, totalFee: number) => void;
  isRoundTrip?: boolean;
}

export default function MealSelectionDrawer({
  isOpen,
  onClose,
  flight,
  passengerName = 'LONG CHIN',
  initialMeals = {},
  onConfirmMeals,
  isRoundTrip = false,
}: MealSelectionDrawerProps) {
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'inbound'>('outbound');
  const [mealCounts, setMealCounts] = useState<Record<string, number>>(initialMeals);

  if (!isOpen) return null;

  const totalMealFee = Object.entries(mealCounts).reduce((sum, [id, qty]) => {
    const meal = COMBO_MEALS.find((m) => m.id === id);
    return sum + (meal ? meal.price * qty : 0);
  }, 0);

  const totalCount = Object.values(mealCounts).reduce((a, b) => a + b, 0);

  const updateQuantity = (id: string, delta: number) => {
    setMealCounts((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleConfirm = () => {
    onConfirmMeals(mealCounts, totalMealFee);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
        {/* Header with Vietjet curve top-right (Screenshot 11) */}
        <div className="relative bg-[#C4161C] text-white px-4 py-3 flex items-center justify-between shadow-md overflow-hidden">
          <div className="w-8 shrink-0" />
          <h2 className="font-sans font-black italic tracking-wide text-base sm:text-lg uppercase text-white text-center">
            CHỌN SUẤT ĂN
          </h2>
          <div className="relative z-10">
            <button
              onClick={onClose}
              className="text-gray-900 bg-white/90 hover:bg-white p-1 rounded-full transition-colors flex items-center justify-center h-7 w-7 cursor-pointer"
              aria-label="Đóng"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
          {/* Vietjet green-yellow swoosh on top right */}
          <div className="pointer-events-none absolute top-0 right-0 h-14 w-24 overflow-hidden">
            <svg className="absolute -top-4 -right-4 h-20 w-28 opacity-95" viewBox="0 0 100 60" fill="none">
              <path d="M100 0 L 20 0 C 40 30, 70 50, 100 60 Z" fill="#2E7D32" />
              <path d="M100 0 L 45 0 C 60 25, 80 45, 100 50 Z" fill="#FBB612" />
            </svg>
          </div>
        </div>

        {/* Legs tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveLeg('outbound')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-all border-b-2 ${
              activeLeg === 'outbound'
                ? 'border-primary-dark text-primary-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Chuyến đi
          </button>
          {isRoundTrip && (
            <button
              type="button"
              onClick={() => setActiveLeg('inbound')}
              className={`flex-1 py-2.5 text-center text-xs font-bold transition-all border-b-2 ${
                activeLeg === 'inbound'
                  ? 'border-primary-dark text-primary-dark'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Chuyến về
            </button>
          )}
        </div>

        {/* Passenger Card matching Screenshot 11 */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="max-w-xs mx-auto overflow-hidden rounded-xl border border-red-200 shadow-sm bg-white text-center">
            <div className="bg-[#C4161C] py-2 px-4 text-white">
              <div className="text-3xs uppercase tracking-wider text-white/80">Người lớn</div>
              <div className="text-sm font-black uppercase tracking-tight">{passengerName}</div>
            </div>
            <div className="py-2.5 px-4 text-sm font-bold text-gray-900 font-koho">
              {activeLeg === 'outbound'
                ? `${flight.from} - ${flight.to}`
                : `${flight.to} - ${flight.from}`}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {/* Banner matching Screenshot 11 */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-red-900 via-amber-950 to-red-950 text-white p-4 shadow-sm relative min-h-[90px] flex items-center">
            <div className="relative z-10 max-w-[80%]">
              <h3 className="text-sm sm:text-base font-black italic text-white leading-snug drop-shadow-sm">
                Mời bạn thưởng thức những món ăn nóng hổi, tươi ngon
              </h3>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-5xl opacity-80 select-none">
              🍱
            </div>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-3">
              Hãy chọn mua thêm suất ăn bạn yêu thích nhé !
            </h4>

            {/* Grid 2 columns of combo meals matching Screenshot 11 */}
            <div className="grid grid-cols-2 gap-3">
              {COMBO_MEALS.map((meal) => {
                const count = mealCounts[meal.id] || 0;
                return (
                  <div
                    key={meal.id}
                    className="flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-md transition-all bg-white"
                  >
                    <div>
                      {/* Meal thumbnail container */}
                      <div className="w-full aspect-[4/3] rounded-lg bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200/80 flex items-center justify-center text-4xl mb-2 relative overflow-hidden shadow-2xs">
                        <span>{meal.img}</span>
                        <div className="absolute top-1 right-1 bg-red-600 text-white text-3xs font-black px-1.5 py-0.5 rounded-full uppercase">
                          Hot
                        </div>
                      </div>

                      <h5 className="text-xs font-extrabold text-gray-900 line-clamp-2 leading-tight">
                        {meal.name}
                      </h5>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-gray-100">
                      <span className="text-xs sm:text-sm font-black text-red-600 italic block mb-2 font-koho">
                        {meal.price.toLocaleString('vi-VN')} VND
                      </span>

                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          className="text-3xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-medium flex items-center gap-0.5"
                        >
                          <span>ⓘ</span> Chi tiết
                        </button>

                        {count === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateQuantity(meal.id, 1)}
                            className="w-7 h-7 rounded-full border border-green-600 bg-white text-green-600 hover:bg-green-600 hover:text-white flex items-center justify-center font-black text-base transition-all shadow-2xs active:scale-95 cursor-pointer"
                            aria-label={`Thêm ${meal.name}`}
                          >
                            <RiAddLine size={16} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(meal.id, -1)}
                              className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors shadow-2xs text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-gray-900 w-3 text-center">
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(meal.id, 1)}
                              className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-2xs text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Red Bar matching Screenshot 11 */}
        <div className="bg-[#C4161C] text-white p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFCC00] flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-xl">🍴</span>
            </div>
            <div className="text-xs leading-tight">
              <span className="opacity-95 font-medium block text-white text-3xs sm:text-xs">
                Chọn suất ăn
              </span>
              <span className="font-black text-xs sm:text-sm text-white font-koho">
                {totalMealFee.toLocaleString('vi-VN')} VND
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-[#FFCC00] hover:bg-[#FFD200] text-gray-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow transition-all active:scale-95 cursor-pointer italic"
          >
            {totalCount > 0 ? 'Xác nhận' : 'Không, cảm ơn'}
          </button>
        </div>
      </div>
    </div>
  );
}
