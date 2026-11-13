'use client';

import React, { Suspense } from 'react';
import SkyIdResetPassword from '@/features/auth/components/skyid/SkyIdResetPassword';

/**
 * Trang "Đặt lại mật khẩu" — `/dat-lai-mat-khau?token=…`.
 *
 * Giao diện SkyID thật (`skyjoy-id.vietjetair.com`). Xem
 * `docs/qa/so-do-skyid-2026-11-13.md`.
 *
 * Nghiệp vụ giữ nguyên: token dùng một lần và băm trong `account_recovery`;
 * đặt lại xong sẽ thu hồi refresh token và session.
 */
export default function ResetPasswordPage() {
  return (
    <main id="main-content" className="min-h-screen">
      <Suspense fallback={null}>
        <SkyIdResetPassword />
      </Suspense>
    </main>
  );
}
