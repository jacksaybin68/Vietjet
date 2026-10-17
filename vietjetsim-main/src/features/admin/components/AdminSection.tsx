import React from 'react';
import { Icon } from '@/shared/components/ui';

/**
 * Khung chuẩn cho mọi tab admin (dark theme):
 * - Header: tiêu đề trắng + mô tả xám + nút hành động bên phải
 * - Thẻ: kính mờ slate, viền trắng 5%
 * Quy ước class dùng chung để các tab không tự chế variant mới.
 */

export const ADMIN_CARD_CLASS =
  'rounded-2xl border p-5 transition-all duration-300 hover:translate-y-[-4px]';

export const ADMIN_CARD_STYLE: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.4)',
  backdropFilter: 'blur(12px)',
  borderColor: 'rgba(255, 255, 255, 0.05)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

export const ADMIN_SUBTITLE_CLASS =
  'text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70';

export const ADMIN_ACTION_BTN =
  'flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all hover:translate-y-[-1px] active:scale-95';

interface AdminTabHeaderProps {
  icon: string;
  iconClassName?: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export function AdminTabHeader({
  icon,
  iconClassName = 'text-indigo-400',
  title,
  subtitle,
  actions,
}: AdminTabHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Icon name={icon} size={24} className={iconClassName} />
          {title}
        </h2>
        <p className={ADMIN_SUBTITLE_CLASS}>{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface AdminStatCardProps {
  icon: string;
  iconClassName?: string;
  value: string;
  label: string;
}

export function AdminStatCard({
  icon,
  iconClassName = 'text-indigo-400',
  value,
  label,
}: AdminStatCardProps) {
  return (
    <div className={ADMIN_CARD_CLASS} style={ADMIN_CARD_STYLE}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-500/10"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Icon name={icon} size={24} className={iconClassName} />
        </div>
      </div>
      <div className="text-2xl font-black text-white tracking-tight tabular-nums">{value}</div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-70">
        {label}
      </div>
    </div>
  );
}
