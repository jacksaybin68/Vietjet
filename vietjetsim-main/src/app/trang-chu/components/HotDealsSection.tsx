'use client';
import React from 'react';
import Link from 'next/link';
import { FaArrowRight, FaEye } from 'react-icons/fa';

const HOT_DEALS = [
  {
    from: 'Mumbai (BOM)',
    to: 'Hà Nội (HAN)',
    date: '28/10/2026',
    type: 'Một chiều / Eco',
    price: 1490000,
    seen: '14 phút trước',
    image: '/images/hero/hero-hongkong-skyline.jpg',
  },
  {
    from: 'Mumbai (BOM)',
    to: 'Hà Nội (HAN)',
    date: '28/10/2026',
    type: 'Một chiều / SkyBoss',
    price: 2990000,
    seen: '19 phút trước',
    image: '/images/hero/hero-skyboss-cabin.jpg',
  },
  {
    from: 'Mumbai (BOM)',
    to: 'Hà Nội (HAN)',
    date: '28/10/2026',
    type: 'Một chiều / Eco',
    price: 1590000,
    seen: '53 phút trước',
    image: '/images/hero/hero-tet-celebration.jpg',
  },
  {
    from: 'New Delhi (DEL)',
    to: 'TP. HCM (SGN)',
    date: '18/07/2027',
    type: 'Chuyến đi / Eco',
    price: 1790000,
    seen: '11 phút trước',
    image: '/images/hero/hero-sale-aerial.jpg',
  },
  {
    from: 'Hyderabad (HYD)',
    to: 'Đà Nẵng (DAD)',
    date: '06/10/2026',
    type: 'Một chiều / Eco',
    price: 1890000,
    seen: '2 giờ trước',
    image: '/images/hero/hero-artwork-beach-sunset.jpg',
  },
  {
    from: 'Kuala Lumpur (KUL)',
    to: 'Hà Nội (HAN)',
    date: '06/01/2027',
    type: 'Một chiều / Eco',
    price: 790000,
    seen: '1 giờ trước',
    image: '/images/hero/hero-hongkong-skyline.jpg',
  },
  {
    from: 'Singapore (SIN)',
    to: 'Phú Quốc (PQC)',
    date: '09/01/2027',
    type: 'Một chiều / Eco',
    price: 399000,
    seen: '12 phút trước',
    image: '/images/hero/hero-skyboss-cabin.jpg',
  },
  {
    from: 'Bangkok (BKK)',
    to: 'TP. HCM (SGN)',
    date: '15/12/2026',
    type: 'Một chiều / Eco',
    price: 690000,
    seen: '25 phút trước',
    image: '/images/hero/hero-tet-celebration.jpg',
  },
  {
    from: 'Tokyo (NRT)',
    to: 'Hà Nội (HAN)',
    date: '20/11/2026',
    type: 'Một chiều / Eco',
    price: 1990000,
    seen: '3 giờ trước',
    image: '/images/hero/hero-sale-aerial.jpg',
  },
];

function formatVND(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

export default function HotDealsSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-primary mb-2">
            Ưu đãi hấp dẫn
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy tracking-tight">
            Chuyến bay phổ biến
          </h2>
          <p className="text-sm sm:text-base text-vj-gray mt-3 max-w-2xl mx-auto">
            Theo dõi giá vé được cập nhật liên tục từ các điểm đến yêu thích
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {HOT_DEALS.map((deal, i) => (
            <div
              key={i}
              className="group flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.1)] transition-all duration-250"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden">
                <img
                  src={deal.image}
                  alt={`${deal.from} - ${deal.to}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-navy/30" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs2 font-semibold text-vj-gray uppercase tracking-wider">
                  {deal.type}
                </p>
                <h3 className="text-sm sm:text-base font-black text-navy truncate mt-0.5">
                  {deal.from} <span className="text-vjred">→</span> {deal.to}
                </h3>
                <p className="text-xs2 text-vj-gray mt-0.5">
                  Ngày đi: <span className="font-semibold text-navy">{deal.date}</span>
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-3xs text-vj-gray font-semibold uppercase">Giá từ</p>
                    <p className="text-xl sm:text-2xl font-black text-vjred leading-none">
                      {formatVND(deal.price)}
                    </p>
                  </div>
                  <Link
                    href="/tim-ve"
                    className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary hover:bg-primary-dark text-white transition-all shadow-md hover:shadow-lg hover:scale-110"
                  >
                    <FaArrowRight size={12} />
                  </Link>
                </div>
                <div className="flex items-center gap-1 mt-2 text-2xs text-vj-muted">
                  <FaEye size={9} />
                  <span>Xem {deal.seen}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
