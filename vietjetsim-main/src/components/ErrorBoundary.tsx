'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

// ─── Error variant types ────────────────────────────────────────────────────

export type ErrorVariant = 'api' | 'network' | 'booking' | 'generic';

function detectVariant(error: Error): ErrorVariant {
  const msg = error.message?.toLowerCase() ?? '';
  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('net::') ||
    !navigator.onLine
  ) {
    return 'network';
  }
  if (
    msg.includes('booking') ||
    msg.includes('seat') ||
    msg.includes('passenger') ||
    msg.includes('payment') ||
    msg.includes('reservation')
  ) {
    return 'booking';
  }
  if (
    msg.includes('api') ||
    msg.includes('supabase') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('404') ||
    msg.includes('500') ||
    msg.includes('503')
  ) {
    return 'api';
  }
  return 'generic';
}

// ─── Variant config ─────────────────────────────────────────────────────────

interface VariantConfig {
  icon: ReactNode;
  title: string;
  subtitle: string;
  retryLabel: string;
  accentColor: string;
  bgColor: string;
}

const VARIANT_CONFIG: Record<ErrorVariant, VariantConfig> = {
  network: {
    accentColor: '#FFD400',
    bgColor: '#FFFBEB',
    retryLabel: 'Thử lại kết nối',
    title: 'Mất kết nối mạng',
    subtitle: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại.',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#FFF8DC" stroke="#FFD400" strokeWidth="2" />
        <path
          d="M16 32 Q32 16 48 32"
          stroke="#FFD400"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 38 Q32 26 44 38"
          stroke="#FFD400"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="32" cy="44" r="3" fill="#FFD400" />
        <line
          x1="20"
          y1="20"
          x2="44"
          y2="44"
          stroke="#EC2029"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  api: {
    accentColor: '#EC2029',
    bgColor: '#FFF5F5',
    retryLabel: 'Tải lại dữ liệu',
    title: 'Lỗi máy chủ',
    subtitle: 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại sau vài giây.',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#FFF0F0" stroke="#EC2029" strokeWidth="2" />
        <rect
          x="18"
          y="20"
          width="28"
          height="18"
          rx="3"
          stroke="#EC2029"
          strokeWidth="2.5"
          fill="none"
        />
        <rect x="22" y="24" width="6" height="4" rx="1" fill="#EC2029" opacity="0.4" />
        <rect x="30" y="24" width="12" height="2" rx="1" fill="#EC2029" opacity="0.4" />
        <rect x="30" y="28" width="8" height="2" rx="1" fill="#EC2029" opacity="0.3" />
        <path d="M26 38 L26 44" stroke="#EC2029" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M38 38 L38 44" stroke="#EC2029" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22 44 L42 44" stroke="#EC2029" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="44" cy="20" r="8" fill="#EC2029" />
        <path d="M44 16 L44 21" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="44" cy="24" r="1" fill="white" />
      </svg>
    ),
  },
  booking: {
    accentColor: '#EC2029',
    bgColor: '#FFF5F5',
    retryLabel: 'Thử đặt vé lại',
    title: 'Đặt vé thất bại',
    subtitle:
      'Đã xảy ra lỗi trong quá trình đặt vé. Thông tin của bạn vẫn được lưu — vui lòng thử lại.',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#FFF0F0" stroke="#EC2029" strokeWidth="2" />
        <path
          d="M14 32 L28 18 L50 18 L50 46 L14 46 Z"
          stroke="#EC2029"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M14 32 L28 32 L28 18"
          stroke="#EC2029"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        <line
          x1="34"
          y1="26"
          x2="44"
          y2="26"
          stroke="#EC2029"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <line
          x1="34"
          y1="31"
          x2="44"
          y2="31"
          stroke="#EC2029"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <line
          x1="34"
          y1="36"
          x2="40"
          y2="36"
          stroke="#EC2029"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="20" cy="39" r="7" fill="#EC2029" />
        <path
          d="M17 39 L19 41 L23 37"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="20"
          y1="35"
          x2="20"
          y2="35"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* X mark overlay */}
        <line
          x1="17"
          y1="36"
          x2="23"
          y2="42"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="23"
          y1="36"
          x2="17"
          y2="42"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  generic: {
    accentColor: '#1A2948',
    bgColor: '#F5F7FA',
    retryLabel: 'Thử lại',
    title: 'Đã xảy ra lỗi',
    subtitle: 'Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay về trang chủ.',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#EEF1F7" stroke="#1A2948" strokeWidth="2" />
        <path d="M32 18 L32 36" stroke="#1A2948" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="44" r="2.5" fill="#1A2948" />
      </svg>
    ),
  },
};

// ─── ErrorFallback UI ────────────────────────────────────────────────────────

export interface ErrorFallbackProps {
  error: Error | null;
  variant?: ErrorVariant;
  onRetry?: () => void;
  onGoHome?: () => void;
  /** Show a compact inline version instead of full-page */
  inline?: boolean;
  /** Custom title override */
  title?: string;
  /** Custom subtitle override */
  subtitle?: string;
  /** Custom retry label override */
  retryLabel?: string;
}

export function ErrorFallback({
  error,
  variant,
  onRetry,
  onGoHome,
  inline = false,
  title,
  subtitle,
  retryLabel,
}: ErrorFallbackProps) {
  const resolvedVariant = variant ?? (error ? detectVariant(error) : 'generic');
  const cfg = VARIANT_CONFIG[resolvedVariant];

  const displayTitle = title ?? cfg.title;
  const displaySubtitle = subtitle ?? cfg.subtitle;
  const displayRetryLabel = retryLabel ?? cfg.retryLabel;

  if (inline) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-10 px-6 rounded-2xl text-center"
        style={{ background: cfg.bgColor }}
        role="alert"
      >
        <div className="flex-shrink-0">{cfg.icon}</div>
        <div>
          <h3 className="text-base font-bold text-[#1A2948] font-['KoHo',sans-serif]">
            {displayTitle}
          </h3>
          <p className="text-sm text-[#666] mt-1 max-w-xs mx-auto">{displaySubtitle}</p>
          {error?.message && (
            <p className="text-xs text-[#999] mt-2 font-mono bg-white/60 px-3 py-1.5 rounded-lg inline-block max-w-xs truncate">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 shadow-sm"
              style={{ background: cfg.accentColor }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              {displayRetryLabel}
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A2948] bg-white border border-[#E8E8E8] transition-all duration-200 hover:bg-[#F5F5F5] active:scale-95 shadow-sm"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Trang chủ
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full-page fallback
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: cfg.bgColor }}
      role="alert"
      aria-live="assertive"
    >
      {/* Vietjet Air brand strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#EC2029] via-[#FF4D53] to-[#FFD400]" />

      <div className="max-w-md w-full text-center">
        {/* Illustration */}
        <div className="flex justify-center mb-6">{cfg.icon}</div>

        {/* Heading */}
        <h1
          className="text-2xl font-bold text-[#1A2948] mb-3 font-['KoHo',sans-serif]"
          style={{ color: cfg.accentColor }}
        >
          {displayTitle}
        </h1>
        <p className="text-sm text-[#555] leading-relaxed mb-6">{displaySubtitle}</p>

        {/* Error detail (dev-friendly, subtle) */}
        {error?.message && (
          <div className="mb-6 bg-white/70 border border-[#E8E8E8] rounded-xl px-4 py-3 text-left">
            <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">
              Chi tiết lỗi
            </p>
            <p className="text-xs text-[#666] font-mono break-all">{error.message}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95 shadow-md"
              style={{ background: cfg.accentColor }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              {displayRetryLabel}
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#1A2948] bg-white border border-[#E8E8E8] transition-all duration-200 hover:bg-[#F5F5F5] active:scale-95 shadow-sm"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Về trang chủ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ErrorBoundary class component ──────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Force a specific error variant instead of auto-detecting */
  variant?: ErrorVariant;
  /** Custom fallback element — overrides the built-in ErrorFallback */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Show inline (compact) fallback instead of full-page */
  inline?: boolean;
  /** Custom title for the fallback */
  title?: string;
  /** Custom subtitle for the fallback */
  subtitle?: string;
  /** Custom retry label */
  retryLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/homepage';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback
          error={this.state.error}
          variant={this.props.variant}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          inline={this.props.inline}
          title={this.props.title}
          subtitle={this.props.subtitle}
          retryLabel={this.props.retryLabel}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
