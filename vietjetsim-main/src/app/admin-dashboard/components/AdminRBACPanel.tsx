'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  SYSTEM_ROLES,
  getRolePermissions,
  hasPermission,
  type Permission,
  type SystemRoleName,
} from '@/lib/rbac';

interface ToastAPI {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

interface AdminRoleRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role_name: string;
  custom_permissions: string | null;
  created_at: string;
}

interface AuditLogRow {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id?: string;
  details_json: string;
  status: 'success' | 'error' | 'denied';
  created_at: string;
}

type TabId = 'roles' | 'matrix' | 'audit' | 'config';

export default function AdminRBACPanel({ onToast }: { onToast?: ToastAPI }) {
  const [activeTab, setActiveTab] = useState<TabId>('matrix');
  const [loading, setLoading] = useState(true);
  const [adminRoles, setAdminRoles] = useState<AdminRoleRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [assignRoleName, setAssignRoleName] = useState<SystemRoleName>('admin_ops');
  const [isAssigning, setIsAssigning] = useState(false);

  // ─── Fetch data ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, logsRes] = await Promise.all([
        fetch('/api/admin/rbac?section=roles'),
        fetch('/api/admin/rbac?section=audit&limit=50'),
      ]);
      if (rolesRes.ok) {
        const d = await rolesRes.json();
        setAdminRoles(d.roles || []);
      }
      if (logsRes.ok) {
        const d = await logsRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (err) {
      console.error('RBAC fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Assign role handler ─────────────────────────────────────────────

  const handleAssignRole = async () => {
    if (!selectedUserEmail) return;
    setIsAssigning(true);

    try {
      // Find user by email first (simplified — in real app would have a lookup)
      const res = await fetch('/api/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_role',
          targetUserId: selectedUserEmail, // In production: resolve email → userId first
          roleName: assignRoleName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onToast?.success('Gán role thành công', data.message);
        setShowAssignModal(false);
        setSelectedUserEmail('');
        fetchData();
      } else {
        onToast?.error('Lỗi', data.message || 'Không thể gán role');
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // ─── Remove role handler ─────────────────────────────────────────────

  const handleRemoveRole = async (userId: string, email: string) => {
    if (!confirm(`Xác nhận xóa quyền admin của "${email}"?`)) return;

    try {
      const res = await fetch('/api/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_role', targetUserId: userId }),
      });
      const data = await res.json();
      if (data.success) {
        onToast?.success('Đã xóa role', data.message);
        fetchData();
      } else {
        onToast?.error('Lỗi', data.message);
      }
    } catch (err: any) {
      onToast?.error('Lỗi', err.message);
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'matrix', label: 'Ma trận phân quyền', icon: 'Squares2X2Icon' },
    { id: 'roles', label: 'Quản lý Admin', icon: 'ShieldCheckIcon' },
    { id: 'audit', label: 'Audit Log', icon: 'DocumentTextIcon' },
    { id: 'config', label: 'Cấu hình hệ thống', icon: 'Cog6ToothIcon' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2
            className="text-xl font-bold flex items-center gap-2 text-navy"
            style={{ fontWeight: 800 }}
          >
            <Icon name="ShieldCheckIcon" size={22} className="text-primary" />
            Hệ thống Phân quyền RBAC
          </h2>
          <p
            className="text-sm mt-1 font-koho"
          >
            Quản lý chi tiết quyền hạn cho từng admin — Role-Based Access Control
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-md hover:shadow-lg bg-primary-solid"
        >
          <Icon name="UserPlusIcon" size={16} /> Gán quyền Admin
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-white shadow text-red-700 font-bold'
                : 'text-gray-500 hover:text-gray-700'
            } font-koho`}
          >
            <Icon name={t.icon as any} size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ TAB: MATRIX ══════ */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* System roles summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {Object.values(SYSTEM_ROLES).map((def) => (
              <div
                key={def.name}
                className={`rounded-xl p-4 border ${def.bgColor.replace('bg-gradient-to-r', 'bg')} border-opacity-20`}
                style={{
                  borderColor: def.color.includes('red')
                    ? '#FCA5A5'
                    : def.color.includes('blue')
                      ? '#93C5FD'
                      : def.color.includes('emerald')
                        ? '#86EFAC'
                        : def.color.includes('purple')
                          ? '#D8B4FE'
                          : '#FDE68A',
                }}
              >
                <div
                  className={`text-[11px] font-black uppercase tracking-wider mb-1`}
                  style={{ color: def.color }}
                >
                  {def.label}
                </div>
                <div className="text-xs mb-2 leading-relaxed" style={{ color: '#4B5563' }}>
                  {def.description}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: def.color.includes('red')
                        ? '#FEE2E2'
                        : def.color.includes('blue')
                          ? '#EFF6FF'
                          : def.color.includes('emerald')
                            ? '#D1FAE5'
                            : def.color.includes('purple')
                              ? '#FAF5FF'
                              : '#FFFBEB',
                      color: def.color,
                    }}
                  >
                    Level {def.level}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {def.permissions.size} quyền
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Full permission matrix table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #1A2948 0%, #0F1E3A 100%)' }}
            >
              <span
                className="text-white font-bold text-sm font-koho"
              >
                Ma trận Phân quyền Chi tiết
              </span>
              <span className="text-white/60 text-xs">
                {PERMISSION_CATEGORIES.length} nhóm &middot; {Object.keys(PERMISSION_LABELS).length}{' '}
                quyền
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                      Nhóm / Quyền
                    </th>
                    {Object.keys(SYSTEM_ROLES).map((roleKey) => {
                      const r = SYSTEM_ROLES[roleKey as SystemRoleName];
                      return (
                        <th
                          key={roleKey}
                          className="px-2 py-2 text-center font-semibold min-w-[80px]"
                          style={{ color: r.color.replace('text-', '') }}
                          dangerouslySetInnerHTML={{
                            __html: `<span class="${r.bgColor.split(' ')[0]} text-white px-2 py-0.5 rounded text-[10px] font-bold">${r.label}</span>`,
                          }}
                        />
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_CATEGORIES.map((cat) => (
                    <React.Fragment key={cat.key}>
                      {/* Category header row */}
                      <tr className="border-t border-gray-100 bg-gray-50/50">
                        <td
                          colSpan={Object.keys(SYSTEM_ROLES).length + 1}
                          className="px-3 py-1.5 font-bold text-gray-700 text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-koho"
                        >
                          <Icon name={cat.icon as any} size={12} /> {cat.label}
                        </td>
                      </tr>
                      {/* Permission rows */}
                      {cat.permissions.map((perm) => (
                        <tr
                          key={perm}
                          className="border-b border-gray-50 hover:bg-red-50/30 transition-colors"
                        >
                          <td className="px-3 py-1.5 font-medium text-gray-600" title={perm}>
                            {PERMISSION_LABELS[perm]}
                          </td>
                          {(
                            Object.entries(SYSTEM_ROLES) as [
                              SystemRoleName,
                              (typeof SYSTEM_ROLES)[SystemRoleName],
                            ][]
                          ).map(([rk, rd]) => (
                            <td key={rk} className="px-2 py-1.5 text-center">
                              {rd.permissions.has(perm) ? (
                                <span
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                                  style={{ background: '#DCFCE7', color: '#166534' }}
                                >
                                  &#10003;
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-300">
                                  &#x2715;
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TAB: ROLES MANAGEMENT ══════ */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div
            className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #1A2948 0%, #0F1E3A 100%)' }}
          >
            <span
              className="text-white font-bold text-sm font-koho"
            >
              Danh sách Admin & Phân quyền
            </span>
            <span className="text-white/60 text-xs">{adminRoles.length} admin</span>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : adminRoles.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Icon name="UsersIcon" size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Chưa có admin nào được gán role chi tiết</p>
              <button
                onClick={() => setShowAssignModal(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-lg bg-primary-solid"
              >
                <Icon name="PlusIcon" size={14} /> Gán quyền đầu tiên
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {adminRoles.map((ar) => {
                const roleDef = SYSTEM_ROLES[ar.role_name as SystemRoleName];
                const perms = ar.custom_permissions
                  ? (JSON.parse(ar.custom_permissions) as Permission[])
                  : null;
                const permList = perms || (roleDef ? Array.from(roleDef.permissions) : []);
                return (
                  <div key={ar.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{
                            background: (roleDef?.bgColor || '#6B7280').split(' ')[1] || '#6B7280',
                          }}
                        >
                          {(ar.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-navy">
                              {ar.full_name || 'Unknown'}
                            </div>
                          <div className="text-xs text-gray-400">{ar.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Role badge */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${roleDef?.bgColor || 'bg-gray-200'} text-white`}
                        >
                          {roleDef?.label || ar.role_name}
                        </span>

                        {/* Permission count */}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                          {permList.length} quyền
                        </span>

                        {/* Actions */}
                        <button
                          onClick={() => handleRemoveRole(ar.user_id, ar.email)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Xóa role"
                        >
                          <Icon name="TrashIcon" size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Mini permission list */}
                    <div className="mt-2 ml-14 flex flex-wrap gap-1">
                      {permList.slice(0, 8).map((p) => (
                        <span
                          key={p}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono truncate max-w-[120px]"
                        >
                          {p}
                        </span>
                      ))}
                      {permList.length > 8 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                          +{permList.length - 8} nữa
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB: AUDIT LOG ══════ */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div
            className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #1A2948 0%, #0F1E3A 100%)' }}
          >
            <span
              className="text-white font-bold text-sm font-koho"
            >
              Audit Log — Lịch sử thao tác
            </span>
            <button
              onClick={fetchData}
              className="text-white/70 hover:text-white text-xs flex items-center gap-1 transition-colors"
            >
              <Icon name="ArrowPathIcon" size={12} /> Làm mới
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Icon name="DocumentTextIcon" size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Chưa có bản ghi audit</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        log.status === 'success'
                          ? 'bg-emerald-500'
                          : log.status === 'denied'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-purple-700">
                          {log.action}
                        </code>
                        <span className="text-[10px] text-gray-400">→</span>
                        <span className="text-[10px] font-semibold text-gray-600">
                          {log.target_type}
                        </span>
                        {log.target_id && (
                          <span className="text-[10px] font-mono text-gray-400">
                            #{log.target_id.slice(0, 8)}
                          </span>
                        )}
                        <span
                          className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            log.status === 'success'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.status === 'denied'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 mt-1 text-[10px] text-gray-400"
                      >
                        <span className="font-semibold">{log.admin_email}</span>
                        <span>{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB: CONFIG ══════ */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3
            className="font-bold text-base mb-4 font-koho"
          >
            Cấu hình hệ thống
          </h3>

          {/* Quick config cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                key: 'site_name',
                label: 'Tên website',
                value: 'VietjetSim',
                desc: 'Hiển thị trên header/tab',
                icon: 'GlobeAltIcon',
              },
              {
                key: 'maintenance_mode',
                value: 'false',
                desc: 'Bật chế độ bảo trì',
                icon: 'WrenchIcon',
              },
              {
                key: 'max_booking_per_user',
                value: '5',
                desc: 'Giới hạn đặt vé/user',
                icon: 'TicketIcon',
              },
              {
                key: 'auto_cancel_hours',
                value: '24',
                desc: 'Tự động huỷ sau X giờ',
                icon: 'ClockIcon',
              },
              {
                key: 'currency_symbol',
                value: '₫',
                desc: 'Ký hiệu tiền tệ',
                icon: 'CurrencyDollarIcon',
              },
              {
                key: 'default_language',
                value: 'vi',
                desc: 'Ngôn ngữ mặc định',
                icon: 'LanguageIcon',
              },
            ].map((cfg) => (
              <div
                key={cfg.key}
                className="rounded-xl border border-gray-200 p-4 hover:border-red-200 hover:shadow-sm transition-all group cursor-pointer"
                onClick={() =>
                  onToast?.info(
                    `Config: ${cfg.key}`,
                    'Tính năng chỉnh sửa config đang được phát triển'
                  )
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                    <Icon name={cfg.icon as any} size={15} className="text-primary" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">{cfg.key}</span>
                </div>
                <div className="font-bold text-sm text-navy">
                  {cfg.label}
                </div>
                <div
                  className="text-lg font-black mt-1 font-koho"
                >
                  {cfg.value}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">{cfg.desc}</div>
              </div>
            ))}
          </div>

          <div
            className="mt-4 p-3 rounded-lg flex items-start gap-2"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            <Icon
              name="InformationCircleIcon"
              size={16}
              className="text-yellow-600 mt-0.5 flex-shrink-0"
            />
            <p className="text-xs" style={{ color: '#92400E' }}>
              Chức năng chỉnh sửa cấu hình trực tiếp sẽ khả dụng sau khi tạo bảng{' '}
              <code className="bg-yellow-100 px-1 rounded">system_config</code> trong database. Hiện
              tại các giá trị được quản lý qua API{' '}
              <code className="bg-yellow-100 px-1 rounded">
                POST /api/admin/rbac?action=set_config
              </code>
              .
            </p>
          </div>
        </div>
      )}

      {/* ═══════ ASSIGN ROLE MODAL ══════ */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAssignModal(false)}
          />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation: 'fadeInUp 0.25s ease-out' }}
          >
            <div
              className="px-5 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #EC2029 0%, #B91C1C 100%)' }}
            >
              <h3
                className="text-white font-bold font-heading-sm"
              >
                Gán quyền cho Admin
              </h3>
              <p className="text-white/70 text-xs mt-0.5">Chọn role và nhập thông tin người dùng</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Email / User ID
                </label>
                <input
                  type="text"
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  placeholder="user@example.com hoặc user ID"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Chọn Role
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    Object.entries(SYSTEM_ROLES) as [
                      SystemRoleName,
                      (typeof SYSTEM_ROLES)[SystemRoleName],
                    ][]
                  ).map(([key, def]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAssignRoleName(key)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                        assignRoleName === key
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${def.bgColor}`}
                        >
                          L{def.level}
                        </div>
                        <div>
                          <div
                            className="font-bold text-sm"
                            style={{ color: assignRoleName === key ? '#EC2029' : '#1A2948' }}
                          >
                            {def.label}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {def.permissions.size} permissions
                          </div>
                        </div>
                      </div>
                      {assignRoleName === key && (
                        <Icon name="CheckCircleIcon" size={18} className="text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected role preview */}
              {(() => {
                const selected = SYSTEM_ROLES[assignRoleName];
                return (
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="EyeIcon" size={13} className="text-gray-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Preview quyền:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(selected!.permissions)
                        .slice(0, 12)
                        .map((p) => (
                          <span
                            key={p}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600 font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      {selected!.permissions.size > 12 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">
                          +{selected!.permissions.size - 12} nữa
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={isAssigning}
                  className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 font-koho"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={!selectedUserEmail || isAssigning}
                  className="flex-1 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{
                    background: isAssigning ? '#9CA3AF' : '#EC2029'
                  }}
                >
                  {isAssigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang gán...
                    </>
                  ) : (
                    <>
                      <Icon name="ShieldCheckIcon" size={14} /> Xác nhận gán
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
