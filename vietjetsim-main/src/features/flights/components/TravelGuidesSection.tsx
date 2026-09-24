'use client';
import React from 'react';
import { AppImage } from '@/shared/components/ui';
import { FaArrowRight, FaCalendarAlt } from 'react-icons/fa';

const GUIDES = [
  {
    title: 'Sân bay Western Sydney (WSI) ở đâu? Lịch bay Vietjet từ TP. Hồ Chí Minh',
    date: '20/08/2026',
    category: 'Úc',
    image: '/images/hero/banner-1-hongkong.jpg',
  },
  {
    title: 'Hướng dẫn di chuyển từ Kazakhstan sang Cộng hòa Séc: Hành trình Á - Âu',
    date: '15/08/2026',
    category: 'Quốc tế',
    image: '/images/hero/download-1.jpg',
  },
  {
    title: 'Du lịch Quảng Ngãi: Khám phá thiên nhiên hùng vĩ & văn hoá miền Trung',
    date: '10/08/2026',
    category: 'Việt Nam',
    image: '/images/hero/banner-2-skyboss.jpg',
  },
  {
    title: 'Cách xin visa Kazakhstan online 2026 nhanh, đơn giản',
    date: '05/08/2026',
    category: 'Thủ tục',
    image: '/images/hero/banner-3-loc-vang.jpg',
  },
  {
    title: 'Du lịch Sri Lanka: Cẩm nang khám phá đảo quốc Ấn Độ Dương',
    date: '01/08/2026',
    category: 'Quốc tế',
    image: '/images/hero/banner-4-44-sale.jpg',
  },
  {
    title: 'Kinh nghiệm du lịch Hòn Một Nha Trang tự túc từ A-Z',
    date: '28/07/2026',
    category: 'Việt Nam',
    image: '/images/hero/download.jpg',
  },
  {
    title: 'So sánh giá vé máy bay từ Việt Nam đến các nước Đông Nam Á',
    date: '20/07/2026',
    category: 'Mẹo hay',
    image: '/images/hero/download-2.jpg',
  },
  {
    title: 'So sánh chi phí du lịch các nước Đông Nam Á: Nên đi nước nào tiết kiệm',
    date: '15/07/2026',
    category: 'Mẹo hay',
    image: '/images/hero/download-3.jpg',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Việt Nam': 'bg-primary text-white',
  'Quốc tế': 'bg-navy text-white',
  'Thủ tục': 'bg-accent text-navy',
  'Mẹo hay': 'bg-stone-200 text-navy',
};

export default function TravelGuidesSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 sm:mb-10 flex-wrap gap-3">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-primary mb-2">
              Cẩm nang du lịch
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy tracking-tight">
              Cẩm nang &amp; Bài viết mới nhất
            </h2>
          </div>
          <a
            href="/bai-viet"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition-all"
          >
            Xem tất cả
            <FaArrowRight size={12} />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {GUIDES.map((guide, i) => (
            <a
              key={i}
              href="#"
              className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <AppImage
                  src={guide.image}
                  alt={guide.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    CATEGORY_COLORS[guide.category] || 'bg-stone-200 text-navy'
                  }`}
                >
                  {guide.category}
                </span>
              </div>
              <div className="flex-1 p-4 flex flex-col">
                <h3 className="text-sm sm:text-base font-bold text-navy line-clamp-3 group-hover:text-primary transition-colors leading-snug mb-3 flex-1">
                  {guide.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-vj-gray pt-3 border-t border-gray-100">
                  <FaCalendarAlt size={10} />
                  <span>{guide.date}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
