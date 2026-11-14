'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import SignInPopup from '@/features/auth/components/SignInPopup';

/**
 * Trang "Đăng ký".
 *
 * Dùng chung popup 622×664 của site thật với `/dang-nhap` (băng đỏ 48px,
 * khung SkyID 500×208, bottom nav 62px). Số đo:
 * `docs/qa/2026-11-15-vietjet-measure/README.md` §1.
 *
 * Route vẫn public (`src/lib/route-access.ts`) và vẫn nhận `?redirect=`.
 */
function RegisterPageInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <main id="main-content" className="min-h-screen">
      <SignInPopup mode="register" redirectTo={redirect} />
    </main>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <RegisterPageInner />
    </React.Suspense>
  );
}
