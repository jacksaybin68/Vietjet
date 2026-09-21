'use client';

import React from 'react';
import Icon from '@/shared/components/ui/AppIcon';

interface AlertBannerProps {
  message: string;
  variant: 'error' | 'success';
}

const STYLES = {
  error: {
    icon: 'ExclamationCircleIcon',
    background: 'rgb(var(--primary-rgb) / 0.08)',
    borderColor: 'rgb(var(--primary-rgb) / 0.25)',
    color: 'var(--primary)',
  },
  success: {
    icon: 'CheckCircleIcon',
    background: 'rgb(var(--vj-green-rgb) / 0.10)',
    borderColor: 'rgb(var(--vj-green-rgb) / 0.30)',
    color: 'var(--vj-green)',
  },
} as const;

/** Inline status banner for the auth forms. Renders nothing when empty. */
export default function AlertBanner({ message, variant }: AlertBannerProps) {
  if (!message) return null;
  const style = STYLES[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
      style={{ background: style.background, borderColor: style.borderColor, color: style.color }}
    >
      <Icon name={style.icon} size={16} />
      {message}
    </div>
  );
}
