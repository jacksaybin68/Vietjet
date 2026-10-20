'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MdArrowOutward, MdConfirmationNumber, MdExpandMore, MdSwapHoriz } from 'react-icons/md';
import AirportPicker, { type Airport } from './AirportPicker';
import PassengerPicker, { type PaxCounts } from './PassengerPicker';
import { FlightDatePickerPopover, formatDisplayDate, toInputDate } from './DatePicker';
import { MdCalendarMonth as Calendar } from 'react-icons/md';

const TABS = [
  { id: 'services', label: 'Mua hành lý, suất ăn chọn chỗ ngồi và hơn thế nữa...' },
  { id: 'rewards', label: 'Đổi thưởng & Mua SkyPoint' },
  { id: 'cargo', label: 'Gửi hàng nhanh' },
] as const;

const CURRENCIES = ['VND', 'USD'] as const;

const TRIP_TYPES = [
  { value: 'round', label: 'Khứ hồi' },
  { value: 'one', label: 'Một chiều' },
] as const;

const FALLBACK_AIRPORTS: Airport[] = [
  { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
  { code: 'SGN', city: 'TP. Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
  { code: 'DAD', city: 'Đà Nẵng', airport: 'Đà Nẵng' },
  { code: 'PQC', city: 'Phú Quốc', airport: 'Phú Quốc' },
  { code: 'CXR', city: 'Nha Trang', airport: 'Cam Ranh' },
  { code: 'VDH', city: 'Quảng Bình', airport: 'Đồng Hới' },
  { code: 'HPH', city: 'Hải Phòng', airport: 'Cát Bi' },
  { code: 'HUI', city: 'Huế', airport: 'Phú Bài' },
  { code: 'PXU', city: 'Pleiku', airport: 'Pleiku' },
  { code: 'BMV', city: 'Buôn Ma Thuột', airport: 'Buôn Ma Thuột' },
  { code: 'DLI', city: 'Đà Lạt', airport: 'Liên Khương' },
  { code: 'VCS', city: 'Côn Đảo', airport: 'Côn Đảo' },
  { code: 'THD', city: 'Thanh Hóa', airport: 'Thọ Xuân' },
  { code: 'VII', city: 'Vinh', airport: 'Vinh' },
  { code: 'VCA', city: 'Cần Thơ', airport: 'Cần Thơ' },
  { code: 'SIN', city: 'Singapore', airport: 'Changi' },
  { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi' },
  { code: 'KUL', city: 'Kuala Lumpur', airport: 'Kuala Lumpur' },
  { code: 'CGK', city: 'Jakarta', airport: 'Soekarno-Hatta' },
];

const fieldGroupClass =
  'grid grid-cols-1 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-white shadow-xs transition-all focus-within:border-[var(--accent)] sm:grid-cols-[2fr_1fr] sm:divide-x sm:divide-y-0';

export default function HeroBookingWidget() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'services' | 'rewards' | 'cargo'>('rewards');
  const [roundTrip, setRoundTrip] = useState(true);
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND');
  const [from, setFrom] = useState('HAN');
  const [to, setTo] = useState('SGN');
  const [departDate, setDepartDate] = useState(() => toInputDate(new Date(Date.now() + 86400000)));
  const [returnDate, setReturnDate] = useState(() =>
    toInputDate(new Date(Date.now() + 7 * 86400000))
  );
  const [activeDatePicker, setActiveDatePicker] = useState<'depart' | 'return' | null>(null);
  const [paxCounts, setPaxCounts] = useState<PaxCounts>({ adult: 1, child: 0, infant: 0 });
  const [airports] = useState<Airport[]>(FALLBACK_AIRPORTS);
  const [promoCode, setPromoCode] = useState('');
  const [cheapestOnly, setCheapestOnly] = useState(false);

  const minDate = toInputDate(new Date());

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    params.set('depart', departDate);
    if (roundTrip && returnDate) params.set('return', returnDate);
    params.set('currency', currency);
    params.set('adult', String(paxCounts.adult));
    if (paxCounts.child) params.set('child', String(paxCounts.child));
    if (paxCounts.infant) params.set('infant', String(paxCounts.infant));
    if (promoCode.trim()) params.set('promo', promoCode.trim());
    if (cheapestOnly) params.set('cheapest', '1');
    router.push(`/tim-ve?${params.toString()}`);
  };

  return (
    <div className="relative w-full max-w-[356px] mx-auto select-none">
      <form
        id="hero-booking-form"
        onSubmit={handleSubmit}
        className="w-full rounded-[4px] bg-vj-red-panel shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-vj-red-panel/30"
      >
        {/* Ba tab dịch vụ trên cùng */}
        <nav
          className="flex gap-0.5 rounded-t-[4px] overflow-hidden"
          aria-label="Chọn dịch vụ đặt vé"
        >
          {TABS.map((tab) => {
            const isGoldTab = tab.id === 'rewards';
            const active = activeTab === tab.id;
            const narrow = tab.id === 'cargo';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                className={`flex min-h-[48px] items-center justify-center p-1.5 text-center text-xs2 leading-[14px] font-bold transition-all cursor-pointer ${
                  isGoldTab
                    ? 'bg-vjgold text-vjwine font-extrabold hover:bg-vj-gold-hover'
                    : active
                      ? 'bg-vj-tab-active text-white'
                      : 'bg-vj-tab-idle text-white/90 hover:bg-vj-tab-idle-hover hover:text-white'
                } ${narrow ? 'w-[72px] shrink-0' : 'flex-1'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Thân form nền đỏ hồng #E74B55 theo quy chuẩn Ảnh 2 */}
        <div className="p-3.5 sm:p-4 text-white bg-vj-red-panel">
          {/* Hàng chọn loại hành trình + Tiền tệ VND */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <fieldset className="flex items-center gap-2.5 sm:gap-3 border-none p-0">
              <legend className="sr-only">Loại hành trình</legend>
              {TRIP_TYPES.map(({ value, label }) => {
                const isSelected = roundTrip === (value === 'round');
                return (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full border border-white bg-transparent">
                      {isSelected && <span className="h-2 w-2 rounded-full bg-vjgold" />}
                    </span>
                    <input
                      type="radio"
                      name="trip-type"
                      checked={isSelected}
                      onChange={() => setRoundTrip(value === 'round')}
                      className="sr-only"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
              <a
                href="/trang-chu#hero-booking-form"
                className="flex items-center gap-0.5 text-xs font-bold text-white hover:text-vjgold transition-colors"
              >
                Nhiều chặng
                <MdArrowOutward className="text-xs2" />
              </a>
            </fieldset>

            <div className="flex items-center">
              <label className="flex h-7 items-center rounded border border-white/40 bg-black/10 px-2 text-xs font-bold text-white hover:border-white transition-colors cursor-pointer">
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as 'VND' | 'USD')}
                  aria-label="Loại tiền tệ"
                  className="cursor-pointer appearance-none border-0 bg-transparent pr-1 text-xs font-bold text-white outline-none"
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code} className="text-[var(--foreground)]">
                      {code}
                    </option>
                  ))}
                </select>
                <MdExpandMore className="text-xs text-white shrink-0 pointer-events-none" />
              </label>
            </div>
          </div>

          {/* Các trường điểm khởi hành, điểm đến và ngày bay */}
          <div className="relative">
            {/* Hàng 1: Khởi hành + Ngày đi */}
            <div className={fieldGroupClass}>
              <AirportPicker
                label="Điểm khởi hành"
                icon="takeoff"
                value={from}
                airports={airports}
                onChange={setFrom}
                variant="flush"
              />
              <label
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveDatePicker((prev) => (prev === 'depart' ? null : 'depart'));
                  }
                }}
                onClick={() => setActiveDatePicker((prev) => (prev === 'depart' ? null : 'depart'))}
                aria-label="Ngày đi"
                aria-expanded={activeDatePicker === 'depart'}
                className={`w-full flex items-center gap-2 bg-white px-2.5 py-1.5 cursor-pointer hover:bg-amber-50 focus-within:bg-amber-50 min-w-0 text-left transition-colors ${
                  activeDatePicker === 'depart' ? 'bg-amber-50/90 ring-1 ring-vjred ring-inset' : ''
                }`}
              >
                <Calendar className="shrink-0 text-base text-[var(--foreground-subtle)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-2xs font-bold uppercase leading-tight tracking-[0.06em] text-[var(--foreground-subtle)]">
                    Ngày đi
                  </span>
                  <span className="block text-sm2 font-bold text-[var(--foreground)] truncate">
                    {formatDisplayDate(departDate) || 'Ngày đi'}
                  </span>
                </span>
              </label>
            </div>

            {/* Nút đảo chiều sân bay */}
            <button
              type="button"
              aria-label="Đổi điểm khởi hành và điểm đến"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="absolute -left-3 top-[52px] -translate-y-1/2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white text-vjred shadow-[0_2px_8px_rgba(0,0,0,0.22)] border border-gray-100 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              <MdSwapHoriz className="text-lg" />
            </button>

            {/* Hàng 2: Điểm đến + Ngày về */}
            <div className={`${fieldGroupClass} mt-2.5`}>
              <AirportPicker
                label="Điểm đến"
                icon="land"
                value={to}
                airports={airports}
                onChange={setTo}
                variant="flush"
                className={roundTrip ? '' : 'sm:col-span-2'}
              />
              {roundTrip && (
                <label
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveDatePicker((prev) => (prev === 'return' ? null : 'return'));
                    }
                  }}
                  onClick={() =>
                    setActiveDatePicker((prev) => (prev === 'return' ? null : 'return'))
                  }
                  aria-label="Ngày về"
                  aria-expanded={activeDatePicker === 'return'}
                  className={`w-full flex items-center gap-2 bg-white px-2.5 py-1.5 cursor-pointer hover:bg-amber-50 focus-within:bg-amber-50 min-w-0 text-left transition-colors ${
                    activeDatePicker === 'return'
                      ? 'bg-amber-50/90 ring-1 ring-vjred ring-inset'
                      : ''
                  }`}
                >
                  <Calendar className="shrink-0 text-base text-[var(--foreground-subtle)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-2xs font-bold uppercase leading-tight tracking-[0.06em] text-[var(--foreground-subtle)]">
                      Ngày về
                    </span>
                    <span className="block text-sm2 font-bold text-[var(--foreground)] truncate">
                      {formatDisplayDate(returnDate) || 'Ngày về'}
                    </span>
                  </span>
                </label>
              )}
            </div>

            {/* Lịch chọn ngày bay 2 tháng chuẩn Vietjet Air */}
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
                onTripTypeChange={(isRound) => {
                  setRoundTrip(isRound);
                  if (isRound && (!returnDate || returnDate < departDate)) {
                    const d = new Date(departDate);
                    d.setDate(d.getDate() + 7);
                    setReturnDate(toInputDate(d));
                  }
                }}
                onClose={() => setActiveDatePicker(null)}
                minDate={minDate}
              />
            )}
          </div>

          {/* Hàng 3: Hành khách */}
          <div className="mt-2.5 rounded-[6px] border border-[var(--border)] bg-white shadow-xs relative z-30">
            <PassengerPicker
              value={paxCounts}
              onChange={setPaxCounts}
              promoCode={promoCode}
              onPromoCodeChange={setPromoCode}
              cheapestOnly={cheapestOnly}
              onCheapestChange={setCheapestOnly}
              onSubmit={() => handleSubmit()}
              className="mt-0"
            />
          </div>

          {/* Hàng 4: Mã khuyến mại (hiển thị khi picker đóng) */}
          <label className="mt-2.5 flex items-center gap-2 rounded-[6px] border border-[var(--border)] bg-white px-3 py-2 shadow-xs transition-all focus-within:border-vjred focus-within:ring-1 focus-within:ring-vjred">
            <MdConfirmationNumber className="shrink-0 text-lg text-vjred/80" />
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder="Mã khuyến mại"
              className="w-full min-w-0 border-0 bg-transparent px-0 text-sm2 font-bold text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] placeholder:font-normal"
            />
          </label>

          {/* Hàng 5: Checkbox Tìm vé rẻ nhất */}
          <label className="mt-3 flex items-center gap-2 text-xs sm:text-sm2 font-semibold text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cheapestOnly}
              onChange={(event) => setCheapestOnly(event.target.checked)}
              className="h-4 w-4 rounded border-white/60 text-vjgold focus:ring-0 cursor-pointer accent-vjgold"
            />
            <span>Tìm vé rẻ nhất</span>
          </label>

          {/* Hàng 6: Nút Tìm chuyến bay — Màu vàng #FFD51A, bo góc dạng viên thuốc, chữ đỏ sẫm đậm */}
          <div className="mt-3.5 flex justify-center">
            <button
              type="submit"
              className="min-h-[40px] w-[55%] max-w-[200px] rounded-full bg-vjgold hover:bg-vj-gold-hover text-vjwine font-extrabold italic text-base2 tracking-wide shadow-sm hover:shadow-md active:translate-y-[1px] transition-all duration-150 flex items-center justify-center cursor-pointer"
            >
              Tìm chuyến bay
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
