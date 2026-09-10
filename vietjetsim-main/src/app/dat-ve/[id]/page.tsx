'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';
import { Header } from '@/shared/components/navigation';
import { Footer } from '@/shared/components/navigation';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';

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
        const res = await fetch(`/api/dat-ve/${bookingId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Không tìm thấy đặt chỗ');
          if (res.status === 401) {
            router.push('/dang-nhap');
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] dark:bg-[var(--dark-surface)]">
        <div className="text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3 sm:mb-4" />
          <p className="text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] font-medium">Đang tải thông tin đặt chỗ...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] dark:bg-[var(--dark-surface)] px-3 sm:px-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Icon name="ExclamationCircleIcon" size={24} sm:size={32} className="text-red-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] dark:text-[var(--foreground)] mb-1.5 sm:mb-2">Không tìm thấy đặt chỗ</h2>
          <p className="text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] mb-5 sm:mb-6">
            {error || 'Mã đặt chỗ không tồn tại hoặc đã bị xóa.'}
          </p>
          <Link
            href="/tai-khoan"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Icon name="ArrowLeftIcon" size={16} sm:size={18} />
            Quay lại Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[booking.status] || STATUS_MAP.pending;

  return (
    <div className="min-h-screen bg-[var(--surface)] dark:bg-[var(--dark-surface)]">
      <Header />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      <main className="py-6 sm:py-8 px-3 sm:px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header - responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <Link
              href="/tai-khoan"
              className="flex items-center gap-1.5 sm:gap-2 text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] hover:text-primary transition-colors font-medium"
            >
              <Icon name="ArrowLeftIcon" size={16} sm:size={18} />
              Quay lại
            </Link>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--surface)] dark:bg-[var(--dark-surface)] border border-[var(--border)] dark:border-[var(--dark-border)] rounded-lg text-[10px] sm:text-sm font-semibold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] hover:border-primary hover:text-primary transition-all"
            >
              <Icon name="ClipboardDocumentIcon" size={14} sm:size={16} />
              Sao chép mã
            </button>
          </div>

          {/* Main Card - responsive */}
          <div className="bg-[var(--surface)] dark:bg-[var(--dark-surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] dark:border-[var(--dark-border)] overflow-hidden shadow-sm">
            {/* Status Banner - responsive */}
            <div
              className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0"
              style={{
                background: `${statusInfo.bg}20`,
                borderBottom: `1px solid ${statusInfo.bg}`,
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                  style={{ backgroundColor: statusInfo.color }}
                />
                <span className="font-bold text-[11px] sm:text-sm" style={{ color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              </div>
              <span className="text-[10px] sm:text-sm text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)]">
                Đặt lúc: {formatDate(booking.created_at)}
              </span>
            </div>

            {/* Booking Code - responsive */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border)] dark:border-[var(--dark-border)]">
              <div className="text-[10px] sm:text-xs font-bold text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)] uppercase tracking-widest mb-0.5 sm:mb-1">
                Mã đặt chỗ
              </div>
              <div className="text-2xl sm:text-3xl font-black text-primary tracking-widest">{booking.id}</div>
            </div>

            {/* Flight Info - responsive */}
            <div className="px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
                <div className="text-[10px] sm:text-sm font-bold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]">{booking.flight_no}</div>
                <div className="text-[10px] sm:text-sm text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)]">{formatDate(booking.depart_time)}</div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
                {/* Departure */}
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-[var(--foreground)] dark:text-[var(--foreground)]">
                    {formatTime(booking.depart_time)}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] mt-0.5 sm:mt-1">{booking.from_code}</div>
                </div>

                {/* Duration Line - responsive */}
                <div className="flex-1 mx-4 sm:mx-6 flex flex-col items-center">
                  <div className="text-[10px] sm:text-xs text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)] mb-0.5 sm:mb-1">
                    {getDuration(booking.depart_time, booking.arrive_time)}
                  </div>
                  <div className="w-full h-px bg-[var(--border)] dark:bg-[var(--dark-border)] relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] dark:bg-[var(--dark-surface)] px-1.5 sm:px-2">
                      <Icon name="PaperAirplaneIcon" size={14} sm:size={16} className="text-primary rotate-90" />
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-primary mt-0.5 sm:mt-1">Bay thẳng</div>
                </div>

                {/* Arrival */}
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-[var(--foreground)] dark:text-[var(--foreground)]">
                    {formatTime(booking.arrive_time)}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] mt-0.5 sm:mt-1">{booking.to_code}</div>
                </div>
              </div>
            </div>

            {/* Divider - responsive */}
            <div className="relative border-t-2 border-dashed border-[var(--border)] dark:border-[var(--dark-border)] mx-4 sm:mx-6">
              <div className="absolute -left-2.5 -top-2.5 w-5 h-5 sm:w-6 sm:h-6 bg-[var(--surface)] dark:bg-[var(--dark-surface)] rounded-full border border-[var(--border)] dark:border-[var(--dark-border)]" />
              <div className="absolute -right-2.5 -top-2.5 w-5 h-5 sm:w-6 sm:h-6 bg-[var(--surface)] dark:bg-[var(--dark-surface)] rounded-full border border-[var(--border)] dark:border-[var(--dark-border)]" />
            </div>

            {/* Passengers - responsive */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <h3 className="text-[10px] sm:text-sm font-bold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] uppercase tracking-wider mb-2.5 sm:mb-3">
                Hành khách
              </h3>
              <div className="space-y-2.5 sm:space-y-3">
                {booking.passengers.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-1.5 sm:py-2 border-b border-[var(--border)] dark:border-[var(--dark-border)] last:border-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/5 dark:bg-primary/10 rounded-full flex items-center justify-center">
                        <Icon name="UserIcon" size={12} sm:size={14} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--foreground)] dark:text-[var(--foreground)] text-[11px] sm:text-sm">{p.full_name}</div>
                        <div className="text-[9px] sm:text-xs text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)] capitalize">{p.passenger_type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--foreground)] dark:text-[var(--foreground)] text-[10px] sm:text-sm">
                        Ghế {p.seat_number || 'Chưa chọn'}
                      </div>
                      <div className="text-[9px] sm:text-xs text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)] capitalize">{booking.class}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info - responsive */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] border-t border-[var(--border)] dark:border-[var(--dark-border)]">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <span className="text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] text-[10px] sm:text-sm">Giá vé</span>
                <span className="font-semibold text-[var(--foreground)] dark:text-[var(--foreground)]">{booking.price.toLocaleString('vi-VN')}₫</span>
              </div>
              {booking.payments.length > 0 && (
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <span className="text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] text-[10px] sm:text-sm">Phương thức</span>
                  <span className="font-semibold text-[var(--foreground)] dark:text-[var(--foreground)] capitalize">{booking.payments[0].method}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 sm:pt-3 border-t border-[var(--border)] dark:border-[var(--dark-border)]">
                <span className="font-bold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] text-[11px] sm:text-sm">Tổng thanh toán</span>
                <span className="text-lg sm:text-xl font-black text-primary">
                  {booking.total_price.toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>

            {/* QR Code Mock - responsive */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col items-center border-t border-[var(--border)] dark:border-[var(--dark-border)]">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[var(--surface-2)] dark:bg-[var(--dark-surface)] rounded-xl flex items-center justify-center border-2 border-dashed border-[var(--border)] dark:border-[var(--dark-border)] mb-2.5 sm:mb-3">
                <div className="text-center">
                  <Icon name="QrCodeIcon" size={32} sm:size={48} className="text-stone-400 mx-auto" />
                  <div className="text-[10px] sm:text-xs text-stone-400 mt-0.5 sm:mt-1">QR Check-in</div>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-[var(--foreground-subtle)] dark:text-[var(--foreground-subtle)] text-center">
                Xuất trình mã QR này tại quầy check-in hoặc cửa lên máy bay
              </p>
            </div>
          </div>

          {/* Actions - responsive */}
          <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <button
              onClick={() =>
                toast.info('Tính năng đang phát triển', 'Chức năng download vé sẽ sớm khả dụng')
              }
              className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-[var(--surface)] dark:bg-[var(--dark-surface)] border border-[var(--border)] dark:border-[var(--dark-border)] rounded-xl font-semibold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] hover:border-primary hover:text-primary transition-all"
            >
              <Icon name="ArrowDownTrayIcon" size={16} sm:size={18} />
              Tải vé
            </button>
            <button
              onClick={() => router.push('/tim-ve')}
              className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
            >
              <Icon name="PlusIcon" size={16} sm:size={18} />
              Đặt vé mới
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
