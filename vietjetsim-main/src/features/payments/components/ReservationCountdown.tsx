'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ReservationCountdownProps {
  initialMinutes?: number;
  onExpire?: () => void;
  bookingCode?: string | null;
}

const STORAGE_KEY = 'vj_reservation_expire_time';

export default function ReservationCountdown({
  initialMinutes = 15,
  onExpire,
  bookingCode,
}: ReservationCountdownProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number>(initialMinutes * 60);
  const [showExpiredModal, setShowExpiredModal] = useState<boolean>(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    // Check or initialize expiration timestamp in sessionStorage
    let expireTimestamp: number;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        expireTimestamp = parseInt(stored, 10);
      } else {
        expireTimestamp = Date.now() + initialMinutes * 60 * 1000;
        sessionStorage.setItem(STORAGE_KEY, expireTimestamp.toString());
      }
    } catch {
      expireTimestamp = Date.now() + initialMinutes * 60 * 1000;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((expireTimestamp - now) / 1000));
      setTimeLeft(diffSeconds);

      if (diffSeconds <= 0) {
        setShowExpiredModal(true);
        onExpireRef.current?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [initialMinutes]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft > 0 && timeLeft <= 180; // Dưới 3 phút là cảnh báo
  const percentLeft = Math.min(100, Math.max(0, (timeLeft / (initialMinutes * 60)) * 100));

  const handleRenewTime = () => {
    const newExpire = Date.now() + 10 * 60 * 1000;
    try {
      sessionStorage.setItem(STORAGE_KEY, newExpire.toString());
    } catch {
      // ignore
    }
    setTimeLeft(10 * 60);
    setShowExpiredModal(false);
  };

  return (
    <>
      <div
        className={`w-full transition-all duration-300 rounded-2xl border shadow-sm overflow-hidden mb-5 ${
          isUrgent
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 border-red-300 text-white shadow-red-200/50'
            : 'bg-gradient-to-r from-red-700 via-red-600 to-amber-500 border-red-400/40 text-white shadow-amber-100/50'
        }`}
      >
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Icon & Text */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isUrgent
                  ? 'bg-white text-red-600 animate-bounce'
                  : 'bg-white/20 text-white backdrop-blur-xs'
              }`}
            >
              <svg
                className={`w-5 h-5 ${timeLeft > 0 ? 'animate-spin' : ''}`}
                style={{ animationDuration: '6s' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                  Thời gian giữ chỗ
                </span>
                {bookingCode && (
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                    Mã đặt chỗ: {bookingCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/90 font-medium">
                {isUrgent
                  ? '⚠️ Sắp hết hạn giữ vé! Vui lòng hoàn tất thanh toán để đảm bảo giá vé này.'
                  : 'Vé của bạn đang được Vietjet tạm giữ. Hoàn tất thanh toán trước khi hết giờ.'}
              </p>
            </div>
          </div>

          {/* Right: Digital Countdown Timer */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 shadow-inner">
              <span className="text-3xs font-bold uppercase text-amber-300">Còn lại</span>
              <div className="font-mono font-black text-lg sm:text-xl tracking-wider text-yellow-300 flex items-center">
                <span>{String(minutes).padStart(2, '0')}</span>
                <span className="animate-pulse mx-0.5">:</span>
                <span>{String(seconds).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="w-full h-1 bg-black/20">
          <div
            className={`h-full transition-all duration-1000 ${
              isUrgent ? 'bg-yellow-300' : 'bg-emerald-400'
            }`}
            style={{ width: `${percentLeft}%` }}
          />
        </div>
      </div>

      {/* Modal khi hết hạn giữ chỗ */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl animate-scale-in border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center text-3xl mb-4 border-2 border-amber-200">
              ⏱️
            </div>
            <h3 className="text-xl font-black text-gray-900 font-koho mb-2">
              Hết thời gian giữ chỗ
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Phiên giữ chỗ của chuyến bay đã hết thời gian tạm giữ 15 phút. Giá vé hoặc tình trạng
              chỗ ngồi có thể đã thay đổi. Bạn có thể gia hạn thêm 10 phút hoặc quay lại chọn chuyến
              bay.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleRenewTime}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-sm transition-colors shadow-sm cursor-pointer"
              >
                Gia hạn thêm 10 phút
              </button>
              <button
                type="button"
                onClick={() => router.push('/tim-ve')}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm transition-colors cursor-pointer"
              >
                Tìm chuyến bay khác
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
