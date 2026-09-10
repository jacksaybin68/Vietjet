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
    price: 15.0,
    seen: '14 phút trước',
    image: '/images/hero/banner-1-hongkong.jpg',
  },
  {
    from: 'Mumbai (BOM)',
    to: 'Hà Nội (HAN)',
    date: '28/10/2026',
    type: 'Một chiều / Eco',
    price: 15.0,
    seen: '19 phút trước',
    image: '/images/hero/banner-2-skyboss.jpg',
  },
  {
    from: 'Mumbai (BOM)',
    to: 'Hà Nội (HAN)',
    date: '28/10/2026',
    type: 'Một chiều / Eco',
    price: 15.0,
    seen: '53 phút trước',
    image: '/images/hero/banner-3-loc-vang.jpg',
  },
  {
    from: 'New Delhi (DEL)',
    to: 'TP. HCM (SGN)',
    date: '18/07/2027',
    type: 'Chuyến đi / Eco',
    price: 38.0,
    seen: '11 phút trước',
    image: '/images/hero/banner-4-44-sale.jpg',
  },
  {
    from: 'Hyderabad (HYD)',
    to: 'Đà Nẵng (DAD)',
    date: '06/10/2026',
    type: 'Một chiều / Eco',
    price: 102.0,
    seen: '2 giờ trước',
    image: '/images/hero/download.jpg',
  },
  {
    from: 'Kuala Lumpur (KUL)',
    to: 'Hà Nội (HAN)',
    date: '06/01/2027',
    type: 'Một chiều / Eco',
    price: 7.67,
    seen: '1 giờ trước',
    image: '/images/hero/banner-1-hongkong.jpg',
  },
  {
    from: 'Singapore (SIN)',
    to: 'Phú Quốc (PQC)',
    date: '09/01/2027',
    type: 'Một chiều / Eco',
    price: 0.73,
    seen: '12 phút trước',
    image: '/images/hero/banner-2-skyboss.jpg',
  },
  {
    from: 'Bangkok (BKK)',
    to: 'TP. HCM (SGN)',
    date: '15/12/2026',
    type: 'Một chiều / Eco',
    price: 23.5,
    seen: '25 phút trước',
    image: '/images/hero/banner-3-loc-vang.jpg',
  },
  {
    from: 'Tokyo (NRT)',
    to: 'Hà Nội (HAN)',
    date: '20/11/2026',
    type: 'Một chiều / Eco',
    price: 89.0,
    seen: '3 giờ trước',
    image: '/images/hero/banner-4-44-sale.jpg',
  },
];

export default function HotDealsSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              className="group flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
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
                <p className="text-[11px] font-semibold text-vj-gray uppercase tracking-wider">
                  {deal.type}
                </p>
                <h3 className="text-sm sm:text-base font-black text-navy truncate mt-0.5">
                  {deal.from} <span className="text-primary">→</span> {deal.to}
                </h3>
                <p className="text-[11px] text-vj-gray mt-0.5">
                  Ngày đi: <span className="font-semibold text-navy">{deal.date}</span>
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-[9px] text-vj-gray font-semibold uppercase">Giá từ</p>
                    <p className="text-lg sm:text-xl font-black text-primary leading-none">
                      {deal.price.toFixed(2)} USD
                    </p>
                  </div>
                  <Link
                    href="/tim-ve"
                    className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary hover:bg-primary-dark text-white transition-all shadow-md hover:shadow-lg hover:scale-110"
                  >
                    <FaArrowRight size={12} />
                  </Link>
                </div>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-vj-muted">
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
