'use client';

import React, { useEffect, useRef, useState } from 'react';

export type ConfirmationModalVariant = 'danger' | 'warning' | 'info';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationModalVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmationModalVariant, { icon: string; iconBg: string }> = {
  danger: {
    icon: '⚠',
    iconBg: 'bg-red-100 text-[#EC2029]',
  },
  warning: {
    icon: '!',
    iconBg: 'bg-yellow-100 text-[#E6BF00]',
  },
  info: {
    icon: 'i',
    iconBg: 'bg-blue-100 text-[#1A2948]',
  },
};

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  isLoading = false,
}: ConfirmationModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Handle open/close animation states
  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      // Small delay to trigger enter animation
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      setClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  };

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen && !closing) return null;

  const { icon, iconBg } = variantConfig[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${visible && !closing ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          animation: closing
            ? 'modalPanelOut 0.18s cubic-bezier(0.4,0,1,1) both'
            : 'modalPanelIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Red Header */}
        <div
          className="px-6 py-5 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #EC2029 0%, #C41017 100%)' }}
        >
          {/* Icon badge */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${iconBg}`}
          >
            {icon}
          </div>
          <h2
            id="confirm-modal-title"
            className="text-white font-bold text-lg leading-tight font-koho"
          >
            {title}
          </h2>
          {/* Close X */}
          <button
            onClick={handleClose}
            className="ml-auto text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Đóng"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M14 4L4 14M4 4l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-6">
          <p id="confirm-modal-desc" className="text-base leading-relaxed font-koho">
            {description}
          </p>

          {/* Divider */}
          <div className="mt-6 h-px bg-gray-100" />

          {/* Actions */}
          <div className="mt-5 flex flex-col-reverse sm:flex-row gap-3 justify-end">
            {/* Cancel button */}
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all duration-200 hover:bg-gray-50 active:scale-95 disabled:opacity-50"
              style={{
                borderColor: '#1A2948',
                color: '#1A2948',
              }}
            >
              {cancelLabel}
            </button>

            {/* Confirm CTA — yellow */}
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              style={{
                background: isLoading
                  ? '#E6BF00'
                  : 'linear-gradient(135deg, #FFD400 0%, #FFC72C 100%)',
                color: '#1A2948',
                transform: isLoading ? 'none' : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isLoading)
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    'translateY(-1px) scale(1.02)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              {isLoading && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
