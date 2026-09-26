'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MdFlightTakeoff, MdFlightLand, MdSearch, MdCheck } from 'react-icons/md';

export interface Airport {
  code: string;
  city: string;
  airport: string;
}

const inputClass =
  'w-full min-w-0 border-0 bg-transparent px-0 text-sm font-extrabold text-[#333333] outline-none';
const labelClass =
  'block text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-[#8c8c8c]';
const iconClass = 'shrink-0 text-lg text-[#4a4a4a]';

/**
 * Strip diacritics so "tan son" finds "Tân Sơn Nhất". Vietnamese users type
 * without marks constantly, and a search box that silently returns nothing is
 * worse than no search box at all.
 */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

interface Props {
  label: string;
  icon: 'takeoff' | 'land';
  value: string;
  airports: readonly Airport[];
  onChange: (code: string) => void;
  /**
   * `flush` drops the field's own border and padding so the control can sit
   * inside a grouped box that already draws the outline and its dividers.
   */
  variant?: 'bordered' | 'flush';
  /** Extra classes on the outer wrapper, e.g. to span a grid track. */
  className?: string;
}

/**
 * Airport dropdown.
 *
 * This used to be a native `<select>`. The open list is painted by the OS, so
 * no stylesheet can turn it white — in dark mode it came up dark while the rest
 * of the form was white. A custom list keeps the panel on the page's own white
 * surface, and with a longer airport list a search box pays for itself.
 */
export default function AirportPicker({
  label,
  icon,
  value,
  airports,
  onChange,
  variant = 'bordered',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const Icon = icon === 'takeoff' ? MdFlightTakeoff : MdFlightLand;

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

  // Drop the query when the panel closes so reopening never shows a stale filter.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const selected = airports.find((a) => a.code === value) ?? airports[0];
  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return airports;
    return airports.filter(
      (a) => fold(a.city).includes(q) || fold(a.code).includes(q) || fold(a.airport).includes(q)
    );
  }, [airports, query]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <label
        className={
          variant === 'flush'
            ? 'flex items-center gap-2 bg-white px-3 py-1.5 focus-within:bg-[#fffdf3]'
            : 'flex items-center gap-2 rounded border border-[#e4e4e4] bg-white px-3 py-1.5 focus-within:border-[var(--accent)]'
        }
      >
        <Icon className={iconClass} />
        <span className="min-w-0 flex-1">
          <span className={labelClass}>{label}</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={label}
            className={`${inputClass} flex cursor-pointer items-center justify-between gap-1 text-left`}
          >
            <span className="truncate">
              {selected.city} ( {selected.code} )
            </span>
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              className={iconClass}
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
            </svg>
          </button>
        </span>
      </label>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-1 w-full min-w-[260px] overflow-hidden rounded-lg border border-[#e4e4e4] bg-white shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-[#eee] px-3 py-2">
            <MdSearch className="shrink-0 text-[#8c8c8c]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm sân bay..."
              aria-label={`Tìm ${label.toLowerCase()}`}
              className="w-full bg-transparent text-sm text-[#333333] outline-none placeholder:text-[#b0b0b0]"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-3 text-sm text-[#8c8c8c]">Không tìm thấy sân bay</li>
            )}
            {results.map((airport) => (
              <li key={airport.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={airport.code === value}
                  onClick={() => choose(airport.code)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#f5f5f5] ${
                    airport.code === value ? 'bg-[#fff3f3]' : ''
                  }`}
                >
                  <span className="w-4 shrink-0 text-[var(--accent)]">
                    {airport.code === value && <MdCheck className="text-sm" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#333333]">
                      {airport.city} ( {airport.code} )
                    </span>
                    <span className="block truncate text-[11px] leading-tight text-[#8c8c8c]">
                      {airport.airport}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
