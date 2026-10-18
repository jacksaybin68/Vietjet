'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MdArrowOutward,
  MdCalendarMonth,
  MdChevronLeft,
  MdChevronRight,
  MdConfirmationNumber,
  MdExpandMore,
  MdSwapHoriz,
} from 'react-icons/md';
import AirportPicker, { type Airport } from './AirportPicker';
import PassengerPicker, { type PaxCounts } from './PassengerPicker';

/**
 * Fallback list, used for the first paint and if the airports API is down. The
 * live list comes from the `airports` table so a new airport needs a migration
 * only, not a code change here.
 */
const FALLBACK_AIRPORTS: Airport[] = [
  { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
  { code: 'SGN', city: 'TP. Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
  { code: 'DAD', city: 'Đà Nẵng', airport: 'Đà Nẵng' },
  { code: 'PQC', city: 'Phú Quốc', airport: 'Phú Quốc' },
  { code: 'CXR', city: 'Nha Trang', airport: 'Cam Ranh' },
  { code: 'HPH', city: 'Hải Phòng', airport: 'Cát Bi' },
  { code: 'HUI', city: 'Huế', airport: 'Phú Bài' },
  { code: 'VDO', city: 'Quảng Ninh', airport: 'Vân Đồn' },
  { code: 'VCA', city: 'Cần Thơ', airport: 'Cần Thơ' },
  { code: 'PXU', city: 'Pleiku', airport: 'Pleiku' },
  { code: 'BMV', city: 'Buôn Ma Thuột', airport: 'Buôn Ma Thuột' },
  { code: 'DLI', city: 'Đà Lạt', airport: 'Liên Khương' },
  { code: 'VCS', city: 'Côn Đảo', airport: 'Côn Đảo' },
  { code: 'THD', city: 'Thanh Hóa', airport: 'Thọ Xuân' },
  { code: 'VII', city: 'Vinh', airport: 'Vinh' },
  { code: 'VDH', city: 'Quảng Bình', airport: 'Đồng Hới' },
  { code: 'UIH', city: 'Quy Nhơn', airport: 'Phù Cát' },
  { code: 'VCL', city: 'Chu Lai', airport: 'Chu Lai' },
  { code: 'DIN', city: 'Điện Biên Phủ', airport: 'Ely Nguyen Binh Khiem' },
  { code: 'VKG', city: 'Rạch Giá', airport: 'Rạch Giá' },
  { code: 'HXX', city: 'Hà Giang', airport: 'Hà Giang' },
  { code: 'TUQ', city: 'Tuyên Quang', airport: 'Tuyên Quang' },
  { code: 'BBU', city: 'Quảng Trạch', airport: 'Bãi Bụt' },
  { code: 'TBB', city: 'Phú Yên', airport: 'Tuy Hòa' },
  // International, added by 028 to keep this list in step with the table. Kept
  // as literals rather than derived: this array has to be a plain value for the
  // first paint, and the airports API replaces it moments later anyway.
  { code: 'SIN', city: 'Singapore', airport: 'Changi' },
  { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi' },
  { code: 'DMK', city: 'Bangkok', airport: 'Don Mueang' },
  { code: 'KUL', city: 'Kuala Lumpur', airport: 'Kuala Lumpur' },
  { code: 'CGK', city: 'Jakarta', airport: 'Soekarno-Hatta' },
  { code: 'MNL', city: 'Manila', airport: 'Ninoy Aquino' },
  { code: 'PNH', city: 'Phnom Penh', airport: 'Phnom Penh' },
  { code: 'RGN', city: 'Yangon', airport: 'Yangon' },
  { code: 'VTE', city: 'Vientiane', airport: 'Wattay' },
  { code: 'ICN', city: 'Seoul', airport: 'Incheon' },
  { code: 'KIX', city: 'Osaka', airport: 'Kansai' },
  { code: 'NRT', city: 'Tokyo', airport: 'Narita' },
  { code: 'HKG', city: 'Hong Kong', airport: 'Hong Kong' },
];

/**
 * Danh sách Banner Quảng Cáo của Vietjet làm nền Hero Banner Slider.
 */
export const HERO_BANNERS = [
  {
    id: 'banner-vietjet-holiday',
    image: '/images/hero/f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg',
    badge: 'Khuyến mại đặc biệt',
    title: 'Bay cùng Vietjet - Bay là thích ngay',
    subtitle: 'Khám phá hàng ngàn điểm đến với mức giá cực kỳ ưu đãi',
  },
  {
    id: 'banner-vietjet-0dong',
    image: '/images/hero/9-fare-website-2.webp',
    badge: 'Săn vé 0 đồng',
    title: 'Vé máy bay siêu tiết kiệm chỉ từ 0đ',
    subtitle: 'Áp dụng cho mọi đường bay nội địa & quốc tế hot nhất',
  },
  {
    id: 'banner-vietjet-international',
    image: '/images/hero/eng-8-fare-website-1.webp',
    badge: 'Đường bay quốc tế',
    title: 'Kết nối năm châu - Chạm đỉnh cao mới',
    subtitle: 'Thoả sức vi vu Nhật Bản, Hàn Quốc, Úc, Ấn Độ cùng Vietjet',
  },
  {
    id: 'banner-vietjet-skyboss',
    image: '/images/hero/261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg',
    badge: 'Dịch vụ SkyBoss',
    title: 'Trải nghiệm phong cách Người dẫn đầu',
    subtitle: 'Phòng chờ hạng sang, hành lý ưu tiên và phục vụ chu đáo',
  },
];

const HERO_ARTWORK = '/images/hero/f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg';

/**
 * Tab strip of the hero booking card, mirrored from vietjetair.com: the active
 * tab is gold with dark-red type, the inactive tabs are white on red.
 */
const BOOKING_TABS = [
  {
    id: 'services',
    label: 'Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa...',
    href: '/dich-vu',
  },
  { id: 'booking', label: 'Đặt chuyến đi & Mua SkyJoy', href: '#hero-booking-form' },
  { id: 'cargo', label: 'Gửi hàng nhanh', href: '/dich-vu' },
] as const;

const CURRENCIES = ['VND', 'USD'] as const;

// 16px on mobile: anything smaller makes iOS Safari zoom the page the moment a
// field takes focus, and the user never sees the form again.
const inputClass =
  'w-full min-w-0 border-0 bg-transparent px-0 text-base font-extrabold text-[#222222] outline-none disabled:cursor-not-allowed disabled:text-[#8b9099] sm:text-sm';
const labelClass =
  'block text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-[#767676]';
/**
 * Airport + date share a single bordered box split 2:1 by a `|` hairline, the
 * way vietjetair.com pairs a route field with its date. The group owns the
 * border, the rounding and the focus colour.
 */
const pairedFieldClass =
  'flex items-center gap-2.5 bg-white px-3.5 py-2.5 transition-colors focus-within:bg-[#fffdf3] sm:py-2';
const pairedFieldWideClass = 'sm:col-span-2';
const fieldGroupClass =
  'grid grid-cols-1 divide-y divide-[#e4e4e4] overflow-hidden rounded-xl border border-[#e4e4e4] bg-white shadow-sm transition-all focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] sm:grid-cols-[2fr_1fr] sm:divide-x sm:divide-y-0';
const fieldClass =
  'flex items-center gap-2.5 rounded-xl border border-[#e4e4e4] bg-white px-3.5 py-2.5 shadow-sm transition-all focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] focus-within:bg-[#fffdf3] sm:py-2';
const iconClass = 'shrink-0 text-lg text-[#555555]';
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
  const [paxCounts, setPaxCounts] = useState<PaxCounts>({ adult: 1, child: 0, infant: 0 });
  const [airports, setAirports] = useState<Airport[]>(FALLBACK_AIRPORTS);

  // Prefer the table so the picker can never offer an airport the database does
  // not know about. The fallback list keeps the form usable if this fails.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/san-bay');
        if (!res?.ok) return;
        const data = await res.json();
        const list = data?.airports as Airport[] | undefined;
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setAirports(list);
        }
      } catch {
        /* keep the fallback list */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // A city can be re-coded, so keep the selection valid against the live list.
  useEffect(() => {
    setFrom((current) => (airports.some((a) => a.code === current) ? current : airports[0].code));
    setTo((current) => (airports.some((a) => a.code === current) ? current : airports[0].code));
  }, [airports]);
  const [promoCode, setPromoCode] = useState('');
  const [currency, setCurrency] = useState<string>('VND');
  const [cheapestOnly, setCheapestOnly] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + HERO_BANNERS.length) % HERO_BANNERS.length);
  };

  const handleNextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({
      from,
      to,
      depart: departDate,
      pax: String(paxCounts.adult),
      cur: currency,
    });
    // Only sent when non-zero so a plain one-adult search keeps its old URL.
    if (paxCounts.child > 0) params.set('child', String(paxCounts.child));
    if (paxCounts.infant > 0) params.set('infant', String(paxCounts.infant));
    if (roundTrip) params.set('return', returnDate);
    if (promoCode.trim()) params.set('promo', promoCode.trim());
    if (cheapestOnly) params.set('sort', 'cheapest');
    router.push(`/tim-ve?${params.toString()}`);
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#b11116] min-h-[640px] xl:min-h-[720px]">
      {/* Banner Quảng Cáo Slider / Carousel làm nền sống động.
          Chỉ render banner hiện tại: các banner inactive dùng `opacity-0`
          vẫn chiếm bounding box và gây lỗi hình chồng khung (IMG+IMG) trong
          kiểm tra giao diện. Khi chỉ cần 1 ảnh ở một thời điểm, không còn
          overlap. */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {HERO_BANNERS.map((banner, idx) => (
          <div
            key={banner.id}
            className={`absolute inset-0 ${
              idx === currentBannerIndex ? 'opacity-100 z-0' : 'hidden pointer-events-none'
            }`}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover object-center scale-[1.01] transition-transform duration-10000"
            />
          </div>
        ))}

        {/* Lớp overlay gradient đa tầng giúp làm nổi bật form đặt vé và chữ */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/40 lg:to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1920px] flex-col px-4 pb-7 pt-[30px] sm:px-6 md:px-8 lg:min-h-[640px] lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:pb-10 lg:pt-10 xl:min-h-[720px] xl:px-[104px] z-10 gap-8">
        {/* Artwork đã chứa thông điệp chiến dịch. Chỉ đặt một tiêu đề ngữ nghĩa
            cho trình đọc màn hình, còn controls neo ở đáy để không che banner. */}
        <div className="flex min-h-[250px] flex-1 flex-col justify-end py-4 text-white lg:min-h-[520px] lg:py-10">
          <h1 className="sr-only">{HERO_BANNERS[currentBannerIndex].title}</h1>
          <div className="flex items-center gap-3 self-start rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              {HERO_BANNERS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Banner quảng cáo ${idx + 1}`}
                  onClick={() => setCurrentBannerIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentBannerIndex
                      ? 'w-8 bg-[var(--accent)] shadow'
                      : 'w-2 bg-white/60 hover:bg-white'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 ml-3">
              <button
                type="button"
                onClick={handlePrevBanner}
                aria-label="Banner quảng cáo trước"
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-all"
              >
                <MdChevronLeft className="text-xl" />
              </button>
              <button
                type="button"
                onClick={handleNextBanner}
                aria-label="Banner quảng cáo tiếp theo"
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-all"
              >
                <MdChevronRight className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        <form
          id="hero-booking-form"
          onSubmit={search}
          className="w-full rounded-[12px] bg-[linear-gradient(135deg,var(--primary),var(--primary-dark))] p-4 sm:p-5 shadow-[0_12px_36px_rgba(71,0,0,0.3)] relative overflow-hidden lg:w-[460px] lg:shrink-0"
        >
          {/* Hình nền mờ: sân bay/máy bay phía sau thẻ đặt vé (dùng lại artworkhero đã có). */}
          <img
            src={HERO_ARTWORK}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale -z-10"
            aria-hidden="true"
          />
          {/* Hàng dịch vụ phía trên: 3 mục. Cuộn ngang trên màn hình nhỏ. */}
          <nav
            className="mb-3.5 flex items-stretch gap-px overflow-x-auto rounded-[5px] bg-black/10 p-0.5"
            aria-label="Dịch vụ chuyến bay"
          >
            {BOOKING_TABS.map((tab) => {
              const active = tab.id === 'booking';
              const isCargo = tab.id === 'cargo';
              return (
                <a
                  key={tab.id}
                  href={tab.href}
                  aria-current={active ? 'true' : undefined}
                  className={`flex items-center justify-center rounded-[4px] px-2 py-2 text-center text-[10px] sm:text-[11px] font-bold leading-tight transition-colors ${
                    isCargo ? 'w-[72px] shrink-0' : 'flex-1'
                  } ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--primary-deep)] shadow-sm font-extrabold'
                      : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
                  }`}
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>

          {/* Lựa chọn loại hành trình & tiền tệ trên cùng một hàng */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-3 text-white">
            <div className="flex items-center gap-3">
              {[
                { value: true, label: 'Khứ hồi' },
                { value: false, label: 'Một chiều' },
              ].map(({ value, label }) => (
                <label
                  key={label}
                  className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  <input
                    type="radio"
                    name="trip-type"
                    checked={roundTrip === value}
                    onChange={() => setRoundTrip(value)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)] cursor-pointer"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href="/trang-chu#hero-booking-form"
                className="flex min-h-8 items-center gap-0.5 text-xs font-bold text-white hover:underline transition-opacity"
              >
                <span>Nhiều chặng</span>
                <MdArrowOutward className="text-sm" />
              </a>

              <label className="flex h-7 items-center rounded border border-white/70 bg-white/10 px-2 transition-colors hover:border-white">
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  aria-label="Loại tiền tệ"
                  className="cursor-pointer appearance-none border-0 bg-transparent pr-1 text-xs font-bold text-white outline-none"
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code} className="text-[#333333]">
                      {code}
                    </option>
                  ))}
                </select>
                <MdExpandMore className="text-sm text-white shrink-0 pointer-events-none" />
              </label>
            </div>
          </div>

          {/* Các trường nhập liệu cách nhau 10-12px */}
          <div className="space-y-2.5">
            <div className="relative">
              <div className="space-y-2.5">
                {/* Hàng 1: Điểm khởi hành & Ngày đi */}
                <div className={fieldGroupClass}>
                  <AirportPicker
                    label="Điểm khởi hành"
                    icon="takeoff"
                    value={from}
                    airports={airports}
                    onChange={setFrom}
                    variant="flush"
                  />
                  <label className={pairedFieldClass}>
                    <MdCalendarMonth className={iconClass} />
                    <span className="min-w-0 flex-1">
                      <span className={labelClass}>Ngày đi</span>
                      <input
                        type="date"
                        value={departDate}
                        min={toInputDate(new Date())}
                        onChange={(event) => setDepartDate(event.target.value)}
                        aria-label="Ngày đi"
                        className={`${inputClass} vj-no-native-icon cursor-pointer`}
                      />
                    </span>
                  </label>
                </div>

                {/* Hàng 2: Điểm đến & Ngày về */}
                <div className={fieldGroupClass}>
                  <AirportPicker
                    label="Điểm đến"
                    icon="land"
                    value={to}
                    airports={airports}
                    onChange={setTo}
                    variant="flush"
                    className={roundTrip ? '' : pairedFieldWideClass}
                  />
                  {roundTrip && (
                    <label className={pairedFieldClass}>
                      <MdCalendarMonth className={iconClass} />
                      <span className="min-w-0 flex-1">
                        <span className={labelClass}>Ngày về</span>
                        <input
                          type="date"
                          value={returnDate}
                          min={departDate}
                          onChange={(event) => setReturnDate(event.target.value)}
                          aria-label="Ngày về"
                          className={`${inputClass} vj-no-native-icon cursor-pointer`}
                        />
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Nút hoán đổi điểm đi và điểm đến nằm giữa hai hàng */}
              <button
                type="button"
                aria-label="Đổi điểm khởi hành và điểm đến"
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                }}
                className="absolute -left-3.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-gray-200 bg-white text-lg text-[var(--primary)] shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-transform hover:scale-105 hover:bg-[#fff3f3] active:scale-95"
              >
                <MdSwapHoriz />
              </button>
            </div>

            {/* Hàng 3: Hành khách */}
            <PassengerPicker value={paxCounts} onChange={setPaxCounts} className="mt-0" />

            {/* Hàng 4: Mã khuyến mại */}
            <label className={fieldClass}>
              <MdConfirmationNumber className={iconClass} />
              <input
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value)}
                placeholder="Mã khuyến mại"
                className="min-w-0 flex-1 border-0 bg-transparent px-0 text-base font-extrabold text-[#222222] outline-none placeholder:font-bold placeholder:text-[#8c8c8c] sm:text-sm"
              />
            </label>
          </div>

          {/* Tìm vé rẻ nhất */}
          <label className="mt-2.5 flex min-h-8 cursor-pointer items-center gap-2 text-xs font-bold text-white transition-opacity hover:opacity-90">
            <input
              type="checkbox"
              checked={cheapestOnly}
              onChange={(event) => setCheapestOnly(event.target.checked)}
              className="h-4 w-4 shrink-0 rounded accent-[var(--accent)] cursor-pointer"
            />
            <span>Tìm vé rẻ nhất</span>
          </label>

          {/* Nút Tìm chuyến bay: chiều cao 52px, bo góc 10px, nền vàng */}
          <button
            type="submit"
            className="vj-cta mt-3.5 h-[52px] min-h-[52px] w-full rounded-[10px] px-4 text-base font-black text-black shadow-md transition-all hover:brightness-105 active:scale-[0.99]"
          >
            Tìm chuyến bay
          </button>
        </form>
      </div>
    </section>
  );
}
