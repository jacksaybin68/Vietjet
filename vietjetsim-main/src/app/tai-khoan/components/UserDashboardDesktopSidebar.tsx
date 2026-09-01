'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface UserDashboardTab {
  id: string;
  label: string;
  icon: string;
}

interface UserDashboardDesktopSidebarProps {
  tabs: UserDashboardTab[];
  activeTab: string;
  sidebarCollapsed: boolean;
  notifUnreadCount: number;
  userFullName?: string;
  onToggleCollapse: () => void;
  onSelectTab: (tabId: string) => void;
}

export default function UserDashboardDesktopSidebar({
  tabs,
  activeTab,
  sidebarCollapsed,
  notifUnreadCount,
  userFullName,
  onToggleCollapse,
  onSelectTab,
}: UserDashboardDesktopSidebarProps) {
  return (
    <aside
      className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div
        className="bg-white border border-amber-100 rounded-3xl overflow-hidden sticky top-[140px]"
        style={{
          boxShadow: '0 8px 32px rgba(245, 158, 11, 0.12), 0 4px 12px rgba(251, 191, 36, 0.08)',
        }}
      >
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
                <span className="text-white/80 text-xs">{userFullName || 'Khách hàng'}</span>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
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

        <nav className="py-3 px-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              title={sidebarCollapsed ? tab.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-1 text-sm font-semibold transition-all text-left ${
                activeTab === tab.id ? 'text-white shadow-lg' : 'text-amber-800 hover:bg-amber-50'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              style={
                activeTab === tab.id
                  ? { background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }
                  : {}
              }
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

        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-t border-amber-100">
            <Link
              href="/dang-nhap"
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
              href="/dang-nhap"
              title="Đăng xuất"
              className="flex items-center justify-center w-full py-3 rounded-2xl text-amber-700 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <Icon name="ArrowRightOnRectangleIcon" size={20} />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
