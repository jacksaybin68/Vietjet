'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

interface CheckInData {
  bookingId: string;
  flightNo: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  departTime: string;
  arriveTime: string;
  date: string;
  passengerName: string;
  seat: string;
  class: string;
  status: string;
}

function CheckInContent({ prefillBookingId }: { prefillBookingId: string }) {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<'search' | 'confirm' | 'success'>(
    prefillBookingId ? 'confirm' : 'search'
  );
  const [searchInput, setSearchInput] = useState(prefillBookingId);
  const [searchType, setSearchType] = useState<'code' | 'email'>('code');
  const [loading, setLoading] = useState(false);
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [boardingPass, setBoardingPass] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập mã đặt chỗ hoặc email');
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 50));

    // Mock data for demo
    const mockData: CheckInData = {
      bookingId: searchInput.toUpperCase() || 'VJ8K3M2',
      flightNo: 'VJ 101',
      from: 'HAN',
      to: 'SGN',
      fromCity: 'Hà Nội',
      toCity: 'TP.HCM',
      departTime: '06:00',
      arriveTime: '08:10',
      date: '20/03/2026',
      passengerName: 'Nguyễn Văn An',
      seat: '12A',
      class: 'Phổ thông',
      status: 'confirmed',
    };

    setCheckInData(mockData);
    setStep('confirm');
    setLoading(false);
  }, [searchInput, toast]);

  const handleCheckIn = useCallback(async () => {
    if (!agreed) {
      toast.warning('Chưa đồng ý', 'Vui lòng đồng ý với điều khoản check-in');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setBoardingPass(true);
    setStep('success');
    setLoading(false);
    toast.success('Check-in thành công!', 'Mã QR đã được tạo. Vui lòng xuất trình tại sân bay.');
  }, [agreed, toast]);

  const handleReset = useCallback(() => {
    setStep('search');
    setSearchInput('');
    setCheckInData(null);
    setAgreed(false);
    setBoardingPass(false);
  }, []);

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
              <h1 className="font-black text-lg text-[#1A2948] font-heading-sm">
                Check-in Trực Tuyến
              </h1>
              <p className="text-xs text-stone-500 font-koho">
                Vietjet Air — Nhanh chóng & Tiện lợi
              </p>
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
        {/* ═══ STEP 1: SEARCH ═══ */}
        {step === 'search' && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-red p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="TicketIcon" size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">Check-in Trực Tuyến</h2>
              <p className="text-white/80 text-sm">Nhập mã đặt chỗ hoặc email để bắt đầu</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Search Type Toggle */}
              <div className="flex bg-stone-100 rounded-xl p-1">
                <button
                  onClick={() => setSearchType('code')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    searchType === 'code'
                      ? 'bg-white shadow text-[#EC2029]'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Mã đặt chỗ
                </button>
                <button
                  onClick={() => setSearchType('email')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    searchType === 'email'
                      ? 'bg-white shadow text-[#EC2029]'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Email
                </button>
              </div>

              {/* Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  {searchType === 'code' ? 'Mã đặt chỗ (PNR)' : 'Email đặt vé'}
                </label>
                <div className="relative">
                  <Icon
                    name={searchType === 'code' ? 'TicketIcon' : 'EnvelopeIcon'}
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type={searchType === 'email' ? 'email' : 'text'}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={searchType === 'code' ? 'VD: VJ8K3M2' : 'VD: user@example.com'}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-koho"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <div className="flex items-start gap-2">
                  <Icon name="InformationCircleIcon" size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Lưu ý</p>
                    <ul className="text-xs space-y-1 text-blue-600">
                      <li>• Check-in mở trước 24 giờ và đóng trước 40 phút giờ khởi hành</li>
                      <li>• Vui lòng chuẩn bị CCCD/Hộ chiếu khi làm thủ tục tại sân bay</li>
                      <li>• Hành lý ký gửi cần được gửi tại quầy trước giờ bay</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSearch}
                disabled={loading || !searchInput.trim()}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang tìm kiếm...
                  </>
                ) : (
                  <>
                    <Icon name="MagnifyingGlassIcon" size={18} />
                    Tìm chuyến bay
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: CONFIRM ═══ */}
        {step === 'confirm' && checkInData && (
          <div className="space-y-4">
            {/* Flight Card */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-gradient-to-r from-[#1A2948] to-[#0F1E3A] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="PaperAirplaneIcon" size={18} className="text-white" />
                  <span className="text-white font-bold">{checkInData.flightNo}</span>
                </div>
                <span className="text-white/70 text-sm">{checkInData.date}</span>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-[#1A2948]">
                      {checkInData.departTime}
                    </div>
                    <div className="text-sm font-bold text-stone-600 mt-1">{checkInData.from}</div>
                    <div className="text-xs text-stone-400">{checkInData.fromCity}</div>
                  </div>

                  <div className="flex-1 mx-6 flex flex-col items-center">
                    <div className="text-xs text-stone-400 mb-1">2h 10m</div>
                    <div className="w-full h-px bg-stone-300 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                        <Icon
                          name="PaperAirplaneIcon"
                          size={16}
                          className="text-primary rotate-90"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-stone-400 mt-1">Bay thẳng</div>
                  </div>

                  <div className="text-center">
                    <div className="text-3xl font-black text-[#1A2948]">
                      {checkInData.arriveTime}
                    </div>
                    <div className="text-sm font-bold text-stone-600 mt-1">{checkInData.to}</div>
                    <div className="text-xs text-stone-400">{checkInData.toCity}</div>
                  </div>
                </div>

                {/* Passenger Info */}
                <div className="border-t border-stone-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-500">Hành khách</span>
                    <span className="font-semibold text-stone-800">
                      {checkInData.passengerName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-500">Ghế ngồi</span>
                    <span className="font-bold text-primary">{checkInData.seat}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-500">Hạng vé</span>
                    <span className="font-semibold text-stone-800">{checkInData.class}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-500">Mã đặt chỗ</span>
                    <span className="font-mono font-bold text-stone-800">
                      {checkInData.bookingId}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-stone-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-stone-600">
                  Tôi xác nhận thông tin hành khách chính xác và đồng ý với{' '}
                  <button className="text-primary font-semibold hover:underline">
                    điều khoản check-in
                  </button>{' '}
                  của Vietjet Air.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-white border border-stone-200 text-stone-700 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={handleCheckIn}
                disabled={loading || !agreed}
                className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Icon name="CheckCircleIcon" size={18} />
                    Xác nhận check-in
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: SUCCESS / BOARDING PASS ═══ */}
        {step === 'success' && checkInData && (
          <div className="space-y-4">
            {/* Success Banner */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="CheckCircleIcon" size={24} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-green-800">Check-in thành công!</p>
                <p className="text-sm text-green-600">Vui lòng xuất trình mã QR tại sân bay</p>
              </div>
            </div>

            {/* Boarding Pass */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-lg">
              {/* Header */}
              <div className="bg-gradient-red px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="PaperAirplaneIcon" size={18} className="text-white" />
                  <span className="text-white font-bold text-sm">BOARDING PASS</span>
                </div>
                <span className="text-white/80 text-xs font-mono">{checkInData.bookingId}</span>
              </div>

              {/* Flight Info */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl font-black text-[#1A2948]">
                      {checkInData.departTime}
                    </div>
                    <div className="text-sm font-bold text-stone-600">{checkInData.from}</div>
                  </div>
                  <div className="flex-1 mx-4 flex flex-col items-center">
                    <Icon name="PaperAirplaneIcon" size={20} className="text-primary rotate-90" />
                    <div className="text-xs text-stone-400 mt-1">{checkInData.flightNo}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#1A2948]">
                      {checkInData.arriveTime}
                    </div>
                    <div className="text-sm font-bold text-stone-600">{checkInData.to}</div>
                  </div>
                </div>

                <div className="text-xs text-stone-500 mb-4">{checkInData.date}</div>

                {/* Divider */}
                <div className="relative border-t-2 border-dashed border-stone-200 my-4">
                  <div className="absolute -left-3 -top-3 w-6 h-6 bg-stone-50 rounded-full border border-stone-200" />
                  <div className="absolute -right-3 -top-3 w-6 h-6 bg-stone-50 rounded-full border border-stone-200" />
                </div>

                {/* Passenger Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Hành khách</div>
                    <div className="font-bold text-stone-800">{checkInData.passengerName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Ghế</div>
                    <div className="text-xl font-black text-primary">{checkInData.seat}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Hạng vé</div>
                    <div className="font-semibold text-stone-800">{checkInData.class}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Cửa lên máy bay</div>
                    <div className="font-bold text-stone-800">
                      A{Math.floor(Math.random() * 20) + 1}
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="w-36 h-36 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-stone-300 mb-2">
                    <div className="text-center">
                      <Icon name="QrCodeIcon" size={56} className="text-stone-700 mx-auto" />
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 text-center">
                    Quét mã QR tại quầy check-in hoặc cửa lên máy bay
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  toast.info(
                    'Tính năng đang phát triển',
                    'Chức năng tải boarding pass sẽ sớm khả dụng'
                  )
                }
                className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-200 rounded-xl font-semibold text-stone-700 hover:border-primary hover:text-primary transition-all"
              >
                <Icon name="ArrowDownTrayIcon" size={18} />
                Tải xuống
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
              >
                <Icon name="PlusIcon" size={18} />
                Check-in khác
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CheckInSearchParamsWrapper() {
  const searchParams = useSearchParams();
  const prefillBookingId = searchParams.get('bookingId') || '';
  return <CheckInContent prefillBookingId={prefillBookingId} />;
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-stone-500 font-medium">Đang tải...</p>
          </div>
        </div>
      }
    >
      <CheckInSearchParamsWrapper />
    </Suspense>
  );
}
