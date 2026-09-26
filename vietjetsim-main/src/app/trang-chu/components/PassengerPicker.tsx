'use client';
import { useEffect, useRef, useState } from 'react';
import { MdPeople, MdExpandMore, MdAdd, MdRemove } from 'react-icons/md';
import { PASSENGER_TYPE_LABELS, type PassengerType } from '@/features/bookings/types/booking-flow';

export interface PaxCounts {
  adult: number;
  child: number;
  infant: number;
}

/** One booking carries at most 9 people, matching the carrier's own limit. */
export const MAX_PASSENGERS = 9;

const ROWS: ReadonlyArray<{
  type: PassengerType;
  hint: string;
  min: number;
}> = [
  { type: 'adult', hint: 'Từ 12 tuổi trở lên', min: 1 },
  { type: 'child', hint: 'Từ 2 đến dưới 12 tuổi', min: 0 },
  { type: 'infant', hint: 'Dưới 2 tuổi, đi kèm người lớn', min: 0 },
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

const inputClass =
  'w-full min-w-0 border-0 bg-transparent px-0 text-sm font-extrabold text-[#333333] outline-none';
const labelClass =
  'block text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-[#8c8c8c]';
const fieldClass =
  'flex items-center gap-2 rounded border border-[#e4e4e4] bg-white px-3 py-1.5 focus-within:border-[var(--accent)]';
const iconClass = 'shrink-0 text-lg text-[#4a4a4a]';

interface Props {
  value: PaxCounts;
  onChange: (next: PaxCounts) => void;
}

export default function PassengerPicker({ value, onChange }: Props) {
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

  return (
    <div ref={containerRef} className="mt-2 relative">
      <label className={fieldClass}>
        <MdPeople className={iconClass} />
        <span className="min-w-0 flex-1">
          <span className={labelClass}>Hành khách</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label="Số hành khách"
            className={`${inputClass} flex cursor-pointer items-center justify-between gap-1 text-left`}
          >
            <span className="truncate">{describePax(value)}</span>
            <MdExpandMore className={iconClass} />
          </button>
        </span>
      </label>

      {open && (
        <div
          role="dialog"
          aria-label="Chọn số hành khách"
          className="absolute left-0 top-full z-30 mt-1 w-full min-w-[280px] rounded-lg border border-[#e4e4e4] bg-white p-3 shadow-lg"
        >
          {ROWS.map((row) => (
            <div
              key={row.type}
              className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] py-2 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#333333]">
                  {PASSENGER_TYPE_LABELS[row.type]}
                </span>
                <span className="block text-[11px] leading-tight text-[#8c8c8c]">{row.hint}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => step(row.type, -1)}
                  disabled={value[row.type] <= row.min}
                  aria-label={`Giảm số ${PASSENGER_TYPE_LABELS[row.type]}`}
                  className="grid h-7 w-7 place-items-center rounded-full border border-[#dcdcdc] text-[#333333] disabled:opacity-35"
                >
                  <MdRemove className="text-sm" />
                </button>
                <span className="w-5 text-center text-sm font-extrabold text-[#333333]">
                  {value[row.type]}
                </span>
                <button
                  type="button"
                  onClick={() => step(row.type, 1)}
                  disabled={value[row.type] >= maxFor(value, row.type)}
                  aria-label={`Tăng số ${PASSENGER_TYPE_LABELS[row.type]}`}
                  className="grid h-7 w-7 place-items-center rounded-full border border-[var(--accent)] text-[var(--accent)] disabled:opacity-35"
                >
                  <MdAdd className="text-sm" />
                </button>
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full rounded bg-[var(--accent)] py-1.5 text-xs font-bold text-white"
          >
            Xong
          </button>
        </div>
      )}
    </div>
  );
}
