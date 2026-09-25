'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';
import { Header, Footer } from '@/shared/components/navigation';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/shared/services';

interface BookingResult {
  pnr: string;
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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
}

/** One row as `GET /api/dat-ve` returns it. */
interface OwnedBooking {
  id: string;
  booking_code: string | null;
  status: BookingResult['status'];
  total_price: number;
  created_at: string;
  flight: {
    flight_no: string;
    from_code: string;
    to_code: string;
    depart_time: string;
    arrive_time: string;
  };
  passengers: Array<{ name: string }>;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ thanh toán', color: '#d97706', bg: '#fef3c7' },
  confirmed: { label: 'Đã xác nhận', color: '#059669', bg: '#d1fae5' },
  completed: { label: 'Hoàn thành', color: '#2563eb', bg: '#dbeafe' },
  cancelled: { label: 'Đã hủy', color: '#dc2626', bg: '#fee2e2' },
  refunded: { label: 'Đã hoàn tiền', color: '#2563eb', bg: '#dbeafe' },
};

/** `HH:MM` in the viewer's timezone, falling back to the raw value. */
function toTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function toDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TrackBookingPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = useCallback(async () => {
    const code = pnr.trim().toUpperCase();
    if (!code) {
      toast.error('Lỗi', 'Vui lòng nhập mã đặt chỗ (PNR)');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      // Only the signed-in customer's own bookings are searched: `/api/dat-ve`
      // requires a session and filters by `user_id` server-side. A booking code
      // is only 6 characters, so a public lookup-by-PNR would let anyone walk
      // the keyspace and read other people's itineraries — the same reason
      // `/api/checkin/status/[bookingId]` demands a session and ownership.
      const data = await apiRequest<{ bookings: OwnedBooking[] }>('/api/dat-ve?limit=100');
      const match = data.bookings.find((b) => (b.booking_code || '').toUpperCase() === code);

      if (!match) {
        setNotFound(true);
        toast.warning('Không tìm thấy', 'Không có đặt chỗ nào khớp với mã bạn nhập');
        return;
      }

      setResult({
        pnr: match.booking_code || code,
        flightNo: match.flight.flight_no,
        from: match.flight.from_code,
        to: match.flight.to_code,
        fromCity: '',
        toCity: '',
        departTime: toTime(match.flight.depart_time),
        arriveTime: toTime(match.flight.arrive_time),
        date: toDate(match.flight.depart_time),
        passengerName: match.passengers[0]?.name || '—',
        seat: '—',
        class: '—',
        status: match.status,
        price: match.total_price,
      });
      toast.success('Tìm thấy!', `Đặt chỗ ${match.booking_code} của bạn`);
    } catch (error) {
      toast.error(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể tra cứu, vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [pnr, toast]);

  const handleReset = useCallback(() => {
    setPnr('');
    setResult(null);
    setNotFound(false);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {/* Header */}
      <header className="bg-gradient-red text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="MagnifyingGlassIcon" size={28} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-1 font-heading-sm">Tra Cứu Đặt Chỗ</h1>
          <p className="text-white/80 text-sm font-koho">
            Nhập mã đặt chỗ của bạn để xem thông tin chuyến bay
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors border border-white/20"
          >
            <Icon name="ArrowLeftIcon" size={16} />
            Về trang chủ
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Not signed in — a booking code is only 6 characters, so the lookup
            is deliberately restricted to the signed-in customer's own bookings
            rather than exposed as a public search. */}
        {!user && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="LockClosedIcon" size={32} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Cần đăng nhập để tra cứu</h2>
            <p className="text-stone-500 mb-6 text-sm max-w-md mx-auto">
              Mã đặt chỗ chỉ gồm 6 ký tự, nên tra cứu công khai sẽ khiến bất kỳ ai cũng có thể dò ra
              hành trình của người khác. Hãy đăng nhập — tra cứu chỉ hiển thị các chuyến của chính
              bạn.
            </p>
            <Link
              href="/dang-nhap?redirect=%2Ftra-cuu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Icon name="ArrowRightIcon" size={18} />
              Đăng nhập
            </Link>
          </div>
        )}

        {/* Search Form */}
        {user && !result && !notFound && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Mã đặt chỗ (PNR)
                </label>
                <div className="relative">
                  <Icon
                    name="TicketIcon"
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    value={pnr}
                    onChange={(e) => setPnr(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="VD: VJ644052"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    maxLength={8}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <span className="font-semibold">Đang xem tài khoản:</span>{' '}
                <code className="font-mono">{user.email}</code> — chỉ các đặt chỗ của tài khoản này
                được hiển thị.
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <Icon name="MagnifyingGlassIcon" size={18} />
                    Tra cứu
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Not Found */}
        {notFound && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="ExclamationCircleIcon" size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Không tìm thấy đặt chỗ</h2>
            <p className="text-stone-500 mb-6 text-sm">
              Không có đặt chỗ nào của tài khoản này khớp với mã bạn đã nhập. Vui lòng kiểm tra lại
              thông tin.
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Icon name="ArrowPathIcon" size={18} />
              Thử lại
            </button>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div
              className="px-5 py-3 rounded-xl flex items-center justify-between"
              style={{ backgroundColor: STATUS_MAP[result.status].bg }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STATUS_MAP[result.status].color }}
                />
                <span
                  className="font-bold text-sm"
                  style={{ color: STATUS_MAP[result.status].color }}
                >
                  {STATUS_MAP[result.status].label}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-semibold text-stone-500 hover:text-primary transition-colors"
              >
                Tra cứu khác
              </button>
            </div>

            {/* Booking Card */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-[#1A2948] to-[#0F1E3A] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="PaperAirplaneIcon" size={18} className="text-white" />
                  <span className="text-white font-bold">{result.flightNo}</span>
                </div>
                <span className="text-white/70 text-sm font-mono">{result.pnr}</span>
              </div>

              {/* Flight Route */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-black text-[#1A2948]">{result.departTime}</div>
                    <div className="text-sm font-bold text-stone-600 mt-1">{result.from}</div>
                    <div className="text-xs text-stone-400">{result.fromCity}</div>
                  </div>

                  <div className="flex-1 mx-6 flex flex-col items-center">
                    <div className="text-xs text-stone-400 mb-1">Bay thẳng</div>
                    <div className="w-full h-px bg-stone-300 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                        <Icon
                          name="PaperAirplaneIcon"
                          size={16}
                          className="text-primary rotate-90"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-stone-400 mt-1">{result.date}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-black text-[#1A2948]">{result.arriveTime}</div>
                    <div className="text-sm font-bold text-stone-600 mt-1">{result.to}</div>
                    <div className="text-xs text-stone-400">{result.toCity}</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative border-t-2 border-dashed border-stone-200 my-4">
                  <div className="absolute -left-3 -top-3 w-6 h-6 bg-stone-50 rounded-full border border-stone-200" />
                  <div className="absolute -right-3 -top-3 w-6 h-6 bg-stone-50 rounded-full border border-stone-200" />
                </div>

                {/* Passenger Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Hành khách</div>
                    <div className="font-semibold text-stone-800">{result.passengerName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Ghế ngồi</div>
                    <div className="font-bold text-primary">{result.seat}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Hạng vé</div>
                    <div className="font-semibold text-stone-800">{result.class}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 uppercase">Giá vé</div>
                    <div className="font-bold text-stone-800">
                      {result.price.toLocaleString('vi-VN')}₫
                    </div>
                  </div>
                </div>

                {/* QR Code Mock */}
                <div className="flex flex-col items-center p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="w-28 h-28 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-stone-300 mb-2">
                    <Icon name="QrCodeIcon" size={48} className="text-stone-400" />
                  </div>
                  <p className="text-xs text-stone-500 text-center">Xuất trình mã QR tại sân bay</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/lam-thu-tuc"
                className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-200 rounded-xl font-semibold text-stone-700 hover:border-primary hover:text-primary transition-all"
              >
                <Icon name="TicketIcon" size={18} />
                Check-in
              </Link>
              <Link
                href="/tim-ve"
                className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
              >
                <Icon name="PlusIcon" size={18} />
                Đặt vé mới
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
