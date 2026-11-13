'use client';

import React, { Suspense } from 'react';
import SkyIdForgotPassword from '@/features/auth/components/skyid/steps/ForgotPasswordStep';

/**
 * Trang "Quên mật khẩu?".
 *
 * Giao diện SkyID thật (`skyjoy-id.vietjetair.com`): form 1 cột trên nền ảnh
 * toàn trang, nhãn nổi `16px/500`, nút CTA gradient vàng. Xem
 * `docs/qa/so-do-skyid-2026-11-13.md`.
 *
 * Nghiệp vụ giữ nguyên: `requestPasswordReset` gọi
 * `POST /api/xac-thuc/quen-mat-khau`; token dùng một lần và băm trong
 * `account_recovery` (`src/lib/password-reset.ts`).
 */
export default function ForgotPasswordPage() {
  return (
    <main id="main-content" className="min-h-screen">
      <Suspense fallback={null}>
        <SkyIdForgotPassword />
      </Suspense>
    </main>
  );
}
