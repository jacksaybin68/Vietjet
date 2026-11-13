'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckInHeader } from '@/shared/components/navigation';
import SkyJoyIdModal from '@/features/auth/components/SkyJoyIdModal';

/**
 * Trang "Đăng ký".
 *
 * Từ đợt sao chép giao diện 13/11/2026, đăng ký của site thật là **modal 2 cột**
 * SkyJoy ID (form `536px` + hero `600×600px`) — nên route này render đúng modal
 * đó ở chế độ `page`. Xem `docs/qa/so-do-vietjetair-2026-11-13.md` mục C.
 *
 * Route vẫn public (`src/lib/route-access.ts`) và vẫn nhận `?redirect=`.
 */
function RegisterPageInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <CheckInHeader title="ĐĂNG KÝ" />

      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
      >
        <SkyJoyIdModal variant="page" mode="register" redirectTo={redirect} />

        {/* Văn bản hỗ trợ bên dưới modal — giữ nội dung trang đủ dài và giải
            thích quyền lợi thành viên SkyJoy cho khách mới. */}
        <section className="mx-auto mt-8 w-full max-w-[900px] px-2 text-center">
          <h2 className="text-xl font-semibold uppercase leading-[26px] text-[var(--vj-text)]">
            Đăng ký Vietjet SkyJoy ID
          </h2>
          <p className="mt-3 text-base font-medium leading-[24px] text-[var(--vj-text-gray)]">
            Thành viên SkyJoy ID tích điểm cho mỗi chuyến bay, đổi được quà tặng, nhận ưu đãi riêng
            cho từng chuyến và quản lý mọi đặt chỗ trong một tài khoản duy nhất. Bạn chỉ cần số điện
            thoại và email để bắt đầu; hệ thống sẽ gửi mã xác thực để bảo đảm tài khoản luôn thuộc
            về bạn.
          </p>
          <p className="mt-3 text-base font-medium leading-[24px] text-[var(--vj-text-gray)]">
            Sau khi hoàn tất đăng ký, bạn có thể đặt vé nhanh hơn, chọn chỗ ngồi theo ý muốn, mua
            thêm hành lý ký gửi và suất ăn, cùng nhiều tiện ích khác trên cả website, ứng dụng di
            động và tại sân bay.
          </p>
          <p className="mt-3 text-base font-medium leading-[24px] text-[var(--vj-text-gray)]">
            Thông tin của bạn được xác thực và bảo vệ bởi SkyJoy ID, hệ thống định danh tập trung
            của Vietjet Air. Nếu bạn đã có tài khoản, hãy chọn Đăng nhập ngay để tiếp tục mà không
            cần tạo mới.
          </p>
        </section>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <RegisterPageInner />
    </React.Suspense>
  );
}
