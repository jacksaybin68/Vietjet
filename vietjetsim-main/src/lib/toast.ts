'use client';

import type { ShowToastOptions } from '@/hooks/useToast';

const FLASH_TOAST_KEY = 'vj-flash-toast';
const SHOW_TOAST_EVENT = 'vj-show-toast';

/**
 * Hiển thị một toast thông báo ngay lập tức trên màn hình (thông qua SiteOverlays toàn cục).
 */
export function toastNotice(options: ShowToastOptions): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SHOW_TOAST_EVENT, { detail: options }));
}

/**
 * Lưu một toast thông báo vào sessionStorage để hiển thị ngay sau khi trang chuyển hướng.
 */
export function flashToast(options: ShowToastOptions): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(FLASH_TOAST_KEY, JSON.stringify(options));
  } catch {
    // Ignore storage quota or disabled storage
  }
}

/**
 * Đọc và xoá flash toast nếu có (dành cho SiteOverlays).
 */
export function consumeFlashToast(): ShowToastOptions | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FLASH_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FLASH_TOAST_KEY);
    return JSON.parse(raw) as ShowToastOptions;
  } catch {
    return null;
  }
}

export const toastSuccess = (
  title: string,
  message?: string,
  options?: Partial<ShowToastOptions>
) => toastNotice({ ...options, type: 'success', title, message });

export const toastError = (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
  toastNotice({ ...options, type: 'error', title, message });

export const toastWarning = (
  title: string,
  message?: string,
  options?: Partial<ShowToastOptions>
) => toastNotice({ ...options, type: 'warning', title, message });

export const toastInfo = (title: string, message?: string, options?: Partial<ShowToastOptions>) =>
  toastNotice({ ...options, type: 'info', title, message });

export { SHOW_TOAST_EVENT };
