'use client';
import { useEffect } from 'react';

import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { consumeFlashToast, SHOW_TOAST_EVENT } from '@/lib/toast';

/**
 * Site-wide overlays: the global ToastContainer for app-wide and flash notifications.
 * Renders only after mount so server and client markup stay identical.
 */
export function SiteOverlays() {
  const toast = useToast();

  // Consume flash toasts on navigation
  useEffect(() => {
    const flash = consumeFlashToast();
    if (flash) {
      toast.show(flash);
    }
  }, [toast]);

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

  return (
    <>
      {/* Global Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </>
  );
}
