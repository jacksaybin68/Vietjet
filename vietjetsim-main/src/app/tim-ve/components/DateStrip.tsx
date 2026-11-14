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
    <section className="w-full border-b border-black/10 bg-white">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
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
                className={`relative flex h-[95px] w-[156px] shrink-0 flex-col items-center justify-center rounded-vj transition-all shadow-sm ${
                  active
                    ? 'bg-[var(--vj-yellow-tab)] text-[var(--vj-tab-ink)] font-bold border border-transparent'
                    : 'border border-gray-200/90 bg-white text-gray-700 font-medium hover:border-amber-300 hover:bg-amber-50/30'
                }`}
              >
                {/* Số đo site thật 14/11/2026: weekday `13px/500`, ngày
                    `16px/500` (Hai cỡ KHÁC nhau — không phải đồng loạt). */}
                <span className="text-sm2 font-medium leading-tight">{dayOfWeek}</span>
                <span className="text-base font-medium leading-tight">{dayMonth}</span>
                {item.price && (
                  <span
                    className={`mt-0.5 text-sm2 font-bold ${
                      active ? 'text-[var(--vj-tab-ink)]' : 'text-gray-500'
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
