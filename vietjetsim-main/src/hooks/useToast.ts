'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { ToastAction, ToastItem, ToastType } from '@/shared/components/feedback';

let toastIdCounter = 0;

function generateId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`;
}

export interface ShowToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  actions?: ToastAction[];
  icon?: React.ReactNode;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((options: ShowToastOptions) => {
    const id = generateId();
    const toast: ToastItem = {
      id,
      type: options.type ?? 'info',
      title: options.title,
      message: options.message,
      duration: options.duration,
      actions: options.actions,
      icon: options.icon,
    };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      show({ ...options, type: 'success', title, message }),
    [show]
  );

  const error = useCallback(
    (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      show({ ...options, type: 'error', title, message }),
    [show]
  );

  const warning = useCallback(
    (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      show({ ...options, type: 'warning', title, message }),
    [show]
  );

  const info = useCallback(
    (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      show({ ...options, type: 'info', title, message }),
    [show]
  );

  const promo = useCallback(
    (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
      show({ ...options, type: 'promo', title, message }),
    [show]
  );

  // The handle must stay referentially stable: it is passed as the `onToast`
  // prop to ~13 child components and listed in their effect dependency arrays.
  // Returning a fresh object literal (or one that depends on `toasts`) would
  // change identity on every render/notification and make those effects refetch
  // in a loop. So the list lives in a ref and is exposed through a getter that
  // reads the current value when React renders the component.
  const toastsRef = useRef<ToastItem[]>([]);
  toastsRef.current = toasts;

  return useMemo(
    () => ({
      get toasts() {
        return toastsRef.current;
      },
      show,
      dismiss,
      dismissAll,
      success,
      error,
      warning,
      info,
      promo,
    }),
    [show, dismiss, dismissAll, success, error, warning, info, promo]
  );
}
