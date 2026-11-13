'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Số giây chờ mặc định sau khi gửi mã OTP — khớp với `.gid-resend-otp` của SkyID. */
export const SKY_ID_RESEND_COOLDOWN = 60;

/**
 * Đồng hồ đếm ngược cho nút "Gửi lại mã" của bước OTP.
 *
 * SkyID thật khóa nút gửi lại trong 60 giây đầu và hiển thị đồng hồ đếm
 * ngược cạnh chữ "Gửi lại mã". Ở đây đồng hồ nằm ở bước cha (`SkyIdAuthFlow`)
 * để nó không bị reset mỗi lần bước con render lại, và để sau khi gửi lại mã
 * thành công thì thời gian chờ bắt đầu lại từ đầu.
 *
 * @param seconds Số giây chờ ban đầu.
 * @returns `[secondsLeft, startCountdown]` — `startCountdown()` dùng để bắt đầu
 *   (hoặc bắt đầu lại) thời gian chờ.
 */
export function useResendCountdown(seconds: number = SKY_ID_RESEND_COOLDOWN) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (next: number = seconds) => {
      clearTimer();
      setSecondsLeft(next);
    },
    [clearTimer, seconds]
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      clearTimer();
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    timerRef.current = id;
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [secondsLeft, clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return [secondsLeft, startCountdown] as const;
}
