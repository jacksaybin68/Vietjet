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
        {/* Header - Red bar matching Screenshot 8 */}
        <div className="bg-primary-dark text-white px-4 py-3 flex items-center justify-between shadow-md">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">CHỌN SUẤT ĂN</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-amber-300 p-1 rounded transition-colors"
            aria-label="Đóng"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Legs tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveLeg('outbound')}
            className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 ${
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
              className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 ${
                activeLeg === 'inbound'
                  ? 'border-primary-dark text-primary-dark'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Chuyến về
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Passenger card */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-primary-dark text-white px-3 py-1.5 text-center">
              <span className="text-2xs uppercase font-bold opacity-80 block">Người lớn</span>
              <span className="text-xs font-black tracking-wider uppercase">{passengerName}</span>
            </div>
            <div className="bg-gray-50 px-3 py-1.5 text-center text-xs font-black text-gray-800">
              {activeLeg === 'outbound'
                ? `${flight.from} - ${flight.to}`
                : `${flight.to} - ${flight.from}`}
            </div>
          </div>

          {/* Banner: Mời bạn thưởng thức suất ăn nóng */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-red-800 via-amber-900 to-red-900 text-white p-4 shadow-sm relative">
            <div className="relative z-10 max-w-[75%]">
              <span className="text-2xs uppercase font-bold text-amber-300 tracking-wider block">
                jet café
              </span>
              <h3 className="text-sm font-black italic mt-0.5 text-white leading-snug">
                Mời bạn thưởng thức những món ăn nóng hổi, tươi ngon
              </h3>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-4xl opacity-80">🍲</div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-800 mb-2">
              Hãy chọn mua thêm suất ăn bạn yêu thích nhé !
            </h4>

            {/* List of combo meals matching Screenshot 8 */}
            <div className="space-y-3">
              {COMBO_MEALS.map((meal) => {
                const count = mealCounts[meal.id] || 0;
                return (
                  <div
                    key={meal.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-red-200 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="w-14 h-14 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shrink-0">
                      {meal.img}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-black text-gray-900 line-clamp-1">{meal.name}</h5>
                      <span className="text-xs font-black text-primary-dark block mt-0.5">
                        {meal.price.toLocaleString('vi-VN')} VND
                      </span>
                      <p className="text-2xs text-gray-500 line-clamp-1 mt-0.5">{meal.desc}</p>
                    </div>

                    <div className="shrink-0">
                      {count === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQuantity(meal.id, 1)}
                          className="w-8 h-8 rounded-full border-2 border-green-500 text-green-600 hover:bg-green-50 flex items-center justify-center font-bold text-lg transition-all"
                          aria-label={`Thêm ${meal.name}`}
                        >
                          <RiAddLine size={18} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(meal.id, -1)}
                            className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <RiSubtractLine size={14} />
                          </button>
                          <span className="text-xs font-black text-gray-900 w-4 text-center">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(meal.id, 1)}
                            className="w-5 h-5 rounded-full bg-primary-dark text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                          >
                            <RiAddLine size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Red Bar matching Screenshot 8 */}
        <div className="bg-primary-dark text-white p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <RiRestaurantLine size={20} className="text-white" />
            </div>
            <div className="text-xs2 leading-tight">
              <span className="opacity-90 block">Chọn suất ăn</span>
              <span className="font-black text-sm text-vjyellow">
                {totalMealFee.toLocaleString('vi-VN')} VND
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-vjyellow hover:bg-accent-light text-gray-900 font-black px-6 py-2 rounded-lg text-sm shadow transition-all active:scale-95"
          >
            {totalCount > 0 ? 'Xác nhận' : 'Không, cảm ơn'}
          </button>
        </div>
      </div>
    </div>
  );
}
