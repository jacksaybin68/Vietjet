'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdFlightTakeoff, MdFlightLand, MdSearch, MdCheck } from 'react-icons/md';

export interface Airport {
  code: string;
  city: string;
  airport: string;
}

// 16px below `sm` so iOS Safari does not zoom the page when the field is tapped.
const inputClass =
  'w-full min-w-0 border-0 bg-transparent px-0 text-base font-extrabold text-[#333333] outline-none sm:text-sm';
const labelClass =
  'block text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-[#8c8c8c]';
const iconClass = 'shrink-0 text-lg text-[#4a4a4a]';
/** Airports visible at once when the screen is tall enough to show them all. */
const LIST_CAP = 448;
/** Gap left under the panel so it never sits flush against the bottom edge. */
const GAP = 16;
/**
 * Height of the search row plus the count footer, used only until the panel has
 * been laid out and can be measured. Kept close to the real value so the first
 * paint is not visibly wrong.
 */
const CHROME_FALLBACK = 70;

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
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number>();
  /**
   * Fixed-position anchor for the portalled panel, measured from the field.
   *
   * The panel is portalled to `document.body` because the hero puts this picker
   * inside a group box with `overflow-hidden` (it has to clip the segments to
   * the rounded corners). An absolutely-positioned panel inside that box was
   * clipped away entirely, so the list never appeared at all.
   */
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number }>();
  const Icon = icon === 'takeoff' ? MdFlightTakeoff : MdFlightLand;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      // The panel is portalled, so it is no longer inside `containerRef` and has
      // to be checked separately or every click inside it would close the list.
      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
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

  /**
   * Cap the list to the room actually left below the field.
   *
   * A `rem` constant cannot do this. The hero sizes itself with a fixed top
   * padding plus a `min-h` that changes at several breakpoints, so the space
   * under the form measured 334px on a 1201x768 screen and 434px on a 375x667
   * one — neither a fixed fraction of the viewport nor a fixed distance from
   * the top. A constant that fit one screen clipped the last airports on
   * another, and a constant loose enough for the smallest pushed the panel
   * off-screen on a short one.
   *
   * So the list height is measured once the panel has been laid out, and the
   * `LIST_CAP` is only the ceiling for screens tall enough to show the list in
   * full. Both numbers in the arithmetic are measured rather than assumed: the
   * viewport and the field position come from the layout, and the search row
   * and count footer come from the panel's own height minus the list's. The
   * footer wrapping to two lines then costs the list its own height instead of
   * silently pushing rows under the fold.
   */
  useLayoutEffect(() => {
    if (!open) {
      setListMaxHeight(undefined);
      setAnchor(undefined);
      return;
    }
    const list = listRef.current;
    if (!list) return;

    const fit = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const room = window.innerHeight - rect.bottom;
      const panel = panelRef.current;
      const chrome =
        panel && list.offsetHeight > 0 ? panel.offsetHeight - list.offsetHeight : CHROME_FALLBACK;
      // A fixed panel has to be placed from the field's own viewport rect, and
      // re-placed on scroll as well as resize — otherwise it detaches from the
      // field the moment the page moves. `width` is floored at the same 260px
      // the panel used to get from `min-w-[260px]`, so the list does not become
      // unreadably narrow in a wide-but-short hero column.
      setAnchor({
        left: rect.left || 0,
        top: (rect.bottom || 0) + 4,
        // `rect.width` is guarded because a partial rect (a test double, or a
        // detached node) would otherwise put `NaN` in the style and silently
        // collapse the panel's width.
        width: Math.max(rect.width || 0, 260),
      });
      // The 96px floor is two airports, and it is deliberately low. A higher
      // floor reads better until the screen is short enough for it to win over
      // the available room, at which point the panel hangs off the bottom with
      // airports that cannot be scrolled to — 200px overflowed by 41px on a
      // 375x667 screen. Two rows plus the search box is the least that works.
      setListMaxHeight(Math.max(96, Math.min(LIST_CAP, room - chrome - GAP)));
    };

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, true);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('scroll', fit, true);
    };
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
            ? 'flex items-center gap-2 bg-white px-3 py-2.5 focus-within:bg-[#fffdf3] sm:py-1.5'
            : 'flex items-center gap-2 rounded border border-[#e4e4e4] bg-white px-3 py-2.5 focus-within:border-[var(--accent)] sm:py-1.5'
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

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={label}
            // `z-50` clears the sticky header (z-40); a fixed panel portalled to
            // the body is a sibling of the whole page, not of the hero.
            className="fixed z-50 overflow-hidden rounded-lg border border-[#e4e4e4] bg-white shadow-lg"
            style={{
              left: anchor?.left ?? 0,
              top: anchor?.top ?? 0,
              width: anchor?.width,
              // Hidden until measured, so the panel is never painted at the
              // wrong spot for a frame on the way to its anchored position.
              visibility: anchor ? 'visible' : 'hidden',
            }}
          >
            <div className="flex items-center gap-2 border-b border-[#eee] px-3 py-2">
              <MdSearch className="shrink-0 text-[#8c8c8c]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm sân bay..."
                aria-label={`Tìm ${label.toLowerCase()}`}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#333333] outline-none placeholder:text-[#b0b0b0]"
              />
              {/* How many are left, so the list does not have to be scrolled to the
                end to find out it is not the whole list. Sits in the search row
                rather than in a footer of its own: on a short screen every row
                the panel gives back is another airport the customer can see. */}
              <span className="shrink-0 text-[11px] tabular-nums text-[#8c8c8c]">
                {query.trim()
                  ? `${results.length} / ${airports.length}`
                  : `${airports.length} sân bay`}
              </span>
            </div>
            <ul
              ref={listRef}
              className="overflow-y-auto py-1"
              style={{ maxHeight: listMaxHeight ?? LIST_CAP }}
            >
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
          </div>,
          document.body
        )}
    </div>
  );
}
