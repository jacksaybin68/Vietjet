'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MdArrowOutward,
  MdConfirmationNumber,
  MdExpandMore,
  MdSwapHoriz,
  MdOutlinePerson,
} from 'react-icons/md';
import AirportPicker, { type Airport } from './AirportPicker';
import { ALL_AIRPORTS } from './airports';
import { FlightDatePickerPopover, formatDisplayDate, toInputDate } from './DatePicker';

/**
 * Ba tab dịch vụ trên đỉnh panel đặt vé.
 *
 * Số đo thật trên vietjetair.com (13/11/2026, viewport 1440×900):
 *   - Hàng tab cao 52px, bo góc 5px 5px 0 0, tổng rộng 380px.
 *   - Tab 1 "Mua hành lý, suất ăn chọn chỗ ngồi và hơn thế nữa..." — 201px,
 *     gradient đỏ 20.12deg, chữ trắng.
 *   - Tab 2 "Đổi thưởng & Mua Skypoint" — 103px, gradient vàng 135deg, chữ đen.
 *   - Tab 3 "Gửi hàng nhanh" — 76px, gradient đỏ 20.12deg, chữ trắng.
 *   - MOBILE (390×844): hàng tab trải hết bề ngang 390px — 207px / 105px /
 *     78px, bo góc 10px 10px 0 0, gradient đỏ 11.3deg (màu đục), tab vàng
 *     135deg.
 *   - Chữ tab: JambonoMedium 14px/500, KHÔNG uppercase, canh giữa.
 */
const TABS = [
  {
    id: 'flight',
    label: 'Mua hành lý, suất ăn chọn chỗ ngồi và hơn thế nữa...',
    href: '/dich-vu#hanh-ly',
    width: 'w-[207px] lg:w-[201px]',
    variant: 'red',
  },
  {
    id: 'rewards',
    label: 'Đổi thưởng & Mua Skypoint',
    href: '/dich-vu#skypoint',
    width: 'w-[105px] lg:w-[103px]',
    variant: 'gold',
  },
  {
    id: 'cargo',
    label: 'Gửi hàng nhanh',
    href: '/dich-vu#hang-hoa',
    width: 'w-[78px] lg:w-[76px]',
    variant: 'red',
  },
] as const;

const CURRENCIES = ['VND', 'USD'] as const;

type TripType = 'one' | 'round';

const TRIP_TYPES: ReadonlyArray<{ value: TripType; label: string }> = [
  { value: 'round', label: 'Khứ hồi' },
  { value: 'one', label: 'Một chiều' },
];

/**
 * Khung ô nhập trong panel đặt vé.
 *
 * Số đo thật:
 *   - Hộp trắng cao 48px, bo góc 10px, rộng 342px (380 − 2×19px padding).
 *   - Nhãn "Điểm khởi hành" / "Điểm đến": 18px/600.
 *   - Giá trị sân bay: 17px/600, nằm trong input rộng 170px, lệch 48px từ mép.
 *   - Cột ngày: nhãn 18px/500, chiếm 121px bên phải.
 */
const fieldBoxClass =
  'relative flex h-[48px] w-full items-stretch overflow-hidden rounded-vj bg-white';

/** Nhãn nhóm 18px/600 (khác `vj-field-label` 12px/600 dùng cho "Hành khách").
 *  Số đo site thật: nhãn sân bay 18px/600, line-height 18.9px. */
const fieldHeadingClass = 'block text-lg font-semibold leading-[18.9px] text-[var(--foreground)]';

/** Giá trị sân bay 17px/600, line-height 17.9px (đo được trên site thật). */
const fieldAirportValueClass =
  'block w-full min-w-0 border-0 bg-transparent p-0 text-lg2 font-semibold leading-[17.9px] text-[var(--foreground)] outline-none';

export default function HeroBookingWidget() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('flight');
  const [tripType, setTripType] = useState<TripType>('round');
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND');
  const [from, setFrom] = useState('HAN');
  const [to, setTo] = useState('SGN');
  const [departDate, setDepartDate] = useState(() => toInputDate(new Date(Date.now() + 86400000)));
  const [returnDate, setReturnDate] = useState(() =>
    toInputDate(new Date(Date.now() + 7 * 86400000))
  );
  const [airports, setAirports] = useState<Airport[]>(ALL_AIRPORTS);
  const [promoCode, setPromoCode] = useState('');
  const [cheapestOnly, setCheapestOnly] = useState(false);
  const [adults, setAdults] = useState(1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [openCalendar, setOpenCalendar] = useState<'depart' | 'return' | null>(null);

  useEffect(() => {
    let active = true;
    try {
      const request = fetch('/api/san-bay');
      if (request && typeof request.then === 'function') {
        request
          .then((res) => (res && res.ok ? res.json() : null))
          .then((data) => {
            if (
              !active ||
              !data?.airports ||
              !Array.isArray(data.airports) ||
              data.airports.length === 0
            )
              return;
            setAirports(data.airports);
          })
          .catch(() => {});
      }
    } catch {
      // Ignore fetch errors during mount
    }
    return () => {
      active = false;
    };
  }, []);

  const roundTrip = tripType === 'round';

  const handleFromChange = (newFrom: string) => {
    if (newFrom === to) setTo(from);
    setFrom(newFrom);
    setSearchError(null);
  };

  const handleToChange = (newTo: string) => {
    if (newTo === from) setFrom(to);
    setTo(newTo);
    setSearchError(null);
  };

  const handleTripTypeChange = (next: TripType) => {
    setTripType(next);
    if (next === 'round' && (!returnDate || returnDate < departDate)) {
      const d = new Date(departDate);
      d.setDate(d.getDate() + 7);
      setReturnDate(toInputDate(d));
    }
  };

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (from === to) {
      setSearchError('Điểm khởi hành và điểm đến không thể trùng nhau');
      return;
    }
    if (roundTrip && returnDate && returnDate < departDate) {
      setSearchError('Ngày về không thể trước ngày đi');
      return;
    }
    setSearchError(null);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    params.set('depart', departDate);
    if (roundTrip && returnDate) params.set('return', returnDate);
    params.set('currency', currency);
    params.set('pax', String(adults));
    params.set('adult', String(adults));
    if (promoCode.trim()) params.set('promo', promoCode.trim());
    if (cheapestOnly) params.set('cheapest', '1');
    router.push(`/tim-ve?${params.toString()}`);
  };

  const swapAirports = () => {
    setFrom(to);
    setTo(from);
    setSearchError(null);
  };

  return (
    // Panel đặt vé của site thật (đo 13/11/2026):
    //   - Rộng 380px, đặt ở mép phải container 1200px (x=940..1320).
    //   - Hàng tab cao 52px, thân form cao 410px, bo đáy 5px.
    //   - Neo trong hero: container 1200px dùng `align-items:center`, panel có
    //     margin-top 65px → đỉnh panel nằm ở y=214 (164px tính từ đỉnh hero).
    <div className="w-full select-none lg:w-[380px] lg:max-w-[380px]">
      <form id="hero-booking-form" onSubmit={handleSubmit} className="w-full">
        {/* Hàng tab — 3 tab, rộng 201 / 103 / 76px, cao 52px. */}
        <nav className="vj-booking-tabs" aria-label="Chọn dịch vụ đặt vé">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={(event) => {
                  event.preventDefault();
                  setActiveTab(tab.id);
                }}
                aria-pressed={active}
                data-variant={tab.variant}
                className={`vj-booking-tab ${tab.width} ${active ? 'vj-booking-tab--active' : ''}`}
                title={tab.label}
              >
                <span className="vj-booking-tab__label">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Thân form — cao 410px, gradient 30.3deg, bo đáy 5px. */}
        <div className="vj-booking-panel">
          {/* Hàng 1 — loại hành trình (radio 18px) + tiền tệ.
              Cao 58px, padding 16.5px 15px, justify-between. */}
          <div className="flex h-[58px] items-center justify-between px-[15px]">
            <div className="flex items-center" role="group" aria-label="Loại hành trình">
              {TRIP_TYPES.map(({ value, label }) => (
                <label
                  key={value}
                  className="mr-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-white"
                >
                  <input
                    type="radio"
                    name="vj-trip-type"
                    value={value}
                    checked={tripType === value}
                    onChange={() => handleTripTypeChange(value)}
                    className="h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-white bg-transparent checked:bg-white"
                  />
                  {label}
                </label>
              ))}
              <a
                href="/trang-chu#hero-booking-form"
                className="inline-flex items-center gap-0.5 text-sm font-medium text-white transition hover:opacity-80"
              >
                Nhiều chặng
                <MdArrowOutward aria-hidden="true" className="text-xs" />
              </a>
            </div>

            {/* Tiền tệ — chữ 17px/700 trắng + mũi tên 24px. */}
            <label className="flex h-[24px] items-center gap-1 text-white">
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as 'VND' | 'USD')}
                aria-label="Loại tiền tệ"
                className="cursor-pointer appearance-none border-0 bg-transparent p-0 pr-0 text-lg2 font-bold leading-none text-white outline-none"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <MdExpandMore className="pointer-events-none h-6 w-6 shrink-0" />
            </label>
          </div>

          {/* Hàng 2 — các ô nhập, padding ngang 19px, cao 273px. */}
          <div className="px-[19px]">
            {/* Ô 1: Điểm khởi hành + Ngày đi (một hộp trắng 342×48px).
                Vỏ ô không cộng thêm `pl-[48px]`: nút `AirportPicker` đã tự
                đặt icon ở `left-[14px]` và chữ ở `pl-[48px]` — tính từ mép
                hộp trắng. Trước đây vỏ lại cộng một lần nữa nên chữ lệch
                sang x=+96, lệch hẳn nhãn "Hành khách"/"Mã khuyến mại" (+48)
                và tràn 7px vào cột ngày. */}
            <div className={fieldBoxClass}>
              <div className="relative flex min-w-0 flex-1 items-center pr-2">
                <AirportPicker
                  label="Điểm khởi hành"
                  ariaLabel="Điểm khởi hành"
                  icon="takeoff"
                  value={from}
                  airports={airports}
                  onChange={handleFromChange}
                  variant="flush"
                  className="h-full w-full"
                  headingClass={fieldHeadingClass}
                  valueClass={fieldAirportValueClass}
                />
              </div>
              <button
                type="button"
                onClick={() => setOpenCalendar((prev) => (prev === 'depart' ? null : 'depart'))}
                aria-label="Ngày đi"
                aria-expanded={openCalendar === 'depart'}
                className="flex w-[127px] shrink-0 items-center justify-center border-l border-[var(--border)] px-1 text-center lg:w-[121px]"
              >
                <span className="text-lg font-medium leading-[18.72px] text-[var(--foreground)]">
                  {formatDisplayDate(departDate) || 'Ngày đi'}
                </span>
              </button>
            </div>

            {/* Ô 2: Điểm đến + Ngày về — cùng cách căn lề như Ô 1. */}
            <div className={`mt-[11px] ${fieldBoxClass}`}>
              <div className="relative flex min-w-0 flex-1 items-center pr-2">
                <AirportPicker
                  label="Điểm đến"
                  ariaLabel="Điểm đến"
                  icon="land"
                  value={to}
                  airports={airports}
                  onChange={handleToChange}
                  variant="flush"
                  className="h-full w-full"
                  headingClass={fieldHeadingClass}
                  valueClass={fieldAirportValueClass}
                />
              </div>
              {roundTrip && (
                <button
                  type="button"
                  onClick={() => setOpenCalendar((prev) => (prev === 'return' ? null : 'return'))}
                  aria-label="Ngày về"
                  aria-expanded={openCalendar === 'return'}
                  className="flex w-[127px] shrink-0 items-center justify-center border-l border-[var(--border)] px-1 text-center lg:w-[121px]"
                >
                  <span className="text-lg font-medium leading-[18.72px] text-[var(--foreground)]">
                    {formatDisplayDate(returnDate) || 'Ngày về'}
                  </span>
                </button>
              )}
              {/* Nút đảo chiều — đè lên mép trái hộp (site thật: 24×28px tại x=940). */}
              <button
                type="button"
                aria-label="Đổi điểm khởi hành và điểm đến"
                onClick={swapAirports}
                className="absolute -left-[19px] top-1/2 z-10 grid h-7 w-6 -translate-y-1/2 cursor-pointer place-items-center text-white transition hover:scale-110 active:scale-95"
              >
                <MdSwapHoriz className="text-xl5" />
              </button>
            </div>

            {/* Ô 3: Hành khách — hộp trắng 342×48px, bo góc 10px, nền trắng
                đồng nhất với Ô 1/Ô 2/Ô 4. Trước đây nền trong suốt nên nhãn
                xám `rgb(107,117,128)` nằm trên nền đỏ gradient, tương phản
                quá thấp và lệch về phía trong so với các ô còn lại.
                MOBILE (390×844): site thật KHÔNG hiện hàng này (thân panel chỉ
                có 2 ô sân bay/ngày) → ẩn hoàn toàn ở dưới `lg`. */}
            <div className="relative mt-[11px] hidden h-[48px] items-center gap-2 rounded-vj bg-white pl-[48px] pr-1 lg:flex">
              <MdOutlinePerson
                aria-hidden="true"
                className="absolute left-[19px] top-1/2 -translate-y-1/2 text-lg2 text-[var(--foreground)]"
              />
              <span className="min-w-0 flex-1">
                <span className="vj-field-label">Hành khách</span>
                <select
                  value={String(adults)}
                  onChange={(event) => setAdults(Number(event.target.value))}
                  aria-label="Số hành khách"
                  className="w-full min-w-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-base font-semibold leading-[19px] text-[var(--foreground)] outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} người lớn
                    </option>
                  ))}
                </select>
              </span>
              <MdExpandMore
                aria-hidden="true"
                className="shrink-0 text-2xl text-[var(--foreground)]"
              />
            </div>

            {/* Ô 4: Mã khuyến mại — hộp trắng 342×48px, bo góc 10px.
                MOBILE: site thật không hiện → ẩn ở dưới `lg`. */}
            <label className="relative mt-[11px] hidden h-[48px] items-center gap-2 rounded-vj bg-white pl-[48px] pr-2 lg:flex">
              <MdConfirmationNumber
                aria-hidden="true"
                className="absolute left-[19px] top-1/2 -translate-y-1/2 text-xl2 text-[var(--foreground)]"
              />
              <span className="min-w-0 flex-1">
                <span className="vj-field-label">Mã khuyến mại</span>
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder="Mã khuyến mại"
                  aria-label="Mã khuyến mại"
                  className="w-full min-w-0 border-0 bg-transparent p-0 text-base font-semibold leading-[19px] text-[var(--foreground)] outline-none placeholder:text-[var(--vj-field-placeholder)]"
                />
              </span>
            </label>

            {/* Hàng 5 — công tắc "Tìm vé rẻ nhất" (42px) + tiêu đề H3 18px/700 trắng.
                MOBILE: site thật không hiện → ẩn ở dưới `lg`. */}
            <div className="hidden h-[48px] items-center gap-2 lg:flex">
              <button
                type="button"
                role="switch"
                aria-checked={cheapestOnly}
                aria-label="Tìm vé rẻ nhất"
                onClick={() => setCheapestOnly((prev) => !prev)}
                className={`relative h-[42px] w-[42px] shrink-0 cursor-pointer rounded-full transition ${
                  cheapestOnly ? 'bg-vjred' : 'bg-white/35'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white transition-all ${
                    cheapestOnly ? 'left-[19px]' : 'left-[3px]'
                  }`}
                />
              </button>
              <h3 className="text-lg font-bold leading-[18.72px] text-white">Tìm vé rẻ nhất</h3>
            </div>
          </div>

          {/* Hàng 6 — nút CTA. Site thật: nút 200×39px, cách đáy khối ô nhập
              10px, còn 29px từ đáy nút xuống đáy panel (panel cao 409px).
              MOBILE (390×844): hàng này cao 129px — padding trên 30px, dưới
              60px; nút nằm ở y=625 (panel bắt đầu ở y=420). */}
          <div className="mt-[11px] flex flex-col items-center justify-center pt-[30px] pb-[60px] lg:mt-0 lg:pt-[10px] lg:pb-[29px]">
            <button
              type="submit"
              className="vj-cta vj-cta--hero hover:brightness-105 active:translate-y-[1px] transition-all duration-150 cursor-pointer"
            >
              Tìm chuyến bay
            </button>
          </div>

          {searchError && (
            <div className="mx-[19px] mb-3 rounded-vj bg-white/95 px-3 py-1.5 text-center text-xs font-bold text-vjred shadow-sm">
              {searchError}
            </div>
          )}

          {/* Lịch chọn ngày — site thật mở popover 630px (2 tháng) khi bấm
              vào cột "Ngày đi" / "Ngày về". */}
          {openCalendar && (
            <FlightDatePickerPopover
              departDate={departDate}
              returnDate={returnDate}
              roundTrip={roundTrip}
              activeStep={openCalendar}
              onStepChange={(step) => setOpenCalendar(step)}
              onSelectDepart={(value) => {
                setDepartDate(value);
                if (!roundTrip) setOpenCalendar(null);
              }}
              onSelectReturn={(value) => {
                setReturnDate(value);
                setOpenCalendar(null);
              }}
              onTripTypeChange={(isRound) => handleTripTypeChange(isRound ? 'round' : 'one')}
              onClose={() => setOpenCalendar(null)}
              minDate={toInputDate(new Date())}
            />
          )}
        </div>
      </form>
    </div>
  );
}
