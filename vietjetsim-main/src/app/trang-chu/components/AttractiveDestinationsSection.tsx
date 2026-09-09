'use client';
import React from 'react';
import { AppImage } from '@/shared/components/ui';
import { FaStar, FaPlane } from 'react-icons/fa';

const DESTINATIONS = [
  {
    city: 'TP. Hồ Chí Minh',
    country: 'Việt Nam',
    price: 399000,
    image: '/images/hero/download.jpg',
    tag: 'Nội địa',
  },
  {
    city: 'Hà Nội',
    country: 'Việt Nam',
    price: 499000,
    image: '/images/hero/banner-1-hongkong.jpg',
    tag: 'Nội địa',
  },
  {
    city: 'Đà Nẵng',
    country: 'Việt Nam',
    price: 599000,
    image: '/images/hero/banner-2-skyboss.jpg',
    tag: 'Nội địa',
  },
  {
    city: 'Phú Quốc',
    country: 'Việt Nam',
    price: 299000,
    image: '/images/hero/banner-3-loc-vang.jpg',
    tag: 'Biển đảo',
  },
  {
    city: 'Bangkok',
    country: 'Thái Lan',
    price: 99000,
    image: '/images/hero/banner-4-44-sale.jpg',
    tag: 'Quốc tế',
  },
  {
    city: 'Singapore',
    country: 'Singapore',
    price: 199000,
    image: '/images/hero/download-1.jpg',
    tag: 'Quốc tế',
  },
];

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function AttractiveDestinationsSection() {
  return (
    <section className="bg-gradient-to-b from-stone-50 to-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-primary mb-2">
            Điểm đến hấp dẫn
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy tracking-tight">
            Khám phá những điểm đến yêu thích
          </h2>
          <p className="text-sm sm:text-base text-vj-gray mt-3 max-w-2xl mx-auto">
            Giá vé chỉ từ <span className="font-bold text-primary">99.000đ</span> cho mỗi hành trình
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
          {DESTINATIONS.map((dest, i) => (
            <a
              key={i}
              href={`/tim-ve?to=${encodeURIComponent(dest.city)}`}
              className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <AppImage
                  src={dest.image}
                  alt={`Du lịch ${dest.city}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    dest.tag === 'Nội địa'
                      ? 'bg-accent text-navy'
                      : dest.tag === 'Biển đảo'
                        ? 'bg-white/90 text-primary'
                        : 'bg-primary text-white'
                  }`}
                >
                  {dest.tag}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
                    {dest.country}
                  </p>
                  <h3 className="text-base sm:text-lg font-black leading-tight">{dest.city}</h3>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[10px] text-vj-gray font-semibold uppercase">Từ</span>
                  <div className="flex items-center gap-1 text-primary font-black text-sm">
                    {formatVND(dest.price)}
                    <FaPlane
                      className="opacity-60 group-hover:translate-x-0.5 transition-transform"
                      size={10}
                    />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
