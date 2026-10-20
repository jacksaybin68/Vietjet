'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MdKeyboardArrowLeft as ChevronLeft,
  MdKeyboardArrowRight as ChevronRight,
  MdCalendarMonth as Calendar,
} from 'react-icons/md';

export interface CalendarCell {
  day: number;
  inMonth: boolean;
  year: number;
  month: number;
}

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

export function formatIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthCells(year: number, month: number): CalendarCell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = CN, 1 = T2
  const leadDays = firstDay === 0 ? 6 : firstDay - 1; // 0 for Mon, 6 for Sun

  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonthCells: CalendarCell[] = [];
  for (let i = leadDays - 1; i >= 0; i--) {
    prevMonthCells.push({
      day: daysInPrevMonth - i,
      inMonth: false,
      year: month === 0 ? year - 1 : year,
      month: month === 0 ? 11 : month - 1,
    });
  }

  const currentMonthCells: CalendarCell[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthCells.push({
      day: i,
      inMonth: true,
      year,
      month,
    });
  }

  const totalSoFar = prevMonthCells.length + currentMonthCells.length;
  const trailingCount = (7 - (totalSoFar % 7)) % 7;
  const nextMonthCells: CalendarCell[] = [];
  for (let i = 1; i <= trailingCount; i++) {
    nextMonthCells.push({
      day: i,
      inMonth: false,
      year: month === 11 ? year + 1 : year,
      month: month === 11 ? 0 : month + 1,
    });
  }

  return [...prevMonthCells, ...currentMonthCells, ...nextMonthCells];
}

export interface FlightDatePickerPopoverProps {
  departDate: string;
  returnDate: string;
  roundTrip: boolean;
  activeStep: 'depart' | 'return';
  onStepChange?: (step: 'depart' | 'return') => void;
  onSelectDepart: (date: string) => void;
  onSelectReturn: (date: string) => void;
  onTripTypeChange: (roundTrip: boolean) => void;
  onClose: () => void;
  minDate?: string;
  className?: string;
}

/**
 * 2-Month Flight Date Picker Popover matching official Vietjet Air design
 */
export function FlightDatePickerPopover({
  departDate,
  returnDate,
  roundTrip,
  activeStep,
  onStepChange,
  onSelectDepart,
  onSelectReturn,
  onTripTypeChange,
  onClose,
  minDate,
  className = '',
}: FlightDatePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize view year/month based on active step's date
  const anchorDate = useMemo(() => {
    const target = activeStep === 'return' && returnDate ? returnDate : departDate;
    return target ? new Date(target) : new Date();
  }, [activeStep, departDate, returnDate]);

  const [viewYear, setViewYear] = useState(() => anchorDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => anchorDate.getMonth());
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Month 2 is Month 1 + 1
  const month2Year = viewMonth === 11 ? viewYear + 1 : viewYear;
  const month2 = (viewMonth + 1) % 12;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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

  const handleCellClick = useCallback(
    (cellIso: string) => {
      if (activeStep === 'depart') {
        onSelectDepart(cellIso);
        if (roundTrip) {
          // If returnDate is missing or earlier than new departDate, adjust it
          if (!returnDate || returnDate < cellIso) {
            onSelectReturn(cellIso);
          }
          onStepChange?.('return');
        } else {
          onClose();
        }
      } else {
        // Active step is 'return'
        if (cellIso < departDate) {
          // Clicked earlier than departDate -> treat as choosing new departDate
          onSelectDepart(cellIso);
          onStepChange?.('return');
        } else {
          onSelectReturn(cellIso);
          onClose();
        }
      }
    },
    [
      activeStep,
      departDate,
      returnDate,
      roundTrip,
      onSelectDepart,
      onSelectReturn,
      onStepChange,
      onClose,
    ]
  );

  const renderMonth = (y: number, m: number, isFirstMonth: boolean) => {
    const cells = getMonthCells(y, m);

    return (
      <div className="flex-1 min-w-[260px]">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          {isFirstMonth ? (
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded text-gray-700 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="text-xl" />
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="text-center font-bold text-sm text-gray-800">
            Tháng {m + 1} {y}
          </div>

          {!isFirstMonth ? (
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded text-gray-700 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Tháng sau"
            >
              <ChevronRight className="text-xl" />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        {/* Weekday headers: Thứ 2 .. Thứ 7, CN (red) */}
        <div className="grid grid-cols-7 text-xs font-semibold text-center mb-2.5">
          {DAYS.map((d, idx) => (
            <div key={d} className={idx === 6 ? 'text-red-500 font-bold' : 'text-gray-500'}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {cells.map((cell, idx) => {
            const isSunday = idx % 7 === 6;
            const cellIso = formatIso(cell.year, cell.month, cell.day);
            const isPast = minDate ? cellIso < minDate : false;

            // Outside month days: rendered in light gray
            if (!cell.inMonth) {
              return (
                <div
                  key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                  className="h-8 flex items-center justify-center"
                >
                  <span className="w-8 h-8 flex items-center justify-center text-xs text-gray-300 font-normal">
                    {cell.day}
                  </span>
                </div>
              );
            }

            const isDepart = cellIso === departDate;
            const isReturn = roundTrip && cellIso === returnDate;
            const isInRange =
              roundTrip && departDate && returnDate && cellIso > departDate && cellIso < returnDate;
            const isHoverRange =
              roundTrip &&
              activeStep === 'return' &&
              hoverDate &&
              cellIso > departDate &&
              cellIso <= hoverDate;

            return (
              <div
                key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                className="h-8 flex items-center justify-center relative"
              >
                {/* Range background tint */}
                {(isInRange || isHoverRange) && (
                  <div className="absolute inset-y-1 inset-x-0 bg-red-50/70" />
                )}

                {/* Date button */}
                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => !isPast && handleCellClick(cellIso)}
                  onMouseEnter={() => activeStep === 'return' && setHoverDate(cellIso)}
                  onMouseLeave={() => setHoverDate(null)}
                  className={`w-8 h-8 rounded-full text-xs flex items-center justify-center relative z-10 transition-all ${
                    isDepart || isReturn
                      ? 'border border-red-500 text-gray-900 font-bold bg-white shadow-xs'
                      : isPast
                        ? 'text-gray-300 cursor-not-allowed'
                        : isSunday
                          ? 'text-red-500 font-semibold hover:border hover:border-red-400 hover:bg-red-50 cursor-pointer'
                          : 'text-gray-800 font-medium hover:border hover:border-gray-300 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {cell.day}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={popoverRef}
      className={`absolute right-0 top-[112px] z-50 w-[630px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-gray-100 p-4 sm:p-5 select-none text-gray-800 animate-fadeIn ${className}`}
    >
      {/* Top Header: Radio Buttons Khứ hồi / Một chiều */}
      <div className="flex items-center justify-end gap-6 mb-4 px-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-gray-800 hover:text-black transition-colors">
          <span
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center p-[2px] transition-colors ${
              roundTrip ? 'border-red-600' : 'border-gray-800'
            }`}
          >
            {roundTrip && <span className="w-2 h-2 rounded-full bg-red-600" />}
          </span>
          <input
            type="radio"
            name="flight-cal-trip-type"
            checked={roundTrip}
            onChange={() => onTripTypeChange(true)}
            className="sr-only"
          />
          <span>Khứ hồi</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-gray-800 hover:text-black transition-colors">
          <span
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center p-[2px] transition-colors ${
              !roundTrip ? 'border-red-600' : 'border-gray-800'
            }`}
          >
            {!roundTrip && <span className="w-2 h-2 rounded-full bg-red-600" />}
          </span>
          <input
            type="radio"
            name="flight-cal-trip-type"
            checked={!roundTrip}
            onChange={() => onTripTypeChange(false)}
            className="sr-only"
          />
          <span>Một chiều</span>
        </label>
      </div>

      {/* Two months side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>{renderMonth(viewYear, viewMonth, true)}</div>
        <div className="hidden md:block">{renderMonth(month2Year, month2, false)}</div>
      </div>
    </div>
  );
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  label?: string;
  variant?: 'flush' | 'card';
  className?: string;
  roundTrip?: boolean;
  onTripTypeChange?: (roundTrip: boolean) => void;
}

/**
 * Standard DatePicker export for single field use
 */
export default function DatePicker({
  value,
  onChange,
  min,
  label = 'Ngày đi',
  variant = 'card',
  className,
  roundTrip = true,
  onTripTypeChange,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const displayValue = useMemo(() => {
    return formatDisplayDate(value) || label;
  }, [value, label]);

  return (
    <div className={`relative ${className ?? ''}`}>
      {variant === 'flush' ? (
        <button
          type="button"
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
        </button>
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

      {open && (
        <FlightDatePickerPopover
          departDate={value}
          returnDate=""
          roundTrip={roundTrip}
          activeStep="depart"
          onSelectDepart={(d) => {
            onChange(d);
            setOpen(false);
          }}
          onSelectReturn={(d) => {
            onChange(d);
            setOpen(false);
          }}
          onTripTypeChange={(r) => onTripTypeChange?.(r)}
          onClose={() => setOpen(false)}
          minDate={min}
        />
      )}
    </div>
  );
}
