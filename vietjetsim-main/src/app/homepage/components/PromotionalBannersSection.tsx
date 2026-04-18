'use client';
import React from 'react';
import Link from 'next/link';

const PROMO_DATA = [
  {
    title: 'Sky Space',
    description: 'Trải nghiệm phòng chờ hạng sang, thư giãn tối đa trước chuyến bay.',
    image: '/assets/images/banners/sky_space.png',
    color: 'bg-red-500',
    link: '/services',
  },
  {
    title: 'Bảo hiểm Du lịch',
    description: 'An tâm trọn vẹn trên mọi hành trình với gói bảo hiểm toàn diện.',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb',
    color: 'bg-blue-600',
    link: '/services',
  },
  {
    title: 'Kết nối E-Sim',
    description: 'Giữ liên lạc thông suốt tại hơn 100 quốc gia mà không cần đổi Sim.',
    image: 'https://images.unsplash.com/photo-1556656793-062ff98782ee',
    color: 'bg-green-600',
    link: '/services',
  },
];

export default function PromotionalBannersSection() {
  return (
    <section className="py-16 bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="mb-10">
          <h2 className="text-3xl font-black text-[#1A2948] font-body italic">
            DỊCH VỤ <span className="text-[#EC2029]">VỆ TINH</span> CAO CẤP
          </h2>
          <div className="h-1.5 w-20 bg-[#EC2029] mt-3 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROMO_DATA.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className="group block relative h-[400px] rounded-3xl overflow-hidden bg-gray-200 shadow-lg"
            >
              {/* Simple background image or color fallback */}
              <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all z-10" />

              <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end text-white">
                <span
                  className={`inline-block px-3 py-1 rounded-lg ${item.color} text-xs font-bold mb-3 w-fit`}
                >
                  NEW SERVICE
                </span>
                <h3 className="text-2xl font-black italic uppercase mb-2">{item.title}</h3>
                <p className="text-sm opacity-90 line-clamp-2">{item.description}</p>
                <div className="mt-4 font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                  Chi tiết <span>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
