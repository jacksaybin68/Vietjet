'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

type NotificationType = 'all' | 'booking' | 'flight' | 'promo';

interface Notification {
  id: string;
  type: 'booking' | 'flight' | 'promo' | 'message';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  icon: string;
  accent: string;
  accentBg: string;
  metadata?: Record<string, string>;
  snoozedUntil?: number;
  archived?: boolean;
}

const STATIC_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'booking',
    title: 'Đặt vé thành công – VJ2B4K9',
    body: 'Vé chuyến bay VJ 101 (HAN → SGN) ngày 20/03/2026 đã được xác nhận. Ghế 14A. Tổng tiền: 1.038.900₫.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    icon: 'TicketIcon',
    accent: '#16a34a',
    accentBg: '#F0FDF4',
    metadata: { booking_id: 'VJ2B4K9', flight_no: 'VJ 101', route: 'HAN → SGN' },
  },
  {
    id: 'n2',
    type: 'booking',
    title: 'Nhắc nhở check-in – VJ2B4K9',
    body: 'Chuyến bay VJ 101 của bạn khởi hành sau 3 ngày nữa. Hãy check-in trực tuyến để tiết kiệm thời gian.',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    read: false,
    icon: 'TicketIcon',
    accent: '#d97706',
    accentBg: '#FFFBEB',
    metadata: { booking_id: 'VJ2B4K9', action: 'checkin' },
  },
  {
    id: 'n3',
    type: 'flight',
    title: 'Cổng lên máy bay thay đổi – VJ 101',
    body: 'Cổng lên máy bay cho chuyến VJ 101 ngày 20/03/2026 đã thay đổi từ Cổng B12 sang Cổng A07.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: false,
    icon: 'ExclamationTriangleIcon',
    accent: '#D0021B',
    accentBg: '#FFF5F5',
    metadata: { flight_no: 'VJ 101', old_gate: 'B12', new_gate: 'A07', delay_type: 'gate_change' },
  },
  {
    id: 'n4',
    type: 'flight',
    title: 'Thay đổi giờ bay – VJ 201',
    body: 'Chuyến bay VJ 201 (SGN → PQC) ngày 05/04/2026 đã thay đổi giờ khởi hành từ 07:30 sang 08:00.',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    read: true,
    icon: 'ClockIcon',
    accent: '#D0021B',
    accentBg: '#FFF5F5',
    metadata: {
      flight_no: 'VJ 201',
      old_time: '07:30',
      new_time: '08:00',
      delay_type: 'schedule_change',
    },
  },
  {
    id: 'n5',
    type: 'promo',
    title: 'Flash Sale – Vé HAN → DAD chỉ từ 299K',
    body: 'Chỉ trong 24 giờ! Đặt ngay vé Hà Nội – Đà Nẵng với giá chỉ từ 299.000₫. Số lượng có hạn.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: false,
    icon: 'TagIcon',
    accent: '#7c3aed',
    accentBg: '#F5F3FF',
    metadata: { route: 'HAN → DAD', price: '299000', expires_hours: '24' },
  },
  {
    id: 'n6',
    type: 'promo',
    title: 'Ưu đãi đặc biệt – Giảm 30% vé nội địa',
    body: 'Đặt vé từ nay đến 31/03/2026 để nhận ưu đãi giảm 30% cho tất cả chuyến bay nội địa. Dùng mã VJET30.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
    icon: 'GiftIcon',
    accent: '#7c3aed',
    accentBg: '#F5F3FF',
    metadata: { promo_code: 'VJET30', discount: '30%', expires: '2026-03-31' },
  },
  {
    id: 'n7',
    type: 'booking',
    title: 'Hoàn tiền thành công – VJ5Z6W4',
    body: 'Yêu cầu hoàn tiền cho chuyến bay VJ 103 (HAN → SGN) đã được xử lý. 1.448.900₫ sẽ được hoàn về tài khoản trong 5–7 ngày làm việc.',
    timestamp: new Date(Date.now() - 604800000).toISOString(),
    read: true,
    icon: 'BanknotesIcon',
    accent: '#16a34a',
    accentBg: '#F0FDF4',
    metadata: { booking_id: 'VJ5Z6W4', amount: '1448900', status: 'refunded' },
  },
];

const getNotifStyle = (type: string): { icon: string; accent: string; accentBg: string } => {
  switch (type) {
    case 'flight':
      return { icon: 'ExclamationTriangleIcon', accent: '#D0021B', accentBg: '#FFF5F5' };
    case 'promo':
      return { icon: 'TagIcon', accent: '#7c3aed', accentBg: '#F5F3FF' };
    case 'message':
      return { icon: 'ChatBubbleLeftRightIcon', accent: '#1A2948', accentBg: '#EFF6FF' };
    default:
      return { icon: 'TicketIcon', accent: '#16a34a', accentBg: '#F0FDF4' };
  }
};

type TimestampFilter = 'all' | 'today' | 'week' | 'month';

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: string; color: string }> = {
  all: { label: 'Tất cả', icon: 'BellIcon', color: '#1A2948' },
  booking: { label: 'Đặt vé', icon: 'TicketIcon', color: '#16a34a' },
  flight: { label: 'Chuyến bay', icon: 'ExclamationTriangleIcon', color: '#D0021B' },
  promo: { label: 'Khuyến mãi', icon: 'TagIcon', color: '#7c3aed' },
};

const SNOOZE_OPTIONS = [
  { label: '1 giờ', ms: 60 * 60 * 1000 },
  { label: '3 giờ', ms: 3 * 60 * 60 * 1000 },
  { label: '1 ngày', ms: 24 * 60 * 60 * 1000 },
];

// ─── Metadata Badge ──────────────────────────────────────────────────────────
function MetadataBadge({ type, metadata }: { type: string; metadata?: Record<string, string> }) {
  if (!metadata) return null;
  if (type === 'flight' && metadata.delay_type) {
    const labels: Record<string, string> = {
      gate_change: '🚪 Đổi cổng',
      schedule_change: '⏰ Đổi giờ',
      delay: '⚠️ Trễ chuyến',
      cancellation: '❌ Huỷ chuyến',
    };
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
        {labels[metadata.delay_type] || metadata.delay_type}
      </span>
    );
  }
  if (type === 'promo' && metadata.promo_code) {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 tracking-wide">
        {metadata.promo_code}
      </span>
    );
  }
  if (type === 'promo' && metadata.expires_hours) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
        ⏱ Còn {metadata.expires_hours}h
      </span>
    );
  }
  if (type === 'booking' && metadata.booking_id) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
        #{metadata.booking_id}
      </span>
    );
  }
  return null;
}

// ─── Notification Card ────────────────────────────────────────────────────────
interface NotifCardProps {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string, ms: number) => void;
}

function NotifCard({ notif, onMarkRead, onDismiss, onArchive, onSnooze }: NotifCardProps) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx)) {
      setSwiping(false);
      setSwipeX(0);
      return;
    }
    if (dx < 0) setSwipeX(Math.max(dx, -160));
    else setSwipeX(0);
  };
  const handleTouchEnd = () => {
    if (swipeX < -SWIPE_THRESHOLD) {
      setDismissed(true);
      setTimeout(() => onDismiss(notif.id), 300);
    } else setSwipeX(0);
    setSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (dismissed) return null;
  const isSnoozed = notif.snoozedUntil && notif.snoozedUntil > Date.now();
  const typeConf = TYPE_CONFIG[notif.type as NotificationType] || TYPE_CONFIG.booking;

  return (
    <div className="relative overflow-hidden">
      {/* Swipe actions background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ width: 160 }}
        aria-hidden="true"
      >
        <button
          onClick={() => onArchive(notif.id)}
          className="flex flex-col items-center justify-center h-full w-1/2 gap-1 text-white text-xs font-semibold"
          style={{ background: '#1A2948' }}
        >
          <Icon name="ArchiveBoxIcon" size={18} />
          <span>Lưu trữ</span>
        </button>
        <button
          onClick={() => onDismiss(notif.id)}
          className="flex flex-col items-center justify-center h-full w-1/2 gap-1 text-white text-xs font-semibold"
          style={{ background: '#D0021B' }}
        >
          <Icon name="TrashIcon" size={18} />
          <span>Xoá</span>
        </button>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (swipeX === 0) onMarkRead(notif.id);
        }}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease-out',
        }}
        className={`flex gap-4 p-5 cursor-pointer transition-colors relative z-10 ${
          notif.read ? 'bg-white hover:bg-stone-50' : 'bg-blue-50/30 hover:bg-blue-50/50'
        } ${isSnoozed ? 'opacity-60' : ''}`}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: notif.accentBg }}
        >
          <Icon name={notif.icon} size={20} style={{ color: notif.accent }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!notif.read && (
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#D0021B' }}
                />
              )}
              <span
                className={`text-sm font-bold truncate ${notif.read ? 'text-stone-600' : 'text-navy'}`}
              >
                {notif.title}
              </span>
            </div>
            <span
              className="flex-shrink-0 text-xs text-stone-400 whitespace-nowrap"
              title={formatFullDate(notif.timestamp)}
            >
              {formatRelativeTime(notif.timestamp)}
            </span>
          </div>

          {/* Body */}
          <p className="text-xs text-stone-500 mt-1 leading-relaxed line-clamp-2">{notif.body}</p>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: notif.accentBg, color: notif.accent }}
            >
              {typeConf.label}
            </span>
            <MetadataBadge type={notif.type} metadata={notif.metadata} />
            {isSnoozed && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                <Icon name="ClockIcon" size={11} />
                Đã nhắc lại
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onArchive(notif.id)}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-stone-200 text-stone-500 bg-white hover:bg-stone-50 hover:border-stone-300 transition-all"
            >
              <Icon name="ArchiveBoxIcon" size={13} />
              <span className="hidden sm:inline">Lưu trữ</span>
            </button>
            <button
              onClick={() => onDismiss(notif.id)}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-stone-200 text-stone-500 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all"
            >
              <Icon name="XMarkIcon" size={13} />
              <span className="hidden sm:inline">Xoá</span>
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSnoozeMenu((s) => !s);
                }}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-stone-200 text-stone-500 bg-white hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-all"
              >
                <Icon name="ClockIcon" size={13} />
                <span className="hidden sm:inline">Nhắc lại</span>
              </button>
              {showSnoozeMenu && (
                <div className="absolute left-0 bottom-full mb-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[120px]">
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.ms}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSnooze(notif.id, opt.ms);
                        setShowSnoozeMenu(false);
                      }}
                      className="w-full text-left text-xs font-semibold px-4 py-2.5 hover:bg-amber-50 hover:text-amber-700 text-stone-600 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ notifications }: { notifications: Notification[] }) {
  const counts = {
    booking: notifications.filter((n) => n.type === 'booking' && !n.read && !n.archived).length,
    flight: notifications.filter((n) => n.type === 'flight' && !n.read && !n.archived).length,
    promo: notifications.filter((n) => n.type === 'promo' && !n.read && !n.archived).length,
  };
  const total = counts.booking + counts.flight + counts.promo;
  if (total === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-stone-50 border-b border-stone-100">
      {[
        {
          key: 'booking',
          label: 'Đặt vé',
          icon: 'TicketIcon',
          color: '#16a34a',
          bg: '#F0FDF4',
          count: counts.booking,
        },
        {
          key: 'flight',
          label: 'Chuyến bay',
          icon: 'ExclamationTriangleIcon',
          color: '#D0021B',
          bg: '#FFF5F5',
          count: counts.flight,
        },
        {
          key: 'promo',
          label: 'Khuyến mãi',
          icon: 'TagIcon',
          color: '#7c3aed',
          bg: '#F5F3FF',
          count: counts.promo,
        },
      ].map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-stone-100"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: item.bg }}
          >
            <Icon name={item.icon} size={14} style={{ color: item.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-navy">{item.count}</div>
            <div className="text-xs text-stone-400 truncate">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface NotificationsTabProps {
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsTab({ onUnreadCountChange }: NotificationsTabProps) {
  const { user } = useAuth();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<NotificationType>('all');
  const [timestampFilter, setTimestampFilter] = useState<TimestampFilter>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications(STATIC_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        credentials: 'include',
      });
      const result = await res.json();

      if (!res.ok || !result.notifications || result.notifications.length === 0) {
        setNotifications(STATIC_NOTIFICATIONS);
        return;
      }

      const mapped: Notification[] = result.notifications.map((row: any) => {
        const style = getNotifStyle(row.type);
        let icon = style.icon;
        if (row.type === 'booking' && row.metadata?.status === 'refunded') icon = 'BanknotesIcon';
        if (row.type === 'booking' && row.metadata?.action === 'checkin') icon = 'TicketIcon';
        if (row.type === 'flight' && row.metadata?.delay_type === 'gate_change')
          icon = 'ExclamationTriangleIcon';
        if (row.type === 'flight' && row.metadata?.delay_type === 'schedule_change')
          icon = 'ClockIcon';
        if (row.type === 'promo' && row.metadata?.promo_code) icon = 'GiftIcon';

        return {
          id: row.id,
          type: row.type as Notification['type'],
          title: row.title,
          body: row.body,
          timestamp: row.created_at,
          read: !!row.read_at,
          icon,
          accent: style.accent,
          accentBg: style.accentBg,
          metadata: row.metadata || {},
        };
      });
      setNotifications(mapped);
    } catch {
      setNotifications(STATIC_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    if (!user) return;
    // Poll for new notifications every 10 seconds
    pollingRef.current = setInterval(loadNotifications, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read && !n.archived).length;

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (user) {
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ notification_id: id, action: 'mark_read' }),
          });
        } catch (err) {
          console.error('Mark read error:', err);
        }
      }
    },
    [user]
  );

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'mark_all_read' }),
        });
      } catch (err) {
        console.error('Mark all read error:', err);
      }
    }
  }, [user]);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleArchive = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, archived: true } : n)));
  }, []);

  const handleSnooze = useCallback((id: string, ms: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, snoozedUntil: Date.now() + ms } : n))
    );
  }, []);

  const now = Date.now();
  const filtered = notifications.filter((n) => {
    if (n.archived && !showArchived) return false;
    if (showUnreadOnly && n.read) return false;
    if (activeType !== 'all' && n.type !== activeType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !n.body.toLowerCase().includes(q)) return false;
    }
    if (n.snoozedUntil && n.snoozedUntil > now) return false;
    const ts = new Date(n.timestamp).getTime();
    const dayMs = 86400000;
    if (timestampFilter === 'today' && now - ts > dayMs) return false;
    if (timestampFilter === 'week' && now - ts > 7 * dayMs) return false;
    if (timestampFilter === 'month' && now - ts > 30 * dayMs) return false;
    return true;
  });

  return (
    <div
      className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
    >
      <div
        className="h-1.5 w-full"
        style={{ background: 'linear-gradient(90deg, #D0021B 0%, #FF4D6A 100%)' }}
      />

      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#FFF5F5' }}
            >
              <Icon name="BellIcon" size={16} style={{ color: '#D0021B' }} />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight text-navy">Trung tâm thông báo</h2>
              <p className="text-xs text-stone-400">Cập nhật đặt vé, chuyến bay & khuyến mãi</p>
            </div>
            {unreadCount > 0 && (
              <span
                className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#D0021B' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-stone-500 hover:text-primary transition-colors flex items-center gap-1"
              >
                <Icon name="CheckCircleIcon" size={13} />
                <span className="hidden sm:inline">Đánh dấu tất cả đã đọc</span>
              </button>
            )}
            <button
              onClick={loadNotifications}
              className="text-stone-400 hover:text-primary transition-colors"
              title="Tải lại"
            >
              <Icon name="ArrowPathIcon" size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Icon
            name="MagnifyingGlassIcon"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm thông báo..."
            className="w-full pl-8 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none transition-all"
          />
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((type) => {
            const conf = TYPE_CONFIG[type];
            const typeUnread =
              type === 'all'
                ? unreadCount
                : notifications.filter((n) => n.type === type && !n.read && !n.archived).length;
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  activeType === type
                    ? 'text-white shadow-sm'
                    : 'text-stone-500 bg-stone-50 hover:bg-stone-100'
                }`}
                style={activeType === type ? { background: conf.color } : {}}
              >
                <Icon name={conf.icon} size={12} />
                {conf.label}
                {typeUnread > 0 && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0 rounded-full ${activeType === type ? 'bg-white/30 text-white' : 'bg-red-100 text-red-600'}`}
                  >
                    {typeUnread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary filters */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <select
            value={timestampFilter}
            onChange={(e) => setTimestampFilter(e.target.value as TimestampFilter)}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-600 focus:outline-none"
          >
            <option value="all">Tất cả thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày qua</option>
            <option value="month">30 ngày qua</option>
          </select>
          <button
            onClick={() => setShowUnreadOnly((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              showUnreadOnly
                ? 'text-white border-transparent'
                : 'text-stone-500 border-stone-200 hover:bg-stone-50'
            }`}
            style={showUnreadOnly ? { background: '#D0021B', borderColor: '#D0021B' } : {}}
          >
            <Icon name="BellIcon" size={12} />
            Chưa đọc
          </button>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              showArchived
                ? 'bg-stone-200 text-stone-700 border-stone-300'
                : 'text-stone-500 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Icon name="ArchiveBoxIcon" size={12} />
            Lưu trữ
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar notifications={notifications} />

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center px-5">
          <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center mb-3">
            <Icon name="BellSlashIcon" size={28} className="text-stone-300" />
          </div>
          <p className="font-bold text-stone-600 text-sm">Không có thông báo</p>
          <p className="text-xs text-stone-400 mt-1 max-w-xs">
            {searchQuery || activeType !== 'all' || showUnreadOnly
              ? 'Không tìm thấy thông báo phù hợp với bộ lọc.'
              : 'Bạn đã xem hết tất cả thông báo.'}
          </p>
          {(searchQuery || activeType !== 'all' || showUnreadOnly || timestampFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveType('all');
                setShowUnreadOnly(false);
                setTimestampFilter('all');
              }}
              className="mt-3 text-xs font-semibold text-white px-4 py-2 rounded-xl transition-all"
              style={{ background: '#D0021B' }}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-stone-50">
          {filtered.map((notif) => (
            <NotifCard
              key={notif.id}
              notif={notif}
              onMarkRead={handleMarkRead}
              onDismiss={handleDismiss}
              onArchive={handleArchive}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {filtered.length} thông báo · {unreadCount} chưa đọc
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#D0021B' }}
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
