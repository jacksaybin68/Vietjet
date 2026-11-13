'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import SkyIdAuthFlow from '@/features/auth/components/skyid/SkyIdAuthFlow';

/**
 * Trang "Đăng nhập".
 *
 * Từ đợt sao chép giao diện 13/11/2026, đăng nhập của site thật là **form 1 cột
 * SkyID** trên nền ảnh toàn trang (`skyjoy-id.vietjetair.com`), thay cho modal 2
 * cột trước đây. Xem `docs/qa/so-do-skyid-2026-11-13.md`.
 *
 * Route vẫn public (`src/lib/route-access.ts`) và vẫn nhận `?redirect=` để quay
 * lại trang gốc sau khi đăng nhập. `?tab=register` vẫn deep-link sang đăng ký.
 */
function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || undefined;
  const mode = searchParams.get('tab') === 'register' ? 'register' : 'login';

  return (
    <main id="main-content" className="min-h-screen">
      <SkyIdAuthFlow variant="page" mode={mode} redirectTo={redirect} />
    </main>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageInner />
    </React.Suspense>
  );
}
