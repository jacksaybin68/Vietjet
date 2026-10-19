'use client';

import React, { useState } from 'react';
import { RiArrowLeftLine, RiArrowRightLine } from 'react-icons/ri';

export interface DateStripItem {
  label: string; // ví dụ "Thứ sáu 16/10"
  value: string; // ISO date YYYY-MM-DD
  price?: number; // giá tốt nhất của ngày này (tuỳ chọn)
}

interface DateStripProps {
  items: DateStripItem[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}

export default function DateStrip({ items, selectedValue, onSelect }: DateStripProps) {
  const [scrollDir, setScrollDir] = useState<'left' | 'right' | null>(null);

  const handleScroll = (dir: 'left' | 'right') => {
    setScrollDir(dir);
    const container = document.querySelector('[data-date-strip-container]');
    if (!container) return;
    const step = 200;
    container.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  const validPrices = items
    .map((i) => i.price)
    .filter((p): p is number => typeof p === 'number' && p > 0);
  const _minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  return (
    <section className="w-full border-b border-black/10 bg-[var(--background)]">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        {/* Thanh cuộn ngang */}
        <div
          data-date-strip-container
          className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar scroll-smooth"
        >
          {items.map((item) => {
            const active = item.value === selectedValue;
            // Parse label into day of week, day & month
            const labelParts = item.label.split(' ');
            const dayOfWeek = labelParts[0] || 'Thứ';
            const dayMonth = labelParts.slice(1).join(' ').replace('/', ' tháng ');
            return (
              <button
                key={item.value}
                onClick={() => onSelect(item.value)}
                className={`relative flex flex-col items-center justify-center shrink-0 min-w-[130px] px-3 py-2 rounded-2xl transition-all shadow-sm ${
                  active
                    ? 'bg-gradient-to-b from-vjyellow to-accent-light text-[var(--foreground)] font-black border-2 border-yellow-500 ring-2 ring-vjyellow/40 scale-105 z-10'
                    : 'border border-gray-200/90 bg-white text-gray-700 font-semibold hover:border-amber-300 hover:bg-amber-50/30'
                }`}
              >
                <span className="text-xs2 font-bold opacity-90">{dayOfWeek}</span>
                <span className="text-xs font-black">{dayMonth}</span>
                {item.price && (
                  <span
                    className={`text-xs2 font-bold mt-0.5 ${
                      active ? 'text-red-700 font-black' : 'text-gray-500'
                    }`}
                  >
                    {active ? 'Từ ' : ''}
                    {item.price.toLocaleString('vi-VN')} VND
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút cuộn trái/phải */}
        <div className="flex justify-between items-center mt-1">
          <button
            onClick={() => handleScroll('left')}
            className={`p-1.5 rounded-full bg-white border border-black/10 transition-colors ${
              scrollDir === 'left' ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Cuộn về ngày trước"
          >
            <RiArrowLeftLine size={16} className="text-vjdark" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className={`p-1.5 rounded-full bg-white border border-black/10 transition-colors ${
              scrollDir === 'right' ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Cuộn về ngày sau"
          >
            <RiArrowRightLine size={16} className="text-vjdark" />
          </button>
        </div>
      </div>
    </section>
  );
}
