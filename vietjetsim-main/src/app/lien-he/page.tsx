'use client';

import React, { useState } from 'react';
import { Icon } from '@/shared/components/ui';
import { Header, Footer, PageHero } from '@/shared/components/navigation';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] font-body">
      <Header />
      <PageHero
        eyebrow="Liên hệ"
        iconName="EnvelopeIcon"
        title="Liên hệ với chúng tôi"
        description="Chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy gửi tin nhắn hoặc liên hệ trực tiếp qua các kênh bên dưới."
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16 -mt-10 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-vj-lg p-8">
            <h2 className="text-2xl font-bold text-[#1A2948] mb-6 font-heading-800">
              Gửi tin nhắn cho chúng tôi
            </h2>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <Icon name="CheckCircleIcon" size={48} />
                <p className="text-green-700 font-bold text-lg mt-2">Gửi thành công!</p>
                <p className="text-green-600">
                  Chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#333333] mb-2">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#EC2029] focus:ring-2 focus:ring-[#EC2029]/20 outline-none transition-all"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#333333] mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#EC2029] focus:ring-2 focus:ring-[#EC2029]/20 outline-none transition-all"
                      placeholder="example@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#333333] mb-2">
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#EC2029] focus:ring-2 focus:ring-[#EC2029]/20 outline-none transition-all"
                    placeholder="Vấn đề bạn cần hỗ trợ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#333333] mb-2">
                    Nội dung *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#EC2029] focus:ring-2 focus:ring-[#EC2029]/20 outline-none transition-all resize-none"
                    placeholder="Mô tả chi tiết yêu cầu của bạn..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full md:w-auto px-8 py-3 rounded-lg bg-[#EC2029] text-white font-bold hover:bg-primary-dark transition-all duration-300 shadow-vj-btn hover:shadow-vj-btn-hover flex items-center justify-center gap-2"
                >
                  <Icon name="PaperAirplaneIcon" size={18} />
                  Gửi tin nhắn
                </button>
              </form>
            )}
          </div>

          {/* Contact Info & Map */}
          <div className="space-y-8">
            {/* Contact Details */}
            <div className="bg-white rounded-2xl shadow-vj-sm p-6">
              <h3 className="text-lg font-bold text-[#1A2948] mb-4 flex items-center gap-2">
                <Icon name="PhoneIcon" size={20} />
                Thông tin liên hệ
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 text-[#EC2029]">
                    <Icon name="EnvelopeIcon" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6D6E71] font-medium uppercase tracking-wide">
                      Email
                    </p>
                    <a
                      href="mailto:support@vietjetair.com"
                      className="text-[#1A2948] font-semibold hover:text-[#EC2029] transition-colors"
                    >
                      support@vietjetair.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 text-[#EC2029]">
                    <Icon name="PhoneIcon" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6D6E71] font-medium uppercase tracking-wide">
                      Hotline
                    </p>
                    <a
                      href="tel:19006886"
                      className="text-[#1A2948] font-semibold hover:text-[#EC2029] transition-colors"
                    >
                      1900-6886
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 text-[#EC2029]">
                    <Icon name="MapPinIcon" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6D6E71] font-medium uppercase tracking-wide">
                      Địa chỉ
                    </p>
                    <p className="text-[#1A2948] font-medium">
                      Tòa nhà Vietjet, Số 1 Nguyễn Văn Trỗi, Phường 2, Quận Tân Bình, TP. Hồ Chí
                      Minh
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-white rounded-2xl shadow-vj-sm p-6">
              <h3 className="text-lg font-bold text-[#1A2948] mb-4 flex items-center gap-2">
                <Icon name="ClockIcon" size={20} />
                Giờ làm việc
              </h3>
              <div className="space-y-2">
                {[
                  { day: 'Thứ 2 - Thứ 6', hours: '08:00 - 20:00' },
                  { day: 'Thứ 7', hours: '08:00 - 18:00' },
                  { day: 'Chủ nhật & Lễ', hours: '09:00 - 17:00' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-[#333333] font-medium">{item.day}</span>
                    <span className="text-sm font-bold text-[#EC2029]">{item.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Map */}
            <div className="bg-white rounded-2xl shadow-vj-sm overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-blue-100 to-gray-200 flex items-center justify-center relative">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: 'radial-gradient(#1A2948 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                ></div>
                <div className="text-center z-10">
                  <Icon name="MapPinIcon" size={32} />
                  <p className="text-sm font-bold text-[#1A2948] mt-2">Bản đồ Vietjet Air</p>
                  <p className="text-xs text-[#6D6E71]">Tân Bình, TP. Hồ Chí Minh</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
