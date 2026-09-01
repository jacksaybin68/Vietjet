'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface UserDashboardTab {
  id: string;
  label: string;
  icon: string;
}

interface UserDashboardMobileNavProps {
  tabs: UserDashboardTab[];
  activeTab: string;
  drawerOpen: boolean;
  sidebarCollapsed: boolean;
  notifUnreadCount: number;
  userFullName?: string;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onSelectTab: (tabId: string) => void;
}

export default function UserDashboardMobileNav({
  tabs,
  activeTab,
  drawerOpen,
  sidebarCollapsed,
  notifUnreadCount,
  userFullName,
  onOpenDrawer,
  onCloseDrawer,
  onSelectTab,
}: UserDashboardMobileNavProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4 lg:hidden">
        <button
          onClick={onOpenDrawer}
          className="flex items-center gap-2 bg-white border border-amber-200 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm"
          style={{ color: '#d97706' }}
        >
          <Icon name="Bars3Icon" size={18} />
          <span>{tabs.find((t) => t.id === activeTab)?.label}</span>
          <Icon name="ChevronDownIcon" size={14} className="text-amber-400 ml-1" />
        </button>
        <button
          onClick={() => onSelectTab('notifications')}
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

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseDrawer} />
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
                  <span className="text-white font-bold text-base block">Xin chào!</span>
                  <span className="text-white/80 text-xs">{userFullName || 'Khách hàng'}</span>
                </div>
              </div>
              <button
                onClick={onCloseDrawer}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Icon name="XMarkIcon" size={18} className="text-white" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-1 text-sm font-semibold transition-all text-left ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`}
                  style={{
                    background:
                      activeTab === tab.id
                        ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                        : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#92400e',
                    fontWeight: activeTab === tab.id ? 700 : 600,
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
                href="/dang-nhap"
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all text-amber-700 hover:bg-red-50 hover:text-red-600"
              >
                <Icon name="ArrowRightOnRectangleIcon" size={20} className="text-amber-500" />
                Đăng xuất
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
