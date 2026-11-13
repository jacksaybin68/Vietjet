'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { EvoucherGiftIcon } from '@/shared/components/ui/RealisticServiceIcons';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { consumeFlashToast, SHOW_TOAST_EVENT } from '@/lib/toast';

const PROMO_KEY = 'vj-promo-dismissed';

/**
 * Site-wide overlays: the first-visit promo popup near the top of the viewport,
 * plus the global ToastContainer for app-wide and flash notifications.
 * Both render only after mount so server and client markup stay identical.
 */
export function SiteOverlays() {
  const pathname = usePathname();
  const toast = useToast();
  const isBookingFlow = Boolean(
    pathname?.startsWith('/tim-ve') ||
    pathname?.startsWith('/dat-ve') ||
    pathname?.startsWith('/thanh-toan') ||
    pathname?.startsWith('/dang-nhap') ||
    pathname?.startsWith('/dang-ky')
  );

  const [showPromo, setShowPromo] = useState(false);

  // Consume flash toasts on navigation
  useEffect(() => {
    const flash = consumeFlashToast();
    if (flash) {
      toast.show(flash);
    }
  }, [pathname, toast]);

  // Listen for global custom events to show toast from anywhere in the app
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        toast.show(customEvent.detail);
      }
    };

    window.addEventListener(SHOW_TOAST_EVENT, handleToastEvent);
    return () => window.removeEventListener(SHOW_TOAST_EVENT, handleToastEvent);
  }, [toast]);

  useEffect(() => {
    if (!isBookingFlow) {
      setShowPromo(!sessionStorage.getItem(PROMO_KEY));
    }
  }, [isBookingFlow]);
  const closePromo = () => {
    sessionStorage.setItem(PROMO_KEY, '1');
    setShowPromo(false);
  };

  return (
    <>
      {/* Global Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

      {showPromo && (
        <div
          role="dialog"
          aria-label="Ưu đãi"
          className="fixed inset-x-0 top-5 mx-auto z-[60] w-[min(92vw,400px)] rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/5 animate-fade-in-up"
        >
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-2xl shadow-inner border border-amber-200"
            >
              <EvoucherGiftIcon size={34} />
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
    </>
  );
}
