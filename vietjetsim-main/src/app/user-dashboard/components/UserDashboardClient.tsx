'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import {
  BookingsTableSkeleton,
  UpcomingBookingsSkeleton,
  ProfileSkeleton,
} from '@/components/ui/SkeletonLoader';
import Pagination from '@/components/ui/Pagination';

// ─── Dynamic imports for heavy tab components (code-split) ──────────────
const UserChat = dynamic(() => import('@/components/chat/UserChat'), {
  loading: () => <div className="fixed bottom-6 right-6 w-80 h-12 bg-white rounded-2xl shadow-lg animate-pulse" />,
  ssr: false,
});
const NotificationsTab = dynamic(() => import('./NotificationsTab'), {
  loading: () => (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-stone-100 rounded-xl animate-pulse" />
      ))}
    </div>
  ),
  ssr: false,
});
const NotificationSettingsTab = dynamic(() => import('./NotificationSettingsTab'), {
  loading: () => <div className="p-4 space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-stone-100 rounded-lg animate-pulse" />)}</div>,
  ssr: false,
});
const WalletTab = dynamic(() => import('./WalletTab'), {
  loading: () => <div className="p-4 space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />)}</div>,
  ssr: false,
});
const PaymentHistoryTab = dynamic(() => import('./PaymentHistoryTab'), {
  loading: () => <div className="p-4 space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />)}</div>,
  ssr: false,
});
const LoyaltyTab = dynamic(() => import('./LoyaltyTab'), {
  loading: () => <div className="p-4 space-y-4">{[1, 2].map((i) => <div key={i} className="h-48 bg-stone-100 rounded-2xl animate-pulse" />)}</div>,
  ssr: false,
});
const SecurityTab = dynamic(() => import('./SecurityTab'), {
  loading: () => <div className="p-4 space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-stone-100 rounded-2xl animate-pulse" />)}</div>,
  ssr: false,
});

// Supabase removed - using API routes instead
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';

type Tab = 'upcoming' | 'history' | 'profile' | 'notifications' | 'notif-settings' | 'refund' | 'wallet' | 'payment-history' | 'loyalty' | 'security';

// Fallback data — used only when API fails or returns empty results
const FALLBACK_UPCOMING = [
  {
    id: 'VJ2B4K9',
    flightNo: 'VJ 101',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP. Hồ Chí Minh',
    date: '20/03/2026',
    departTime: '06:00',
    arriveTime: '08:10',
    seat: '14A',
    price: 1038900,
    status: 'confirmed',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1384cb481-1773695589532.png',
    alt: 'Ho Chi Minh City skyline',
  },
  {
    id: 'VJ7M3P1',
    flightNo: 'VJ 201',
    from: 'SGN',
    to: 'PQC',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Phú Quốc',
    date: '05/04/2026',
    departTime: '07:30',
    arriveTime: '08:45',
    seat: '8C',
    price: 598900,
    status: 'confirmed',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_107571e1a-1773695589380.png',
    alt: 'Phu Quoc island beach',
  },
];

const FALLBACK_HISTORY = [
  {
    id: 'VJ1A2B3',
    flightNo: 'VJ 301',
    from: 'HAN',
    to: 'DAD',
    fromCity: 'Hà Nội',
    toCity: 'Đà Nẵng',
    date: '10/02/2026',
    departTime: '07:00',
    arriveTime: '08:20',
    seat: '22F',
    price: 548900,
    status: 'completed',
  },
  {
    id: 'VJ9X8Y7',
    flightNo: 'VJ 109',
    from: 'SGN',
    to: 'HAN',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Hà Nội',
    date: '25/01/2026',
    departTime: '18:45',
    arriveTime: '20:55',
    seat: '5B',
    price: 748900,
    status: 'completed',
  },
  {
    id: 'VJ5Z6W4',
    flightNo: 'VJ 103',
    from: 'HAN',
    to: 'SGN',
    fromCity: 'Hà Nội',
    toCity: 'TP. Hồ Chí Minh',
    date: '15/01/2026',
    departTime: '09:30',
    arriveTime: '11:40',
    seat: '11D',
    price: 1448900,
    status: 'cancelled',
  },
];

// IATA code → Vietnamese city name
const AIRPORT_CITIES: Record<string, string> = {
  HAN: 'Hà Nội',
  SGN: 'TP. Hồ Chí Minh',
  DAD: 'Đà Nẵng',
  PQC: 'Phú Quốc',
  CXR: 'Nha Trang',
  HUI: 'Huế',
  VDO: 'Vũng Tàu',
  VCL: 'Chu Lai',
  UIH: 'Phù Cát',
  BMV: 'Bù Ma Thuột',
  PUX: 'Phú Quôc',
  HPH: 'Hải Phòng',
  DIN: 'Điện Biên',
  THD: 'Thọ Xuân',
  VCA: 'Tam Kỳ',
  VKO: 'Rạch Giá',
  CAH: 'Cà Mau',
  TBB: 'Tuy Hoà',
  VCS: 'Côn Đảo',
};

/** Booking shape expected by the UI (upcoming cards + history table) */
type UiBooking = {
  id: string;
  flightNo: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  date: string;
  departTime: string;
  arriveTime: string;
  seat: string;
  price: number;
  status: string;
  image?: string;
  alt?: string;
};

/**
 * Map a DB booking record (from /api/bookings) to UiBooking format.
 * DB returns: { id, status, total_price, flight: { flight_no, from_code, to_code, depart_time, arrive_time }, passengers: [] }
 */
function mapDbBookingToUi(b: any): UiBooking {
  const flight = b.flight || {};
  const dep = flight.depart_time ? new Date(flight.depart_time) : new Date();
  const arr = flight.arrive_time ? new Date(flight.arrive_time) : new Date();
  const fmtTime = (d: Date) =>
    d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  const fmtDate = (d: Date) =>
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  // Derive seat from first passenger if available
  const firstPassenger =
    b.passengers && Array.isArray(b.passengers) && b.passengers.length > 0 ? b.passengers[0] : null;

  return {
    id: b.id || '',
    flightNo: flight.flight_no || 'VJ ???',
    from: flight.from_code || '???',
    to: flight.to_code || '???',
    fromCity: AIRPORT_CITIES[flight.from_code] || flight.from_code || '???',
    toCity: AIRPORT_CITIES[flight.to_code] || flight.to_code || '???',
    date: fmtDate(dep),
    departTime: fmtTime(dep),
    arriveTime: fmtTime(arr),
    seat: firstPassenger?.seat || '--',
    price: typeof b.total_price === 'number' ? b.total_price : Number(b.total_price) || 0,
    status: b.status || 'confirmed',
  };
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Đã xác nhận', cls: 'badge-success' },
  completed: { label: 'Hoàn thành', cls: 'badge-info' },
  cancelled: { label: 'Đã huỷ', cls: 'badge-error' },
};

export default function UserDashboardClient() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileDob, setProfileDob] = useState('1990-05-15');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Refund state
  const [refundBookingId, setRefundBookingId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundSubmitted, setRefundSubmitted] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundBankName, setRefundBankName] = useState('');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [refundAccountHolder, setRefundAccountHolder] = useState('');
  const [refundRequests, setRefundRequests] = useState<
    {
      id: string;
      bookingId: string;
      reason: string;
      note: string;
      status: 'pending' | 'approved' | 'rejected';
      date: string;
      adminNote?: string;
    }[]
  >([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Notification unread count (for bell badge)
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  // Skeleton / error states
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  // Dynamic booking data from API
  const [upcomingBookings, setUpcomingBookings] = useState<UiBooking[]>([]);
  const [historyBookings, setHistoryBookings] = useState<UiBooking[]>([]);

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyStatus, setHistoryStatus] = useState<
    'all' | 'completed' | 'cancelled' | 'upcoming'
  >('all');
  const [historySortField, setHistorySortField] = useState<'date' | 'status' | null>(null);
  const [historySortDir, setHistorySortDir] = useState<'asc' | 'desc'>('asc');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const toggleSort = (field: 'date' | 'status') => {
    if (historySortField === field) {
      setHistorySortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setHistorySortField(field);
      setHistorySortDir('asc');
    }
    setHistoryPage(1);
  };

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const filteredHistory = historyBookings
    .filter((booking) => {
      const searchLower = historySearch.toLowerCase();
      const matchesSearch =
        !historySearch ||
        booking.id.toLowerCase().includes(searchLower) ||
        booking.flightNo.toLowerCase().includes(searchLower) ||
        booking.fromCity.toLowerCase().includes(searchLower) ||
        booking.toCity.toLowerCase().includes(searchLower) ||
        booking.from.toLowerCase().includes(searchLower) ||
        booking.to.toLowerCase().includes(searchLower);

      const matchesStatus = historyStatus === 'all' || booking.status === historyStatus;

      const bookingDate = parseDate(booking.date);
      const matchesDateFrom = !historyDateFrom || bookingDate >= new Date(historyDateFrom);
      const matchesDateTo = !historyDateTo || bookingDate <= new Date(historyDateTo);

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      if (!historySortField) return 0;
      if (historySortField === 'date') {
        const diff = parseDate(a.date).getTime() - parseDate(b.date).getTime();
        return historySortDir === 'asc' ? diff : -diff;
      }
      if (historySortField === 'status') {
        const statusOrder: Record<string, number> = { confirmed: 0, completed: 1, cancelled: 2 };
        const diff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        return historySortDir === 'asc' ? diff : -diff;
      }
      return 0;
    });

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const historySafePage = Math.min(historyPage, historyTotalPages);
  const paginatedHistory = filteredHistory.slice(
    (historySafePage - 1) * historyPageSize,
    historySafePage * historyPageSize
  );

  const hasActiveFilters =
    historySearch || historyDateFrom || historyDateTo || historyStatus !== 'all';

  const clearFilters = () => {
    setHistorySearch('');
    setHistoryDateFrom('');
    setHistoryDateTo('');
    setHistoryStatus('all');
    setHistorySortField(null);
    setHistorySortDir('asc');
    setHistoryPage(1);
  };

  const fetchUpcomingBookings = useCallback(async () => {
    if (!user) return;
    setUpcomingError(false);
    setUpcomingLoading(true);
    try {
      // Fetch confirmed + pending bookings as "upcoming"
      const res = await fetch('/api/bookings?status=confirmed,pending&limit=20');
      const json = await res.json();
      if (res.ok && Array.isArray(json.bookings) && json.bookings.length > 0) {
        const mapped = json.bookings.map(mapDbBookingToUi);
        setUpcomingBookings(mapped);
      } else {
        // API empty or error → use fallback
        setUpcomingBookings(FALLBACK_UPCOMING as any);
      }
    } catch {
      setUpcomingError(true);
      // Keep fallback so UI still shows something
      setUpcomingBookings(FALLBACK_UPCOMING as any);
    } finally {
      setUpcomingLoading(false);
    }
  }, [user]);

  const retryUpcoming = () => {
    fetchUpcomingBookings();
  };

  const loadRefundRequests = useCallback(async () => {
    if (!user) return;
    setRefundLoading(true);
    setRefundError(null);
    try {
      const res = await fetch('/api/refunds');
      const json = await res.json();
      const data = json.refunds || [];
      const error = res.ok ? null : { message: 'Failed to load' };
      if (error) {
        setRefundError(error.message);
        return;
      }
      setRefundRequests(
        (data || []).map((r: any) => ({
          id: r.id,
          bookingId: r.booking_id,
          reason: r.reason,
          note: r.note || '',
          status: r.status as 'pending' | 'approved' | 'rejected',
          date: new Date(r.created_at).toLocaleDateString('vi-VN'),
          adminNote: r.admin_note || '',
        }))
      );
    } catch (e: any) {
      setRefundError('Không thể tải dữ liệu');
    } finally {
      setRefundLoading(false);
    }
  }, [user]);

  const retryProfile = () => {
    setProfileError(false);
    setProfileLoading(true);
    setTimeout(() => setProfileLoading(false), 1400);
  };

  const fetchHistoryBookings = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      // Fetch all bookings (no status filter) — we'll separate upcoming vs history on the client
      const res = await fetch('/api/bookings?limit=50');
      const json = await res.json();
      if (res.ok && Array.isArray(json.bookings) && json.bookings.length > 0) {
        // History = everything that is NOT confirmed/pending
        const mapped = json.bookings
          .map(mapDbBookingToUi)
          .filter((b: UiBooking) => b.status !== 'confirmed' && b.status !== 'pending');
        setHistoryBookings(mapped.length > 0 ? mapped : (FALLBACK_HISTORY as any));
      } else {
        setHistoryBookings(FALLBACK_HISTORY as any);
      }
    } catch {
      setHistoryError(true);
      setHistoryBookings(FALLBACK_HISTORY as any);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const retryHistory = () => {
    fetchHistoryBookings();
  };

  const exportCSV = () => {
    const headers = [
      'Mã đặt chỗ',
      'Chuyến bay',
      'Từ',
      'Đến',
      'Ngày bay',
      'Giờ đi',
      'Giờ đến',
      'Ghế',
      'Giá vé (VND)',
      'Trạng thái',
    ];
    const rows = filteredHistory.map((b) => [
      b.id,
      b.flightNo,
      `${b.from} - ${b.fromCity}`,
      `${b.to} - ${b.toCity}`,
      b.date,
      b.departTime,
      b.arriveTime,
      b.seat,
      b.price,
      STATUS_MAP[b.status].label,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lich-su-dat-ve-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = filteredHistory
      .map(
        (b) => `
      <tr>
        <td>${b.id}</td>
        <td>${b.flightNo}</td>
        <td>${b.from} → ${b.to}</td>
        <td>${b.date}</td>
        <td>${b.departTime} → ${b.arriveTime}</td>
        <td>${b.seat}</td>
        <td style="text-align:right">${b.price.toLocaleString('vi-VN')}₫</td>
        <td><span style="padding:2px 8px;border-radius:999px;font-size:11px;background:${b.status === 'completed' ? '#dbeafe' : b.status === 'cancelled' ? '#fee2e2' : '#f0fdf4'};color:${b.status === 'completed' ? '#1d4ed8' : b.status === 'cancelled' ? '#dc2626' : '#16a34a'}">${STATUS_MAP[b.status].label}</span></td>
      </tr>`
      )
      .join('');
    const filterDesc = [
      historySearch ? `Tìm kiếm: "${historySearch}"` : '',
      historyDateFrom ? `Từ ngày: ${historyDateFrom}` : '',
      historyDateTo ? `Đến ngày: ${historyDateTo}` : '',
      historyStatus !== 'all'
        ? `Trạng thái: ${STATUS_MAP[historyStatus as keyof typeof STATUS_MAP]?.label ?? historyStatus}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ');
    printWindow.document
      .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lịch sử đặt vé</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1c1917; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #78716c; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f5f5f4; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; border-bottom: 2px solid #e7e5e4; }
        td { padding: 8px 10px; border-bottom: 1px solid #f5f5f4; }
        tr:nth-child(even) td { background: #fafaf9; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Lịch sử đặt vé</h1>
      <div class="meta">Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} · ${filteredHistory.length} chuyến bay${filterDesc ? ' · Bộ lọc: ' + filterDesc : ''}</div>
      <table>
        <thead><tr>
          <th>Mã đặt chỗ</th><th>Chuyến bay</th><th>Hành trình</th><th>Ngày bay</th><th>Giờ bay</th><th>Ghế</th><th>Giá vé</th><th>Trạng thái</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profileName,
          phone: profilePhone,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // silently fail
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'upcoming', label: 'Chuyến bay sắp tới', icon: 'CalendarIcon' },
    { id: 'history', label: 'Lịch sử đặt vé', icon: 'ClockIcon' },
    { id: 'refund', label: 'Yêu cầu hoàn tiền', icon: 'BanknotesIcon' },
    { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'UserCircleIcon' },
    { id: 'notifications', label: 'Thông báo', icon: 'BellIcon' },
    { id: 'notif-settings', label: 'Cài đặt thông báo', icon: 'Cog6ToothIcon' },
    { id: 'wallet', label: 'Ví của tôi', icon: 'WalletIcon' },
    { id: 'payment-history', label: 'Thanh toán', icon: 'CreditCardIcon' },
    { id: 'loyalty', label: 'Điểm thưởng', icon: 'StarIcon' },
    { id: 'security', label: 'Bảo mật', icon: 'ShieldCheckIcon' },
  ];

  const handleTabSelect = (id: Tab) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  // Fetch initial booking data from API
  useEffect(() => {
    fetchUpcomingBookings();
  }, [fetchUpcomingBookings]);

  // Fetch history bookings when history tab becomes active (lazy load)
  useEffect(() => {
    if (activeTab === 'history' && historyBookings.length === 0 && !historyLoading) {
      fetchHistoryBookings();
    }
  }, [activeTab, historyBookings.length, historyLoading, fetchHistoryBookings]);

  // Sync profile fields from authenticated user data
  useEffect(() => {
    if (user) {
      setProfileName(user.fullName || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
    }
  }, [user]);

  // Load refund requests when tab is active or user changes
  useEffect(() => {
    if (activeTab === 'refund' && user) {
      loadRefundRequests();
    }
  }, [activeTab, user, loadRefundRequests]);

  // Subscribe to refund request updates (real-time status changes) — chỉ polling khi ở tab refund
  useEffect(() => {
    if (!user || activeTab !== 'refund') return;
    const interval = setInterval(loadRefundRequests, 10000);
    return () => clearInterval(interval);
  }, [user, activeTab, loadRefundRequests]);

  // Load initial unread notification count for bell badge
  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/notifications');
        const json = await res.json();
        const count = json.notifications?.filter((n: any) => !n.is_read).length || 0;
        setNotifUnreadCount(count ?? 0);
      } catch {
        /* ignore */
      }
    };
    fetchUnreadCount();
    // Real-time badge updates
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const toast = useToast();
  return (
    <div className="pt-20 pb-12 min-h-screen" style={{
      background: 'linear-gradient(180deg, #fefce8 0%, #fffbeb 50%, #fef9c3 100%)'
    }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Mobile: top bar with drawer toggle + active tab label */}
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 bg-white border border-amber-200 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm"
            style={{ color: '#d97706' }}
          >
            <Icon name="Bars3Icon" size={18} />
            <span>{tabs.find((t) => t.id === activeTab)?.label}</span>
            <Icon name="ChevronDownIcon" size={14} className="text-amber-400 ml-1" />
          </button>
          {/* Notification bell badge (mobile) */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative ml-auto flex items-center justify-center w-10 h-10 bg-white border border-amber-200 rounded-2xl shadow-sm"
            title="Thông báo"
          >
            <Icon name="BellIcon" size={18} style={{ color: '#d97706' }} />
            {notifUnreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-white text-[10px] font-bold rounded-full px-1"
                style={{ background: '#ef4444' }}
              >
                {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Drawer Overlay */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <div
              className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col rounded-r-3xl"
              style={{ animation: 'slideInLeft 0.25s ease-out' }}
            >
              <div
                className="flex items-center justify-between px-5 py-5 rounded-br-3xl"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Icon name="UserCircleIcon" size={24} className="text-white" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-base block">
                      Xin chào!
                    </span>
                    <span className="text-white/80 text-xs">
                      {user?.fullName || 'Khách hàng'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Icon name="XMarkIcon" size={18} className="text-white" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-1 text-sm font-semibold transition-all text-left ${
                      sidebarCollapsed ? 'justify-center' : ''
                    }`}
                    style={{
                      background: activeTab === tab.id ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
                      color: activeTab === tab.id ? 'white' : '#92400e',
                      fontWeight: activeTab === tab.id ? 700 : 600
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.id) e.currentTarget.style.background = '#fef3c7';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icon
                      name={tab.icon}
                      size={20}
                      className={activeTab === tab.id ? 'text-white' : 'text-amber-500'}
                    />
                    {!sidebarCollapsed && <span className="truncate text-left">{tab.label}</span>}
                    {activeTab === tab.id && !sidebarCollapsed && (
                      <Icon name="ChevronRightIcon" size={14} className="ml-auto text-white/70" />
                    )}
                  </button>
                ))}
              </nav>
              <div className="px-3 py-4 border-t border-amber-100">
                <Link
                  href="/sign-up-login"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all text-amber-700 hover:bg-red-50 hover:text-red-600"
                >
                  <Icon name="ArrowRightOnRectangleIcon" size={20} className="text-amber-500" />
                  Đăng xuất
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main layout: sidebar + content */}
        <div className="flex gap-6 items-start">
          {/* Desktop Sidebar */}
          <aside
            className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
          >
            <div
              className="bg-white border border-amber-100 rounded-3xl overflow-hidden sticky top-[100px]"
              style={{ boxShadow: '0 8px 32px rgba(245, 158, 11, 0.12), 0 4px 12px rgba(251, 191, 36, 0.08)' }}
            >
              {/* Sidebar header */}
              <div
                className="flex items-center justify-between px-5 py-5 border-b border-amber-100"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  borderRadius: '1.5rem 1.5rem 0 0',
                }}
              >
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon name="UserCircleIcon" size={22} className="text-white" />
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm block">Xin chào!</span>
                      <span className="text-white/80 text-xs">{user?.fullName || 'Khách hàng'}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`}
                  title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                  <Icon
                    name={sidebarCollapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'}
                    size={14}
                    className="text-white"
                  />
                </button>
              </div>

              {/* Sidebar nav items */}
              <nav className="py-3 px-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={sidebarCollapsed ? tab.label : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-1 text-sm font-semibold transition-all text-left ${
                      activeTab === tab.id
                        ? 'text-white shadow-lg'
                        : 'text-amber-800 hover:bg-amber-50'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' } : {}}
                  >
                    <div className="relative flex-shrink-0">
                      <Icon
                        name={tab.icon}
                        size={20}
                        className={activeTab === tab.id ? 'text-white' : 'text-amber-500'}
                      />
                      {tab.id === 'notifications' && notifUnreadCount > 0 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center text-white text-[9px] font-bold rounded-full px-0.5"
                          style={{
                            background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : '#ef4444',
                          }}
                        >
                          {notifUnreadCount > 9 ? '9+' : notifUnreadCount}
                        </span>
                      )}
                    </div>
                    {!sidebarCollapsed && <span className="truncate text-left">{tab.label}</span>}
                    {!sidebarCollapsed && tab.id === 'notifications' && notifUnreadCount > 0 && (
                      <span
                        className="ml-auto text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : '#ef4444',
                        }}
                      >
                        {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Sidebar footer */}
              {!sidebarCollapsed && (
                <div className="px-3 py-3 border-t border-amber-100">
                  <Link
                    href="/sign-up-login"
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-amber-700 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <Icon name="ArrowRightOnRectangleIcon" size={20} className="text-amber-500" />
                    <span>Đăng xuất</span>
                  </Link>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="px-2 py-3 border-t border-amber-100">
                  <Link
                    href="/sign-up-login"
                    title="Đăng xuất"
                    className="flex items-center justify-center w-full py-3 rounded-2xl text-amber-700 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <Icon name="ArrowRightOnRectangleIcon" size={20} />
                  </Link>
                </div>
              )}
            </div>
          </aside>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Upcoming Bookings */}
            {activeTab === 'upcoming' && (
              <div className="space-y-4">
                {upcomingLoading ? (
                  <UpcomingBookingsSkeleton count={2} />
                ) : upcomingError ? (
                  <div
                    className="bg-white rounded-2xl border border-red-200 p-8 text-center"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  >
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Icon name="ExclamationTriangleIcon" size={28} className="text-red-500" />
                    </div>
                    <p className="font-bold text-sm mb-1" style={{ color: '#1e40af' }}>
                      Không thể tải chuyến bay
                    </p>
                    <p className="text-xs text-stone-400 mb-4">
                      Đã xảy ra lỗi khi tải danh sách chuyến bay sắp tới. Vui lòng thử lại.
                    </p>
                    <button
                      onClick={retryUpcoming}
                      className="inline-flex items-center gap-2 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
                      style={{ background: '#1e40af' }}
                    >
                      <Icon name="ArrowPathIcon" size={14} />
                      Thử lại
                    </button>
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div
                    className="bg-white rounded-3xl border border-amber-100 overflow-hidden"
                    style={{ boxShadow: '0 8px 32px rgba(245, 158, 11, 0.1), 0 4px 12px rgba(251, 191, 36, 0.06)' }}
                  >
                    <div
                      className="h-2 w-full"
                      style={{ background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)' }}
                    />
                    <div className="p-10 flex flex-col sm:flex-row items-center gap-8 max-w-lg mx-auto">
                      <div className="shrink-0 w-36 h-36">
                        <img
                          src="/assets/empty-upcoming-flights.svg"
                          alt="Không có chuyến bay sắp tới"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="font-black text-lg mb-2 text-amber-900">
                          Chưa có chuyến bay nào
                        </p>
                        <p className="text-sm text-amber-600 mb-5 leading-relaxed">
                          Bạn chưa có chuyến bay nào sắp tới. Hãy đặt vé ngay để bắt đầu hành trình
                          của bạn!
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <Link
                            href="/flight-booking"
                            className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-all hover:opacity-90 active:scale-95 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)' }}
                          >
                            <Icon name="PaperAirplaneIcon" size={15} />
                            Đặt vé ngay
                          </Link>
                          <button
                            onClick={retryUpcoming}
                            className="inline-flex items-center gap-2 text-amber-700 font-semibold px-5 py-3 rounded-2xl text-sm border border-amber-200 hover:bg-amber-50 transition-all bg-white"
                          >
                            <Icon name="ArrowPathIcon" size={14} />
                            Tải lại
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  upcomingBookings.map((booking) => (
                    <Link key={booking.id} href={`/booking/${booking.id}`} className="block">
                      <div
                        className="bg-white rounded-3xl border border-amber-100 overflow-hidden card-hover-yellow"
                        style={{
                          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08), 0 2px 8px rgba(251, 191, 36, 0.04)',
                        }}
                      >
                        <div
                          className="h-2 w-full"
                          style={{ background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)' }}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3">
                          <div className="relative h-40 sm:h-auto sm:col-span-1">
                            <AppImage
                              src={booking.image || ''}
                              alt={booking.alt || ''}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                          </div>
                          <div className="sm:col-span-2 p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-black text-sm" style={{ color: '#1A2948' }}>
                                  {booking.flightNo}
                                </div>
                                <div className="text-xs text-stone-400 mt-0.5">{booking.date}</div>
                              </div>
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_MAP[booking.status].cls}`}
                              >
                                <span className="badge-dot" />
                                {STATUS_MAP[booking.status].label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                              <div>
                                <div className="text-2xl font-black" style={{ color: '#1A2948' }}>
                                  {booking.departTime}
                                </div>
                                <div className="text-xs text-stone-500">
                                  {booking.from} · {booking.fromCity}
                                </div>
                              </div>
                              <div className="flex-1 flex flex-col items-center">
                                <Icon name="PaperAirplaneIcon" size={16} className="text-primary" />
                                <div className="text-xs text-stone-400 mt-0.5">Bay thẳng</div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black" style={{ color: '#1A2948' }}>
                                  {booking.arriveTime}
                                </div>
                                <div className="text-xs text-stone-500">
                                  {booking.to} · {booking.toCity}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                              <div className="flex items-center gap-3 text-xs text-stone-500">
                                <div className="flex items-center gap-1">
                                  <Icon name="TicketIcon" size={12} />
                                  Mã:{' '}
                                  <span className="font-bold" style={{ color: '#1A2948' }}>
                                    {booking.id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Icon name="MapPinIcon" size={12} />
                                  Ghế {booking.seat}
                                </div>
                              </div>
                              <div
                                className="font-black text-sm px-3 py-1 rounded-lg"
                                style={{
                                  color: '#1A2948',
                                  background: '#FFF8E1',
                                  border: '1px solid #FFC72C',
                                }}
                              >
                                {booking.price.toLocaleString('vi-VN')}₫
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center border border-dashed border-stone-300">
                                <Icon name="QrCodeIcon" size={20} className="text-stone-400" />
                              </div>
                              <div className="text-xs text-stone-400">
                                <div className="font-semibold text-stone-600">Check-in online</div>
                                <div>Xuất trình QR code tại sân bay</div>
                              </div>
                              <button
                                onClick={() => window.location.href = `/check-in?bookingId=${booking.id}`}
                                className="ml-auto text-xs font-semibold border px-3 py-1.5 rounded-lg transition-all"
                                style={{
                                  color: '#1e40af',
                                  borderColor: '#1e40af',
                                  background: '#eff6ff',
                                }}
                              >
                                Check-in
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <div
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
              >
                <div
                  className="h-1.5 w-full"
                  style={{ background: 'linear-gradient(90deg, #EC2029 0%, #FF4D6A 100%)' }}
                />
                <div className="p-5 border-b border-stone-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold" style={{ color: '#1A2948' }}>
                        Lịch sử đặt vé
                      </h2>
                      <p className="text-sm text-stone-400 mt-0.5">
                        {filteredHistory.length} / {historyBookings.length} chuyến bay
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {filteredHistory.length > 0 && (
                        <>
                          <button
                            onClick={exportCSV}
                            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-all"
                            title="Xuất CSV"
                          >
                            <Icon name="TableCellsIcon" size={13} />
                            CSV
                          </button>
                          <button
                            onClick={exportPDF}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-all"
                            title="Xuất PDF"
                          >
                            <Icon name="DocumentArrowDownIcon" size={13} />
                            PDF
                          </button>
                        </>
                      )}
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-lg transition-all"
                          style={{ color: '#EC2029', borderColor: '#EC2029' }}
                        >
                          <Icon name="XMarkIcon" size={12} />
                          Xoá bộ lọc
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative mb-3">
                    <Icon
                      name="MagnifyingGlassIcon"
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value);
                        setHistoryPage(1);
                      }}
                      placeholder="Tìm theo mã đặt chỗ, chuyến bay, thành phố..."
                      className="w-full pl-9 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-all"
                      style={{ outline: 'none' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#EC2029';
                        e.target.style.boxShadow = '0 0 0 2px rgba(208,2,27,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    />
                    {historySearch && (
                      <button
                        onClick={() => {
                          setHistorySearch('');
                          setHistoryPage(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        <Icon name="XMarkIcon" size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 min-w-[120px]">
                        <Icon
                          name="CalendarIcon"
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                        />
                        <input
                          type="date"
                          value={historyDateFrom}
                          onChange={(e) => {
                            setHistoryDateFrom(e.target.value);
                            setHistoryPage(1);
                          }}
                          className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none transition-all"
                        />
                      </div>
                      <span className="text-stone-400 text-xs flex-shrink-0">→</span>
                      <div className="relative flex-1 min-w-[120px]">
                        <Icon
                          name="CalendarIcon"
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                        />
                        <input
                          type="date"
                          value={historyDateTo}
                          onChange={(e) => {
                            setHistoryDateTo(e.target.value);
                            setHistoryPage(1);
                          }}
                          className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl p-1 flex-shrink-0">
                      {(
                        [
                          { value: 'all', label: 'Tất cả' },
                          { value: 'completed', label: 'Hoàn thành' },
                          { value: 'cancelled', label: 'Đã huỷ' },
                          { value: 'upcoming', label: 'Sắp tới' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setHistoryStatus(opt.value);
                            setHistoryPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${historyStatus === opt.value ? 'text-white border-transparent' : 'text-stone-600 hover:text-stone-700 hover:bg-stone-100'}`}
                          style={
                            historyStatus === opt.value
                              ? { background: '#EC2029', borderColor: '#EC2029' }
                              : {}
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100" style={{ background: '#1A2948' }}>
                        <th
                          className="text-left text-xs font-bold uppercase tracking-wider px-4 py-2"
                          style={{ color: '#FFC72C' }}
                        >
                          Mã đặt chỗ
                        </th>
                        <th
                          className="text-left text-xs font-bold uppercase tracking-wider px-4 py-2"
                          style={{ color: '#FFC72C' }}
                        >
                          Chuyến bay
                        </th>
                        <th
                          className="text-left text-xs font-bold uppercase tracking-wider px-4 py-2 hidden sm:table-cell"
                          style={{ color: '#FFC72C' }}
                        >
                          Hành trình
                        </th>
                        <th
                          className="text-left text-xs font-bold uppercase tracking-wider px-4 py-2 hidden md:table-cell cursor-pointer select-none"
                          style={{ color: '#FFC72C' }}
                          onClick={() => toggleSort('date')}
                        >
                          <span className="inline-flex items-center gap-1">
                            Ngày bay
                            <span
                              className="inline-flex flex-col leading-none"
                              style={{ fontSize: 8 }}
                            >
                              <span
                                style={{
                                  opacity:
                                    historySortField === 'date' && historySortDir === 'asc'
                                      ? 1
                                      : 0.35,
                                }}
                              >
                                ▲
                              </span>
                              <span
                                style={{
                                  opacity:
                                    historySortField === 'date' && historySortDir === 'desc'
                                      ? 1
                                      : 0.35,
                                }}
                              >
                                ▼
                              </span>
                            </span>
                          </span>
                        </th>
                        <th
                          className="text-right text-xs font-bold uppercase tracking-wider px-4 py-2"
                          style={{ color: '#FFC72C' }}
                        >
                          Giá vé
                        </th>
                        <th
                          className="text-center text-xs font-bold uppercase tracking-wider px-4 py-2 cursor-pointer select-none"
                          style={{ color: '#FFC72C' }}
                          onClick={() => toggleSort('status')}
                        >
                          <span className="inline-flex items-center gap-1 justify-center">
                            Trạng thái
                            <span
                              className="inline-flex flex-col leading-none"
                              style={{ fontSize: 8 }}
                            >
                              <span
                                style={{
                                  opacity:
                                    historySortField === 'status' && historySortDir === 'asc'
                                      ? 1
                                      : 0.35,
                                }}
                              >
                                ▲
                              </span>
                              <span
                                style={{
                                  opacity:
                                    historySortField === 'status' && historySortDir === 'desc'
                                      ? 1
                                      : 0.35,
                                }}
                              >
                                ▼
                              </span>
                            </span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLoading ? (
                        <BookingsTableSkeleton rows={3} />
                      ) : historyError ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                                <Icon
                                  name="ExclamationTriangleIcon"
                                  size={28}
                                  className="text-red-500"
                                />
                              </div>
                              <div>
                                <p className="font-bold text-sm mb-1" style={{ color: '#1A2948' }}>
                                  Không thể tải lịch sử đặt vé
                                </p>
                                <p className="text-xs text-stone-400 max-w-xs mx-auto">
                                  Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.
                                </p>
                              </div>
                              <button
                                onClick={retryHistory}
                                className="inline-flex items-center gap-2 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
                                style={{ background: '#EC2029' }}
                              >
                                <Icon name="ArrowPathIcon" size={14} />
                                Thử lại
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center">
                            <div className="flex flex-col sm:flex-row items-center gap-6 py-8 px-6 max-w-md mx-auto animate-[fadeInUp_0.35s_ease-out]">
                              <div className="shrink-0 w-28 h-28">
                                <img
                                  src="/assets/empty-refund-requests.svg"
                                  alt="Chưa có yêu cầu hoàn tiền"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="text-center sm:text-left">
                                <p
                                  className="font-black text-base mb-1.5"
                                  style={{ color: '#1A2948' }}
                                >
                                  Chưa có yêu cầu nào
                                </p>
                                <p className="text-xs text-stone-400 mb-4 leading-relaxed">
                                  Các yêu cầu hoàn tiền bạn gửi sẽ xuất hiện tại đây. Bạn có thể
                                  theo dõi trạng thái xử lý của từng yêu cầu.
                                </p>
                                <button
                                  onClick={() => {
                                    const el = document.querySelector('form');
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90 active:scale-95"
                                  style={{ background: '#EC2029' }}
                                >
                                  <Icon name="PlusIcon" size={13} />
                                  Gửi yêu cầu hoàn tiền
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedHistory.map((booking, i) => (
                          <tr
                            key={booking.id}
                            className={`vj-table-row border-b border-stone-50 ${i % 2 === 0 ? '' : 'bg-stone-50/50'} cursor-pointer hover:bg-stone-100`}
                            onClick={() => (window.location.href = `/booking/${booking.id}`)}
                          >
                            <td className="px-4 py-2.5">
                              <span
                                className="font-mono font-bold text-sm"
                                style={{ color: '#1A2948' }}
                              >
                                {booking.id}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gradient-red rounded flex items-center justify-center">
                                  <Icon name="PaperAirplaneIcon" size={9} className="text-white" />
                                </div>
                                <span
                                  className="font-semibold text-sm"
                                  style={{ color: '#1A2948' }}
                                >
                                  {booking.flightNo}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-bold" style={{ color: '#1A2948' }}>
                                  {booking.from}
                                </span>
                                <Icon name="ArrowRightIcon" size={11} className="text-stone-400" />
                                <span className="font-bold" style={{ color: '#1A2948' }}>
                                  {booking.to}
                                </span>
                              </div>
                              <div className="text-xs text-stone-400">
                                {booking.departTime} → {booking.arriveTime}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              <span className="text-sm text-stone-600">{booking.date}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className="font-bold text-sm px-2 py-0.5 rounded"
                                style={{ color: '#1A2948', background: '#FFF8E1' }}
                              >
                                {booking.price.toLocaleString('vi-VN')}₫
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_MAP[booking.status].cls}`}
                              >
                                <span className="badge-dot" />
                                {STATUS_MAP[booking.status].label}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredHistory.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 border-t border-stone-100 bg-stone-50/50 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-400">
                        {filteredHistory.length > historyPageSize
                          ? `Hiển thị ${(historySafePage - 1) * historyPageSize + 1}–${Math.min(historySafePage * historyPageSize, filteredHistory.length)} / ${filteredHistory.length} chuyến bay`
                          : `${filteredHistory.length} chuyến bay`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-stone-400">Hiển thị:</span>
                        <select
                          value={historyPageSize}
                          onChange={(e) => {
                            setHistoryPageSize(Number(e.target.value));
                            setHistoryPage(1);
                          }}
                          className="text-xs font-semibold border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-700 focus:outline-none cursor-pointer"
                          style={{ color: '#1A2948' }}
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                        <span className="text-xs text-stone-400">hàng</span>
                      </div>
                    </div>
                    {historyTotalPages > 1 && (
                      <Pagination
                        currentPage={historySafePage}
                        totalPages={historyTotalPages}
                        onPageChange={setHistoryPage}
                        siblingCount={1}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profile */}
            {activeTab === 'profile' &&
              (profileLoading ? (
                <ProfileSkeleton />
              ) : profileError ? (
                <div
                  className="bg-white rounded-2xl border border-red-200 p-8 text-center"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                >
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Icon name="ExclamationTriangleIcon" size={28} className="text-red-500" />
                  </div>
                  <p className="font-bold text-sm mb-1" style={{ color: '#1A2948' }}>
                    Không thể tải hồ sơ
                  </p>
                  <p className="text-xs text-stone-400 mb-4 max-w-xs mx-auto">
                    Đã xảy ra lỗi khi tải thông tin cá nhân. Vui lòng thử lại.
                  </p>
                  <button
                    onClick={retryProfile}
                    className="inline-flex items-center gap-2 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
                    style={{ background: '#EC2029' }}
                  >
                    <Icon name="ArrowPathIcon" size={14} />
                    Thử lại
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <form
                      onSubmit={handleSaveProfile}
                      className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
                      style={{
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        className="h-1.5 w-full"
                        style={{ background: 'linear-gradient(90deg, #EC2029 0%, #FF4D6A 100%)' }}
                      />
                      <div className="p-4">
                        <h2 className="font-bold mb-1" style={{ color: '#1A2948' }}>
                          Thông tin cá nhân
                        </h2>
                        <div
                          className="w-10 h-0.5 mb-5 rounded-full"
                          style={{ background: '#FFC72C' }}
                        />
                        {saveSuccess && (
                          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">
                            <Icon name="CheckCircleIcon" size={16} />
                            Cập nhật thông tin thành công!
                          </div>
                        )}
                        <div className="space-y-4">
                          <div>
                            <label
                              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                              style={{ color: '#1A2948' }}
                            >
                              Họ và tên
                            </label>
                            <input
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm form-input"
                            />
                          </div>
                          <div>
                            <label
                              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                              style={{ color: '#1A2948' }}
                            >
                              Email
                            </label>
                            <input
                              type="email"
                              value={profileEmail}
                              onChange={(e) => setProfileEmail(e.target.value)}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm form-input"
                            />
                          </div>
                          <div>
                            <label
                              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                              style={{ color: '#1A2948' }}
                            >
                              Số điện thoại
                            </label>
                            <input
                              type="tel"
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm form-input"
                            />
                          </div>
                          <div>
                            <label
                              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                              style={{ color: '#1A2948' }}
                            >
                              Ngày sinh
                            </label>
                            <input
                              type="date"
                              value={profileDob}
                              onChange={(e) => setProfileDob(e.target.value)}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm form-input"
                            />
                          </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                          <button
                            type="submit"
                            className="flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-sm"
                            style={{ background: '#EC2029' }}
                          >
                            <Icon name="CheckIcon" size={16} />
                            Lưu thay đổi
                          </button>
                          <button
                            type="button"
                            className="px-6 py-2.5 border border-stone-300 font-semibold rounded-xl text-sm transition-all hover:bg-stone-50"
                            style={{ color: '#1A2948' }}
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="space-y-4">
                    <div
                      className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
                      style={{
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        className="h-1.5 w-full"
                        style={{ background: 'linear-gradient(90deg, #EC2029 0%, #FF4D6A 100%)' }}
                      />
                      <div className="p-5">
                        <h3 className="font-bold mb-1" style={{ color: '#1A2948' }}>
                          Thống kê của bạn
                        </h3>
                        <div
                          className="w-8 h-0.5 mb-4 rounded-full"
                          style={{ background: '#FFC72C' }}
                        />
                        <div className="space-y-3">
                          {[
                            {
                              label: 'Tổng chuyến bay',
                              value: '5',
                              icon: 'PaperAirplaneIcon' as const,
                              color: '#EC2029',
                              bg: '#FFF5F5',
                            },
                            {
                              label: 'Điểm tích lũy',
                              value: '1,250',
                              icon: 'StarIcon' as const,
                              color: '#B8860B',
                              bg: '#FFF8E1',
                            },
                            {
                              label: 'Tổng chi tiêu',
                              value: '5.2M₫',
                              icon: 'CurrencyDollarIcon' as const,
                              color: '#16a34a',
                              bg: '#f0fdf4',
                            },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className="flex items-center justify-between py-2 border-b border-stone-50"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ background: stat.bg }}
                                >
                                  <Icon name={stat.icon} size={16} style={{ color: stat.color }} />
                                </div>
                                <span className="text-sm text-stone-600">{stat.label}</span>
                              </div>
                              <span className="font-black" style={{ color: '#1A2948' }}>
                                {stat.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div
                      className="rounded-2xl p-5 text-white overflow-hidden relative"
                      style={{ background: '#1A2948' }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: '#FFC72C' }}
                      />
                      <div className="flex items-center gap-2 mb-3 mt-1">
                        <Icon name="ShieldCheckIcon" size={20} style={{ color: '#FFC72C' }} />
                        <span className="font-bold">Bảo mật tài khoản</span>
                      </div>
                      <p className="text-white/70 text-xs mb-4">
                        Tài khoản của bạn được bảo vệ bởi xác thực 2 lớp.
                      </p>
                      <button
                        className="w-full font-semibold py-2.5 rounded-xl text-xs transition-all"
                        style={{ background: '#FFC72C', color: '#1A2948' }}
                      >
                        Đổi mật khẩu
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <NotificationsTab onUnreadCountChange={setNotifUnreadCount} />
            )}

            {/* Notification Settings */}
            {activeTab === 'notif-settings' && <NotificationSettingsTab />}

            {/* Refund */}
            {activeTab === 'refund' && (
              <div className="space-y-5">
                {/* Submit refund form */}
                <div
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ background: 'linear-gradient(90deg, #EC2029 0%, #FF4D6A 100%)' }}
                  />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }}
                      >
                        <Icon name="BanknotesIcon" size={20} className="text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-amber-900">
                          Yêu cầu hoàn tiền
                        </h2>
                        <p className="text-xs text-amber-600">
                          Điền thông tin để gửi yêu cầu hoàn tiền vé máy bay
                        </p>
                      </div>
                    </div>
                    <div
                      className="w-12 h-1 mb-4 rounded-full mt-3"
                      style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
                    />

                    {refundSubmitted ? (
                      <div className="flex flex-col items-center py-10 text-center">
                        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                          <Icon name="CheckCircleIcon" size={36} className="text-green-500" />
                        </div>
                        <h3 className="font-black text-base mb-2" style={{ color: '#1A2948' }}>
                          Yêu cầu đã được gửi!
                        </h3>
                        <p className="text-sm text-stone-400 max-w-xs mb-6">
                          Chúng tôi sẽ xem xét và phản hồi yêu cầu hoàn tiền của bạn trong vòng 3–5
                          ngày làm việc.
                        </p>
                        <button
                          onClick={() => {
                            setRefundSubmitted(false);
                            setRefundBookingId('');
                            setRefundReason('');
                            setRefundNote('');
                            setRefundBankName('');
                            setRefundAccountNumber('');
                            setRefundAccountHolder('');
                          }}
                          className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                          style={{ background: '#EC2029' }}
                        >
                          <Icon name="PlusIcon" size={15} />
                          Gửi yêu cầu mới
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (
                            !refundBookingId ||
                            !refundReason ||
                            !refundBankName ||
                            !refundAccountNumber ||
                            !refundAccountHolder
                          )
                            return;
                          setRefundSubmitting(true);
                          setRefundError(null);
                          try {
                            const insertData: any = {
                              booking_id: refundBookingId,
                              reason: refundReason,
                              note: refundNote,
                              bank_name: refundBankName,
                              account_number: refundAccountNumber,
                              account_holder: refundAccountHolder,
                              status: 'pending',
                              flight_no: '',
                              route: '',
                              flight_date: '',
                              amount: 0,
                            };
                            if (user) {
                              insertData.user_id = user.id;
                            }
                            const res = await fetch('/api/refunds', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(insertData),
                            });
                            const insertErr = res.ok ? null : { message: 'Failed to submit' };
                            if (insertErr) {
                              setRefundError(insertErr.message);
                              return;
                            }
                            setRefundSubmitted(true);
                            toast.success(
                              'Yêu cầu hoàn tiền đã được gửi',
                              'Chúng tôi sẽ xem xét và phản hồi trong 3–5 ngày làm việc.'
                            );
                            await loadRefundRequests();
                          } catch (err: any) {
                            setRefundError('Không thể gửi yêu cầu. Vui lòng thử lại.');
                          } finally {
                            setRefundSubmitting(false);
                          }
                        }}
                        className="space-y-5"
                      >
                        {/* Booking ID */}
                        <div>
                          <label
                            className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                            style={{ color: '#1A2948' }}
                          >
                            Mã đặt chỗ <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Icon
                              name="TicketIcon"
                              size={15}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                            />
                            <input
                              type="text"
                              value={refundBookingId}
                              onChange={(e) => setRefundBookingId(e.target.value.toUpperCase())}
                              placeholder="VD: VJ2B4K9"
                              required
                              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-all"
                              onFocus={(e) => {
                                e.target.style.borderColor = '#EC2029';
                                e.target.style.boxShadow = '0 0 0 2px rgba(208,2,27,0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '';
                                e.target.style.boxShadow = '';
                              }}
                            />
                          </div>
                          <p className="text-xs text-stone-400 mt-1">
                            Nhập mã đặt chỗ từ email xác nhận hoặc lịch sử đặt vé
                          </p>
                        </div>

                        {/* Note */}
                        <div>
                          <label
                            className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                            style={{ color: '#1A2948' }}
                          >
                            Ghi chú thêm
                          </label>
                          <textarea
                            value={refundNote}
                            onChange={(e) => setRefundNote(e.target.value)}
                            placeholder="Mô tả chi tiết lý do hoàn tiền (không bắt buộc)..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-all resize-none"
                            onFocus={(e) => {
                              e.target.style.borderColor = '#EC2029';
                              e.target.style.boxShadow = '0 0 0 2px rgba(208,2,27,0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '';
                              e.target.style.boxShadow = '';
                            }}
                          />
                        </div>

                        {/* Bank account info section */}
                        <div className="rounded-xl border border-stone-200 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 bg-stone-50 border-b border-stone-200">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ background: '#FFF5F5' }}
                            >
                              <Icon name="CreditCardIcon" size={13} style={{ color: '#EC2029' }} />
                            </div>
                            <span
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{ color: '#1A2948' }}
                            >
                              Thông tin tài khoản ngân hàng nhận tiền
                            </span>
                            <span className="text-red-500 text-xs font-bold">*</span>
                          </div>
                          <div className="p-4 space-y-3">
                            {/* Bank name */}
                            <div>
                              <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                                Tên ngân hàng <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Icon
                                  name="BuildingOffice2Icon"
                                  size={15}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                                />
                                <input
                                  type="text"
                                  value={refundBankName}
                                  onChange={(e) => setRefundBankName(e.target.value)}
                                  placeholder="VD: Vietcombank, Techcombank, MB Bank..."
                                  required
                                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-all"
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#EC2029';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(208,2,27,0.1)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '';
                                    e.target.style.boxShadow = '';
                                  }}
                                />
                              </div>
                            </div>
                            {/* Account number */}
                            <div>
                              <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                                Số tài khoản <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Icon
                                  name="HashtagIcon"
                                  size={15}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                                />
                                <input
                                  type="text"
                                  value={refundAccountNumber}
                                  onChange={(e) =>
                                    setRefundAccountNumber(e.target.value.replace(/\D/g, ''))
                                  }
                                  placeholder="Nhập số tài khoản ngân hàng"
                                  required
                                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-all"
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#EC2029';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(208,2,27,0.1)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '';
                                    e.target.style.boxShadow = '';
                                  }}
                                />
                              </div>
                            </div>
                            {/* Account holder */}
                            <div>
                              <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                                Tên chủ tài khoản <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Icon
                                  name="UserIcon"
                                  size={15}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                                />
                                <input
                                  type="text"
                                  value={refundAccountHolder}
                                  onChange={(e) =>
                                    setRefundAccountHolder(e.target.value.toUpperCase())
                                  }
                                  placeholder="Nhập tên chủ tài khoản (in hoa)"
                                  required
                                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-all"
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#EC2029';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(208,2,27,0.1)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '';
                                    e.target.style.boxShadow = '';
                                  }}
                                />
                              </div>
                              <p className="text-xs text-stone-400 mt-1">
                                Tên phải khớp với tên đăng ký tài khoản ngân hàng
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Notice */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                          <Icon
                            name="InformationCircleIcon"
                            size={16}
                            className="text-amber-600 mt-0.5 flex-shrink-0"
                          />
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Hoàn tiền sẽ được xử lý trong <strong>3–5 ngày làm việc</strong>. Số
                            tiền hoàn lại phụ thuộc vào chính sách vé và thời điểm huỷ.
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={
                              !refundBookingId ||
                              !refundReason ||
                              !refundBankName ||
                              !refundAccountNumber ||
                              !refundAccountHolder ||
                              refundSubmitting
                            }
                            className="flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: '#EC2029' }}
                          >
                            {refundSubmitting ? (
                              <>
                                <svg
                                  className="animate-spin w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                                Đang gửi...
                              </>
                            ) : (
                              <>
                                <Icon name="PaperAirplaneIcon" size={15} />
                                Gửi yêu cầu
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRefundBookingId('');
                              setRefundReason('');
                              setRefundNote('');
                              setRefundBankName('');
                              setRefundAccountNumber('');
                              setRefundAccountHolder('');
                            }}
                            className="px-6 py-2.5 border border-stone-300 font-semibold rounded-xl text-sm transition-all hover:bg-stone-50 text-stone-600"
                          >
                            Xoá trắng
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Refund history */}
                <div
                  className="bg-white rounded-3xl border border-amber-100 overflow-hidden"
                  style={{ boxShadow: '0 8px 32px rgba(245, 158, 11, 0.1), 0 4px 12px rgba(251, 191, 36, 0.06)' }}
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)' }}
                  />
                  <div className="p-5 border-b border-amber-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-sm text-amber-900">
                          Lịch sử yêu cầu hoàn tiền
                        </h3>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {refundRequests.length} yêu cầu
                        </p>
                      </div>
                      <button
                        onClick={loadRefundRequests}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                        title="Tải lại"
                      >
                        <Icon name="ArrowPathIcon" size={13} />
                      </button>
                    </div>
                    {refundError && (
                      <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                        <Icon
                          name="ExclamationTriangleIcon"
                          size={14}
                          className="text-red-500 flex-shrink-0"
                        />
                        <p className="text-xs text-red-600 flex-1">{refundError}</p>
                        <button
                          onClick={loadRefundRequests}
                          className="text-xs font-semibold text-red-600 underline"
                        >
                          Thử lại
                        </button>
                      </div>
                    )}
                    {refundLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : refundRequests.length === 0 ? (
                      <div className="flex flex-col sm:flex-row items-center gap-6 py-8 px-6 max-w-md mx-auto animate-[fadeInUp_0.35s_ease-out]">
                        <div className="shrink-0 w-28 h-28">
                          <img
                            src="/assets/empty-refund-requests.svg"
                            alt="Chưa có yêu cầu hoàn tiền"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="font-black text-base mb-1.5" style={{ color: '#1A2948' }}>
                            Chưa có yêu cầu nào
                          </p>
                          <p className="text-xs text-stone-400 mb-4 leading-relaxed">
                            Các yêu cầu hoàn tiền bạn gửi sẽ xuất hiện tại đây. Bạn có thể theo dõi
                            trạng thái xử lý của từng yêu cầu.
                          </p>
                          <button
                            onClick={() => {
                              const el = document.querySelector('form');
                              el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90 active:scale-95"
                            style={{ background: '#EC2029' }}
                          >
                            <Icon name="PlusIcon" size={13} />
                            Gửi yêu cầu hoàn tiền
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-stone-50">
                        {refundRequests.map((req) => (
                          <div
                            key={req.id}
                            className="px-4 py-4 flex items-start justify-between gap-4"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${req.status === 'approved' ? 'bg-green-50' : req.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'}`}
                              >
                                <Icon
                                  name={
                                    req.status === 'approved'
                                      ? 'CheckCircleIcon'
                                      : req.status === 'rejected'
                                        ? 'XCircleIcon'
                                        : 'ClockIcon'
                                  }
                                  size={18}
                                  className={
                                    req.status === 'approved'
                                      ? 'text-green-500'
                                      : req.status === 'rejected'
                                        ? 'text-red-500'
                                        : 'text-amber-500'
                                  }
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="font-mono font-bold text-sm"
                                    style={{ color: '#1A2948' }}
                                  >
                                    {req.bookingId}
                                  </span>
                                </div>
                                <div className="text-xs text-stone-500 truncate">
                                  {req.reason}
                                  {req.note ? ` · ${req.note}` : ''}
                                </div>
                                <div className="text-xs text-stone-400 mt-0.5">{req.date}</div>
                                {req.adminNote && (
                                  <div
                                    className={`mt-1.5 text-xs px-2.5 py-1.5 rounded-lg ${req.status === 'approved' ? 'bg-green-50 text-green-700' : req.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
                                  >
                                    <span className="font-semibold">Admin: </span>
                                    {req.adminNote}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                            >
                              {req.status === 'approved'
                                ? 'Đã duyệt'
                                : req.status === 'rejected'
                                  ? 'Từ chối'
                                  : 'Đang xử lý'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Wallet */}
            {activeTab === 'wallet' && user && <WalletTab user={user} />}

            {/* Payment History */}
            {activeTab === 'payment-history' && <PaymentHistoryTab />}

            {/* Loyalty */}
            {activeTab === 'loyalty' && <LoyaltyTab />}

            {/* Security */}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </div>

      {/* Slide-in animation keyframe */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>

      <UserChat />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </div>
  );
}
