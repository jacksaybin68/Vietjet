'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import SignInPopup from '@/features/auth/components/SignInPopup';

/**
 * Trang "Đăng nhập".
 *
 * Site thật không có trang đăng nhập riêng — mọi thao tác đăng nhập đều mở
 * **popup 622×664** (băng đỏ 48px, khung SkyID 500×208, bottom nav 62px).
 * Route này render đúng popup đó trên nền tối `rgba(0,0,0,.4)`, để deep-link
 * `/dang-nhap` vẫn dùng được.
 *
 * Số đo: `docs/qa/2026-11-15-vietjet-measure/README.md` §1.
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
      <SignInPopup mode={mode} redirectTo={redirect} />
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
