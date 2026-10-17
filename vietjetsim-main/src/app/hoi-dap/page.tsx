'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';
import { Header, Footer, PageHero } from '@/shared/components/navigation';
import { CATEGORIES, FAQ_DATA } from './faq-data';

export default function FAQPage() {
  const [openId, setOpenId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Tất cả' || faq.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const toggleAccordion = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] font-body">
      <Header />
      <PageHero
        eyebrow="Hỗ trợ"
        iconName="QuestionMarkCircleIcon"
        title="Câu hỏi thường gặp"
        description="Tìm kiếm câu trả lời nhanh chóng cho các thắc mắc về đặt vé, thanh toán, hành lý và nhiều dịch vụ khác."
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-16 -mt-10 relative z-20">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-vj-md p-2 mb-8 flex items-center">
          <div className="pl-4 text-[#6D6E71]">
            <Icon name="MagnifyingGlassIcon" size={20} />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 outline-none text-[#333333] placeholder:text-[#939598] bg-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-2 text-[#6D6E71] hover:text-[#EC2029] transition-colors"
            >
              <Icon name="XMarkIcon" size={18} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-[#EC2029] text-white shadow-vj-btn'
                  : 'bg-white text-[#333333] hover:bg-red-50 hover:text-[#EC2029] border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white rounded-xl shadow-vj-sm overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-vj-md"
              >
                <button
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        openId === faq.id ? 'bg-[#EC2029] text-white' : 'bg-red-50 text-[#EC2029]'
                      }`}
                    >
                      {faq.category.charAt(0)}
                    </span>
                    <span className="text-[#1A2948] font-semibold text-base">{faq.question}</span>
                  </div>
                  <div
                    className={`transform transition-transform duration-300 text-[#EC2029] ${openId === faq.id ? 'rotate-180' : ''}`}
                  >
                    <Icon name="ChevronDownIcon" size={20} />
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openId === faq.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                    <p className="text-[#333333] leading-relaxed pt-4 pl-11">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-vj-sm">
              <Icon name="MagnifyingGlassIcon" size={40} />
              <p className="text-[#6D6E71] mt-3 font-medium">Không tìm thấy câu hỏi phù hợp.</p>
              <p className="text-[#939598] text-sm mt-1">
                Vui lòng thử từ khóa khác hoặc liên hệ hỗ trợ.
              </p>
            </div>
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-[#1A2948] rounded-2xl p-8 text-center text-white">
          <h3 className="text-xl font-bold mb-2 font-heading-800">
            Vẫn chưa tìm thấy câu trả lời?
          </h3>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/lien-he"
              className="px-6 py-3 rounded-lg bg-[#EC2029] text-white font-bold hover:bg-primary-dark transition-all shadow-vj-btn"
            >
              Gửi tin nhắn
            </Link>
            <a
              href="tel:19006886"
              className="px-6 py-3 rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2"
            >
              <Icon name="PhoneIcon" size={18} />
              Gọi 1900-6886
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
