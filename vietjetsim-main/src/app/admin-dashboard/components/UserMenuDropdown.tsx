'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

interface UserMenuDropdownProps {
  onNavigate?: (tab: string) => void;
}

export default function UserMenuDropdown({ onNavigate }: UserMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, roleLabel, signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  const handleMenuClick = (action: string) => {
    setIsOpen(false);
    if (action === 'logout') {
      handleLogout();
    } else if (action === 'profile') {
      onNavigate?.('rbac');
    } else if (action === 'audit') {
      onNavigate?.('audit_logs');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const menuItems = [
    {
      id: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: 'UserIcon' as const,
      href: '/user-dashboard?tab=profile',
      description: 'Quản lý thông tin tài khoản',
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      icon: 'CogIcon' as const,
      href: null,
      description: 'Cấu hình hệ thống',
    },
    {
      id: 'audit',
      label: 'Nhật ký hoạt động',
      icon: 'ClipboardDocumentListIcon' as const,
      href: null,
      description: 'Xem lịch sử thao tác',
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all hover:bg-slate-700/50"
        style={{ background: isOpen ? 'rgba(99, 102, 241, 0.2)' : 'transparent' }}
        title="Menu người dùng"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            getInitials(profile?.fullName || user?.email || 'Admin')
          )}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold text-white leading-tight">
            {profile?.fullName || user?.email?.split('@')[0] || 'Admin'}
          </div>
          <div className="text-[10px] text-indigo-400 leading-tight">{roleLabel}</div>
        </div>
        <Icon
          name="ChevronUpDownIcon"
          size={14}
          className={`text-slate-400 transition-transform hidden sm:block ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            animation: 'slideDown 0.2s ease-out',
          }}
        >
          <style jsx>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          {/* User Info Header */}
          <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  getInitials(profile?.fullName || user?.email || 'Admin')
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {profile?.fullName || 'Admin'}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                    }}
                  >
                    {roleLabel}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] text-emerald-400">Trực tuyến</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                >
                  <Icon name={item.icon} size={16} className="text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-[11px] text-slate-500">{item.description}</p>
                </div>
                <Icon name="ChevronRightIcon" size={14} className="text-slate-600" />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-4 py-2 border-t" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
            <Link
              href="/homepage"
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors rounded-lg"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(148, 163, 184, 0.1)' }}
              >
                <Icon name="ArrowLeftOnRectangleIcon" size={16} className="text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300">Về trang chủ</p>
                <p className="text-[11px] text-slate-500"> Quay lại website</p>
              </div>
            </Link>
          </div>

          {/* Logout Button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Icon name="ArrowRightOnRectangleIcon" size={16} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#f87171' }}>
                  {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </p>
                <p className="text-[11px] text-red-400/60">Đăng xuất khỏi tài khoản</p>
              </div>
              {!isLoggingOut && (
                <Icon name="ArrowRightIcon" size={14} className="text-red-400/60" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
