'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckInHeader } from '@/shared/components/navigation';
import SkyJoyIdModal from '@/features/auth/components/SkyJoyIdModal';

/**
 * Trang "Đăng nhập".
 *
 * Trước đây đây là trang full-page theo theme SkyID. Từ đợt sao chép giao diện
 * 13/11/2026, đăng nhập/đăng ký của site thật là **modal 2 cột** (cột trái
 * form `536px`, cột phải hero `600×600px`) mở từ header — nên route này render
 * đúng modal đó ở chế độ `page` (xem `docs/qa/so-do-vietjetair-2026-11-13.md`
 * mục C).
 *
 * Route vẫn public (`src/lib/route-access.ts`) và vẫn nhận `?redirect=` để quay
 * lại trang gốc sau khi đăng nhập.
 */
function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || undefined;
  const mode = searchParams.get('tab') === 'register' ? 'register' : 'login';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <CheckInHeader title="ĐĂNG NHẬP" />

      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
      >
        <SkyJoyIdModal variant="page" mode={mode} redirectTo={redirect} />

        {/* Văn bản hỗ trợ bên dưới modal — giữ nội dung trang đủ dài và giải
            thích luồng SkyJoy ID cho khách chưa đăng nhập. */}
        <section className="mx-auto mt-8 w-full max-w-[900px] px-2 text-center">
          <h2 className="text-xl font-semibold uppercase leading-[26px] text-[var(--vj-text)]">
            Đăng nhập Vietjet SkyJoy ID
          </h2>
          <p className="mt-3 text-base font-medium leading-[24px] text-[var(--vj-text-gray)]">
            Tài khoản SkyJoy ID là tài khoản thành viên của Vietjet Air, dùng để quản lý chuyến bay,
            tra cứu đặt chỗ, làm thủ tục trực tuyến và tích điểm đổi quà. Sau khi đăng nhập bằng số
            điện thoại, bạn có thể xem toàn bộ đặt chỗ của mình, chọn chỗ ngồi, mua thêm hành lý và
            suất ăn, hoặc quản lý phương thức thanh toán trong một tài khoản duy nhất.
          </p>
          <p className="mt-3 text-base font-medium leading-[24px] text-[var(--vj-text-gray)]">
            Nếu bạn chưa có tài khoản, hãy chọn Đăng ký ngay để tạo tài khoản mới bằng số điện thoại
            và email của bạn. Mã xác thực sẽ được gửi tới để bảo đảm bạn là chủ sở hữu thực của số
            điện thoại đó. Bạn cũng có thể đăng nhập nhanh bằng tài khoản Apple hoặc Google đã liên
            kết.
          </p>
          <p className="mt-3 text-base font-medium leading-[24px] text-[var(--vj-text-gray)]">
            Mọi thông tin đăng nhập của bạn được xác thực bởi SkyJoy ID, hệ thống định danh tập
            trung của Vietjet Air, nên một tài khoản dùng được trên cả website, ứng dụng di động và
            tại sân bay.
          </p>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageInner />
    </React.Suspense>
  );
}
