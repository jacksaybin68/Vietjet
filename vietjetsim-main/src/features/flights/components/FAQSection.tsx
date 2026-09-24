'use client';
import React, { useState } from 'react';
import { FaChevronDown, FaQuestionCircle } from 'react-icons/fa';

const FAQS = [
  {
    q: 'Làm thế nào để đặt vé máy bay trên website Vietjet?',
    a: 'Bạn có thể đặt vé dễ dàng bằng cách chọn điểm khởi hành, điểm đến, ngày đi/ngày về, số lượng hành khách và nhấn "Tìm chuyến bay". Chọn chuyến bay phù hợp, điền thông tin hành khách và thanh toán. Vé điện tử sẽ được gửi qua email ngay sau khi thanh toán thành công.',
  },
  {
    q: 'Vietjet có những hạng vé nào?',
    a: 'Vietjet cung cấp 4 hạng vé: Eco (Tiết kiệm), Plus, SkyBoss (Thương gia) và Deluxe. Mỗi hạng vé có những tiện ích khác nhau về hành lý, suất ăn, chọn chỗ và quyền ưu tiên.',
  },
  {
    q: 'Hành lý xách tay được phép mang theo bao nhiêu kg?',
    a: 'Hành khách được phép mang 1 kiện hành lý xách tay 7kg (56x36x23cm) và 1 phụ kiện nhỏ (40x30x10cm). Hành lý ký gửi có thể mua thêm từ 15-40kg tùy theo nhu cầu.',
  },
  {
    q: 'Làm thủ tục online (Web Check-in) khi nào?',
    a: 'Bạn có thể làm thủ tục online từ 24 giờ đến 4 giờ trước giờ khởi hành. Thủ tục online giúp bạn tiết kiệm thời gian tại sân bay và chọn chỗ ngồi yêu thích.',
  },
  {
    q: 'Tôi có thể đổi vé hoặc hoàn vé không?',
    a: 'Có. Bạn có thể đổi ngày/giờ bay, tên hành khách hoặc hủy vé tùy theo điều kiện của hạng vé. Phí đổi/hủy sẽ được áp dụng theo chính sách hiện hành của Vietjet.',
  },
  {
    q: 'Vietjet có chương trình khách hàng thân thiết không?',
    a: 'Có - SkyJoy là chương trình khách hàng thân thiết với nhiều đặc quyền hấp dẫn: tích điểm mỗi chuyến bay, ưu đãi đặc biệt, quyền ưu tiên check-in và nhiều hơn nữa.',
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="bg-stone-50 py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg mb-4">
            <FaQuestionCircle size={24} />
          </div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-primary mb-2">
            Hỗ trợ khách hàng
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy tracking-tight">
            Câu hỏi thường gặp
          </h2>
          <p className="text-sm sm:text-base text-vj-gray mt-3 max-w-2xl mx-auto">
            Tìm câu trả lời nhanh chóng cho những thắc mắc phổ biến nhất
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen ? 'border-primary/30 shadow-md' : 'border-gray-100 hover:border-primary/20'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm sm:text-base font-bold transition-colors ${
                      isOpen ? 'text-primary' : 'text-navy'
                    }`}
                  >
                    {faq.q}
                  </span>
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen ? 'bg-primary text-white rotate-180' : 'bg-stone-100 text-navy'
                    }`}
                  >
                    <FaChevronDown size={12} />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-vj-gray leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
