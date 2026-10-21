'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import Mascot from '@/shared/components/ui/Mascot';

const COOKIE_KEY = 'vj-cookie-consent';
const PROMO_KEY = 'vj-promo-dismissed';

/**
 * Site-wide overlays mirrored from vietjetair.com: the first-visit promo popup
 * near the top of the viewport and the cookie consent bar pinned to the
 * bottom. Both render only after mount (gated by localStorage/sessionStorage)
 * so server and client markup stay identical.
 */
export function SiteOverlays() {
  const pathname = usePathname();
  const isBookingFlow = Boolean(
    pathname?.startsWith('/tim-ve') ||
    pathname?.startsWith('/dat-ve') ||
    pathname?.startsWith('/thanh-toan') ||
    pathname?.startsWith('/dang-nhap') ||
    pathname?.startsWith('/dang-ky')
  );

  const [showCookie, setShowCookie] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    const hasCookieDecision = Boolean(localStorage.getItem(COOKIE_KEY));
    setShowCookie(!hasCookieDecision);
    if (!isBookingFlow) {
      setShowPromo(hasCookieDecision && !sessionStorage.getItem(PROMO_KEY));
    }
  }, [isBookingFlow]);

  const decideCookie = (value: 'accepted' | 'rejected') => {
    localStorage.setItem(COOKIE_KEY, value);
    setShowCookie(false);
    if (!isBookingFlow && !sessionStorage.getItem(PROMO_KEY)) {
      window.setTimeout(() => setShowPromo(true), 300);
    }
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
          className="fixed inset-x-0 top-5 mx-auto z-[60] w-[min(92vw,400px)] rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/5 animate-fade-in-up"
        >
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--vj-yellow)] to-accent-light text-2xl shadow-inner"
            >
              🎁
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-gray-900">Ưu đãi cá nhân hoá</h4>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Chào bạn, Vietjet có ưu đãi khủng chỉ dành riêng cho bạn. Nhấn &ldquo;Đồng ý&rdquo;
                để không bỏ lỡ nhé!
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closePromo}
              className="rounded-lg px-4 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={closePromo}
              className="rounded-lg bg-[var(--vj-red)] px-6 py-2 text-xs font-black uppercase tracking-wider text-white shadow transition hover:bg-primary-dark"
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
          className="fixed inset-x-0 bottom-0 z-[55] border-t border-gray-200 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.15)] animate-fade-in-up"
        >
          <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center">
            <div className="shrink-0 flex items-center justify-center">
              <Mascot greeting="Xin chào!" className="h-16 w-auto sm:h-20" />
            </div>
            <div className="flex-1">
              <p className="text-base font-black text-[var(--foreground)]">
                Chúng tôi sử dụng cookie!
              </p>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--foreground-muted)]">
                Nhằm tối ưu hóa và cá nhân hóa trải nghiệm của bạn khi truy cập website, vui lòng
                nhấn &ldquo;Đồng ý&rdquo; để chấp nhận việc sử dụng cookies và không hiển thị thông
                báo này trong lần truy cập tiếp theo.
              </p>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Để tìm hiểu về cookies và cách quản lý cookies, vui lòng{' '}
                <Link href="/gioi-thieu" className="font-semibold text-[var(--vj-blue)] underline">
                  bấm vào đây
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 self-end lg:self-center">
              <button
                type="button"
                onClick={() => decideCookie('rejected')}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-black"
              >
                Từ chối tất cả
              </button>
              <button
                type="button"
                onClick={() => decideCookie('accepted')}
                className="rounded-lg bg-[var(--vj-yellow)] px-6 py-2.5 text-xs sm:text-sm font-black uppercase text-black shadow transition hover:brightness-95"
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
