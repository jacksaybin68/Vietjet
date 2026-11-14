'use client';

import React, { useCallback, useEffect } from 'react';
import Link from 'next/link';

/**
 * `PopupFrame` — khung popup SkyID 622×664 của site thật.
 *
 * Số đo (đo lại trên DOM sống 14/11/2026 — `newweb.vietjetair.com/vi/signin`,
 * xem `docs/qa/2026-11-15-vietjet-measure/`):
 *   - Khung ngoài: `622×664px`, `border-radius:10px`, `overflow:hidden`,
 *     shadow `rgba(0,0,0,.21) 0 2px 6px`.
 *   - Băng đỏ trên cùng: cao `48px`, `padding:0 17px`, nền
 *     `linear-gradient(rgb(217,26,33) 34.8%, rgb(171,3,3) 182.34%)`,
 *     tiêu đề "Đăng nhập SkyJoy" / "Đăng ký SkyJoy" 16px/500 trắng.
 *   - Thân: overlay ảnh `linear-gradient(rgba(0,0,0,.5) 0%, rgba(0,0,0,.094) 100%)`.
 *   - Khung form SkyID: `500×208px`, nằm ở `x=61`, `y=100` (tức cách mép trên
 *     khung 52px).
 *   - Bottom nav: cao `62px`, `border-radius:15px 15px 0 0`, nền
 *     `linear-gradient(rgba(0,0,0,.8) 4.03%, rgba(0,0,0,.153) 216.13%)`,
 *     nhãn `10px/700` trắng, mục active `#F7C61A`.
 *
 * Ở mobile khung co theo `calc(100vw - 24px)` × `min(664px, 90vh)`.
 */

export interface PopupFrameProps {
  /** Tiêu đề trên băng đỏ — "Đăng nhập SkyJoy" / "Đăng ký SkyJoy". */
  title: string;
  children: React.ReactNode;
  /** Đóng popup (bấm nút × trên băng đỏ hoặc phím Esc). */
  onClose?: () => void;
  /** Hiện nút đóng × trên băng đỏ. */
  showClose?: boolean;
  /** Nội dung bên trong khung form 500×208. */
  bodyClassName?: string;
}

export default function PopupFrame({
  title,
  children,
  onClose,
  showClose = true,
  bodyClassName = '',
}: PopupFrameProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!onClose) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, onClose]);

  return (
    <div className="vj-popup-overlay" role="presentation">
      <div role="dialog" aria-modal="true" aria-label={title} className="vj-popup-frame">
        {/* Băng đỏ 48px — tiêu đề + nút đóng. */}
        <div className="vj-popup-header">
          <span className="vj-popup-header-title">{title}</span>
          {showClose && onClose ? (
            <button type="button" onClick={onClose} aria-label="Đóng" className="vj-popup-close">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* Thân popup — overlay ảnh tối dần. */}
        <div className="vj-popup-body">
          {/* Khung form SkyID 500×208. */}
          <div className={`vj-popup-viewport ${bodyClassName}`}>{children}</div>
        </div>

        {/* Bottom nav 62px — 4 mục, bo góc trên 15px. */}
        <nav aria-label="Dịch vụ nhanh" className="vj-popup-nav">
          {POPUP_NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`vj-popup-nav-item${item.active ? ' is-active' : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="vj-popup-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

const POPUP_NAV_ITEMS = [
  { label: 'Đặt chuyến bay', href: '/trang-chu#hero-booking-form', active: false },
  { label: 'Chuyến bay của tôi', href: '/chuyen-bay-cua-toi', active: false },
  { label: 'Mua hành lý, chỗ ngồi...', href: '/dich-vu?service=baggage', active: false },
  { label: 'Check-in', href: '/lam-thu-tuc', active: false },
] as const;
