'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MdArrowOutward,
  MdConfirmationNumber,
  MdExpandMore,
  MdSwapHoriz,
  MdOutlineHotel,
  MdOutlineShoppingBag,
  MdOutlineCardGiftcard,
  MdOutlineFlight,
} from 'react-icons/md';
import AirportPicker, { type Airport } from './AirportPicker';
import { ALL_AIRPORTS } from './airports';
import PassengerPicker, { type PaxCounts } from './PassengerPicker';
import { FlightDatePickerPopover, formatDisplayDate, toInputDate } from './DatePicker';
import { MdCalendarMonth as Calendar } from 'react-icons/md';

/**
 * Thanh tab dịch vụ trên cùng của dải đặt vé.
 * Site thật (đo 13/11/2026): nền đỏ #EC2029, cao 40px, bo góc 16px 16px 0 0,
 * 4 mục với icon, chữ trắng 17px.
 */
const TABS = [
  { id: 'flight', label: 'Đặt vé', icon: MdOutlineFlight },
  { id: 'hotel', label: 'Khách sạn', icon: MdOutlineHotel },
  { id: 'skyshop', label: 'Skyshop', icon: MdOutlineShoppingBag },
  { id: 'rewards', label: 'Đổi thưởng vé máy bay', icon: MdOutlineCardGiftcard },
] as const;

const CURRENCIES = ['VND', 'USD'] as const;

type TripType = 'one' | 'round' | 'multi';

const TRIP_TYPES: ReadonlyArray<{ value: TripType; label: string }> = [
  { value: 'one', label: 'Một chiều' },
  { value: 'round', label: 'Khứ hồi' },
  { value: 'multi', label: 'Nhiều chặng' },
];

/**
 * Ô nhập trong dải đặt vé: nền trắng, bo góc 10px, viền #ECECEC.
 * Site thật: mỗi ô rộng 235px, nhãn 12px #6B7580, giá trị 16px #333.
 */
const fieldBoxClass =
  'flex h-[56px] w-full min-w-0 items-center gap-2 rounded-vj border border-[var(--border)] bg-white px-3';

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
  const [activeDatePicker, setActiveDatePicker] = useState<'depart' | 'return' | null>(null);
  const [paxCounts, setPaxCounts] = useState<PaxCounts>({ adult: 1, child: 0, infant: 0 });
  const [airports, setAirports] = useState<Airport[]>(ALL_AIRPORTS);
  const [promoCode, setPromoCode] = useState('');
  const [cheapestOnly, setCheapestOnly] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (typeof fetch === 'function') {
      try {
        const p = fetch('/api/san-bay');
        if (p && typeof p.then === 'function') {
          p.then((res) => (res && res.ok ? res.json() : null))
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
    }
    return () => {
      active = false;
    };
  }, []);

  const minDate = toInputDate(new Date());
  const roundTrip = tripType === 'round';

  const handleFromChange = (newFrom: string) => {
    if (newFrom === to) {
      setTo(from);
    }
    setFrom(newFrom);
    setSearchError(null);
  };

  const handleToChange = (newTo: string) => {
    if (newTo === from) {
      setFrom(to);
    }
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
    params.set('pax', String(paxCounts.adult));
    params.set('adult', String(paxCounts.adult));
    if (paxCounts.child) params.set('child', String(paxCounts.child));
    if (paxCounts.infant) params.set('infant', String(paxCounts.infant));
    if (promoCode.trim()) params.set('promo', promoCode.trim());
    if (cheapestOnly) params.set('cheapest', '1');
    router.push(`/tim-ve?${params.toString()}`);
  };

  return (
    // Dải đặt vé: container 1200px, thanh tab đỏ 40px + panel trắng bo góc 16px.
    <div className="relative mx-auto w-full max-w-[1200px] select-none px-4 sm:px-6 lg:px-0">
      <form id="hero-booking-form" onSubmit={handleSubmit} className="w-full">
        {/* Thanh tab dịch vụ — nền đỏ #EC2029, cao 40px, bo 16px 16px 0 0. */}
        <nav className="vj-booking-tabs" aria-label="Chọn dịch vụ đặt vé">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                className="vj-booking-tab gap-1.5"
                data-active={active}
                title={tab.label}
              >
                <Icon aria-hidden="true" className="shrink-0 text-lg" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Panel trắng — nền rgba(255,255,255,.9), bo góc 0 0 16px 16px. */}
        <div className="vj-booking-panel px-4 py-4 sm:px-5 sm:py-5">
          {/* Hàng chọn loại hành trình (pill) + tiền tệ */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="vj-pill-track" role="group" aria-label="Loại hành trình">
              {TRIP_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTripTypeChange(value)}
                  aria-pressed={tripType === value}
                  className="vj-pill-item"
                  data-active={tripType === value}
                >
                  {label}
                </button>
              ))}
              <a
                href="/trang-chu#hero-booking-form"
                className="vj-pill-item inline-flex items-center gap-0.5"
              >
                Nhiều chặng
                <MdArrowOutward aria-hidden="true" className="text-xs" />
              </a>
            </div>

            <div className="flex items-center">
              <label className="flex h-7 items-center rounded-full border border-[var(--border)] bg-white px-2 text-xs font-bold text-[var(--foreground)] hover:border-[var(--accent)] transition-colors cursor-pointer">
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as 'VND' | 'USD')}
                  aria-label="Loại tiền tệ"
                  className="cursor-pointer appearance-none border-0 bg-transparent pr-1 text-xs font-bold text-[var(--foreground)] outline-none"
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <MdExpandMore className="text-xs text-[var(--foreground)] shrink-0 pointer-events-none" />
              </label>
            </div>
          </div>

          {/* Hàng 4 ô: Từ / Đến / Ngày đi / Hành khách + nút tìm chuyến bay.
              Mỗi ô rộng 235px, nút 174×44 — đo được trên site thật. */}
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[235px_235px_235px_235px_1fr]">
            {/* Ô 1: Điểm khởi hành */}
            <div className="min-w-0">
              <AirportPicker
                label="Từ"
                ariaLabel="Điểm khởi hành"
                icon="takeoff"
                value={from}
                airports={airports}
                onChange={handleFromChange}
                variant="field"
              />
            </div>

            {/* Ô 2: Điểm đến — có nút đảo chiều đè lên ranh giới hai ô. */}
            <div className="relative min-w-0">
              <AirportPicker
                label="Đến"
                ariaLabel="Điểm đến"
                icon="land"
                value={to}
                airports={airports}
                onChange={handleToChange}
                variant="field"
              />
              <button
                type="button"
                aria-label="Đổi điểm khởi hành và điểm đến"
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                  setSearchError(null);
                }}
                className="absolute -left-[15px] top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white text-vjred shadow-[0_2px_8px_rgba(0,0,0,0.22)] border border-[var(--border)] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <MdSwapHoriz className="text-lg" />
              </button>
            </div>

            {/* Ô 3: Ngày đi / Ngày về (mở lịch 2 tháng chuẩn Vietjet Air).
                Site thật: ô ngày rộng 235px; khi chọn khứ hồi, ô này chia làm
                hai nửa "Ngày đi" và "Ngày về". */}
            <div className="relative min-w-0">
              <div
                className={`${fieldBoxClass} gap-0 divide-x divide-[var(--border)] ${
                  activeDatePicker ? 'border-[var(--accent)]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setActiveDatePicker((prev) => (prev === 'depart' ? null : 'depart'))
                  }
                  aria-label="Ngày đi"
                  aria-expanded={activeDatePicker === 'depart'}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Calendar className="shrink-0 text-base text-[var(--vj-muted)]" />
                  <span className="min-w-0 flex-1">
                    <span className="vj-field-label">Ngày đi</span>
                    <span className="vj-field-value truncate">
                      {formatDisplayDate(departDate) || 'Ngày đi'}
                    </span>
                  </span>
                </button>

                {roundTrip && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDatePicker((prev) => (prev === 'return' ? null : 'return'))
                    }
                    aria-label="Ngày về"
                    aria-expanded={activeDatePicker === 'return'}
                    className="flex min-w-0 flex-1 items-center gap-2 pl-3 text-left"
                  >
                    <Calendar className="shrink-0 text-base text-[var(--vj-muted)]" />
                    <span className="min-w-0 flex-1">
                      <span className="vj-field-label">Ngày về</span>
                      <span className="vj-field-value truncate">
                        {formatDisplayDate(returnDate) || 'Ngày về'}
                      </span>
                    </span>
                  </button>
                )}
              </div>

              {activeDatePicker && (
                <FlightDatePickerPopover
                  departDate={departDate}
                  returnDate={returnDate}
                  roundTrip={roundTrip}
                  activeStep={activeDatePicker}
                  onStepChange={setActiveDatePicker}
                  onSelectDepart={(date) => {
                    setDepartDate(date);
                    if (roundTrip && returnDate && returnDate < date) {
                      const d = new Date(date);
                      d.setDate(d.getDate() + 3);
                      setReturnDate(toInputDate(d));
                    }
                  }}
                  onSelectReturn={setReturnDate}
                  onTripTypeChange={(isRound) => handleTripTypeChange(isRound ? 'round' : 'one')}
                  onClose={() => setActiveDatePicker(null)}
                  minDate={minDate}
                />
              )}
            </div>

            {/* Ô 4: Hành khách */}
            <div className="relative min-w-0">
              <PassengerPicker
                value={paxCounts}
                onChange={setPaxCounts}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                cheapestOnly={cheapestOnly}
                onCheapestChange={setCheapestOnly}
                onSubmit={() => handleSubmit()}
                className="mt-0 w-full"
              />
            </div>

            {/* Nút "Tìm chuyến bay" — 174×44, gradient 26.73deg, bo góc 10px. */}
            <div className="flex items-end lg:justify-end">
              <button
                type="submit"
                className="vj-cta vj-cta--search hover:brightness-105 active:translate-y-[1px] transition-all duration-150 cursor-pointer"
              >
                Tìm chuyến bay
              </button>
            </div>
          </div>

          {/* Mã khuyến mại — chỉ hiện khi người dùng đã nhập mã ở hộp thoại
              hành khách, để dải đặt vé giữ đúng một hàng như site thật. */}
          {promoCode.trim() && (
            <label className="mt-3 flex h-[48px] items-center gap-2.5 rounded-vj border border-[var(--border)] bg-white px-3">
              <MdConfirmationNumber className="shrink-0 text-lg text-vjred/80" />
              <span className="min-w-0 flex-1">
                <span className="vj-field-label">Mã khuyến mại</span>
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder="Mã khuyến mại"
                  className="w-full min-w-0 border-0 bg-transparent px-0 text-base font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--vj-field-placeholder)]"
                />
              </span>
            </label>
          )}

          {/* Checkbox "Tìm vé rẻ nhất" + thông báo lỗi */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cheapestOnly}
                onChange={(event) => setCheapestOnly(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] text-vjred focus:ring-0 cursor-pointer accent-vjred"
              />
              <span>Tìm vé rẻ nhất</span>
            </label>

            {searchError && (
              <div className="rounded-vj bg-white/95 border border-vjred px-3 py-1.5 text-xs font-bold text-vjred text-center shadow-sm">
                {searchError}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
