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
  MdPeople,
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
      className="relative min-h-[565px] overflow-hidden bg-cover bg-center py-10 lg:min-h-[610px] lg:py-14 dark:py-12 dark:lg:py-16"
      style={{
        backgroundImage:
          "linear-gradient(110deg,rgba(227,30,36,.90),rgba(128,117,214,.56) 50%,rgba(37,99,212,.40)),url('/images/hero/banner-1-hongkong.jpg')",
      }}
    >
      <div className="mx-auto max-w-[1240px] px-4">

        <div className="max-w-xl pt-5 font-[var(--vj-font)] text-white lg:pt-10 animate-fade-in-up">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#FFF200] sm:text-[13px]">
            Vietjet Air
          </p>
          <h1 className="font-[var(--vj-font-heading)] text-4xl font-black leading-[1.05] tracking-[-0.04em] drop-shadow-md sm:text-5xl lg:text-6xl">
            Bay là thích ngay!
          </h1>
          <p className="mt-3 max-w-md text-sm font-normal leading-6 text-white/95 sm:text-base lg:text-xl">
            Sẵn sàng cho hành trình mới với vé bay linh hoạt và nhiều ưu đãi.
          </p>

          <form
            onSubmit={search}
            className="mt-6 w-full max-w-[540px] bg-[#EC2029] dark:bg-[#B91C1C] border-2 border-[#EC2029] dark:border-[#B91C1C] rounded-lg shadow-sm p-4 sm:p-6 font-[var(--vj-font)]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <img src="/logo-vj.svg" alt="Vietjet Air" className="h-6 w-auto sm:h-7" />
              <div className="hidden sm:flex gap-2 md:gap-4 text-[11px] font-bold text-white md:text-[12px] lg:text-[13px]">
                <span className="cursor-pointer hover:text-[#FFD400]">Mua hành lý</span>
                <span className="cursor-pointer hover:text-[#FFD400]">Đổi thưởng Skypoint</span>
                <span className="cursor-pointer hover:text-[#FFD400]">Gửi hàng nhanh</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-4 text-[13px] font-bold text-white md:text-[14px] lg:text-[15px]">
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    checked={roundTrip}
                    onChange={() => setRoundTrip(true)}
                    type="radio"
                    name="trip"
                    className="h-4 w-4 accent-[#f3c84d]"
                  />
                  <span className="text-[12px] md:text-[14px]">Khứ hồi</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    checked={!roundTrip}
                    onChange={() => setRoundTrip(false)}
                    type="radio"
                    name="trip"
                    className="h-4 w-4 accent-[#f3c84d]"
                  />
                  <span className="text-[12px] md:text-[14px]">Một chiều</span>
                </label>
                <span className="cursor-pointer text-[12px] md:text-[14px] font-bold text-white/90">
                  Nhiều chặng ↗
                </span>
                <span className="text-[12px] md:text-[14px] font-bold text-white">VND ▾</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 md:space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[4fr_1fr] gap-2 md:gap-3">
                <div className="flex h-[50px] md:h-[58px] items-center rounded-xl bg-white dark:bg-navy-dark border-2 border-[#EC2029] dark:border-[#444] px-3 md:px-4 text-left shadow-sm">
                  <MdFlightTakeoff className="text-[24px] md:text-[32px] text-[#1A2948] dark:text-white/80" />
                  <div className="ml-2 md:ml-3 min-w-0 flex-1">
                    <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.08em] text-[#1A2948] dark:text-white/70">
                      Điểm khởi hành
                    </div>
                    <select
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="mt-1 w-full appearance-none bg-transparent text-[14px] md:text-[19px] font-bold text-[#1A2948] dark:text-white outline-none sm:text-[16px] md:text-[20px]"
                    >
                      {airports.map((item) => (
                        <option key={item.code} value={item.code} className="bg-white dark:bg-navy-dark text-[#1A2948] dark:text-white">
                          {item.city} ({item.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex h-[50px] md:h-[58px] items-center rounded-xl bg-white dark:bg-navy-dark border-2 border-[#EC2029] dark:border-[#444] px-3 md:px-4 text-left shadow-sm">
                  <MdCalendarToday className="text-[16px] md:text-[20px] text-[#1A2948] dark:text-white/80" />
                  <div className="ml-2 md:ml-3 min-w-0 flex-1">
                    <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.08em] text-[#1A2948] dark:text-white/70">
                      Ngày đi
                    </div>
                    <input
                      type="date"
                      defaultValue="2026-04-15"
                      className="mt-1 w-full bg-transparent text-[12px] md:text-[15px] font-bold text-[#1A2948] dark:text-white outline-none sm:text-[14px] md:text-[16px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[4fr_1fr] gap-2 md:gap-3">
                <div className="flex h-[50px] md:h-[58px] items-center rounded-xl bg-white dark:bg-navy-dark border-2 border-[#EC2029] dark:border-[#444] px-3 md:px-4 text-left shadow-sm">
                  <MdFlightLand className="text-[24px] md:text-[32px] text-[#1A2948] dark:text-white/80" />
                  <div className="ml-2 md:ml-3 min-w-0 flex-1">
                    <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.08em] text-[#1A2948] dark:text-white/70">
                      Điểm đến
                    </div>
                    <select
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="mt-1 w-full appearance-none bg-transparent text-[14px] md:text-[19px] font-bold text-[#1A2948] dark:text-white outline-none sm:text-[16px] md:text-[20px]"
                    >
                      {airports.map((item) => (
                        <option key={item.code} value={item.code} className="bg-white dark:bg-navy-dark text-[#1A2948] dark:text-white">
                          {item.city} ({item.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex h-[50px] md:h-[58px] items-center rounded-xl bg-white dark:bg-navy-dark border-2 border-[#EC2029] dark:border-[#444] px-3 md:px-4 text-left shadow-sm">
                  <MdCalendarToday className="text-[16px] md:text-[20px] text-[#1A2948] dark:text-white/80" />
                  <div className="ml-2 md:ml-3 min-w-0 flex-1">
                    <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.08em] text-[#1A2948] dark:text-white/70">
                      Ngày về
                    </div>
                    <input
                      type="date"
                      defaultValue="2026-04-22"
                      disabled={!roundTrip}
                      className="mt-1 w-full bg-transparent text-[12px] md:text-[15px] font-bold text-[#1A2948] dark:text-white outline-none disabled:text-[#999] dark:disabled:text-[#666] sm:text-[14px] md:text-[16px]"
                    />
                  </div>
                </div>
              </div>

              {/* Passenger Selector - Accordion */}
              <div className="mt-2 md:mt-4">
                <div
                  onClick={() => setPaxOpen(!paxOpen)}
                  className="cursor-pointer flex items-center justify-between px-3 md:px-4 py-2 md:py-3 rounded-xl bg-white dark:bg-navy-dark border-2 border-[#EC2029] dark:border-[#444] text-[12px] md:text-[14px] font-medium text-[#1A2948] dark:text-white hover:bg-[#f9f9f9] dark:hover:bg-[#2a2a2a] transition-colors duration-200 h-[46px] md:h-[58px]"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <MdPeople className="h-4 w-4 md:h-5 md:w-5 text-[#E30613] dark:text-[#FFC400]" />
                    <div>
                      <div className="text-[12px] md:text-[14px] font-bold text-[#1A2948] dark:text-white">Hành khách</div>
                      <div className="text-[11px] md:text-[14px] text-[#1A2948] dark:text-white/80 font-bold">
                        {pax.adults} người lớn{' '}
                        {pax.children > 0 && `, ${pax.children} trẻ em `}
                        {pax.infants > 0 && `, ${pax.infants} em bé`}
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 md:h-5 md:w-5 transition-transform duration-200 ${
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
                  className={`mt-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    paxOpen ? 'height-auto' : 'height-0'
                  }`}
                  style={{
                    height: paxOpen ? 'auto' : 0,
                    overflow: paxOpen ? 'visible' : 'hidden',
                  }}
                >
                  <div className="px-3 md:px-4 py-2 bg-[#f8fafc] dark:bg-navy-dark rounded-b-xl">
                    <div className="grid gap-2 md:gap-4">
                      {/* Adults Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                          <MdPerson className="h-4 w-4 md:h-5 md:w-5 text-[#1A2948] dark:text-white/80" />
                          <div>
                            <div className="text-[11px] md:text-[13px] font-bold text-[#1A2948] dark:text-white">
                              Người lớn
                            </div>
                            <div className="text-[9px] md:text-[11px] text-[#1A2948] dark:text-white/70">
                              {'> 12 tuổi'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                adults: Math.max(1, prev.adults - 1)
                              }))
                            }
                            disabled={pax.adults <= 1}
                            className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border border-[#d1d5db] dark:border-[#555] text-[10px] md:text-[12px] text-[#6B7280] dark:text-white/60 hover:bg-[#f3f4f6] dark:hover:bg-[#333]"
                          >
                            -
                          </button>
                          <span className="text-[14px] md:text-[16px] font-bold text-[#1A2948] dark:text-white">{pax.adults}</span>
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                adults: prev.adults + 1
                              }))
                            }
                            className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border border-[#d1d5db] dark:border-[#555] text-[10px] md:text-[12px] text-[#6B7280] dark:text-white/60 hover:bg-[#f3f4f6] dark:hover:bg-[#333]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Children Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 md:h-5 md:w-5 text-[#1A2948] dark:text-white/80"
                            fill="currentColor"
                          >
                            <path d="M17 12h-5v5h5v-5zM16 5v2H3V3h13v2z" />
                          </svg>
                          <div>
                            <div className="text-[11px] md:text-[13px] font-bold text-[#1A2948] dark:text-white">
                              Trẻ em
                            </div>
                            <div className="text-[9px] md:text-[11px] text-[#1A2948] dark:text-white/70">
                              {'2-12 tuổi'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                children: Math.max(0, prev.children - 1)
                              }))
                            }
                            disabled={pax.children <= 0}
                            className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border border-[#d1d5db] dark:border-[#555] text-[10px] md:text-[12px] text-[#6B7280] dark:text-white/60 hover:bg-[#f3f4f6] dark:hover:bg-[#333]"
                          >
                            -
                          </button>
                          <span className="text-[14px] md:text-[16px] font-bold text-[#1A2948] dark:text-white">{pax.children}</span>
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                children: prev.children + 1
                              }))
                            }
                            className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border border-[#d1d5db] dark:border-[#555] text-[10px] md:text-[12px] text-[#6B7280] dark:text-white/60 hover:bg-[#f3f4f6] dark:hover:bg-[#333]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Infants Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 md:h-5 md:w-5 text-[#1A2948] dark:text-white/80"
                            fill="currentColor"
                          >
                            <path d="M20 9c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H6v2H4c-1.1 0-2 .9-2 2v6c0 3.31 2.69 6 6 6h6c3.31 0 6-2.69 6-6V9zm-9 3c-.59 0-1-.41-1-1s.41-1 1-1 1 .41 1 1-.41 1-1 1z" />
                          </svg>
                          <div>
                            <div className="text-[11px] md:text-[13px] font-bold text-[#1A2948] dark:text-white">
                              Em bé
                            </div>
                            <div className="text-[9px] md:text-[11px] text-[#1A2948] dark:text-white/70">
                              {'< 2 tuổi'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                infants: Math.max(0, prev.infants - 1)
                              }))
                            }
                            disabled={pax.infants <= 0}
                            className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border border-[#d1d5db] dark:border-[#555] text-[10px] md:text-[12px] text-[#6B7280] dark:text-white/60 hover:bg-[#f3f4f6] dark:hover:bg-[#333]"
                          >
                            -
                          </button>
                          <span className="text-[14px] md:text-[16px] font-bold text-[#1A2948] dark:text-white">{pax.infants}</span>
                          <button
                            onClick={() =>
                              setPax(prev => ({
                                ...prev,
                                infants: prev.infants + 1
                              }))
                            }
                            className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border border-[#d1d5db] dark:border-[#555] text-[10px] md:text-[12px] text-[#6B7280] dark:text-white/60 hover:bg-[#f3f4f6] dark:hover:bg-[#333]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discount Code Input */}
              <div className="mt-2 md:mt-4 flex items-center gap-2 rounded-xl bg-white dark:bg-navy-dark border-2 border-[#EC2029] dark:border-[#444] px-3 md:px-4 h-[46px] md:h-[58px]">
                <MdPercent className="text-[16px] md:text-[20px] text-[#1A2948] dark:text-white/80" />
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá"
                  className="mt-0 w-full bg-transparent text-[13px] md:text-[17px] font-bold text-[#1A2948] dark:text-white outline-none sm:text-[15px] md:text-[18px]"
                />
              </div>

              <label className="mt-2 flex items-center gap-2 text-[12px] md:text-[14px] font-bold text-white">
                <input type="checkbox" className="h-4 w-4 md:h-5 md:w-5 rounded border-0 accent-[#f3c84d] dark:accent-[#FFC400]" />
                <span>Tìm vé rẻ nhất</span>
              </label>

              <button
                type="submit"
                className="mt-3 md:mt-4 flex h-[44px] md:h-[50px] w-full items-center justify-center rounded-full bg-[#FFD400] dark:bg-[#FFC400]/90 text-[14px] md:text-[16px] font-bold uppercase text-[#1A2948] dark:text-navy-dark hover:bg-[#ffdd00] dark:hover:bg-[#FFC400] transition-all duration-200"
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