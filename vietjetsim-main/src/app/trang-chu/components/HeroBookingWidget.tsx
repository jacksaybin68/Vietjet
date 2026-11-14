'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MdCardGiftcard,
  MdExpandMore,
  MdFlight,
  MdHotel,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdShoppingBag,
  MdSwapHoriz,
} from 'react-icons/md';
import AirportPicker, { type Airport } from './AirportPicker';
import { ALL_AIRPORTS } from './airports';
import PassengerPicker, { type PaxCounts } from './PassengerPicker';
import { FlightDatePickerPopover, formatDisplayDate, toInputDate } from './DatePicker';

/**
 * Rail dịch vụ phía trên dải đặt vé — 4 nút, đúng site thật.
 *
 * Số đo thật trên newweb.vietjetair.com (14/11/2026, viewport 1440×900):
 *   - Rail đỏ rộng 1200px, cao 40px, nền #EC2029, bo góc 16px 16px 0 0,
 *     padding ngang 15px.
 *   - 4 nút, mỗi nút `gap: 6px`, padding 0 10px, icon 24×24 đứng TRƯỚC chữ.
 *     "Đặt vé" 251px (17px/700, active) / "Khách sạn" 279px (17px/500) /
 *     "Skyshop" 266px / "Đổi thưởng vé máy bay" 374px.
 *   - MOBILE (390×844): rail đỏ bo góc 20px, cao 46px, 4 nút cuộn ngang.
 */
const SERVICE_TABS = [
  {
    id: 'flight',
    label: 'Đặt vé',
    href: '/trang-chu#hero-booking-form',
    icon: MdFlight,
  },
  {
    id: 'hotel',
    label: 'Khách sạn',
    href: '/dich-vu?service=hotel',
    icon: MdHotel,
  },
  {
    id: 'skyshop',
    label: 'Skyshop',
    href: '/dich-vu?service=dutyfree',
    icon: MdShoppingBag,
  },
  {
    id: 'rewards',
    label: 'Đổi thưởng vé máy bay',
    href: '/dich-vu?service=voucher',
    icon: MdCardGiftcard,
  },
] as const;

const CURRENCIES = ['VND', 'USD'] as const;

type TripType = 'one' | 'round';

const TRIP_TYPES: ReadonlyArray<{ value: TripType; label: string }> = [
  { value: 'round', label: 'Khứ hồi' },
  { value: 'one', label: 'Một chiều' },
];

export default function HeroBookingWidget() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof SERVICE_TABS)[number]['id']>('flight');
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
  const [pax, setPax] = useState<PaxCounts>({ adult: 1, child: 0, infant: 0 });
  const [searchError, setSearchError] = useState<string | null>(null);
  const [openCalendar, setOpenCalendar] = useState<'depart' | 'return' | null>(null);
  /**
   * Thẻ đặt vé trên MOBILE bắt đầu ở trạng thái thu gọn: chỉ hai ô sân bay
   * trong hộp trắng 354×72px, còn ô ngày / hành khách / nút CTA bị ẩn
   * (đo site thật 14/11/2026: thẻ đỏ 366×130px). Bấm vào ô "Từ" hoặc "Đến"
   * sẽ bung thẻ ra (thẻ đỏ cao 507px, hộp trắng 354×449px) — cũng đúng site
   * thật. Trên desktop trạng thái này không có tác dụng gì vì mọi ô luôn hiện.
   */
  const [mobileExpanded, setMobileExpanded] = useState(false);

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
    params.set('adult', String(pax.adult));
    if (pax.child > 0) params.set('child', String(pax.child));
    if (pax.infant > 0) params.set('infant', String(pax.infant));
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
    // Dải đặt vé NGANG 1200px — hai tầng, khớp site thật (đo 14/11/2026):
    //   Tầng 1: rail đỏ 1200×40px (4 nút dịch vụ).
    //   Tầng 2: hàng tìm kiếm trắng 1200×69px, đổ bóng, bo góc 16px.
    //
    // MOBILE (390×844): site thật bọc rail + hộp trắng trong MỘT thẻ đỏ
    // bo góc 20px (366×130px, padding 6px). Ở đây thẻ đó là `.vj-booking-shell`;
    // trên desktop nó trong suốt và chỉ chứa hai tầng nằm ngang.
    <div
      className="vj-booking-shell w-full select-none"
      data-expanded={mobileExpanded ? 'true' : 'false'}
    >
      <form id="hero-booking-form" onSubmit={handleSubmit} className="w-full">
        {/* ── Tầng 1: rail dịch vụ ───────────────────────────────────────── */}
        <nav className="vj-booking-rail" aria-label="Chọn dịch vụ đặt vé">
          {SERVICE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={(event) => {
                  // "Đặt vé" chỉ đổi trạng thái — các tab dịch vụ khác dẫn tới
                  // trang tương ứng như site thật (data-home-search-direct-redirect).
                  if (tab.id !== 'flight') return;
                  event.preventDefault();
                  setActiveTab(tab.id);
                }}
                aria-pressed={active}
                className="vj-booking-rail__tab"
                title={tab.label}
              >
                <span className="vj-booking-rail__icon" aria-hidden="true">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Tầng 2: hàng tìm kiếm ─────────────────────────────────────── */}
        <div className="vj-booking-bar">
          {/* Cụm ô nhập: Từ → hoán đổi → Đến → Ngày bay. */}
          <div className="vj-booking-fields">
            <AirportPicker
              label="Từ"
              ariaLabel="Điểm khởi hành"
              icon="takeoff"
              value={from}
              airports={airports}
              onChange={handleFromChange}
              onActivate={() => setMobileExpanded(true)}
              variant="bar"
              className="h-full w-full"
            />

            <button
              type="button"
              onClick={swapAirports}
              aria-label="Đổi điểm khởi hành và điểm đến"
              className="vj-booking-swap"
            >
              <MdSwapHoriz className="h-[14px] w-[14px]" aria-hidden="true" />
            </button>

            <AirportPicker
              label="Đến"
              ariaLabel="Điểm đến"
              icon="land"
              value={to}
              airports={airports}
              onChange={handleToChange}
              onActivate={() => setMobileExpanded(true)}
              variant="bar"
              className="h-full w-full"
            />

            {/* Cột ngày bay: nút 171px + nút mũi tên 24px (bo góc 4px). */}
            <div className="vj-booking-date">
              <button
                type="button"
                onClick={() => setOpenCalendar((prev) => (prev === 'depart' ? null : 'depart'))}
                aria-label="Ngày đi"
                aria-expanded={openCalendar === 'depart'}
                className="vj-booking-field"
              >
                <span className="vj-booking-field__label">Ngày đi</span>
                <span
                  className={`vj-booking-field__value ${
                    departDate ? '' : 'text-[var(--vj-field-placeholder)]'
                  }`}
                >
                  {formatDisplayDate(departDate) || 'DD/MM/YYYY'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOpenCalendar((prev) => (prev === 'depart' ? null : 'depart'))}
                aria-label="Mở lịch chọn ngày đi"
                className="vj-booking-chevron"
              >
                <MdKeyboardArrowDown className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Cụm phải: ô hành khách (259px) + nút CTA (174×44px).
              Site thật đo tổng 469px, bắt đầu ở x=846.4.
              Hàng phụ mã khuyến mại / tìm vé rẻ nhất (`jss295`, nền #F3F1F1,
              bo góc 14px) nằm GIỮA hai ô, đúng vị trí trên site thật. Trên
              desktop site thật ẩn hàng này, nên ở đây nó chỉ hiện khi thẻ
              đặt vé được bung ra (trạng thái mở rộng trên mobile). */}
          <div className="vj-booking-right">
            <PassengerPicker
              value={pax}
              onChange={setPax}
              variant="bar"
              className="vj-booking-pax-slot"
            />

            <details className="vj-booking-extra group">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-[var(--foreground)]">
                <span>Mã khuyến mại &amp; tìm vé rẻ nhất</span>
                <MdExpandMore
                  className="h-6 w-6 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <div className="mt-3 flex flex-col gap-3">
                <label className="flex h-11 items-center rounded-vj bg-white px-3">
                  <span className="sr-only">Mã khuyến mại</span>
                  <input
                    value={promoCode}
                    onChange={(event) => setPromoCode(event.target.value)}
                    placeholder="Mã khuyến mại"
                    aria-label="Mã khuyến mại"
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-base font-medium leading-[19px] text-[var(--foreground)] outline-none placeholder:text-[var(--vj-field-placeholder)]"
                  />
                </label>

                <label className="flex shrink-0 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cheapestOnly}
                    onChange={(event) => setCheapestOnly(event.target.checked)}
                    aria-label="Tìm vé rẻ nhất"
                    className="h-4 w-4 rounded border-vj-border accent-vjred focus:ring-0"
                  />
                  <span className="text-sm font-bold text-[var(--foreground)]">Tìm vé rẻ nhất</span>
                </label>
              </div>
            </details>

            {/* Nút CTA — 174×44px, bo góc 10px, gradient vàng 26.73deg. */}
            <div className="vj-booking-cta">
              <button
                type="submit"
                className="vj-cta vj-cta--hero hover:brightness-105 active:translate-y-[1px] transition-all duration-150 cursor-pointer"
              >
                <span className="vj-cta__label">
                  <span>Tìm chuyến bay</span>
                  <svg
                    className="vj-cta__icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    role="presentation"
                  >
                    <path
                      fill="currentColor"
                      d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>

        {searchError && (
          <div className="mt-2 rounded-vj bg-white/95 px-3 py-1.5 text-center text-xs font-bold text-vjred shadow-sm">
            {searchError}
          </div>
        )}

        {/* Lịch chọn ngày — popover 630px (2 tháng) khi bấm vào "Ngày đi".
            Loại hành trình (Một chiều / Khứ hồi / Nhiều chặng) nằm TRONG
            popover, đúng như site thật: trên trang chủ dải pill bị ẩn. */}
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
      </form>
    </div>
  );
}
