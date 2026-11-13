'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MdOutlinePerson,
  MdChildCare,
  MdChildFriendly,
  MdExpandMore,
  MdAdd,
  MdRemove,
  MdInfoOutline,
  MdConfirmationNumber,
} from 'react-icons/md';
import { PASSENGER_TYPE_LABELS, type PassengerType } from '@/features/bookings/types/booking-flow';

export interface PaxCounts {
  adult: number;
  child: number;
  infant: number;
}

/** One booking carries at most 9 people, matching the carrier's own limit. */
export const MAX_PASSENGERS = 9;

interface RowDef {
  type: PassengerType;
  title: string;
  ageDisplay: string;
  testHint: string;
  min: number;
  icon: typeof MdOutlinePerson;
}

const ROWS: ReadonlyArray<RowDef> = [
  {
    type: 'adult',
    title: 'Người lớn',
    ageDisplay: '12 tuổi trở lên',
    testHint: 'Từ 12 tuổi trở lên',
    min: 1,
    icon: MdOutlinePerson,
  },
  {
    type: 'child',
    title: 'Trẻ em',
    ageDisplay: '2-11 tuổi',
    testHint: 'Từ 2 đến dưới 12 tuổi',
    min: 0,
    icon: MdChildCare,
  },
  {
    type: 'infant',
    title: 'Em bé',
    ageDisplay: 'Dưới 2 tuổi',
    testHint: 'Dưới 2 tuổi, đi kèm người lớn',
    min: 0,
    icon: MdChildFriendly,
  },
];

/**
 * How many of a category may be added.
 *
 * Children and infants travel in the care of an adult, so neither may outnumber
 * the adults; the whole party is also capped at 9. A stepper that refused an
 * impossible selection is friendlier than one that silently reshuffles counts.
 */
export function maxFor(counts: PaxCounts, type: PassengerType): number {
  if (type === 'adult') return MAX_PASSENGERS;
  const total = counts.adult + counts.child + counts.infant;
  return Math.min(MAX_PASSENGERS - total + counts[type], counts.adult);
}

export function describePax(counts: PaxCounts): string {
  return ROWS.filter((row) => counts[row.type] > 0)
    .map((row) => `${counts[row.type]} ${PASSENGER_TYPE_LABELS[row.type]}`)
    .join(', ');
}

interface Props {
  value: PaxCounts;
  onChange: (next: PaxCounts) => void;
  className?: string;
  promoCode?: string;
  onPromoCodeChange?: (val: string) => void;
  cheapestOnly?: boolean;
  onCheapestChange?: (val: boolean) => void;
  onSubmit?: () => void;
}

export default function PassengerPicker({
  value,
  onChange,
  className,
  promoCode = '',
  onPromoCodeChange,
  cheapestOnly = false,
  onCheapestChange,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const step = (type: PassengerType, delta: number) => {
    const row = ROWS.find((r) => r.type === type)!;
    const next = value[type] + delta;
    if (next < row.min || next > maxFor(value, type)) return;
    onChange({ ...value, [type]: next });
  };

  const handleSearchSubmit = () => {
    setOpen(false);
    onSubmit?.();
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? 'mt-2.5'}`}>
      {/* Trigger Button inside Hero Widget */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Số hành khách"
        className="flex h-[56px] w-full min-w-0 items-center gap-2 rounded-vj border border-[var(--border)] bg-white px-3 text-left transition-colors cursor-pointer hover:border-[var(--accent)]"
      >
        <MdOutlinePerson className="shrink-0 text-xl text-[var(--vj-muted)]" />
        <span className="min-w-0 flex-1">
          <span className="vj-field-label">Hành khách</span>
          <span className="vj-field-value truncate">{describePax(value)}</span>
        </span>
        <MdExpandMore
          className={`shrink-0 text-xl text-[var(--vj-muted)] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Popup matching Vietjet Live Screenshot 2 */}
      {open && (
        <div
          role="dialog"
          aria-label="Chọn số hành khách"
          className="absolute left-0 top-full z-50 mt-1 w-full max-w-[calc(100vw-28px)] min-w-[280px] sm:min-w-[340px] rounded-vj border border-vj-border bg-white p-3.5 sm:p-4 shadow-[0_16px_50px_rgba(0,0,0,0.22)] animate-fadeIn text-[var(--foreground)]"
        >
          {/* Top Row: Yêu cầu trợ giúp đặc biệt */}
          <div className="flex justify-end mb-3">
            <a
              href="/ho-tro/tro-giup-dac-biet"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
            >
              <span>Yêu cầu trợ giúp đặc biệt</span>
              <MdInfoOutline className="text-sm shrink-0" />
            </a>
          </div>

          {/* Steppers: Người lớn, Trẻ em, Em bé */}
          <div className="space-y-3">
            {ROWS.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.type}
                  className="flex items-center justify-between gap-3 py-1 border-b border-vj-border-light last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="text-2xl text-vj-text-soft shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-[var(--foreground)]">
                        {row.title}
                      </span>
                      <span className="block text-xs text-vj-text-soft leading-tight">
                        {row.ageDisplay}
                        <span className="sr-only">{row.testHint}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => step(row.type, -1)}
                      disabled={value[row.type] <= row.min}
                      aria-label={`Giảm số ${row.title}`}
                      className="grid h-8 w-8 place-items-center rounded-full border border-vj-border text-vj-text-soft hover:bg-vj-surface-cool disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <MdRemove className="text-sm" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-[var(--foreground)]">
                      {value[row.type]}
                    </span>
                    <button
                      type="button"
                      onClick={() => step(row.type, 1)}
                      disabled={value[row.type] >= maxFor(value, row.type)}
                      aria-label={`Tăng số ${row.title}`}
                      className="grid h-8 w-8 place-items-center rounded-full border border-vj-border text-vj-text-strong hover:bg-vj-surface-cool disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <MdAdd className="text-sm" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coupon / Mã khuyến mại input */}
          <div className="mt-4 flex items-center gap-2.5 rounded-vj bg-vj-surface-cool px-3 py-2 border border-transparent focus-within:border-vj-border transition-colors">
            <MdConfirmationNumber className="text-vj-text-soft text-lg shrink-0" />
            <input
              type="text"
              value={promoCode}
              onChange={(e) => onPromoCodeChange?.(e.target.value)}
              placeholder="Mã khuyến mại"
              className="w-full bg-transparent text-sm font-medium text-[var(--foreground)] placeholder:text-vj-placeholder outline-none"
            />
          </div>

          {/* Checkbox: Tìm vé rẻ nhất */}
          <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cheapestOnly}
              onChange={(e) => onCheapestChange?.(e.target.checked)}
              className="h-4 w-4 rounded border-vj-border text-vjred accent-vjred focus:ring-0 cursor-pointer"
            />
            <span className="text-sm font-bold text-[var(--foreground)]">Tìm vé rẻ nhất</span>
          </label>

          {/* CTA: Tìm chuyến bay button */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="vj-cta vj-cta--search hover:brightness-105 active:translate-y-[1px] transition-all duration-150 cursor-pointer"
            >
              Tìm chuyến bay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
