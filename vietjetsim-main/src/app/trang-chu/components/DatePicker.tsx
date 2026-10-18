'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MdKeyboardArrowLeft as ChevronLeft,
  MdKeyboardArrowRight as ChevronRight,
  MdCalendarMonth as Calendar,
} from 'react-icons/md';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  label?: string;
  className?: string;
}

const MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function DatePicker({
  value,
  onChange,
  min,
  label = 'Ngày đi',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0 = CN, 1 = T2...
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = value ? new Date(value) : null;
  const minDate = min ? new Date(min) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const prevMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const selectDay = useCallback(
    (day: number) => {
      const d = new Date(year, month, day);
      onChange(d.toISOString().slice(0, 10));
      setOpen(false);
    },
    [year, month, onChange]
  );

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d < minDate;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  // Adjust firstDay: 0=CN → 6, 1=T2 → 0, ...
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

  const displayValue = value
    ? new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '--/--/----';

  return (
    <div ref={ref} className={`relative inline-block ${className ?? ''}`}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
        className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 transition-colors focus-within:bg-[#fffdf3] sm:py-2 rounded-xl border border-[#e4e4e4] shadow-sm focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] focus-within:bg-[#fffdf3]"
      >
        <Calendar className="shrink-0 text-lg text-[#555555]" />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-[#767676]`}
          >
            {label}
          </span>
          <span className="text-base font-extrabold text-[#222222]">{displayValue}</span>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 bg-white rounded-xl border border-[#e4e4e4] shadow-2xl p-3 animate-in fade-in zoom-in duration-100">
          {/* Header: navigation + month/year */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md hover:bg-vjbgs/50 transition-colors text-vjdark"
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-black text-vjdark">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md hover:bg-vjbgs/50 transition-colors text-vjdark"
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-gray-500 uppercase mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells before first day */}
            {[...Array(adjustedFirstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {/* Days */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const disabled = isDisabled(day);
              const selected = isSelected(day);
              const todayFlag = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => (disabled ? undefined : selectDay(day))}
                  disabled={disabled}
                  className={`h-8 w-8 rounded-md text-sm transition-all flex items-center justify-center ${
                    disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : selected
                        ? 'bg-vjred text-white font-bold shadow-sm shadow-vjred/30'
                        : todayFlag
                          ? 'border border-vjred text-vjred font-bold bg-vjred/10'
                          : 'text-vjdark hover:bg-vjbgs/50 hover:text-vjred'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-[#e4e4e4]">
            <button
              onClick={() => {
                onChange(today.toISOString().slice(0, 10));
                setOpen(false);
              }}
              className="w-full py-1.5 rounded-md text-xs font-semibold text-vjdark hover:bg-vjbgs/50 transition-colors"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
