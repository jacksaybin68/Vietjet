'use client';
import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaMapMarkerAlt } from 'react-icons/fa';

const REGIONS = [
  {
    name: 'Việt Nam',
    routes: [
      'TP. Hồ Chí Minh',
      'Hà Nội',
      'Đà Nẵng',
      'Nha Trang',
      'Phú Quốc',
      'Đà Lạt',
      'Hải Phòng',
      'Cần Thơ',
      'Huế',
      'Quy Nhơn',
      'Thanh Hóa',
      'Vinh',
      'Buôn Ma Thuột',
      'Pleiku',
    ],
  },
  {
    name: 'Thái Lan',
    routes: [
      'Bangkok',
      'Chiang Mai',
      'Phuket',
      'Koh Samui',
      'Krabi',
      'Hat Yai',
      'Rayong',
      'Nakhon Si Thammarat',
    ],
  },
  {
    name: 'Trung Quốc',
    routes: [
      'Thượng Hải',
      'Bắc Kinh',
      'Quảng Châu',
      'Thâm Quyến',
      'Chengdu',
      'Trùng Khánu',
      'Hàng Châu',
      'Tây An',
    ],
  },
  {
    name: 'Ấn Độ',
    routes: [
      'Mumbai',
      'New Delhi',
      'Bengaluru',
      'Hyderabad',
      'Chennai',
      'Kolkata',
      'Ahmedabad',
      'Pune',
    ],
  },
  {
    name: 'Myanmar',
    routes: ['Yangon', 'Mandalay', 'Naypyidaw'],
  },
  {
    name: 'Nhật Bản',
    routes: ['Tokyo', 'Osaka', 'Nagoya', 'Fukuoka', 'Hiroshima', 'Sendai'],
  },
  {
    name: 'Hồng Kông (TQ)',
    routes: ['Hồng Kông'],
  },
  {
    name: 'Philippines',
    routes: ['Manila', 'Cebu', 'Clark', 'Davao'],
  },
  {
    name: 'Indonesia',
    routes: ['Jakarta', 'Bali (Denpasar)', 'Surabaya'],
  },
  {
    name: 'Úc',
    routes: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Western Sydney (WSI)'],
  },
  {
    name: 'Malaysia',
    routes: ['Kuala Lumpur', 'Penang', 'Kota Kinabalu', 'Langkawi'],
  },
  {
    name: 'Quốc tế',
    routes: [],
  },
  {
    name: 'Kazakhstan',
    routes: ['Almaty', 'Astana'],
  },
  {
    name: 'Lào',
    routes: ['Vientiane', 'Luang Prabang'],
  },
  {
    name: 'Singapore',
    routes: ['Singapore'],
  },
  {
    name: 'Ma Cao (TQ)',
    routes: ['Ma Cao'],
  },
  {
    name: 'Hàn Quốc',
    routes: ['Seoul', 'Busan', 'Jeju'],
  },
  {
    name: 'Đài Loan (TQ)',
    routes: ['Đài Bắc', 'Cao Hùng', 'Đài Trung'],
  },
  {
    name: 'Campuchia',
    routes: ['Phnom Penh', 'Siem Reap'],
  },
];

export default function FlyEverywhereSection() {
  const [expanded, setExpanded] = useState<string | null>('Việt Nam');

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-primary mb-2">
            Mạng lưới đường bay
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy tracking-tight">
            Bay khắp nơi cùng Vietjet
          </h2>
          <p className="text-sm sm:text-base text-vj-gray mt-3 max-w-2xl mx-auto">
            Khám phá hơn 120 đường bay trong nước và quốc tế đến các điểm đến hấp dẫn nhất châu Á -
            Thái Bình Dương
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {REGIONS.map((region) => {
            const isOpen = expanded === region.name;
            return (
              <div
                key={region.name}
                className="rounded-xl border border-gray-200 bg-gradient-to-br from-stone-50 to-white overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : region.name)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FaMapMarkerAlt
                      className={`flex-shrink-0 ${isOpen ? 'text-primary' : 'text-vj-gray'}`}
                      size={14}
                    />
                    <span
                      className={`text-sm font-bold truncate ${isOpen ? 'text-primary' : 'text-navy'}`}
                    >
                      {region.name}
                    </span>
                  </div>
                  {region.routes.length > 0 ? (
                    isOpen ? (
                      <FaChevronUp className="flex-shrink-0 text-primary" size={12} />
                    ) : (
                      <FaChevronDown className="flex-shrink-0 text-vj-gray" size={12} />
                    )
                  ) : (
                    <span className="flex-shrink-0 text-xs font-semibold text-vj-gray">Sắp mở</span>
                  )}
                </button>
                {isOpen && region.routes.length > 0 && (
                  <ul className="px-4 pb-3 pt-1 space-y-1.5 border-t border-gray-100">
                    {region.routes.map((route) => (
                      <li key={route}>
                        <a
                          href={`/tim-ve?to=${encodeURIComponent(route)}`}
                          className="text-xs sm:text-sm text-vj-gray hover:text-primary transition-colors block py-0.5"
                        >
                          • {route}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
