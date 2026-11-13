'use client';

import React from 'react';

/**
 * Vỏ giao diện SkyID — bản sao bố cục trang xác thực thật của Vietjet.
 *
 * Site thật `vietjetair.com/vi/signin` nhúng iframe
 * `skyjoy-id.vietjetair.com`; bộ giao diện đó được dựng lại ở đây bằng
 * chính token nội bộ và asset chính thức đã tải về `public/images/skyid/`.
 *
 * Số đo (13/11/2026, đọc trên DOM sống — xem
 * `docs/qa/so-do-skyid-2026-11-13.md`):
 *   - `.authenLayout`: nền `bg.jpg` (1921×1081) `cover`, căn giữa cả hai
 *     chiều, `min-height:100vh`, padding `1.5625rem 1.25rem`.
 *   - `.gid-content`: khối form trắng, `padding:24px 34px 0`,
 *     bo góc dưới `16px`, căn giữa.
 *   - `.gid-content-title`: `18px/700`, `#333`.
 *   - `.gid-logo-image-red`: logo đỏ `absolute top:20px left:20px` (`116px`).
 *   - `.gid-logo-image-white`: logo trắng `fixed bottom:20px left:20px` (`176px`).
 *   - `.gid-logo-footer`: mô tả `14px/500 #7B7B7B` + 3 logo cao `16px`.
 *
 * Component này KHÔNG tự nối nghiệp vụ — nó chỉ cung cấp khung. Mọi lệnh gọi
 * vẫn đi qua `useAuth()` (đã bọc `fetchAuth` + CSRF) nên các API
 * `/api/xac-thuc/*` không đổi.
 */

export interface SkyIdShellProps {
  children: React.ReactNode;
  /** Tiêu đề chính của màn — `.gid-content-title`. */
  title: string;
  /** Dòng phụ dưới tiêu đề. */
  subtitle?: string;
  /** Ẩn khối chân trang logo (dùng khi màn đã có logo riêng). */
  hideFooter?: boolean;
}

export default function SkyIdShell({
  children,
  title,
  subtitle,
  hideFooter = false,
}: SkyIdShellProps) {
  return (
    <div className="vj-skyid-layout">
      {/* Logo đỏ góc trên bên trái — `.gid-logo-image-red`. */}
      <img src="/images/skyid/logo-red.svg" alt="Vietjet Air" className="vj-skyid-logo-red" />

      {/* Logo trắng góc dưới bên trái — `.gid-logo-image-white`. */}
      <img
        src="/images/skyid/logo-white.svg"
        alt="Vietjet SkyJoy"
        className="vj-skyid-logo-white"
      />

      {/* Cột chứa form — `.gid-popup`. */}
      <div className="vj-skyid-panel">
        <div className="vj-skyid-card">
          <h1 className="vj-skyid-title">{title}</h1>
          {subtitle ? <p className="vj-skyid-subtitle mt-1">{subtitle}</p> : null}

          <div className="mt-6 text-left">{children}</div>
        </div>

        {hideFooter ? null : (
          <div className="vj-skyid-footer relative z-1">
            <p className="vj-skyid-footer-description">Được cung cấp và xác thực bởi SkyJoy ID</p>
            <div className="vj-skyid-footer-logos">
              <img src="/images/skyid/sky-loy.svg" alt="SkyJoy" className="mx-1.5" />
              <img src="/images/skyid/vietjet-air.svg" alt="Vietjet Air" className="mx-1.5" />
              <img src="/images/skyid/galaxy-pay.svg" alt="Galaxy Pay" className="mx-1.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
