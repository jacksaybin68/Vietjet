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
            const parts = item.label.split(' ');
            return (
              <button
                key={item.value}
                onClick={() => onSelect(item.value)}
                className={`flex flex-col items-center gap-1 shrink-0 px-3 py-2 rounded-xl transition-all ${
                  active
                    ? 'border-2 border-vjred bg-vjred/10 text-vjred font-black'
                    : 'border-transparent text-vjdark font-semibold hover:bg-vjbgs/50'
                }`}
              >
                <span className="text-xs uppercase tracking-wider">{parts[0]}</span>
                <span className="text-sm font-black">{parts.slice(1).join(' ')}</span>
                {item.price && (
                  <span className="text-[10px] text-vjred font-bold mt-0.5">
                    {item.price.toLocaleString('vi-VN')}đ
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
