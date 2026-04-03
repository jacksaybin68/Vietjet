'use client';

import React, { useState } from 'react';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

type ModalConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'info';
};

const MODAL_PRESETS: Record<string, ModalConfig> = {
  seat: {
    title: 'Hủy ghế đã chọn?',
    description:
      'Bạn có chắc muốn hủy ghế 12A trên chuyến VJ123 HAN → SGN? Ghế sẽ được giải phóng và không thể hoàn tác.',
    confirmLabel: 'Hủy ghế',
    variant: 'danger',
  },
  booking: {
    title: 'Xóa đặt chỗ này?',
    description:
      'Đặt chỗ #BK-20240317 sẽ bị xóa vĩnh viễn. Phí hoàn vé (nếu có) sẽ được xử lý trong 5–7 ngày làm việc.',
    confirmLabel: 'Xóa đặt chỗ',
    variant: 'danger',
  },
  admin: {
    title: 'Xác nhận hành động quản trị',
    description:
      'Bạn sắp vô hiệu hóa tài khoản người dùng này. Họ sẽ không thể đăng nhập cho đến khi được kích hoạt lại.',
    confirmLabel: 'Vô hiệu hóa',
    variant: 'warning',
  },
};

export default function ToastDemo() {
  const toast = useToast();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = (key: string) => setActiveModal(key);
  const closeModal = () => {
    setActiveModal(null);
    setIsLoading(false);
  };

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      closeModal();
      if (activeModal === 'seat')
        toast?.success('Đã hủy ghế', 'Ghế 12A đã được giải phóng thành công.');
      if (activeModal === 'booking')
        toast?.error('Đã xóa đặt chỗ', 'Đặt chỗ #BK-20240317 đã bị xóa.');
      if (activeModal === 'admin')
        toast?.warning('Đã vô hiệu hóa', 'Tài khoản người dùng đã bị vô hiệu hóa.');
    }, 1400);
  };

  const currentModal = activeModal ? MODAL_PRESETS[activeModal] : null;

  return (
    <>
      <section className="py-12 bg-[#F7F7F7] border-t border-[#E8E8E8]">
        <div className="max-w-5xl mx-auto px-4">
          {/* Section header */}
          <div className="mb-8 text-center">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#EC2029] mb-2 font-['KoHo',sans-serif]">
              Thông báo hệ thống
            </span>
            <h2 className="text-2xl font-bold text-[#1A2948] font-['KoHo',sans-serif]">
              Trung tâm thông báo
            </h2>
          </div>

          {/* Toast demo buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <button
              onClick={() =>
                toast?.success(
                  'Đặt vé thành công!',
                  'Chuyến bay HAN → SGN đã được xác nhận. Kiểm tra email của bạn.',
                  {
                    actions: [
                      { label: 'Xem vé', onClick: () => {}, variant: 'primary' },
                      { label: 'Bỏ qua', onClick: () => {}, variant: 'ghost' },
                    ],
                  }
                )
              }
              className="px-4 py-2 rounded-lg bg-[#1A2948] text-white text-sm font-semibold hover:bg-[#0F1E3A] transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#FFD400] inline-block" />
              Thành công
            </button>

            <button
              onClick={() =>
                toast?.error(
                  'Thanh toán thất bại',
                  'Thẻ của bạn bị từ chối. Vui lòng kiểm tra lại thông tin.',
                  {
                    actions: [
                      { label: 'Thử lại', onClick: () => {}, variant: 'primary' },
                      { label: 'Đổi thẻ', onClick: () => {}, variant: 'ghost' },
                    ],
                  }
                )
              }
              className="px-4 py-2 rounded-lg bg-[#EC2029] text-white text-sm font-semibold hover:bg-[#C41017] transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              Lỗi
            </button>

            <button
              onClick={() =>
                toast?.warning('Sắp hết chỗ!', 'Chỉ còn 3 ghế trên chuyến SGN → PQC. Đặt ngay!', {
                  duration: 7000,
                  actions: [{ label: 'Đặt ngay', onClick: () => {}, variant: 'accent' }],
                })
              }
              className="px-4 py-2 rounded-lg bg-[#FFD400] text-[#1A2948] text-sm font-semibold hover:bg-[#E6BF00] transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#1A2948] inline-block" />
              Cảnh báo
            </button>

            <button
              onClick={() =>
                toast?.info(
                  'Cập nhật lịch bay',
                  'Chuyến VJ123 khởi hành lúc 14:30 thay vì 13:00.',
                  {
                    actions: [{ label: 'Chi tiết', onClick: () => {}, variant: 'ghost' }],
                  }
                )
              }
              className="px-4 py-2 rounded-lg border-2 border-[#1A2948] text-[#1A2948] text-sm font-semibold hover:bg-[#1A2948] hover:text-white transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#1A2948] inline-block" />
              Thông tin
            </button>

            <button
              onClick={() =>
                toast?.promo(
                  '🔥 Ưu đãi đặc biệt!',
                  'Bay HAN → SGN chỉ từ 99.000đ — Hôm nay đến 23:59!',
                  {
                    duration: 8000,
                    actions: [
                      { label: 'Đặt vé ngay', onClick: () => {}, variant: 'accent' },
                      { label: 'Xem tất cả', onClick: () => {}, variant: 'ghost' },
                    ],
                  }
                )
              }
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#EC2029] to-[#FFD400] text-white text-sm font-semibold hover:opacity-90 transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              Khuyến mãi
            </button>
          </div>

          {/* Confirmation Modal Demo */}
          <div className="border-t border-[#E8E8E8] pt-8">
            <div className="mb-5 text-center">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#EC2029] mb-1 font-['KoHo',sans-serif]">
                Hộp thoại xác nhận
              </span>
              <p className="text-sm text-[#666666] font-['KoHo',sans-serif]">
                Dùng cho hủy ghế, xóa đặt chỗ và hành động quản trị
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => openModal('seat')}
                className="px-5 py-2.5 rounded-xl border-2 border-[#EC2029] text-[#EC2029] text-sm font-semibold hover:bg-[#EC2029] hover:text-white transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Hủy ghế
              </button>

              <button
                onClick={() => openModal('booking')}
                className="px-5 py-2.5 rounded-xl border-2 border-[#EC2029] text-[#EC2029] text-sm font-semibold hover:bg-[#EC2029] hover:text-white transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                Xóa đặt chỗ
              </button>

              <button
                onClick={() => openModal('admin')}
                className="px-5 py-2.5 rounded-xl border-2 border-[#1A2948] text-[#1A2948] text-sm font-semibold hover:bg-[#1A2948] hover:text-white transition-all duration-150 active:scale-95 font-['KoHo',sans-serif] flex items-center gap-2"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Hành động quản trị
              </button>
            </div>
          </div>
        </div>
      </section>

      <ToastContainer toasts={toast?.toasts} onDismiss={toast?.dismiss} position="top-right" />

      {currentModal && (
        <ConfirmationModal
          isOpen={!!activeModal}
          onClose={closeModal}
          onConfirm={handleConfirm}
          title={currentModal.title}
          description={currentModal.description}
          confirmLabel={currentModal.confirmLabel}
          cancelLabel="Hủy bỏ"
          variant={currentModal.variant}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
