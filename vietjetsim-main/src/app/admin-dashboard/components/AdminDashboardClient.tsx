'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import OverviewTab from './OverviewTab';
import FlightsTab from './FlightsTab';
import UsersTab from './UsersTab';
import RevenueTab from './RevenueTab';
import BookingsTab from './BookingsTab';
import ChatTab from './ChatTab';
import RefundRequestsTab from './RefundRequestsTab';
import AnalyticsTab from './AnalyticsTab';
import SstkTab from './SstkTab';
import DiscountsTab from './DiscountsTab';
import AdminRBACPanel from './AdminRBACPanel';
import NotificationDropdown from './NotificationDropdown';
import UserMenuDropdown from './UserMenuDropdown';
import GlobalSearch from './GlobalSearch';
import AirportsTab from './AirportsTab';
import AnnouncementsTab from './AnnouncementsTab';
import SystemSettingsTab from './SystemSettingsTab';
import BankAccountsTab from './BankAccountsTab';
import AuditLogsTab from './AuditLogsTab';
import TransactionsTab from './TransactionsTab';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';

export type AdminTab =
  | 'overview'
  | 'flights'
  | 'users'
  | 'revenue'
  | 'bookings'
  | 'chat'
  | 'refunds'
  | 'analytics'
  | 'sstk'
  | 'rbac'
  | 'airports'
  | 'announcements'
  | 'settings'
  | 'audit_logs'
  | 'transactions'
  | 'banks'
  | 'discounts';

const NAV_ITEMS: {
  id: AdminTab;
  label: string;
  icon:
    | 'HomeIcon'
    | 'PaperAirplaneIcon'
    | 'UsersIcon'
    | 'ChartBarIcon'
    | 'TicketIcon'
    | 'ChatBubbleLeftRightIcon'
    | 'BanknotesIcon'
    | 'PresentationChartBarIcon'
    | 'WrenchScrewdriverIcon'
    | 'ShieldCheckIcon'
    | 'BuildingOfficeIcon'
    | 'MegaphoneIcon'
    | 'CogIcon'
    | 'ClipboardDocumentListIcon'
    | 'CurrencyDollarIcon';
  category?: 'management' | 'support' | 'system';
}[] = [
  { id: 'overview', label: 'Tổng quan', icon: 'HomeIcon', category: 'management' },
  { id: 'flights', label: 'Chuyến bay', icon: 'PaperAirplaneIcon', category: 'management' },
  { id: 'users', label: 'Người dùng', icon: 'UsersIcon', category: 'management' },
  { id: 'bookings', label: 'Đặt vé', icon: 'TicketIcon', category: 'management' },
  { id: 'airports', label: 'Sân bay', icon: 'BuildingOfficeIcon', category: 'management' },
  { id: 'discounts', label: 'Mã giảm giá', icon: 'TicketIcon', category: 'management' },
  { id: 'transactions', label: 'Giao dịch', icon: 'CurrencyDollarIcon', category: 'management' },
  { id: 'banks', label: 'Ngân hàng', icon: 'BanknotesIcon', category: 'management' },
  { id: 'revenue', label: 'Doanh thu', icon: 'ChartBarIcon', category: 'management' },
  { id: 'refunds', label: 'Hoàn tiền', icon: 'BanknotesIcon', category: 'management' },
  { id: 'chat', label: 'Chat hỗ trợ', icon: 'ChatBubbleLeftRightIcon', category: 'support' },
  { id: 'announcements', label: 'Thông báo', icon: 'MegaphoneIcon', category: 'support' },
  { id: 'analytics', label: 'Phân tích dữ liệu', icon: 'PresentationChartBarIcon', category: 'system' },
  { id: 'sstk', label: 'SSTK', icon: 'WrenchScrewdriverIcon', category: 'system' },
  { id: 'rbac', label: 'RBAC', icon: 'ShieldCheckIcon', category: 'system' },
  { id: 'settings', label: 'Cài đặt', icon: 'CogIcon', category: 'system' },
  { id: 'audit_logs', label: 'Nhật ký', icon: 'ClipboardDocumentListIcon', category: 'system' },
];

const NAV_CATEGORIES = [
  { id: 'management', label: 'Quản lý' },
  { id: 'support', label: 'Hỗ trợ' },
  { id: 'system', label: 'Hệ thống' },
];

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Tổng quan',
  flights: 'Chuyến bay',
  users: 'Người dùng',
  revenue: 'Doanh thu',
  bookings: 'Đặt vé',
  refunds: 'Hoàn tiền',
  chat: 'Chat hỗ trợ',
  analytics: 'Phân tích dữ liệu',
  sstk: 'SSTK',
  rbac: 'Phân quyền RBAC',
  airports: 'Sân bay',
  announcements: 'Thông báo',
  settings: 'Cài đặt hệ thống',
  audit_logs: 'Nhật ký hoạt động',
  transactions: 'Lịch sử giao dịch',
  banks: 'Quản lý tài khoản ngân hàng',
  discounts: 'Quản lý mã giảm giá',
};

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const toast = useToast();
  const { user, profile, roleLabel } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleTabSelect = (id: AdminTab) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  const handleSearchSelect = (result: { type: string; id: string }) => {
    switch (result.type) {
      case 'flight':
        setActiveTab('flights');
        break;
      case 'user':
        setActiveTab('users');
        break;
      case 'booking':
        setActiveTab('bookings');
        break;
    }
  };

  const handleUserMenuNavigate = (tab: string) => {
    if (tab === 'audit_logs') {
      setActiveTab('audit_logs');
    } else if (tab === 'settings') {
      setActiveTab('settings');
    }
  };

  const breadcrumbItems = [
    {
      label: 'Admin',
      href: '/admin-dashboard',
      icon: (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    { label: TAB_LABELS[activeTab] },
  ];

  const getInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const renderNavItems = (items: typeof NAV_ITEMS, isMobile = false) => {
    const groupedItems: Record<string, typeof NAV_ITEMS> = {};
    
    items.forEach(item => {
      const category = item.category || 'management';
      if (!groupedItems[category]) {
        groupedItems[category] = [];
      }
      groupedItems[category].push(item);
    });

    if (isMobile) {
      return items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleTabSelect(item.id)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-semibold transition-all text-left"
          style={{
            background: activeTab === item.id
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'transparent',
            color: activeTab === item.id ? 'white' : '#94a3b8',
          }}
        >
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </button>
      ));
    }

    return Object.entries(groupedItems).map(([category, categoryItems]) => (
      <div key={category} className="space-y-1">
        {!sidebarCollapsed && (
          <div className="px-4 pt-4 pb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60">
              {NAV_CATEGORIES.find(c => c.id === category)?.label || category}
            </span>
          </div>
        )}
        {categoryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative group overflow-hidden ${
              activeTab === item.id 
                ? 'text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            } ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{
              background: activeTab === item.id
                ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                : 'transparent',
            }}
            title={sidebarCollapsed ? item.label : undefined}
          >
            {activeTab === item.id && (
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
            <Icon 
              name={item.icon} 
              size={18} 
              className={`flex-shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} 
            />
            {!sidebarCollapsed && <span className="relative z-10">{item.label}</span>}
            {sidebarCollapsed && (
              <span
                className="absolute left-full ml-3 px-3 py-2 text-white text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50"
                style={{ background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>
    ));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 font-body">
      {/* ── Desktop Sidebar - Dark Professional Theme ── */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 z-40 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
        }}
      >
        {/* Logo */}
        <div
          className={`h-16 flex items-center border-b border-slate-700/50 px-4 gap-3 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <span
                className="font-bold text-white text-sm tracking-tight"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Vietjet Air
              </span>
              <div className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
                Bảng Quản Trị
              </div>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!sidebarCollapsed && (
          <div
            className="mx-3 mt-4 mb-2 rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="drop-shadow-sm">{getInitials(profile?.fullName || user?.email || 'Admin')}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate max-w-[140px] tracking-tight">
                  {profile?.fullName || user?.email?.split('@')[0] || 'Admin'}
                </div>
                <div className="text-[10px] text-indigo-400/90 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
                  {roleLabel}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {renderNavItems(NAV_ITEMS)}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-slate-700/50 space-y-1">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              sidebarCollapsed ? 'justify-center' : ''
            } text-slate-400 hover:text-white hover:bg-slate-800/50`}
            title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            <Icon name={sidebarCollapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'} size={16} />
            {!sidebarCollapsed && <span>Thu gọn</span>}
          </button>
          <Link
            href="/homepage"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              sidebarCollapsed ? 'justify-center' : ''
            } text-slate-400 hover:text-white hover:bg-slate-800/50`}
            title={sidebarCollapsed ? 'Về trang chủ' : undefined}
          >
            <Icon name="ArrowLeftOnRectangleIcon" size={16} />
            {!sidebarCollapsed && <span>Về trang chủ</span>}
          </Link>
        </div>
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              animation: 'slideInLeft 0.25s ease-out'
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Vietjet Air</div>
                  <div className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">Bảng Quản Trị</div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <Icon name="XMarkIcon" size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Role badge mobile */}
            <div className="mx-4 mt-4 mb-2 rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(profile?.fullName || user?.email || 'Admin')
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {profile?.fullName || user?.email?.split('@')[0] || 'Admin'}
                  </div>
                  <div className="text-[11px] text-indigo-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {roleLabel}
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {renderNavItems(NAV_ITEMS, true)}
            </nav>

            <div className="px-3 py-4 border-t border-slate-700/50">
              <Link
                href="/homepage"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-slate-400 hover:text-white hover:bg-slate-800/50"
              >
                <Icon name="ArrowLeftOnRectangleIcon" size={18} />
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="h-16 flex items-center justify-between px-4 lg:px-6 flex-shrink-0"
          style={{
            background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: 'rgba(148, 163, 184, 0.1)' }}
            >
              <Icon name="Bars3Icon" size={20} className="text-slate-400" />
            </button>
            <div className="flex flex-col justify-center gap-1">
              <BreadcrumbNav items={breadcrumbItems} />
              <p className="text-xs hidden sm:block text-slate-500">
                {formattedDate} - {formattedTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/10 group active:scale-95"
              style={{ background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(255,255,255,0.05)' }}
              title="Tìm kiếm (Ctrl+K)"
            >
              <Icon name="MagnifyingGlassIcon" size={18} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>

            {/* Notification Dropdown */}
            <NotificationDropdown onNotificationCountChange={setUnreadCount} />

            {/* User Menu Dropdown */}
            <UserMenuDropdown onNavigate={handleUserMenuNavigate} />
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
        >
          <div className="max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <ErrorBoundary inline variant="api">
              <OverviewTab onNavigate={setActiveTab} />
            </ErrorBoundary>
          )}
          {activeTab === 'flights' && (
            <ErrorBoundary inline variant="api" retryLabel="Tải lại chuyến bay">
              <FlightsTab onToast={toast} />
            </ErrorBoundary>
          )}
          {activeTab === 'users' && (
            <ErrorBoundary inline variant="api" retryLabel="Tải lại người dùng">
              <UsersTab onToast={toast} />
            </ErrorBoundary>
          )}
          {activeTab === 'revenue' && (
            <ErrorBoundary inline variant="api">
              <RevenueTab />
            </ErrorBoundary>
          )}
          {activeTab === 'bookings' && (
            <ErrorBoundary inline variant="api" retryLabel="Tải lại đặt vé">
              <BookingsTab />
            </ErrorBoundary>
          )}
          {activeTab === 'refunds' && (
            <ErrorBoundary inline variant="api" retryLabel="Tải lại hoàn tiền">
              <RefundRequestsTab onToast={toast} />
            </ErrorBoundary>
          )}

          {activeTab === 'chat' && (
            <ErrorBoundary inline variant="network">
              <ChatTab />
            </ErrorBoundary>
          )}

          {activeTab === 'analytics' && (
            <ErrorBoundary inline variant="api">
              <AnalyticsTab />
            </ErrorBoundary>
          )}

          {activeTab === 'sstk' && (
            <ErrorBoundary inline variant="api" retryLabel="Tải lại SSTK">
              <SstkTab onToast={toast} />
            </ErrorBoundary>
          )}

          {activeTab === 'rbac' && (
            <ErrorBoundary inline variant="api" retryLabel="Tải lại RBAC">
              <AdminRBACPanel onToast={toast} />
            </ErrorBoundary>
          )}

          {/* Integrated Management Tabs */}
          {activeTab === 'airports' && (
            <ErrorBoundary inline variant="api">
              <AirportsTab onToast={toast} />
            </ErrorBoundary>
          )}
          {activeTab === 'announcements' && (
            <ErrorBoundary inline variant="api">
              <AnnouncementsTab onToast={toast} />
            </ErrorBoundary>
          )}
          {activeTab === 'settings' && (
            <ErrorBoundary inline variant="api">
              <SystemSettingsTab onToast={toast} />
            </ErrorBoundary>
          )}
          {activeTab === 'audit_logs' && (
            <ErrorBoundary inline variant="api">
              <AuditLogsTab onToast={toast} />
            </ErrorBoundary>
          )}

          {activeTab === 'transactions' && (
            <ErrorBoundary inline variant="api">
              <TransactionsTab onToast={toast} />
            </ErrorBoundary>
          )}

          {activeTab === 'banks' && (
            <ErrorBoundary inline variant="api">
              <BankAccountsTab onToast={toast} />
            </ErrorBoundary>
          )}

          {activeTab === 'discounts' && (
            <ErrorBoundary inline variant="api">
              <DiscountsTab onToast={toast} />
            </ErrorBoundary>
          )}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectResult={handleSearchSelect}
      />

      {/* Keyboard shortcut for search */}
      <KeyboardShortcut handler={() => setSearchOpen(true)} keyCode="k" ctrl />

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
    </div>
  );
}

// Keyboard shortcut component
function KeyboardShortcut({
  handler,
  keyCode,
  ctrl,
}: {
  handler: () => void;
  keyCode: string;
  ctrl?: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (ctrl && e.ctrlKey && e.key.toLowerCase() === keyCode.toLowerCase()) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handler, keyCode, ctrl]);

  return null;
}
