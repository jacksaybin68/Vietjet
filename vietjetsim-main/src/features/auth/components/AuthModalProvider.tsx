'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import SkyIdAuthFlow, { type SkyIdMode } from './skyid/SkyIdAuthFlow';

/**
 * Điều phối modal SkyJoy ID cho toàn site.
 *
 * Header (mọi biến thể) gọi `openAuthModal('login' | 'register')` để mở đúng
 * modal 2 cột của site thật, thay vì nhảy sang trang full-page. Route
 * `/dang-nhap` và `/dang-ky` vẫn tồn tại (public, deep-link được) và render
 * cùng component ở chế độ `page`.
 *
 * `redirectTo` cho phép quay lại trang gốc sau khi đăng nhập — header tự đọc
 * `?redirect=` trên URL và truyền xuống.
 */

export interface OpenAuthModalOptions {
  /** Đường dẫn quay lại sau khi xác thực thành công. */
  redirectTo?: string;
}

interface AuthModalContextValue {
  isOpen: boolean;
  mode: SkyIdMode;
  openAuthModal: (mode: SkyIdMode, options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SkyIdMode>('login');
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  const openAuthModal = useCallback((nextMode: SkyIdMode, options?: OpenAuthModalOptions) => {
    setMode(nextMode);
    setRedirectTo(options?.redirectTo);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo<AuthModalContextValue>(
    () => ({ isOpen, mode, openAuthModal, closeAuthModal }),
    [isOpen, mode, openAuthModal, closeAuthModal]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {isOpen ? (
        <SkyIdAuthFlow
          variant="overlay"
          mode={mode}
          redirectTo={redirectTo}
          onClose={closeAuthModal}
        />
      ) : null}
    </AuthModalContext.Provider>
  );
}

/** Hook truy cập modal SkyJoy ID. */
export function useAuthModal(): AuthModalContextValue {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}
