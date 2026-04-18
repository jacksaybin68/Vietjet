'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface FAQItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 1,
    category: 'Chung',
    question: 'Vietjet Air là gì?',
    answer:
      'Vietjet Air là nền tảng đặt vé máy bay trực tuyến chính thức, giúp người dùng trải nghiệm quy trình tìm kiếm, đặt vé, chọn ghế và thanh toán giống như thực tế.',
  },
  {
    id: 2,
    category: 'Đặt vé',
    question: 'Làm thế nào để đặt vé trên Vietjet Air?',
    answer:
      'Bạn chỉ cần truy cập trang chủ, nhập điểm đi, điểm đến, ngày bay và số lượng hành khách. Sau đó chọn chuyến bay phù hợp, điền thông tin hành khách và hoàn tất thanh toán.',
  },
  {
    id: 6,
    category: 'Hoàn tiền',
    question: 'Chính sách hoàn vé của Vietjet Air như thế nào?',
    answer:
      'Vé có thể được hoàn tùy theo điều kiện của từng hạng vé. Vé Eco thường không được hoàn, trong khi vé Deluxe và SkyBoss được hoàn với phí xử lý nhất định.',
  },
  {
    id: 4,
    category: 'Thanh toán',
    question: 'Vietjet Air chấp nhận những phương thức thanh toán nào?',
    answer:
      'Chúng tôi hỗ trợ thanh toán qua thẻ ATM nội địa, thẻ tín dụng/ghi nợ quốc tế (Visa, Mastercard, JCB), ví điện tử (MoMo, ZaloPay, VNPay) và chuyển khoản ngân hàng.',
  },
  {
    id: 3,
    category: 'Đặt vé',
    question: 'Tôi có thể đặt vé cho người khác không?',
    answer:
      'Có, bạn có thể đặt vé cho người thân hoặc bạn bè bằng cách điền chính xác thông tin cá nhân của họ (Họ tên, ngày sinh, số CCCD/Hộ chiếu) trong bước điền thông tin hành khách.',
  },
  {
    id: 4,
    category: 'Thanh toán',
    question: 'Vietjet Air chấp nhận những phương thức thanh toán nào?',
    answer:
      'Chúng tôi hỗ trợ thanh toán qua thẻ ATM nội địa, thẻ tín dụng/ghi nợ quốc tế (Visa, Mastercard, JCB), ví điện tử (MoMo, ZaloPay, VNPay) và chuyển khoản ngân hàng.',
  },
  {
    id: 5,
    category: 'Thanh toán',
    question: 'Tôi có thể thanh toán trả góp không?',
    answer:
      'Hiện tại tính năng trả góp đang được áp dụng cho các đơn vé quốc tế và nội địa có giá trị từ 3.000.000 VNĐ trở lên thông qua các đối tác tài chính liên kết.',
  },
  {
    id: 6,
    category: 'Hoàn tiền',
    question: 'Chính sách hoàn vé của Vietjet Air như thế nào?',
    answer:
      'Vé có thể được hoàn tùy theo điều kiện của từng hạng vé. Vé Eco thường không được hoàn, trong khi vé Deluxe và SkyBoss được hoàn với phí xử lý nhất định.',
  },
  {
    id: 7,
    category: 'Hoàn tiền',
    question: 'Thời gian nhận tiền hoàn là bao lâu?',
    answer:
      'Sau khi yêu cầu hoàn vé được phê duyệt, tiền sẽ được hoàn về tài khoản thanh toán ban đầu trong vòng 7-14 ngày làm việc tùy thuộc vào ngân hàng.',
  },
  {
    id: 8,
    category: 'Hành lý',
    question: 'Hành lý ký gửi tối đa được bao nhiêu kg?',
    answer:
      'Bạn có thể mua gói hành lý ký gửi từ 15kg, 20kg, 25kg đến 32kg. Mỗi kiện hành lý không được vượt quá 32kg theo quy định an toàn hàng không.',
  },
  {
    id: 9,
    category: 'Hành lý',
    question: 'Tôi có được mang hành lý xách tay lên máy bay không?',
    answer:
      'Có, mỗi hành khách được mang tối đa 01 kiện hành lý xách tay 7kg và 01 túi xách nhỏ hoặc túi laptop. Tổng trọng lượng không vượt quá 10kg.',
  },
  {
    id: 10,
    category: 'Check-in',
    question: 'Tôi có thể check-in online không?',
    answer:
      'Có, bạn có thể check-in online trên website hoặc ứng dụng từ 24 giờ đến 1 giờ trước giờ bay dự kiến. Sau khi check-in, bạn sẽ nhận được thẻ lên tàu điện tử.',
  },
  {
    id: 11,
    category: 'Đổi vé',
    question: 'Tôi có thể đổi ngày bay sau khi đặt vé không?',
    answer:
      'Bạn có thể đổi ngày bay tùy theo điều kiện hạng vé. Phí đổi vé và chênh lệch giá vé (nếu có) sẽ được áp dụng. Vui lòng liên hệ tổng đài để được hỗ trợ.',
  },
  {
    id: 12,
    category: 'Chung',
    question: 'Làm sao để nhận mã đặt chỗ (PNR)?',
    answer:
      'Mã đặt chỗ (PNR) gồm 6 ký tự sẽ được gửi đến email và số điện thoại của bạn ngay sau khi thanh toán thành công. Bạn cũng có thể xem lại trong mục "Chuyến bay của tôi".',
  },
];

const CATEGORIES = [
  'Tất cả',
  'Chung',
  'Đặt vé',
  'Thanh toán',
  'Hoàn tiền',
  'Hành lý',
  'Check-in',
  'Đổi vé',
];

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
    <div className="min-h-screen bg-gray-50 font-body">
      {/* Hero Section */}
      <div
        className="relative py-24 px-4 text-center text-white overflow-hidden"
        style={{
          background: 'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
        }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-56 h-56 bg-[#FFD400] rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <Icon name="QuestionMarkCircleIcon" size={16} />
            <span className="text-xs font-semibold tracking-wider uppercase">Hỗ trợ</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-body">Câu hỏi thường gặp</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Tìm kiếm câu trả lời nhanh chóng cho các thắc mắc về đặt vé, thanh toán, hành lý và
            nhiều dịch vụ khác.
          </p>
          <Link
            href="/homepage"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-lg bg-[#FFD400] text-[#1A2948] font-bold hover:bg-[#FFE033] transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Icon name="ArrowLeftIcon" size={18} />
            Quay lại trang chủ
          </Link>
        </div>
      </div>

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
              href="/contact"
              className="px-6 py-3 rounded-lg bg-[#EC2029] text-white font-bold hover:bg-[#C41017] transition-all shadow-vj-btn"
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
    </div>
  );
}
