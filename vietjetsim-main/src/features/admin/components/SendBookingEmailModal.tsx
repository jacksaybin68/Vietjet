'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/shared/components/ui';
import { sendBookingEmail } from '@/features/admin/services';
import { getApiErrorMessage } from '@/shared/services';

export interface SendBookingEmailModalBooking {
  id: string;
  bookingCode?: string | null;
  userName?: string;
  userEmail?: string;
  amount: number;
  flightNo?: string;
  route?: string;
  date?: string;
  status?: string;
  seat?: string;
}

export type EmailTemplateType = 'payment_instruction' | 'ticket_issuance' | 'payment_failed';

interface SendBookingEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SendBookingEmailModalBooking | null;
  defaultType?: EmailTemplateType;
  onSuccess?: (type: EmailTemplateType, message: string, newStatus?: string) => void;
}

export default function SendBookingEmailModal({
  isOpen,
  onClose,
  booking,
  defaultType = 'payment_instruction',
  onSuccess,
}: SendBookingEmailModalProps) {
  const [templateType, setTemplateType] = useState<EmailTemplateType>(defaultType);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [customNote, setCustomNote] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when booking changes or modal opens
  useEffect(() => {
    if (booking) {
      setRecipientEmail(booking.userEmail || '');
      setRecipientName(booking.userName || 'Quý khách');
      setAmount(booking.amount || 0);
      setCustomNote('');
      setErrorMessage(null);
      // Auto-select template based on booking status
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        setTemplateType('ticket_issuance');
        setAutoConfirm(false);
      } else {
        setTemplateType(defaultType);
        setAutoConfirm(true);
      }
    }
  }, [booking, defaultType]);

  if (!isOpen || !booking) return null;

  const pnr = booking.bookingCode || booking.id.slice(0, 6).toUpperCase();
  const formattedAmount = (amount || 0).toLocaleString('vi-VN');

  const handleSend = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email người nhận hợp lệ.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await sendBookingEmail({
        bookingId: booking.id,
        type: templateType,
        toEmail: recipientEmail.trim(),
        fullName: recipientName.trim() || undefined,
        amount: Number(amount) || undefined,
        customNote: customNote.trim() || undefined,
        autoConfirmBooking: templateType === 'ticket_issuance' ? autoConfirm : false,
      });

      if (res.success) {
        onSuccess?.(templateType, res.message || 'Đã gửi Gmail thành công!', res.status);
        onClose();
      } else {
        setErrorMessage(res.message || 'Gửi Gmail không thành công.');
      }
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Lỗi kết nối khi gửi email'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-white/10 rounded-[28px] sm:rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        style={{ background: 'linear-gradient(145deg, #131b2e 0%, #0a0f1d 100%)' }}
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            {/* Google Gmail Icon */}
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-inner">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Gửi Gmail Thông Báo & Xuất Vé
                </h3>
                <span className="text-3xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  PNR: {pnr}
                </span>
              </div>
              <p className="text-2xs font-semibold text-slate-400 mt-0.5">
                Chuyến bay {booking.flightNo || 'VJ'} · {booking.route || 'Hành trình'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>

        {/* Template Selector Tabs */}
        <div className="px-6 sm:px-8 pt-4 pb-2 border-b border-white/5 bg-slate-900/60">
          <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setTemplateType('payment_instruction')}
              className={`py-2.5 px-3 rounded-xl text-2xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                templateType === 'payment_instruction'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon name="QrCodeIcon" size={15} />
              <span className="truncate">1. Hướng dẫn thanh toán</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('ticket_issuance')}
              className={`py-2.5 px-3 rounded-xl text-2xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                templateType === 'ticket_issuance'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon name="TicketIcon" size={15} />
              <span className="truncate">2. Xuất vé điện tử</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('payment_failed')}
              className={`py-2.5 px-3 rounded-xl text-2xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                templateType === 'payment_failed'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon name="XCircleIcon" size={15} />
              <span className="truncate">3. Báo thất bại</span>
            </button>
          </div>

          {/* Submode Switcher: Form vs Preview */}
          <div className="flex items-center justify-between mt-3 text-2xs">
            <span className="text-slate-400 font-medium">
              {templateType === 'payment_instruction' &&
                'Gửi hướng dẫn quét mã VietQR và thông tin STK thụ hưởng cho khách'}
              {templateType === 'ticket_issuance' &&
                'Gửi email thông báo thanh toán thành công và vé máy bay điện tử'}
              {templateType === 'payment_failed' &&
                'Gửi thông báo giao dịch chuyển khoản bị từ chối/thất bại kèm link thử lại'}
            </span>

            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-2.5 py-1 rounded-md text-3xs font-black uppercase tracking-wider transition-colors ${
                  activeTab === 'form'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Nhập liệu
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md text-3xs font-black uppercase tracking-wider transition-colors flex items-center gap-1 ${
                  activeTab === 'preview'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon name="EyeIcon" size={11} />
                Xem trước
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5 text-rose-300 text-xs font-semibold">
              <Icon name="ExclamationTriangleIcon" size={16} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'form' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Recipient Email */}
                <div>
                  <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Hộp thư nhận Gmail <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="vd: khachhang@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-all focus:bg-white/10"
                    />
                    <Icon
                      name="EnvelopeIcon"
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                </div>

                {/* Recipient Name */}
                <div>
                  <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Tên người nhận / Khách hàng
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="vd: Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-all focus:bg-white/10"
                    />
                    <Icon
                      name="UserIcon"
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Số tiền thanh toán (VNĐ)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full pl-4 pr-14 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500/60 transition-all focus:bg-white/10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xs font-black text-slate-500">
                      ₫
                    </span>
                  </div>
                </div>

                {/* Booking Code PNR */}
                <div>
                  <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Mã đặt chỗ (PNR)
                  </label>
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-amber-300 tracking-widest">
                    {pnr}
                  </div>
                </div>
              </div>

              {/* Template specifics */}
              {templateType === 'payment_instruction' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-black">
                    <Icon name="InformationCircleIcon" size={16} />
                    <span>Thông tin thụ hưởng VietQR trong email:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-2xs text-slate-300 pt-1">
                    <div>
                      Ngân hàng: <strong className="text-white">VIB (Quốc tế Việt Nam)</strong>
                    </div>
                    <div>
                      STK: <strong className="text-white">876922729</strong>
                    </div>
                    <div>
                      Chủ TK: <strong className="text-white">DANG THI NGOC HAN</strong>
                    </div>
                    <div>
                      Cú pháp: <strong className="text-amber-400">VJ {pnr}</strong>
                    </div>
                  </div>
                </div>
              )}

              {templateType === 'ticket_issuance' && (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-black">
                      <Icon name="CheckCircleIcon" size={16} />
                      <span>Thông tin vé xuất trong email:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-2xs text-slate-300 pt-1">
                      <div>
                        Chuyến bay:{' '}
                        <strong className="text-white">{booking.flightNo || 'VJ120'}</strong>
                      </div>
                      <div>
                        Hành trình: <strong className="text-white">{booking.route || '—'}</strong>
                      </div>
                      <div>
                        Ngày bay: <strong className="text-white">{booking.date || '—'}</strong>
                      </div>
                      <div>
                        Số ghế: <strong className="text-white">{booking.seat || 'Tự động'}</strong>
                      </div>
                    </div>
                  </div>

                  {booking.status !== 'confirmed' && (
                    <label className="flex items-center gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={autoConfirm}
                        onChange={(e) => setAutoConfirm(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                      <span className="text-2xs font-bold text-slate-300">
                        Đồng thời tự động chuyển trạng thái đơn hàng sang{' '}
                        <strong className="text-emerald-400">Đã xác nhận (Confirmed)</strong>
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Custom Admin Note */}
              <div>
                <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Lời nhắn / Ghi chú gửi kèm (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Nhập lời nhắn riêng từ hệ thống tới khách hàng (sẽ hiển thị nổi bật trong email)..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-medium text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-all focus:bg-white/10 resize-none"
                />
              </div>
            </div>
          ) : (
            /* Email Live Preview Tab */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 text-slate-800 shadow-lg border border-slate-200">
                {/* Simulated Gmail Header */}
                <div className="border-b border-slate-200 pb-3 mb-4">
                  <div className="text-3xs uppercase tracking-widest text-slate-400 font-bold mb-1">
                    Tiêu đề Gmail (Subject)
                  </div>
                  <div className="text-xs font-black text-slate-900">
                    {templateType === 'payment_instruction' &&
                      `Thông báo thanh toán đặt chỗ ${pnr} — Vietjet Air`}
                    {templateType === 'ticket_issuance' &&
                      `Thanh toán thành công & Xác nhận vé ${pnr} — Vietjet Air`}
                    {templateType === 'payment_failed' &&
                      `Thông báo thanh toán chưa thành công ${pnr} — Vietjet Air`}
                  </div>
                  <div className="text-2xs text-slate-500 mt-1">
                    Người gửi: <strong>Vietjet Air &lt;booking@vietjet.shop&gt;</strong>
                  </div>
                  <div className="text-2xs text-slate-500">
                    Gửi tới: <strong>{recipientEmail || 'khachhang@gmail.com'}</strong>
                  </div>
                </div>

                {/* Email Body preview */}
                <div className="space-y-3 text-xs leading-relaxed">
                  <p>
                    Kính chào <strong>{recipientName || 'Quý khách'}</strong>,
                  </p>

                  {templateType === 'payment_instruction' && (
                    <>
                      <p className="text-slate-600">
                        Đặt chỗ của Quý khách đã được giữ tạm thời. Vui lòng hoàn tất thanh toán
                        trong vòng <strong>30 phút</strong> để đảm bảo giữ chỗ và được phát hành vé
                        điện tử chính thức:
                      </p>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <div className="text-3xs uppercase tracking-widest text-slate-400 font-bold">
                          MÃ ĐẶT CHỖ (PNR)
                        </div>
                        <div className="text-2xl font-black text-[#EC2029] tracking-widest mt-1">
                          {pnr}
                        </div>
                        <div className="text-2xs text-amber-600 font-bold mt-1">
                          Chờ thanh toán qua VietQR
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-2xs space-y-1">
                        <div>
                          Số tiền: <strong>{formattedAmount} VNĐ</strong>
                        </div>
                        <div>
                          Ngân hàng: <strong>Ngân hàng Quốc tế Việt Nam (VIB)</strong>
                        </div>
                        <div>
                          Số tài khoản: <strong>876922729</strong>
                        </div>
                        <div>
                          Chủ tài khoản: <strong>DANG THI NGOC HAN</strong>
                        </div>
                        <div>
                          Nội dung chuyển khoản:{' '}
                          <strong className="text-[#EC2029]">VJ {pnr}</strong>
                        </div>
                      </div>
                    </>
                  )}

                  {templateType === 'ticket_issuance' && (
                    <>
                      <p className="text-slate-600">
                        Vietjet Air xin trân trọng thông báo giao dịch thanh toán của Quý khách đã{' '}
                        <strong>hoàn tất thành công</strong>. Vé điện tử đã được phát hành chính
                        thức:
                      </p>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <div className="text-3xs uppercase tracking-widest text-slate-400 font-bold">
                          MÃ ĐẶT CHỖ (PNR)
                        </div>
                        <div className="text-2xl font-black text-[#EC2029] tracking-widest mt-1">
                          {pnr}
                        </div>
                        <div className="text-2xs text-emerald-600 font-bold mt-1">
                          ĐÃ THANH TOÁN • VÉ ĐÃ PHÁT HÀNH
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-2xs space-y-1">
                        <div>
                          Trạng thái: <strong>Thành công (Đã xuất vé)</strong>
                        </div>
                        <div>
                          Tổng tiền: <strong>{formattedAmount} VNĐ</strong>
                        </div>
                        <div>
                          Chuyến bay: <strong>{booking.flightNo || 'VJ120'}</strong>
                        </div>
                        <div>
                          Hành trình: <strong>{booking.route || 'SGN → HAN'}</strong>
                        </div>
                      </div>
                    </>
                  )}

                  {templateType === 'payment_failed' && (
                    <>
                      <p className="text-slate-600">
                        Giao dịch thanh toán cho mã đặt chỗ của Quý khách{' '}
                        <strong>chưa được hoàn tất thành công</strong>.
                      </p>
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                        <div className="text-2xl font-black text-rose-600 tracking-widest">
                          {pnr}
                        </div>
                        <div className="text-2xs text-rose-600 font-bold mt-1">
                          THANH TOÁN THẤT BẠI / TỪ CHỐI ĐỐI SOÁT
                        </div>
                      </div>
                    </>
                  )}

                  {customNote && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-2xs text-amber-900">
                      <strong>Lời nhắn từ Quản trị viên:</strong>
                      <p className="mt-0.5">{customNote}</p>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <span className="inline-block px-5 py-2.5 bg-[#EC2029] text-white font-bold text-2xs rounded-lg uppercase tracking-wider">
                      {templateType === 'payment_instruction'
                        ? 'Thanh toán ngay bằng VietQR'
                        : 'Xem vé điện tử & Quản lý chuyến bay'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-white/[0.03] border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-2xs uppercase tracking-widest transition-all"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !recipientEmail}
            className={`px-7 py-3 rounded-2xl font-black text-2xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 ${
              templateType === 'payment_instruction'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : templateType === 'ticket_issuance'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
            }`}
          >
            {isSending ? (
              <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
            ) : (
              <Icon name="PaperAirplaneIcon" size={16} />
            )}
            <span>
              {isSending
                ? 'Đang gửi Gmail...'
                : templateType === 'payment_instruction'
                  ? 'Gửi Gmail thanh toán'
                  : templateType === 'ticket_issuance'
                    ? 'Gửi Gmail xuất vé'
                    : 'Gửi Gmail thông báo'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
