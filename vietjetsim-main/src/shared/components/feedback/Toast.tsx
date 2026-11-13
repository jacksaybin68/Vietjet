'use client';

import React, { useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'promo';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'accent' | 'ghost';
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = no auto-dismiss
  actions?: ToastAction[];
  icon?: React.ReactNode;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG: Record<
  ToastType,
  {
    bar: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    messageColor: string;
    closeBtn: string;
    progressColor: string;
    defaultIcon: React.ReactNode;
  }
> = {
  success: {
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-50 border-2 border-emerald-500 shadow-xl shadow-emerald-500/20',
    iconBg: 'bg-emerald-600 shadow-md shadow-emerald-600/30',
    iconColor: 'text-white',
    titleColor: 'text-emerald-950 font-bold',
    messageColor: 'text-emerald-800 font-medium',
    closeBtn: 'text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100',
    progressColor: 'bg-emerald-500',
    defaultIcon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    bar: 'bg-red-500',
    bg: 'bg-red-50 border-2 border-red-500 shadow-xl shadow-red-500/20',
    iconBg: 'bg-red-600 shadow-md shadow-red-600/30',
    iconColor: 'text-white',
    titleColor: 'text-red-950 font-bold',
    messageColor: 'text-red-800 font-medium',
    closeBtn: 'text-red-700 hover:text-red-950 hover:bg-red-100',
    progressColor: 'bg-red-500',
    defaultIcon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-50 border-2 border-amber-400 shadow-xl shadow-amber-500/20',
    iconBg: 'bg-amber-500 shadow-md shadow-amber-500/30',
    iconColor: 'text-white',
    titleColor: 'text-amber-950 font-bold',
    messageColor: 'text-amber-800 font-medium',
    closeBtn: 'text-amber-700 hover:text-amber-950 hover:bg-amber-100',
    progressColor: 'bg-amber-500',
    defaultIcon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    bar: 'bg-blue-500',
    bg: 'bg-blue-50 border-2 border-blue-400 shadow-xl shadow-blue-500/20',
    iconBg: 'bg-blue-600 shadow-md shadow-blue-600/30',
    iconColor: 'text-white',
    titleColor: 'text-blue-950 font-bold',
    messageColor: 'text-blue-800 font-medium',
    closeBtn: 'text-blue-700 hover:text-blue-950 hover:bg-blue-100',
    progressColor: 'bg-blue-500',
    defaultIcon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  promo: {
    bar: 'bg-gradient-to-r from-red-600 via-pink-500 to-amber-500',
    bg: 'bg-white border-2 border-red-300 shadow-xl shadow-red-500/10',
    iconBg: 'bg-gradient-to-br from-red-600 to-amber-500',
    iconColor: 'text-white',
    titleColor: 'text-gray-950 font-bold',
    messageColor: 'text-gray-700',
    closeBtn: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
    progressColor: 'bg-gradient-to-r from-red-600 to-amber-500',
    defaultIcon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 10l1.293-1.293zm2.586 0L13.586 7l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 00-1.414 1.414L13.586 7l-1.293-1.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

function ToastProgressBar({
  duration,
  paused,
  color,
}: {
  duration: number;
  paused: boolean;
  color: string;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/5 overflow-hidden rounded-b-xl">
      <div
        className={`h-full ${color} origin-left`}
        style={{
          animation: `toast-progress ${duration}ms linear forwards`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  );
}

function ToastNotification({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = TYPE_CONFIG[toast.type];
  const duration = toast.duration ?? 5000;

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 320);
  };

  useEffect(() => {
    // Mount animation
    const mountTimer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(mountTimer);
  }, []);

  useEffect(() => {
    if (duration === 0) return;
    if (paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, duration]);

  return (
    <div
      className={`relative w-[360px] max-w-[calc(100vw-32px)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.14)] overflow-hidden cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${config.bg}
        ${visible && !exiting ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'}
      `}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="alert"
      aria-live="assertive"
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${config.bar}`} />

      <div className="flex items-start gap-3 px-4 pt-3 pb-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.iconBg} ${config.iconColor} flex items-center justify-center mt-0.5`}
        >
          {toast.icon ?? config.defaultIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-tight font-['KoHo',sans-serif] ${config.titleColor}`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className={`text-xs mt-1 leading-relaxed ${config.messageColor}`}>{toast.message}</p>
          )}

          {/* Action buttons */}
          {toast.actions && toast.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {toast.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    dismiss();
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-150 active:scale-95 font-['KoHo',sans-serif]
                    ${
                      action.variant === 'accent'
                        ? 'bg-[var(--accent)] text-[var(--vj-navy)] hover:bg-vj-gold-ink-6 shadow-sm'
                        : action.variant === 'ghost'
                          ? 'text-[var(--foreground-muted)] hover:text-[var(--vj-navy)] hover:bg-[var(--vj-sky)]'
                          : 'bg-[var(--primary)] text-white hover:bg-primary-dark shadow-sm'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150 mt-0.5 ${config.closeBtn}`}
          aria-label="Đóng thông báo"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <ToastProgressBar duration={duration} paused={paused} color={config.progressColor} />
      )}
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

const POSITION_CLASSES: Record<NonNullable<ToastContainerProps['position']>, string> = {
  'top-right': 'top-3 sm:top-4 right-3 sm:right-4 left-3 sm:left-auto items-center sm:items-end',
  'top-left': 'top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-auto items-center sm:items-start',
  'bottom-right': 'bottom-4 right-3 sm:right-4 left-3 sm:left-auto items-center sm:items-end',
  'bottom-left': 'bottom-4 left-3 sm:left-4 right-3 sm:right-auto items-center sm:items-start',
  'top-center': 'top-3 sm:top-4 left-1/2 -translate-x-1/2 items-center px-2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center px-2',
};

export function ToastContainer({ toasts, onDismiss, position = 'top-right' }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-[9999] flex flex-col gap-2.5 pointer-events-none ${POSITION_CLASSES[position]}`}
      aria-label="Thông báo"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

export default ToastNotification;
