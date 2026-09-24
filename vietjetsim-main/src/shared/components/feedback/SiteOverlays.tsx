'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const COOKIE_KEY = 'vj-cookie-consent';
const PROMO_KEY = 'vj-promo-dismissed';

/**
 * Site-wide overlays mirrored from vietjetair.com: the first-visit promo popup
 * near the top of the viewport and the cookie consent bar pinned to the
 * bottom. Both render only after mount (gated by localStorage/sessionStorage)
 * so server and client markup stay identical.
 */
export function SiteOverlays() {
  const [showCookie, setShowCookie] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) setShowCookie(true);
    if (!sessionStorage.getItem(PROMO_KEY)) setShowPromo(true);
  }, []);

  const decideCookie = (value: 'accepted' | 'rejected') => {
    localStorage.setItem(COOKIE_KEY, value);
    setShowCookie(false);
  };

  const closePromo = () => {
    sessionStorage.setItem(PROMO_KEY, '1');
    setShowPromo(false);
  };

  return (
    <>
      {showPromo && (
        <div
          role="dialog"
          aria-label="Ưu đãi"
          className="fixed left-1/2 top-5 z-[60] w-[min(92vw,360px)] -translate-x-1/2 rounded-xl bg-white p-4 shadow-[0_16px_48px_rgba(0,0,0,0.22)]"
        >
          <div className="flex gap-3">
            <div
              aria-hidden="true"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--vj-yellow)] to-[#ffb700] text-3xl"
            >
              🎁
            </div>
            <p className="text-[13px] leading-5 text-[#333]">
              Chào bạn, Vietjet có ưu đãi khủng chỉ dành riêng cho bạn. &ldquo;Đồng ý&rdquo; để
              không bỏ lỡ nhé!
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end gap-5">
            <button
              type="button"
              onClick={closePromo}
              className="text-sm font-bold text-[#6c6f76] transition-colors hover:text-[#333]"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={closePromo}
              className="rounded-lg bg-[var(--vj-red)] px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-[#c81820]"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}

      {showCookie && (
        <div
          role="region"
          aria-label="Thông báo cookie"
          className="fixed inset-x-0 bottom-0 z-[55] border-t border-[#eee] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        >
          <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center">
            <div aria-hidden="true" className="text-4xl">
              🍪
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-[#333]">Chúng tôi sử dụng cookie!</p>
              <p className="mt-1 text-sm leading-5 text-[#6c6f76]">
                Nhằm tối ưu hóa và cá nhân hóa trải nghiệm của bạn khi truy cập website, vui lòng
                nhấn &ldquo;đồng ý&rdquo; để chấp nhận việc sử dụng cookies và không hiển thị thông
                báo này trong lần truy cập tiếp theo.
              </p>
              <p className="mt-1 text-sm text-[#6c6f76]">
                Để tìm hiểu về cookies và cách quản lý cookies, vui lòng{' '}
                <Link href="/gioi-thieu" className="font-semibold text-[#0055aa] underline">
                  bấm vào đây
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => decideCookie('rejected')}
                className="rounded-lg bg-[var(--vj-yellow)] px-6 py-2.5 text-sm font-bold text-[#333] transition hover:brightness-95"
              >
                Từ chối tất cả
              </button>
              <button
                type="button"
                onClick={() => decideCookie('accepted')}
                className="rounded-lg bg-[var(--vj-yellow)] px-6 py-2.5 text-sm font-bold text-[#333] transition hover:brightness-95"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
