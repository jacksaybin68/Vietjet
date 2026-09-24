'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MdArrowOutward,
  MdCalendarMonth,
  MdConfirmationNumber,
  MdExpandMore,
  MdFlightLand,
  MdFlightTakeoff,
  MdPeople,
  MdSwapHoriz,
} from 'react-icons/md';

const AIRPORTS = [
  { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
  { code: 'SGN', city: 'Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
  { code: 'DAD', city: 'Đà Nẵng', airport: 'Đà Nẵng' },
  { code: 'PQC', city: 'Phú Quốc', airport: 'Phú Quốc' },
  { code: 'CXR', city: 'Nha Trang', airport: 'Cam Ranh' },
  { code: 'HPH', city: 'Hải Phòng', airport: 'Cát Bi' },
  { code: 'HUI', city: 'Huế', airport: 'Phú Bài' },
  { code: 'VDO', city: 'Quảng Ninh', airport: 'Vân Đồn' },
  { code: 'VCA', city: 'Cần Thơ', airport: 'Cần Thơ Quốc tế' },
  { code: 'PXU', city: 'Pleiku', airport: 'Pleiku' },
  { code: 'BMV', city: 'Buôn Ma Thuột', airport: 'Buôn Ma Thuột' },
  { code: 'DLI', city: 'Đà Lạt', airport: 'Liên Khuông' },
  { code: 'VCS', city: 'Côn Đảo', airport: 'Côn Đảo' },
  { code: 'THD', city: 'Thanh Hóa', airport: 'Tho Xuân' },
  { code: 'VII', city: 'Vinh', airport: 'Vinh' },
];

/**
 * Homepage hero artwork.
 *
 * Picked for a right-pinned booking card: this 4000x2000 campaign banner keeps
 * its passengers and plane in the bottom-left and its promo copy between ~33%
 * and ~55% of the width, so the whole right half stays empty cloud for the card
 * to sit on. The `*-fare-website-*.webp` banners (1920x650 / 2560x867) are the
 * right ratio for a hero, but their headline sits at 52-82% of the width and the
 * card half-clipped it. The previous `banner-1-hongkong.jpg` is a 1562x1354
 * (1.15:1) portrait crop built for the deal cards, so stretching it behind a
 * full-bleed hero via `background-size: cover` destroyed it.
 */
const HERO_ARTWORK = '/images/hero/f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg';

/**
 * Tab strip of the hero booking card, mirrored from vietjetair.com: the active
 * tab is gold with dark-red type, the inactive tabs are white on red.
 */
const BOOKING_TABS = [
  {
    id: 'services',
    label: 'Mua hành lý, suất ăn chọn chỗ ngồi và hơn thế nữa...',
    href: '/dich-vu',
  },
  { id: 'booking', label: 'Đặt chuyến đi & Mua SkyJoy', href: '#hero-booking-form' },
  { id: 'cargo', label: 'Gửi hàng nhanh', href: '/dich-vu' },
] as const;

const CURRENCIES = ['VND', 'USD'] as const;

const inputClass =
  'w-full min-w-0 border-0 bg-transparent px-0 text-sm font-extrabold text-[#333333] outline-none disabled:cursor-not-allowed disabled:text-[#8b9099]';
const labelClass =
  'block text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-[#8c8c8c]';
const fieldClass =
  'flex items-center gap-2 rounded border border-[#e4e4e4] bg-white px-3 py-1.5 focus-within:border-[var(--accent)]';
const iconClass = 'shrink-0 text-lg text-[#4a4a4a]';
const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

export default function HeroSection() {
  const router = useRouter();
  const [roundTrip, setRoundTrip] = useState(true);
  const [from, setFrom] = useState('HAN');
  const [to, setTo] = useState('SGN');
  const [departDate, setDepartDate] = useState(() => toInputDate(new Date(Date.now() + 86400000)));
  const [returnDate, setReturnDate] = useState(() =>
    toInputDate(new Date(Date.now() + 7 * 86400000))
  );
  const [passengers, setPassengers] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [currency, setCurrency] = useState<string>('VND');
  const [cheapestOnly, setCheapestOnly] = useState(false);

  const search = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({
      from,
      to,
      depart: departDate,
      pax: String(passengers),
      cur: currency,
    });
    if (roundTrip) params.set('return', returnDate);
    if (promoCode.trim()) params.set('promo', promoCode.trim());
    if (cheapestOnly) params.set('sort', 'cheapest');
    router.push(`/tim-ve?${params.toString()}`);
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#e9f2fb]">
      {/* Full-bleed campaign artwork with no scrim in front of it, exactly like
          the vietjetair.com hero. */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={HERO_ARTWORK}
          alt=""
          className="h-full w-full object-cover object-left lg:object-center"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1920px] flex-col px-4 pb-7 pt-[150px] sm:px-6 sm:pt-[230px] lg:min-h-[560px] lg:items-end lg:justify-center lg:px-10 lg:pb-10 lg:pt-10 xl:min-h-[640px] xl:px-[104px]">
        {/* The campaign headline is baked into the artwork, so the page outline
            keeps a screen-reader title instead of duplicating it visually. */}
        <p className="sr-only">Bay là thích ngay</p>
        <h1 className="sr-only">Chuyến bay tốt giá bắt đầu từ đây</h1>

        <form
          id="hero-booking-form"
          onSubmit={search}
          className="w-full rounded bg-[var(--primary)] p-3.5 shadow-[0_12px_36px_rgba(71,0,0,0.3)] lg:w-[392px] lg:shrink-0"
        >
          <nav
            className="mb-3 flex items-stretch gap-px rounded bg-white/30"
            aria-label="Dịch vụ chuyến bay"
          >
            {BOOKING_TABS.map((tab) => {
              const active = tab.id === 'booking';
              return (
                <a
                  key={tab.id}
                  href={tab.href}
                  aria-current={active ? 'true' : undefined}
                  className={`flex flex-1 items-center justify-center rounded-[2px] px-1.5 py-2 text-center text-[10px] font-bold leading-[1.2] transition-colors sm:text-[11px] ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--primary-deep)]'
                      : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
                  }`}
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3">
            {[
              { value: true, label: 'Khứ hồi' },
              { value: false, label: 'Một chiều' },
            ].map(({ value, label }) => (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-white"
              >
                <input
                  type="radio"
                  name="trip-type"
                  checked={roundTrip === value}
                  onChange={() => setRoundTrip(value)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                <span>{label}</span>
              </label>
            ))}

            <a
              href="/tim-ve"
              className="ml-auto flex items-center text-xs font-bold text-white hover:underline"
            >
              Nhiều chặng
              <MdArrowOutward className="text-sm" />
            </a>

            <label className="flex items-center rounded border border-white/70 px-1.5 py-0.5">
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                aria-label="Loại tiền tệ"
                className="cursor-pointer appearance-none border-0 bg-transparent text-xs font-bold text-white outline-none"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code} className="text-[#333333]">
                    {code}
                  </option>
                ))}
              </select>
              <MdExpandMore className="text-sm text-white" />
            </label>
          </div>

          {/* Departure / destination paired with their dates, with the swap
              control hugging the left gutter between the two rows. */}
          <div className="relative">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.3fr_1fr]">
              <AirportField
                label="Điểm khởi hành"
                value={from}
                onChange={setFrom}
                icon={<MdFlightTakeoff className={iconClass} />}
              />
              <DateField
                label="Ngày đi"
                value={departDate}
                min={toInputDate(new Date())}
                onChange={setDepartDate}
              />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1.3fr_1fr]">
              <AirportField
                label="Điểm đến"
                value={to}
                onChange={setTo}
                icon={<MdFlightLand className={iconClass} />}
              />
              {roundTrip && (
                <DateField
                  label="Ngày về"
                  value={returnDate}
                  min={departDate}
                  onChange={setReturnDate}
                />
              )}
            </div>

            <button
              type="button"
              aria-label="Đổi điểm khởi hành và điểm đến"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="absolute -left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white text-base text-[var(--primary)] shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:bg-[#fff3f3]"
            >
              <MdSwapHoriz />
            </button>
          </div>

          <label className={`mt-2 ${fieldClass}`}>
            <MdPeople className={iconClass} />
            <span className="min-w-0 flex-1">
              <span className={labelClass}>Hành khách</span>
              <select
                value={passengers}
                onChange={(event) => setPassengers(Number(event.target.value))}
                aria-label="Số hành khách"
                className={`${inputClass} cursor-pointer appearance-none`}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                  <option key={count} value={count}>
                    {count} người lớn
                  </option>
                ))}
              </select>
            </span>
            <MdExpandMore className={iconClass} />
          </label>

          <label className={`mt-2 ${fieldClass}`}>
            <MdConfirmationNumber className={iconClass} />
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder="Mã khuyến mại"
              className="min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-extrabold text-[#333333] outline-none placeholder:font-bold placeholder:text-[#8c8c8c]"
            />
          </label>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-bold text-white">
            <input
              type="checkbox"
              checked={cheapestOnly}
              onChange={(event) => setCheapestOnly(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span>Tìm vé rẻ nhất</span>
          </label>

          <button type="submit" className="vj-cta mt-3 w-full px-4 text-sm font-extrabold">
            Tìm chuyến bay
          </button>
        </form>
      </div>
    </section>
  );
}

function AirportField({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <label className={fieldClass}>
      {icon}
      <span className="min-w-0 flex-1">
        <span className={labelClass}>{label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className={`${inputClass} cursor-pointer appearance-none`}
        >
          {AIRPORTS.map((airport) => (
            <option key={airport.code} value={airport.code}>
              {airport.city} ({airport.code})
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={fieldClass}>
      <MdCalendarMonth className={iconClass} />
      <span className="min-w-0 flex-1">
        <span className={labelClass}>{label}</span>
        <input
          type="date"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className={`${inputClass} cursor-pointer`}
        />
      </span>
    </label>
  );
}
