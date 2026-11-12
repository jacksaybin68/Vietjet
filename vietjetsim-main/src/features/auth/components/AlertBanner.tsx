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
    background: '#FEF2F2',
    borderColor: '#EF4444',
    color: '#991B1B',
  },
  success: {
    icon: 'CheckCircleIcon',
    background: '#ECFDF5',
    borderColor: '#10B981',
    color: '#065F46',
  },
} as const;

/** Inline status banner for the auth forms. Renders nothing when empty. */
export default function AlertBanner({ message, variant }: AlertBannerProps) {
  if (!message) return null;
  const style = STYLES[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className="mb-4 flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-bold shadow-sm"
      style={{ background: style.background, borderColor: style.borderColor, color: style.color }}
    >
      <Icon name={style.icon} size={18} />
      <span>{message}</span>
    </div>
  );
}
