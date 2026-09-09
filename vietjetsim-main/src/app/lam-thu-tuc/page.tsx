'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/shared/components/navigation';
import { Footer } from '@/shared/components/navigation';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { MdFlight, MdCheckCircle, MdInfoOutline, MdQrCode2 } from 'react-icons/md';

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
  const [bookingCode, setBookingCode] = useState(prefillBookingId);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [agreed, setAgreed] = useState(false);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!bookingCode.trim()) {
        toast.error('Lỗi', 'Vui lòng nhập mã đặt chỗ');
        return;
      }
      if (!lastName.trim()) {
        toast.error('Lỗi', 'Vui lòng nhập họ');
        return;
      }
      if (!firstName.trim()) {
        toast.error('Lỗi', 'Vui lòng nhập tên đệm và tên');
        return;
      }

      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));

      const mockData: CheckInData = {
        bookingId: bookingCode.trim().toUpperCase(),
        flightNo: 'VJ 101',
        from: 'HAN',
        to: 'SGN',
        fromCity: 'Hà Nội (HAN)',
        toCity: 'TP. Hồ Chí Minh (SGN)',
        departTime: '06:00',
        arriveTime: '08:10',
        date: '20/03/2026',
        passengerName: `${lastName.trim().toUpperCase()} ${firstName.trim().toUpperCase()}`,
        seat: '12A',
        class: 'Eco',
        status: 'confirmed',
      };

      setCheckInData(mockData);
      setStep('confirm');
      setLoading(false);
    },
    [bookingCode, lastName, firstName, toast]
  );

  const handleCheckIn = useCallback(async () => {
    if (!agreed) {
      toast.warning('Chưa đồng ý', 'Vui lòng xác nhận đồng ý với quy định an toàn bay');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setStep('success');
    setLoading(false);
    toast.success('Check-in thành công!', 'Thẻ lên tàu bay đã sẵn sàng.');
  }, [agreed, toast]);

  const fieldClass =
    'w-full rounded border border-[#d9d9d9] bg-white px-4 py-3 text-sm text-[#333] placeholder:text-[#bbb] focus:border-[#E31E24] focus:outline-none focus:ring-2 focus:ring-[#E31E24]/20 font-koho';

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col justify-between">
      <Header />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* Red Banner - Official Vietjet style */}
      <div className="bg-[#E31E24] py-10 text-center text-white">
        <div className="mx-auto max-w-[900px] px-4">
          <MdFlight className="mx-auto mb-3 text-5xl opacity-90" />
          <h1 className="text-3xl font-black tracking-tight uppercase">
            CHECK-IN TRỰC TUYẾN (WEB CHECK-IN)
          </h1>
          <p className="mt-2 text-sm text-white/90">
            Dịch vụ áp dụng cho các chuyến bay nội địa và quốc tế do Vietjet khai thác. Mở trước 24
            giờ đến 60 phút so với giờ khởi hành.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-[900px] w-full px-4 py-8 flex-grow">
        {/* STEP 1: SEARCH FORM */}
        {step === 'search' && (
          <div className="overflow-hidden rounded-lg bg-white shadow-md border border-[#e7e7e7]">
            <div className="border-b border-[#e7e7e7] bg-[#fafafa] px-8 py-4">
              <h2 className="text-base font-bold uppercase text-[#333]">
                Tra cứu chuyến bay làm thủ tục
              </h2>
            </div>

            <form onSubmit={handleSearch} className="p-8 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#555]">
                    Mã đặt chỗ (PNR)<span className="ml-1 text-[#E31E24]">*</span>
                  </label>
                  <input
                    type="text"
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: VJ8K3M2"
                    className={fieldClass}
                    maxLength={7}
                  />
                  <p className="mt-1 text-[11px] text-[#888]">
                    Mã đặt chỗ gồm 6 chữ cái hoặc chữ và số được gửi qua email xác nhận đặt vé.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#555]">
                    Họ (Last Name)<span className="ml-1 text-[#E31E24]">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: NGUYEN"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#555]">
                    Tên đệm & Tên (First & Middle Name)
                    <span className="ml-1 text-[#E31E24]">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: VAN AN"
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* Note box */}
              <div className="rounded border border-[#ffe4e6] bg-[#fff1f2] p-4 text-xs text-[#9f1239]">
                <div className="flex items-start gap-2.5">
                  <MdInfoOutline className="text-lg shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="font-bold">Quy định và lưu ý về dịch vụ Web Check-in:</p>
                    <p>
                      • Dịch vụ làm thủ tục trực tuyến khả dụng từ 24 tiếng đến 60 phút trước giờ
                      khởi hành dự kiến.
                    </p>
                    <p>
                      • Quý khách mang theo hành lý ký gửi vui lòng có mặt tại quầy thủ tục sân bay
                      tối thiểu 50 phút trước giờ bay để gửi hành lý.
                    </p>
                    <p>
                      • Vui lòng chuẩn bị đầy đủ giấy tờ tùy thân (CCCD / Hộ chiếu) còn hạn sử dụng
                      trước khi ra cửa khởi hành.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded bg-[#E31E24] py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow hover:bg-[#c9191f] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm chuyến bay'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: CONFIRMATION */}
        {step === 'confirm' && checkInData && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg bg-white shadow-md border border-[#e7e7e7]">
              <div className="bg-[#1A2948] px-6 py-4 text-white flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider text-sm">
                  Chuyến bay: {checkInData.flightNo}
                </span>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                  {checkInData.date}
                </span>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-[#eee] pb-6">
                  <div>
                    <p className="text-2xl font-black text-[#E31E24]">{checkInData.departTime}</p>
                    <p className="text-sm font-bold text-[#333]">{checkInData.fromCity}</p>
                  </div>
                  <div className="text-center px-4">
                    <MdFlight className="text-2xl text-[#888] rotate-90 mx-auto" />
                    <span className="text-[11px] text-[#888] font-semibold">Bay thẳng</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#E31E24]">{checkInData.arriveTime}</p>
                    <p className="text-sm font-bold text-[#333]">{checkInData.toCity}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-[#fafafa] p-4 rounded border border-[#eee]">
                  <div>
                    <p className="text-xs text-[#777]">Tên hành khách:</p>
                    <p className="font-bold text-[#333]">{checkInData.passengerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#777]">Số ghế được cấp:</p>
                    <p className="font-bold text-[#E31E24]">{checkInData.seat}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agree"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#E31E24] focus:ring-[#E31E24]"
                  />
                  <label
                    htmlFor="agree"
                    className="text-xs text-[#555] cursor-pointer leading-relaxed"
                  >
                    Tôi xác nhận thông tin cá nhân hoàn toàn chính xác và cam kết không mang theo
                    các vật phẩm nguy hiểm thuộc danh mục cấm bay.
                  </label>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('search')}
                    className="w-1/3 rounded border border-[#d9d9d9] bg-white py-3 text-sm font-bold uppercase text-[#555] hover:bg-gray-50"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="w-2/3 rounded bg-[#E31E24] py-3 text-sm font-bold uppercase text-white shadow hover:bg-[#c9191f] disabled:opacity-50"
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận làm thủ tục'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS BOARDING PASS */}
        {step === 'success' && checkInData && (
          <div className="overflow-hidden rounded-lg bg-white shadow-md border border-[#e7e7e7] p-8 text-center space-y-6">
            <MdCheckCircle className="mx-auto text-6xl text-[#10B981]" />
            <div>
              <h2 className="text-2xl font-black text-[#333] uppercase">Làm thủ tục thành công!</h2>
              <p className="text-sm text-[#666] mt-1">
                Thẻ lên tàu bay điện tử (Boarding Pass) của bạn đã sẵn sàng.
              </p>
            </div>

            <div className="max-w-sm mx-auto bg-[#f9fafb] border-2 border-dashed border-[#d1d5db] p-6 rounded-xl space-y-4">
              <div className="flex justify-between text-xs font-bold text-[#555] border-b border-[#e5e7eb] pb-3">
                <span>{checkInData.flightNo}</span>
                <span>GHẾ: {checkInData.seat}</span>
              </div>
              <p className="text-sm font-black text-[#111827]">{checkInData.passengerName}</p>
              <MdQrCode2 className="mx-auto text-9xl text-[#111827]" />
              <p className="text-[11px] text-[#6b7280]">
                Vui lòng lưu lại hình ảnh hoặc chụp màn hình mã QR này để xuất trình tại sân bay.
              </p>
            </div>

            <div className="pt-4">
              <Link
                href="/trang-chu"
                className="inline-block rounded bg-[#E31E24] px-8 py-3 text-sm font-bold uppercase text-white shadow hover:bg-[#c9191f]"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function OnlineCheckInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
      <CheckInParamsWrapper />
    </Suspense>
  );
}

function CheckInParamsWrapper() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  return <CheckInContent prefillBookingId={code} />;
}
