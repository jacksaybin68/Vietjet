'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import SkyIdAuthFlow from '@/features/auth/components/skyid/SkyIdAuthFlow';

/**
 * Trang "Đăng ký".
 *
 * Dùng chung bộ SkyID với `/dang-nhap` — form 1 cột trên nền ảnh toàn trang,
 * khớp `skyjoy-id.vietjetair.com`. Xem `docs/qa/so-do-skyid-2026-11-13.md`.
 *
 * Route vẫn public (`src/lib/route-access.ts`) và vẫn nhận `?redirect=`.
 */
function RegisterPageInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <main id="main-content" className="min-h-screen">
      <SkyIdAuthFlow variant="page" mode="register" redirectTo={redirect} />
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
