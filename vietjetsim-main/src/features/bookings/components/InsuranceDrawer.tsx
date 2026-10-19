'use client';

import React, { useState } from 'react';
import { Flight } from '@/features/bookings/types/booking-flow';
import { RiCloseLine, RiShieldCheckLine } from 'react-icons/ri';
import { TRAVEL_SAFE_INSURANCE_PRICE } from '@/features/bookings/pricing';

interface InsuranceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  hasInsurance: boolean;
  onConfirmInsurance: (enabled: boolean) => void;
}

export default function InsuranceDrawer({
  isOpen,
  onClose,
  flight,
  hasInsurance,
  onConfirmInsurance,
}: InsuranceDrawerProps) {
  const [selectedOption, setSelectedOption] = useState<boolean>(hasInsurance);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmInsurance(selectedOption);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
        {/* Header - Red bar matching Screenshot 1 */}
        <div className="bg-primary-dark text-white px-4 py-3 flex items-center justify-between shadow-md">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">
            BẢO HIỂM DU LỊCH VIETJET TRAVEL SAFE
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-amber-300 p-1 rounded transition-colors"
            aria-label="Đóng"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-gray-700 leading-relaxed">
          {/* Banner */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 text-white p-4 shadow-sm relative">
            <div className="relative z-10 max-w-[70%]">
              <h3 className="text-base font-black italic mb-1 text-white">Bảo hiểm du lịch,</h3>
              <p className="text-xs font-bold text-amber-200">
                an tâm tận hưởng hành trình của bạn ({flight.from} ✈ {flight.to}).
              </p>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <RiShieldCheckLine size={36} />
            </div>
          </div>

          <div>
            <p className="font-semibold">
              Đơn vị cung cấp dịch vụ bảo hiểm:{' '}
              <span className="text-primary-dark font-black italic">BaoViet Insurance</span>
            </p>
            <p className="mt-2 text-gray-800 font-bold">
              Thật yên tâm và thoải mái với chương trình bảo hiểm du lịch toàn diện cho chuyến đi:
            </p>
          </div>

          {/* Bullet points with yellow checkmarks */}
          <ul className="space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0 mt-0.5">●</span>
              <span>
                Quyền lợi bảo hiểm tai nạn, chi phí y tế với hạn mức cao lên tới 2 tỷ đồng
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0 mt-0.5">●</span>
              <span>
                Quyền lợi bảo hiểm cho những trở ngại trong chuyến đi gồm huỷ/hoãn chuyến bay,
                mất/hỏng hành lý, ...
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0 mt-0.5">●</span>
              <span>Dịch vụ hỗ trợ y tế và du lịch toàn cầu 24/7</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0 mt-0.5">●</span>
              <span>Thủ tục mua và bồi thường đơn giản, nhanh chóng</span>
            </li>
          </ul>

          <div className="text-xs2 text-gray-600 space-y-2 pt-2 border-t border-gray-100">
            <p>
              Bằng việc chọn Đồng ý mua Bảo hiểm du lịch, Quý khách đã đọc, hiểu, đồng ý với các
              điều kiện, điều khoản của Quy tắc Bảo hiểm và ủy quyền cho Vietjet cung cấp dữ liệu cá
              nhân cần thiết của tôi cho đối tác bảo hiểm nhằm mục đích cấp Giấy Chứng nhận Bảo
              hiểm.
            </p>
            <p>
              Để xem quyền lợi, điều kiện của Vietjet Travel Safe, vui lòng nhấn{' '}
              <a
                href="#"
                className="text-vjblue font-bold underline"
                onClick={(e) => e.preventDefault()}
              >
                vào đây
              </a>
              .
            </p>
            <p>
              Sau khi Quý khách mua và thanh toán thành công, Giấy chứng nhận bảo hiểm điện tử sẽ
              được gửi kèm vé máy bay đến Quý khách. Quý khách cần kiểm tra và chắc chắn có Giấy
              chứng nhận bảo hiểm trước khi thực hiện chuyến bay để được hưởng quyền lợi bảo hiểm.
              Nếu chưa nhận được Giấy chứng nhận bảo hiểm, đề nghị Quý khách liên hệ Vietjet
              (19001886) trước khi thực hiện chuyến bay để được hỗ trợ. Giấy chứng nhận bảo hiểm
              không thể được cấp sau chuyến bay.
            </p>
            <p className="font-bold text-gray-800">
              Cùng trải nghiệm dịch vụ bảo hiểm du lịch toàn diện với quyền lợi bảo hiểm hấp dẫn,
              đáp ứng nhu cầu đa dạng
            </p>
          </div>

          {/* Radio choices matching Screenshot 1 */}
          <div className="space-y-2.5 pt-3 border-t border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="insurance_choice"
                checked={selectedOption === true}
                onChange={() => setSelectedOption(true)}
                className="w-4 h-4 text-primary-dark focus:ring-primary-dark accent-primary-dark"
              />
              <span className="font-bold text-gray-900">
                Đồng ý mua Bảo hiểm du lịch ({TRAVEL_SAFE_INSURANCE_PRICE.toLocaleString('vi-VN')}{' '}
                VND)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="insurance_choice"
                checked={selectedOption === false}
                onChange={() => setSelectedOption(false)}
                className="w-4 h-4 text-primary-dark focus:ring-primary-dark accent-primary-dark"
              />
              <span className="font-bold text-gray-700">Không, cảm ơn</span>
            </label>
          </div>

          <p className="text-xs2 text-primary-dark italic">
            Bảo hiểm du lịch đã được chọn trước. Quý khách vui lòng lựa chọn &quot;Không, cảm
            ơn&quot; nếu không có nhu cầu mua bảo hiểm.
          </p>
        </div>

        {/* Footer Red Bar matching Screenshot 1 */}
        <div className="bg-primary-dark text-white p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 max-w-[65%]">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <RiShieldCheckLine size={20} className="text-white" />
            </div>
            <div className="text-xs2 leading-tight">
              <span className="line-clamp-1 opacity-90">Bảo hiểm du lịch Vietjet Travel Safe</span>
              <span className="font-black text-sm text-vjyellow">
                {selectedOption
                  ? `${TRAVEL_SAFE_INSURANCE_PRICE.toLocaleString('vi-VN')} VND`
                  : '0 VND'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-vjyellow hover:bg-accent-light text-gray-900 font-black px-6 py-2 rounded-lg text-sm shadow transition-all active:scale-95"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
