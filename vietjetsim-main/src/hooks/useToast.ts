'use client';

import { useState, useCallback } from 'react';
import { ToastItem, ToastType, ToastAction } from '@/components/ui/Toast';

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

  return { toasts, show, dismiss, dismissAll, success, error, warning, info, promo };
}
