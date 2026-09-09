'use client';

// Last updated: 2026-09-09 - Fixed JSX parsing errors and passenger selector

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import {
  MdCalendarToday,
  MdFlightLand,
  MdFlightTakeoff,
  MdLogin,
  MdPercent,
  MdPerson,
  MdSwapHoriz,
} from 'react-icons/md';

const airports = [
  { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
  { code: 'SGN', city: 'TP. Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
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
  { code: 'VDH', city: 'Đông Hội', airport: 'Đông Hội' },
  { code: 'VII', city: 'Vinh', airport: 'Vinh' },
  { code: 'SYH', city: 'Kon Tum', airport: 'Kon Tum' },
];

export default function HeroSection() {
  const [roundTrip, setRoundTrip] = useState(true);
  const [from, setFrom] = useState('HAN');
  const [to, setTo] = useState('SGN');
  const [pax, setPax] = useState({ adults: 1, children: 0, infants: 0 });
  const [paxOpen, setPaxOpen] = useState(false);
  const paxRef = useRef<HTMLDivElement>(null);

  const airport = (code: string) => airports.find((item) => item.code === code)!;
  const search = (event: FormEvent) => {
    event.preventDefault();
    window.location.href = `/tim-ve?from=${from}&to=${to}&pax=${pax.adults}`;
  };
  const adj = (key: keyof typeof pax, delta: number) =>
    setPax((p) => ({ ...p, [key]: Math.max(key === 'adults' ? 1 : 0, p[key] + delta) }));

  return (
    <section
      className="relative min-h-[565px] overflow-hidden bg-cover bg-center py-10 lg:min-h-[610px] lg:py-14"
      style={{
        backgroundImage:
          "linear-gradient(110deg,rgba(227,30,36,.90),rgba(128,117,214,.56) 50%,rgba(37,99,212,.40)),url('/images/hero/banner-1-hongkong.jpg')",
      }}
    >
      <div className="mx-auto max-w-[1240px] px-4">

        <div className="max-w-xl pt-5 font-[var(--vj-font)] text-white lg:pt-10 animate-fade-in-up">
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[.16em] text-[#FFF200]">
            Vietjet Air
          </p>
          <h1 className="font-[var(--vj-font-heading)] text-5xl font-black leading-[1.05] tracking-[-0.04em] drop-shadow-md sm:text-6xl">
            Bay là thích ngay!
          </h1>
          <p className="mt-3 max-w-md text-base font-normal leading-6 text-white/95 sm:text-xl">
            Sẵn sàng cho hành trình mới với vé bay linh hoạt và nhiều ưu đãi.
          </p>

          <form
            onSubmit={search}
            className="mt-8 w-full max-w-[540px] bg-white rounded-lg shadow-sm p-6 font-[var(--vj-font)]"
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#B91C1C] px-3 py-3 text-center text-[11px] font-bold uppercase leading-[1.25] tracking-[0.02em] text-white sm:text-[12px]">
                Mua hành lý, suất ăn chọn chỗ ngồi...
              </div>
              <div className="rounded-xl bg-[#FFF200] px-3 py-3 text-center text-[11px] font-bold uppercase leading-[1.25] tracking-[0.02em] text-[#1E293B] sm:text-[12px]">
                Đổi thưởng &
                <br />
                Mua Skypoint
              </div>
              <div className="rounded-xl bg-[#B91C1C] px-3 py-3 text-center text-[11px] font-bold uppercase leading-[1.25] tracking-[0.02em] text-white sm:text-[12px]">
                Gửi hàng nhanh
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-[14px] font-bold text-white sm:text-[15px]">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  checked={roundTrip}
                  onChange={() => setRoundTrip(true)}
                  type="radio"
                  name="trip"
                  className="h-4 w-4 accent-[#f3c84d]"
                />
                <span>Khứ hồi</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  checked={!roundTrip}
                  onChange={() => setRoundTrip(false)}
                  type="radio"
                  name="trip"
                  className="h-4 w-4 accent-[#f3c84d]"
                />
                <span>Một chiều</span>
              </label>
              <span className="ml-auto cursor-pointer text-[14px] font-bold text-white/90">
                Nhiều chặng ↗
              </span>
              <span className="text-[14px] font-bold">VND ▾</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex h-[74px] items-center rounded-xl bg-[#f3f3f3] px-4 text-left shadow-sm ring-1 ring-[#e3e3e3]">
                  <MdFlightTakeoff className="text-[28px] text-[#111]" />
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                      Điểm khởi hành
                    </div>
                    <select
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="mt-1 w-full appearance-none bg-transparent text-[17px] font-bold text-[#1E293B] outline-none sm:text-[18px]"
                    >
                      {airports.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.city} ({item.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex h-[74px] items-center rounded-xl bg-[#f3f3f3] px-4 text-left shadow-sm ring-1 ring-[#e3e3e3]">
                  <MdCalendarToday className="text-[26px] text-[#111]" />
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                      Ngày đi
                    </div>
                    <input
                      type="date"
                      defaultValue="2026-04-15"
                      className="mt-1 w-full bg-transparent text-[17px] font-bold text-[#1E293B] outline-none sm:text-[18px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex h-[74px] items-center rounded-xl bg-[#f3f3f3] px-4 text-left shadow-sm ring-1 ring-[#e3e3e3]">
                  <MdFlightLand className="text-[28px] text-[#111]" />
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                      Điểm đến
                    </div>
                    <select
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="mt-1 w-full appearance-none bg-transparent text-[17px] font-bold text-[#1E293B] outline-none sm:text-[18px]"
                    >
                      {airports.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.city} ({item.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex h-[74px] items-center rounded-xl bg-[#f3f3f3] px-4 text-left shadow-sm ring-1 ring-[#e3e3e3]">
                  <MdCalendarToday className="text-[26px] text-[#111]" />
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                      Ngày về
                    </div>
                    <input
                      type="date"
                      defaultValue="2026-04-22"
                      disabled={!roundTrip}
                      className="mt-1 w-full bg-transparent text-[17px] font-bold text-[#1E293B] outline-none disabled:text-[#999] sm:text-[18px]"
                    />
                  </div>
                </div>
              </div>

              {/* Discount Code Input */}
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f3f4f6] px-4">
                <MdPercent className="text-[20px] text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá"
                  className="mt-1 w-full bg-transparent text-[17px] font-bold text-[#1E293B] outline-none sm:text-[18px]"
                />
              </div>

              {/* Passenger Selector - Accordion */}
              <div className="mt-4">
                <div
                  onClick={() => setPaxOpen(!paxOpen)}
                  className="cursor-pointer flex items-center justify-between px-4 py-3 rounded-xl bg-[#f3f3f3] text-[14px] font-medium text-[#1E293B] hover:bg-[#f0f0f0] transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 text-[#E30613]"
                      fill="currentColor"
                    >
                      <path d="M12 2a6 6 0 00-6 6v3H5a2 2 0 00-2 2v5h14V11a2 2 0 00-2-2v-3a6 6 0 00-6-6zm0 10a4 4 0 110-8 4 4 0 010 8z" />
                    </svg>
                    <div>
                      <div className="text-[14px] font-bold text-[#1E293B]">Hành khách</div>
                      <div className="text-[12px] text-[#E30613] font-medium">
                        {pax.adults} người lớn{
                          ' '}
                        {pax.children > 0 && (
                          <>
                            , {pax.children} trẻ em{
                              ' '}
                          </>
                        )}
                        {pax.infants > 0 && (
                          <>
                            , {pax.infants} em bé
                          </>
                        )}
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-5 w-5 transition-transform duration-200 ${
                        paxOpen ? 'rotate-180' : ''
                      }`}
                      fill="currentColor"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {/* Passenger Details Panel */}
                <div
                  className={`mt-3 overflow-hidden transition-all duration-300 ease-in-out ${
                    paxOpen ? 'height-auto' : 'height-0'
                  }`}
                  style={{
                    height: paxOpen ? 'auto' : 0,
                    overflow: paxOpen ? 'visible' : 'hidden',
                  }}
                >
                  <div className="px-4 py-3 bg-[#f8fafc] rounded-b-xl">
                    <div className="grid gap-4">
                      {/* Adults Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 text-[#111]"
                            fill="currentColor"
                          >
                            <path d="M12 2a6 6 0 00-6 6v3H5a2 2 0 00-2 2v5h14V11a2 2 0 00-2-2v-3a6 6 0 00-6-6zm0 10a4 4 0 110-8 4 4 0 010 8z" />
                          </svg>
                          <div>
                            <div className="text-[13px] font-bold text-[#1E293B]">
                              Người lớn
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {'> 12 tuổi'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                adults: Math.max(1, prev.adults - 1)
                              }))
                            }
                            disabled={pax.adults <= 1}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] text-[#6B7280] hover:bg-[#f3f4f6]"
                          >
                            -
                          </button>
                          <span className="text-[16px] font-bold text-[#1E293B]">{pax.adults}</span>
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                adults: prev.adults + 1
                              }))
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] text-[#6B7280] hover:bg-[#f3f4f6]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Children Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 text-[#111]"
                            fill="currentColor"
                          >
                            <path d="M17 12h-5v5h5v-5zM16 5v2H3V3h13v2z" />
                          </svg>
                          <div>
                            <div className="text-[13px] font-bold text-[#1E293B]">
                              Trẻ em
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {'2-12 tuổi'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                children: Math.max(0, prev.children - 1)
                              }))
                            }
                            disabled={pax.children <= 0}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] text-[#6B7280] hover:bg-[#f3f4f6]"
                          >
                            -
                          </button>
                          <span className="text-[16px] font-bold text-[#1E293B]">{pax.children}</span>
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                children: prev.children + 1
                              }))
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] text-[#6B7280] hover:bg-[#f3f4f6]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Infants Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 text-[#111]"
                            fill="currentColor"
                          >
                            <path d="M20 9c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H6v2H4c-1.1 0-2 .9-2 2v6c0 3.31 2.69 6 6 6h6c3.31 0 6-2.69 6-6V9zm-9 3c-.59 0-1-.41-1-1s.41-1 1-1 1 .41 1 1-.41 1-1 1z" />
                          </svg>
                          <div>
                            <div className="text-[13px] font-bold text-[#1E293B]">
                              Em bé
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {'< 2 tuổi'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                infants: Math.max(0, prev.infants - 1)
                              }))
                            }
                            disabled={pax.infants <= 0}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] text-[#6B7280] hover:bg-[#f3f4f6]"
                          >
                            -
                          </button>
                          <span className="text-[16px] font-bold text-[#1E293B]">{pax.infants}</span>
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                infants: prev.infants + 1
                              }))
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] text-[#6B7280] hover:bg-[#f3f4f6]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <label className="mt-2 flex items-center gap-3 text-[14px] font-bold text-white">
                <input type="checkbox" className="h-5 w-5 rounded border-0 accent-[#f3c84d]" />
                <span>Tìm vé rẻ nhất</span>
              </label>

              <button
                type="submit"
                className="mt-4 flex h-[50px] w-full items-center justify-center rounded-full bg-gradient-to-b from-[#ffe000] to-[#ffb800] text-[16px] font-bold uppercase text-[#1f2937] hover:from-[#ffd700] hover:to-[#ffa500] transition-all duration-200"
              >
                Tìm chuyến bay
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}