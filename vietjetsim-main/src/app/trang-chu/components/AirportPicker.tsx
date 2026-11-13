'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdFlightTakeoff, MdFlightLand, MdSearch, MdCheck } from 'react-icons/md';

export interface Airport {
  code: string;
  city: string;
  airport: string;
  country?: string;
  isDomestic?: boolean;
}

export const DOMESTIC_AIRPORT_CODES = new Set([
  'SGN',
  'HAN',
  'DAD',
  'PQC',
  'CXR',
  'HPH',
  'HUI',
  'DLI',
  'VII',
  'VDO',
  'VCA',
  'UIH',
  'BMV',
  'PXU',
  'TBB',
  'VCL',
  'THD',
  'VDH',
  'DIN',
  'VCS',
  'VKG',
]);

export const TOP_DOMESTIC_HUBS = ['SGN', 'HAN', 'DAD', 'PQC', 'CXR'];

export function isDomesticAirport(airport: Airport): boolean {
  if (typeof airport.isDomestic === 'boolean') return airport.isDomestic;
  if (airport.country && (airport.country === 'Việt Nam' || airport.country === 'Vietnam'))
    return true;
  return DOMESTIC_AIRPORT_CODES.has(airport.code.toUpperCase());
}

// 16px below `sm` so iOS Safari does not zoom the page when the field is tapped.
// Từ `sm` trở lên dùng 17px — đúng số đo "Input sân bay" của site thật.
const labelClass =
  'block text-2xs font-bold uppercase leading-none tracking-[0.06em] text-vj-text-soft';
const iconClass = 'shrink-0 text-lg text-vj-text-strong';

/**
 * Biến thể "field" — ô nhập trong dải đặt vé của trang chủ.
 * Site thật (đo 13/11/2026): nhãn 12px màu #6B7580, giá trị 16px/500 #333,
 * ô cao 56px, bo góc 10px, viền #ECECEC.
 */
const fieldLabelClass = 'vj-field-label';
const fieldValueClass = 'vj-field-value truncate';
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
  /**
   * Tên truy cập của nút. Mặc định bằng `label`; ở dải đặt vé nhãn nhìn thấy là
   * "Từ"/"Đến" nhưng tên truy cập phải nói rõ đầu ra và đầu vào.
   */
  ariaLabel?: string;
  icon: 'takeoff' | 'land';
  value: string;
  airports: readonly Airport[];
  onChange: (code: string) => void;
  /**
   * `flush` drops the field's own border and padding so the control can sit
   * inside a grouped box that already draws the outline and its dividers.
   * `field` is the standalone single-line field of the homepage booking bar:
   * 56px tall, 10px radius, 12px label + 16px value.
   */
  variant?: 'bordered' | 'flush' | 'field';
  /** Extra classes on the outer wrapper, e.g. to span a grid track. */
  className?: string;
  /**
   * Class cho nhãn hiển thị. Panel đặt vé của trang chủ dùng nhãn 18px/600
   * (đo được trên site thật) thay vì nhãn 12px/600 mặc định.
   */
  headingClass?: string;
  /** Class cho giá trị sân bay. Mặc định 16px/500. */
  valueClass?: string;
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
  ariaLabel,
  icon,
  value,
  airports,
  onChange,
  variant = 'bordered',
  className = '',
  headingClass = '',
  valueClass = '',
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
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
      const panelWidth = Math.min(viewportWidth - 16, Math.max(rect.width || 0, 260));
      const panelLeft = Math.max(8, Math.min(rect.left || 0, viewportWidth - panelWidth - 8));
      setAnchor({
        left: panelLeft,
        top: (rect.bottom || 0) + 4,
        width: panelWidth,
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
  const { domesticResults, internationalResults, totalCount } = useMemo(() => {
    const q = fold(query.trim());
    const filtered = !q
      ? airports
      : airports.filter(
          (a) => fold(a.city).includes(q) || fold(a.code).includes(q) || fold(a.airport).includes(q)
        );

    const domestic: Airport[] = [];
    const international: Airport[] = [];

    for (const item of filtered) {
      if (isDomesticAirport(item)) {
        domestic.push(item);
      } else {
        international.push(item);
      }
    }

    domestic.sort((a, b) => {
      const rankA = TOP_DOMESTIC_HUBS.indexOf(a.code);
      const rankB = TOP_DOMESTIC_HUBS.indexOf(b.code);
      if (rankA !== -1 && rankB !== -1) return rankA - rankB;
      if (rankA !== -1) return -1;
      if (rankB !== -1) return 1;
      return a.city.localeCompare(b.city, 'vi');
    });

    return {
      domesticResults: domestic,
      internationalResults: international,
      totalCount: domestic.length + international.length,
    };
  }, [airports, query]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 h-full ${className}`}>
      {variant === 'flush' ? (
        // Biến thể "flush" — nằm trong hộp trắng đã có sẵn viền/bo góc.
        // Số đo site thật (13/11/2026):
        //   - Icon sân bay 20×19px nằm ở x = mép hộp + 14px, canh giữa dọc.
        //   - Nhãn 18px/600 nằm ở x = mép hộp + 48px (dòng trên).
        //   - Giá trị sân bay 17px/600 nằm dưới nhãn, cùng cột trái.
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          className="relative flex h-full w-full min-w-0 cursor-pointer flex-col items-start justify-center gap-0.5 bg-transparent pl-[48px] text-left"
        >
          <Icon
            aria-hidden="true"
            className="absolute left-[14px] top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--foreground)]"
          />
          <span className={`block truncate ${headingClass || labelClass}`}>{label}</span>
          <span className="flex w-full min-w-0 items-center justify-between gap-1">
            <span className={`truncate ${valueClass || 'text-base font-medium'}`}>
              {selected.city} ( {selected.code} )
            </span>
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              className="shrink-0 text-lg text-[var(--foreground)]"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
            </svg>
          </span>
        </button>
      ) : (
        <label
          className={
            variant === 'field'
              ? 'flex h-[56px] w-full min-w-0 items-center gap-2 rounded-vj border border-[var(--border)] bg-white px-3 transition-colors hover:border-[var(--accent)] focus-within:border-[var(--accent)]'
              : 'flex min-h-[48px] items-center gap-2 rounded-vj border border-vj-border bg-white px-3 py-1.5 focus-within:border-[var(--accent)]'
          }
        >
          <Icon className={iconClass} />
          <span className="min-w-0 flex-1">
            <span className={variant === 'field' ? fieldLabelClass : labelClass}>{label}</span>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-label={ariaLabel ?? label}
              className={`w-full min-w-0 border-0 bg-transparent px-0 text-base font-medium text-[var(--foreground)] outline-none ${
                variant === 'field' ? '' : 'sm:text-lg2'
              } flex cursor-pointer items-center justify-between gap-1 text-left`}
            >
              <span className={variant === 'field' ? fieldValueClass : 'truncate'}>
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
      )}

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={ariaLabel ?? label}
            // `z-50` clears the sticky header (z-40); a fixed panel portalled to
            // the body is a sibling of the whole page, not of the hero.
            className="fixed z-50 overflow-hidden rounded-vj border border-vj-border bg-white shadow-lg"
            style={{
              left: anchor?.left ?? 0,
              top: anchor?.top ?? 0,
              width: anchor?.width,
              // Hidden until measured, so the panel is never painted at the
              // wrong spot for a frame on the way to its anchored position.
              visibility: anchor ? 'visible' : 'hidden',
            }}
          >
            <div className="flex items-center gap-2 border-b border-vj-border-light px-3 py-2">
              <MdSearch className="shrink-0 text-vj-text-soft" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm sân bay..."
                aria-label={`Tìm ${(ariaLabel ?? label).toLowerCase()}`}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-vj-placeholder"
              />
              {/* How many are left, so the list does not have to be scrolled to the
                end to find out it is not the whole list. Sits in the search row
                rather than in a footer of its own: on a short screen every row
                the panel gives back is another airport the customer can see. */}
              <span className="shrink-0 text-xs2 tabular-nums text-vj-text-soft">
                {query.trim() ? `${totalCount} / ${airports.length}` : `${airports.length} sân bay`}
              </span>
            </div>
            <ul
              ref={listRef}
              className="overflow-y-auto py-1"
              style={{ maxHeight: listMaxHeight ?? LIST_CAP }}
            >
              {totalCount === 0 && (
                <li className="px-3 py-3 text-sm text-vj-text-soft">Không tìm thấy sân bay</li>
              )}

              {/* Nhóm sân bay nội địa (ưu tiên phía trên) */}
              {domesticResults.length > 0 && (
                <>
                  <li
                    role="presentation"
                    className="sticky top-0 z-10 flex items-center justify-between bg-red-50/95 px-3 py-1.5 text-xs font-semibold text-red-800 border-b border-red-100/80 backdrop-blur-sm"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <span aria-hidden="true">🇻🇳</span> Chặng bay nội địa
                    </span>
                    <span className="text-xs2 font-semibold text-red-600 bg-white/90 px-2 py-0.5 rounded-full border border-red-100">
                      {domesticResults.length}
                    </span>
                  </li>
                  {domesticResults.map((airport) => (
                    <li key={airport.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={airport.code === value}
                        onClick={() => choose(airport.code)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--vj-sky)] transition-colors ${
                          airport.code === value ? 'bg-vj-surface-rose' : ''
                        }`}
                      >
                        <span className="w-4 shrink-0 text-[var(--accent)]">
                          {airport.code === value && <MdCheck className="text-sm" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1">
                            <span className="truncate text-sm font-bold text-[var(--foreground)]">
                              {airport.city} ( {airport.code} )
                            </span>
                            <span className="shrink-0 rounded bg-red-100/70 px-1.5 py-0.5 text-2xs font-semibold text-red-700">
                              Nội địa
                            </span>
                          </span>
                          <span className="block truncate text-xs2 leading-tight text-vj-text-soft">
                            {airport.airport}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </>
              )}

              {/* Nhóm sân bay quốc tế (phía dưới) */}
              {internationalResults.length > 0 && (
                <>
                  <li
                    role="presentation"
                    className="sticky top-0 z-10 flex items-center justify-between bg-sky-50/95 px-3 py-1.5 text-xs font-semibold text-sky-800 border-t border-b border-sky-100/80 backdrop-blur-sm"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <span aria-hidden="true">🌏</span> Chặng bay quốc tế
                    </span>
                    <span className="text-xs2 font-semibold text-sky-700 bg-white/90 px-2 py-0.5 rounded-full border border-sky-100">
                      {internationalResults.length}
                    </span>
                  </li>
                  {internationalResults.map((airport) => (
                    <li key={airport.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={airport.code === value}
                        onClick={() => choose(airport.code)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--vj-sky)] transition-colors ${
                          airport.code === value ? 'bg-vj-surface-rose' : ''
                        }`}
                      >
                        <span className="w-4 shrink-0 text-[var(--accent)]">
                          {airport.code === value && <MdCheck className="text-sm" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1">
                            <span className="truncate text-sm font-bold text-[var(--foreground)]">
                              {airport.city} ( {airport.code} )
                            </span>
                            <span className="shrink-0 rounded bg-blue-100/70 px-1.5 py-0.5 text-2xs font-semibold text-blue-700">
                              Quốc tế
                            </span>
                          </span>
                          <span className="block truncate text-xs2 leading-tight text-vj-text-soft">
                            {airport.airport}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
