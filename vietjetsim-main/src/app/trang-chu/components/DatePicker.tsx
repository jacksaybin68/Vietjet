'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MdKeyboardArrowLeft as ChevronLeft,
  MdKeyboardArrowRight as ChevronRight,
  MdCalendarMonth as Calendar,
  MdClose as CloseIcon,
} from 'react-icons/md';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  label?: string;
  variant?: 'flush' | 'card';
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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay(); // 0 = CN, 1 = T2...
  return day === 0 ? 6 : day - 1; // 0 = T2, 6 = CN
}

function formatIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DatePicker({
  value,
  onChange,
  min,
  label = 'Ngày đi',
  variant = 'card',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const initialDate = useMemo(() => (value ? new Date(value) : new Date()), [value]);
  const [viewYear, setViewYear] = useState(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => initialDate.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Month 2 is Month 1 + 1
  const month2Year = viewMonth === 11 ? viewYear + 1 : viewYear;
  const month2 = (viewMonth + 1) % 12;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const selectedDate = useMemo(() => (value ? new Date(value) : null), [value]);
  const minDate = useMemo(() => (min ? new Date(min) : null), [min]);

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
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const selectDay = useCallback(
    (y: number, m: number, d: number) => {
      onChange(formatIso(y, m, d));
      setOpen(false);
    },
    [onChange]
  );

  const isDayDisabled = useCallback(
    (y: number, m: number, d: number) => {
      if (!minDate) return false;
      const target = new Date(y, m, d);
      target.setHours(0, 0, 0, 0);
      return target < minDate;
    },
    [minDate]
  );

  const isDaySelected = useCallback(
    (y: number, m: number, d: number) => {
      if (!selectedDate) return false;
      return (
        selectedDate.getFullYear() === y &&
        selectedDate.getMonth() === m &&
        selectedDate.getDate() === d
      );
    },
    [selectedDate]
  );

  const displayValue = useMemo(() => {
    if (!value) return '--/--/----';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, [value]);

  const renderMonthGrid = (y: number, m: number) => {
    const daysCount = getDaysInMonth(y, m);
    const firstDay = getFirstDayOfMonth(y, m);

    return (
      <div className="flex-1">
        <div className="text-center font-black text-sm text-[var(--vj-navy)] mb-3 pb-1 border-b border-gray-100">
          {MONTHS[m]} / {y}
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-xs2 font-bold text-gray-400 uppercase text-center mb-1.5">
          {DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {Array.from({ length: daysCount }).map((_, i) => {
            const day = i + 1;
            const disabled = isDayDisabled(y, m, day);
            const selected = isDaySelected(y, m, day);

            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && selectDay(y, m, day)}
                className={`w-8 h-8 mx-auto rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                  disabled
                    ? 'text-gray-300 cursor-not-allowed opacity-50'
                    : selected
                      ? 'bg-vjred text-white shadow-md scale-105'
                      : 'text-gray-800 hover:bg-red-50 hover:text-vjred'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      {/* Trigger Button */}
      {variant === 'flush' ? (
        <label
          onClick={() => setOpen((prev) => !prev)}
          aria-label={label}
          className="w-full flex items-center gap-2 bg-white px-2.5 py-1.5 cursor-pointer hover:bg-amber-50 focus-within:bg-amber-50 min-w-0 text-left transition-colors"
        >
          <Calendar className="shrink-0 text-base text-[var(--foreground-subtle)]" />
          <span className="min-w-0 flex-1">
            <span className="block text-2xs font-bold uppercase leading-tight tracking-[0.06em] text-[var(--foreground-subtle)]">
              {label}
            </span>
            <span className="block text-sm2 font-bold text-[var(--foreground)] truncate">
              {displayValue}
            </span>
          </span>
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={label}
          className="w-full flex items-center gap-2.5 bg-white px-3.5 py-2.5 sm:py-2 rounded-xl border border-[var(--border)] shadow-sm hover:border-[var(--accent)] focus:border-[var(--accent)] text-left transition-colors"
        >
          <Calendar className="shrink-0 text-lg text-[var(--foreground-muted)]" />
          <span className="min-w-0 flex-1">
            <span className="block text-2xs font-bold uppercase leading-none tracking-[0.06em] text-[var(--foreground-muted)]">
              {label}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-[var(--foreground)]">
              {displayValue}
            </span>
          </span>
        </button>
      )}

      {/* Two-Month Popover matching Image 1 */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[580px] max-w-[92vw] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-gray-100 p-4 sm:p-5 z-50 animate-fadeIn text-[var(--foreground)]">
          {/* Header navigation bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              aria-label="Tháng trước"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Chọn ngày bay Vietjet Air
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                aria-label="Tháng sau"
              >
                <ChevronRight size={22} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors ml-1"
                aria-label="Đóng"
              >
                <CloseIcon size={20} />
              </button>
            </div>
          </div>

          {/* Two months side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="pt-2 md:pt-0">{renderMonthGrid(viewYear, viewMonth)}</div>
            <div className="pt-4 md:pt-0 md:pl-6">{renderMonthGrid(month2Year, month2)}</div>
          </div>

          {/* Footer Shortcuts */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-vjred" />
              <span className="text-gray-500 text-xs2">Ngày được chọn</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(formatIso(today.getFullYear(), today.getMonth(), today.getDate()));
                setOpen(false);
              }}
              className="font-bold text-vjred hover:underline"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
