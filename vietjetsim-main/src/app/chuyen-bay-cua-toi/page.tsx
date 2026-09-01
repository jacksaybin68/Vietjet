'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

export default function MyFlightsPage() {
  const toast = useToast();
  const [bookingCode, setBookingCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingCode.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập mã đặt chỗ');
      return;
    }
    if (!firstName.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập họ');
      return;
    }
    if (!lastName.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập tên đệm và tên');
      return;
    }

    setLoading(true);
    
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    
    // Redirect to booking detail page
    window.location.href = `/dat-ve/${bookingCode.toUpperCase()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-red rounded-xl flex items-center justify-center">
              <Icon name="PaperAirplaneIcon" size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg text-[#1A2948]">Chuyến bay của tôi</h1>
              <p className="text-xs text-stone-500">Tra cứu thông tin đặt chỗ</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-stone-600 hover:text-primary font-medium transition-colors"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-lg">
          {/* Header Banner */}
          <div className="bg-gradient-red p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="TicketIcon" size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">CHUYẾN BAY CỦA TÔI</h2>
            <p className="text-white/90 text-sm max-w-md mx-auto leading-relaxed">
              Bạn muốn xem chuyến bay đã đặt, đổi lịch trình bay hay mua thêm dịch vụ hành lý, chỗ
              ngồi, suất ăn..., vui lòng điền thông tin bên dưới:
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSearch} className="p-8 space-y-6">
            {/* Booking Code */}
            <div>
              <label className="block text-sm font-bold text-[#1A2948] mb-2">
                Mã đặt chỗ<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Icon
                  name="TicketIcon"
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: VJ8K3M2"
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  maxLength={10}
                />
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-bold text-[#1A2948] mb-2">
                Họ<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Icon
                  name="UserIcon"
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ví dụ: NGUYEN"
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-bold text-[#1A2948] mb-2">
                Tên đệm và tên<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Icon
                  name="UserIcon"
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ví dụ: VAN AN"
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Icon
                  name="InformationCircleIcon"
                  size={18}
                  className="text-blue-500 mt-0.5 flex-shrink-0"
                />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">Lưu ý quan trọng</p>
                  <ul className="text-xs space-y-1 text-blue-600">
                    <li>• Mã đặt chỗ (PNR) gồm 6-7 ký tự được gửi qua email sau khi đặt vé</li>
                    <li>• Họ và tên phải khớp chính xác với thông tin khi đặt vé</li>
                    <li>• Nhập họ và tên bằng tiếng Việt không dấu hoặc tiếng Anh</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tìm kiếm...
                </>
              ) : (
                <>
                  <Icon name="MagnifyingGlassIcon" size={18} />
                  Tìm kiếm
                </>
              )}
            </button>

            {/* Alternative Actions */}
            <div className="pt-4 border-t border-stone-100">
              <p className="text-sm text-stone-500 text-center mb-3">Hoặc</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dang-nhap"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm"
                >
                  <Icon name="ArrowRightOnRectangleIcon" size={16} />
                  Đăng nhập tài khoản
                </Link>
                <Link
                  href="/lam-thu-tuc"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm"
                >
                  <Icon name="CheckCircleIcon" size={16} />
                  Check-in trực tuyến
                </Link>
              </div>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="QuestionMarkCircleIcon" size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A2948] mb-2">Cần hỗ trợ?</h3>
              <p className="text-sm text-stone-600 mb-3">
                Nếu bạn không tìm thấy mã đặt chỗ hoặc gặp vấn đề, vui lòng liên hệ:
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="tel:19001886"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <Icon name="PhoneIcon" size={14} />
                  1900 1886
                </a>
                <a
                  href="mailto:support@vietjetair.com"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <Icon name="EnvelopeIcon" size={14} />
                  support@vietjetair.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
