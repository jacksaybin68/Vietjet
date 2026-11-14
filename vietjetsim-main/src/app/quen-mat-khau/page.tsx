'use client';

import React, { Suspense } from 'react';
import { ForgotPasswordPopup } from '@/features/auth/components/SignInPopup';

/**
 * Trang "Quên mật khẩu?".
 *
 * Dùng chung khung popup 622×664 của site thật (băng đỏ 48px, khung form
 * 500×208, bottom nav 62px) — số đo:
 * `docs/qa/2026-11-15-vietjet-measure/README.md` §1.
 *
 * Nghiệp vụ giữ nguyên: `requestPasswordReset` gọi
 * `POST /api/xac-thuc/quen-mat-khau`; token dùng một lần và băm trong
 * `account_recovery` (`src/lib/password-reset.ts`).
 */
export default function ForgotPasswordPage() {
  return (
    <main id="main-content" className="min-h-screen">
      <Suspense fallback={null}>
        <ForgotPasswordPopup />
      </Suspense>
    </main>
  );
}
