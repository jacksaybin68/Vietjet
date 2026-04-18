'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

interface BookingDetail {
  id: string;
  user_id: string;
  flight_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  created_at: string;
  updated_at: string;
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price: number;
  class: string;
  passengers: Array<{
    id: string;
    full_name: string;
    seat_number?: string;
    passenger_type: string;
  }>;
  payments: Array<{
    id: string;
    method: string;
    status: string;
    amount: number;
    created_at: string;
  }>;
  seats: Array<{
    id: string;
    seat_number: string;
    seat_class: string;
  }>;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ thanh toán', color: '#d97706', bg: '#fef3c7' },
  confirmed: { label: 'Đã xác nhận', color: '#059669', bg: '#d1fae5' },
  completed: { label: 'Hoàn thành', color: '#2563eb', bg: '#dbeafe' },
  cancelled: { label: 'Đã hủy', color: '#dc2626', bg: '#fee2e2' },
  refunded: { label: 'Đã hoàn tiền', color: '#7c3aed', bg: '#ede9fe' },
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Không tìm thấy đặt chỗ');
          if (res.status === 401) {
            router.push('/sign-up-login');
            return;
          }
          throw new Error('Lỗi khi tải thông tin');
        }
        const data = await res.json();
        setBooking(data.booking);
      } catch (err: any) {
        setError(err.message || 'Đã có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  const handleCopyCode = useCallback(async () => {
    if (booking?.id) {
      await navigator.clipboard.writeText(booking.id);
      toast.success('Đã sao chép', `Mã đặt chỗ ${booking.id} đã được sao chép`);
    }
  }, [booking, toast]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = (depart: string, arrive: string) => {
    const diff = new Date(arrive).getTime() - new Date(depart).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Đang tải thông tin đặt chỗ...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="ExclamationCircleIcon" size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Không tìm thấy đặt chỗ</h2>
          <p className="text-stone-500 mb-6">
            {error || 'Mã đặt chỗ không tồn tại hoặc đã bị xóa.'}
          </p>
          <Link
            href="/user-dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Icon name="ArrowLeftIcon" size={18} />
            Quay lại Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[booking.status] || STATUS_MAP.pending;

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      <main className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/user-dashboard"
              className="flex items-center gap-2 text-stone-600 hover:text-primary transition-colors font-medium"
            >
              <Icon name="ArrowLeftIcon" size={18} />
              Quay lại
            </Link>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-700 hover:border-primary hover:text-primary transition-all"
            >
              <Icon name="ClipboardDocumentIcon" size={16} />
              Sao chép mã
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            {/* Status Banner */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                background: `${statusInfo.bg}20`,
                borderBottom: `1px solid ${statusInfo.bg}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: statusInfo.color }}
                />
                <span className="font-bold" style={{ color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              </div>
              <span className="text-sm text-stone-500">
                Đặt lúc: {formatDate(booking.created_at)}
              </span>
            </div>

            {/* Booking Code */}
            <div className="px-6 py-5 border-b border-stone-100">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">
                Mã đặt chỗ
              </div>
              <div className="text-3xl font-black text-primary tracking-widest">{booking.id}</div>
            </div>

            {/* Flight Info */}
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm font-bold text-stone-500">{booking.flight_no}</div>
                <div className="text-sm text-stone-400">{formatDate(booking.depart_time)}</div>
              </div>

              <div className="flex items-center justify-between">
                {/* Departure */}
                <div className="text-center">
                  <div className="text-3xl font-black text-stone-900">
                    {formatTime(booking.depart_time)}
                  </div>
                  <div className="text-lg font-bold text-stone-700 mt-1">{booking.from_code}</div>
                </div>

                {/* Duration Line */}
                <div className="flex-1 mx-6 flex flex-col items-center">
                  <div className="text-xs text-stone-400 mb-1">
                    {getDuration(booking.depart_time, booking.arrive_time)}
                  </div>
                  <div className="w-full h-px bg-stone-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                      <Icon name="PaperAirplaneIcon" size={16} className="text-primary rotate-90" />
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 mt-1">Bay thẳng</div>
                </div>

                {/* Arrival */}
                <div className="text-center">
                  <div className="text-3xl font-black text-stone-900">
                    {formatTime(booking.arrive_time)}
                  </div>
                  <div className="text-lg font-bold text-stone-700 mt-1">{booking.to_code}</div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative border-t-2 border-dashed border-stone-200 mx-6">
              <div className="absolute -left-3 -top-3 w-6 h-6 bg-stone-50 rounded-full border border-stone-200" />
              <div className="absolute -right-3 -top-3 w-6 h-6 bg-stone-50 rounded-full border border-stone-200" />
            </div>

            {/* Passengers */}
            <div className="px-6 py-5">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">
                Hành khách
              </h3>
              <div className="space-y-3">
                {booking.passengers.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
                        <Icon name="UserIcon" size={14} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{p.full_name}</div>
                        <div className="text-xs text-stone-400 capitalize">{p.passenger_type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-stone-900">
                        Ghế {p.seat_number || 'Chưa chọn'}
                      </div>
                      <div className="text-xs text-stone-400 capitalize">{booking.class}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="px-6 py-5 bg-stone-50 border-t border-stone-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-stone-500">Giá vé</span>
                <span className="font-semibold">{booking.price.toLocaleString('vi-VN')}₫</span>
              </div>
              {booking.payments.length > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-stone-500">Phương thức</span>
                  <span className="font-semibold capitalize">{booking.payments[0].method}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-stone-200">
                <span className="font-bold text-stone-700">Tổng thanh toán</span>
                <span className="text-xl font-black text-primary">
                  {booking.total_price.toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>

            {/* QR Code Mock */}
            <div className="px-6 py-6 flex flex-col items-center border-t border-stone-100">
              <div className="w-32 h-32 bg-stone-100 rounded-xl flex items-center justify-center border-2 border-dashed border-stone-300 mb-3">
                <div className="text-center">
                  <Icon name="QrCodeIcon" size={48} className="text-stone-400 mx-auto" />
                  <div className="text-xs text-stone-400 mt-1">QR Check-in</div>
                </div>
              </div>
              <p className="text-xs text-stone-400 text-center">
                Xuất trình mã QR này tại quầy check-in hoặc cửa lên máy bay
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                toast.info('Tính năng đang phát triển', 'Chức năng download vé sẽ sớm khả dụng')
              }
              className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-200 rounded-xl font-semibold text-stone-700 hover:border-primary hover:text-primary transition-all"
            >
              <Icon name="ArrowDownTrayIcon" size={18} />
              Tải vé
            </button>
            <button
              onClick={() => router.push('/flight-booking')}
              className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
            >
              <Icon name="PlusIcon" size={18} />
              Đặt vé mới
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
