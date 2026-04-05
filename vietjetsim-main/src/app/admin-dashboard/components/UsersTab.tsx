'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination from '@/components/ui/Pagination';
import { useAuth, isAdminRole } from '@/contexts/AuthContext';

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
  warning: (title: string, message?: string, options?: object) => void;
  info: (title: string, message?: string, options?: object) => void;
}

type UserRole =
  | 'user'
  | 'admin'
  | 'super_admin'
  | 'admin_ops'
  | 'admin_finance'
  | 'admin_support'
  | 'admin_content';
type UserStatus = 'active' | 'locked';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  bookings: number;
  spent: number;
  joinDate: string;
  notes?: string;
  lastLogin?: string;
  address?: string;
}

const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'Nguyễn Văn An',
    email: 'user@vietjetsim.vn',
    phone: '0901 234 567',
    role: 'user',
    status: 'active',
    bookings: 5,
    spent: 4820000,
    joinDate: '2026-01-10',
    notes: 'Khách hàng thân thiết, thường xuyên đặt vé đi Đà Nẵng.',
    lastLogin: '2026-04-01 14:30',
    address: 'Quận 1, TP. Hồ Chí Minh'
  },
  {
    id: '2',
    name: 'Trần Thị Bích',
    email: 'bich.tran@gmail.com',
    phone: '0912 345 678',
    role: 'user',
    status: 'active',
    bookings: 3,
    spent: 2150000,
    joinDate: '2026-01-15',
    lastLogin: '2026-03-28 09:15',
  },
  {
    id: '3',
    name: 'Lê Minh Tuấn',
    email: 'tuan.le@outlook.com',
    phone: '0923 456 789',
    role: 'user',
    status: 'active',
    bookings: 8,
    spent: 7340000,
    joinDate: '2026-01-20',
    notes: 'Cần hỗ trợ về hóa đơn đỏ.',
    lastLogin: '2026-04-03 18:45',
  },
  {
    id: '4',
    name: 'Phạm Thu Hà',
    email: 'ha.pham@yahoo.com',
    phone: '0934 567 890',
    role: 'user',
    status: 'locked',
    bookings: 2,
    spent: 980000,
    joinDate: '2026-01-25',
    notes: 'Tài khoản tạm khóa do nghi ngờ gian lận thanh toán.',
  },
  {
    id: '5',
    name: 'Hoàng Văn Dũng',
    email: 'dung.hoang@gmail.com',
    phone: '0945 678 901',
    role: 'user',
    status: 'active',
    bookings: 12,
    spent: 11200000,
    joinDate: '2026-02-01',
    lastLogin: '2026-04-05 10:00',
  },
  {
    id: '7',
    name: 'Admin VietjetSim',
    email: 'admin@vietjetsim.vn',
    phone: '0900 000 000',
    role: 'admin',
    status: 'active',
    bookings: 0,
    spent: 0,
    joinDate: '2026-01-01',
  },
];

const STATUS_TABS: { value: 'all' | UserStatus; label: string; activeColor: string }[] = [
  { value: 'all', label: 'Tất cả', activeColor: 'text-stone-700 bg-stone-100' },
  { value: 'active', label: 'Hoạt động', activeColor: 'text-green-700 bg-green-100' },
  { value: 'locked', label: 'Đã khoá', activeColor: 'text-red-700 bg-red-100' },
];

const ROLE_TABS: { value: 'all' | UserRole; label: string; activeColor: string }[] = [
  { value: 'all', label: 'Tất cả', activeColor: 'text-stone-700 bg-stone-100' },
  { value: 'user', label: 'User', activeColor: 'text-blue-700 bg-blue-100' },
  { value: 'admin', label: 'Admin', activeColor: 'text-primary bg-primary-100' },
];

export default function UsersTab({ onToast }: { onToast?: ToastAPI }) {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  const [joinDateFrom, setJoinDateFrom] = useState('');
  const [joinDateTo, setJoinDateTo] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [sortKey, setSortKey] = useState<
    'name' | 'joinDate' | 'bookings' | 'spent' | 'status' | null
  >(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switchingRoleId, setSwitchingRoleId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch('/api/admin/users?limit=100');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        const mapped = data.users.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.name || 'Unknown',
          email: u.email || '',
          phone: u.phone || '0900 000 000',
          role: u.role || 'user',
          status: u.status || 'active',
          bookings: u.bookings_count || 0,
          spent: Number(u.total_spent) || 0,
          joinDate: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'N/A',
          notes: u.notes,
          lastLogin: u.last_login ? new Date(u.last_login).toLocaleString('vi-VN') : undefined,
          address: u.address
        }));
        setUsers(mapped.length > 0 ? mapped : INITIAL_USERS);
      }
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const retryLoad = () => fetchUsers();

  const activeFilterCount = [
    filterRole !== 'all',
    filterStatus !== 'all',
    !!joinDateFrom,
    !!joinDateTo,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
    setJoinDateFrom('');
    setJoinDateTo('');
    setCurrentPage(1);
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    const matchDateFrom = !joinDateFrom || u.joinDate >= joinDateFrom;
    const matchDateTo = !joinDateTo || u.joinDate <= joinDateTo;
    return matchSearch && matchRole && matchStatus && matchDateFrom && matchDateTo;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (sortKey === 'name') {
          aVal = a.name;
          bVal = b.name;
        } else if (sortKey === 'joinDate') {
          aVal = a.joinDate;
          bVal = b.joinDate;
        } else if (sortKey === 'bookings') {
          aVal = a.bookings;
          bVal = b.bookings;
        } else if (sortKey === 'spent') {
          aVal = a.spent;
          bVal = b.spent;
        } else if (sortKey === 'status') {
          aVal = a.status;
          bVal = b.status;
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : filtered;

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col)
      return (
        <Icon name="ChevronUpDownIcon" size={13} className="text-stone-300 ml-1 inline-block" />
      );
    return sortDir === 'asc' ? (
      <Icon name="ChevronUpIcon" size={13} className="text-primary ml-1 inline-block" />
    ) : (
      <Icon name="ChevronDownIcon" size={13} className="text-primary ml-1 inline-block" />
    );
  };

  const toggleStatus = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const user = users.find((u) => u.id === id);
    if (!user || togglingId === id) return;
    setTogglingId(id);
    try {
      const newStatus = user.status === 'active' ? 'locked' : 'active';
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
        if (selectedUser?.id === id) {
          setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
        }
        if (newStatus === 'locked') {
          onToast?.warning('Tài khoản đã bị khoá', `${user.name} không thể đăng nhập.`);
        } else {
          onToast?.success('Tài khoản đã được mở khoá', `${user.name} có thể đăng nhập trở lại.`);
        }
      } else {
        onToast?.error('Lỗi', data.message || 'Không thể thay đổi trạng thái.');
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const user = users.find((u) => u.id === id);
    if (!confirm('Bạn có chắc muốn xoá người dùng này?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users?userId=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        onToast?.error('Đã xoá người dùng', `${user?.name ?? 'Người dùng'} đã bị xoá khỏi hệ thống.`);
      } else {
        onToast?.error('Lỗi khi xoá', data.message || 'Không thể xoá người dùng.');
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveNotes = (id: string, notes: string) => {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, notes } : u));
      if (selectedUser?.id === id) {
          setSelectedUser(prev => prev ? { ...prev, notes } : null);
      }
      onToast?.success('Thành công', 'Đã lưu ghi chú vận hành.');
  };

  const handleSwitchRole = async (targetUser: User) => {
    if (!currentUser || switchingRoleId === targetUser.id) return;
    if (targetUser.id === currentUser.id) {
      onToast?.warning(
        'Không thể thay đổi vai trò',
        'Bạn không thể thay đổi vai trò của chính mình.'
      );
      return;
    }
    const newRole: UserRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const actionLabel = newRole === 'admin' ? 'nâng cấp lên Admin' : 'hạ cấp về User';
    if (!confirm(`Bạn có chắc muốn ${actionLabel} tài khoản "${targetUser.name}"?`)) return;
    setSwitchingRoleId(targetUser.id);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật vai trò');
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)));
      if (selectedUser?.id === targetUser.id) {
          setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
      onToast?.success('Cập nhật vai trò thành công', `${targetUser.name} đã được ${actionLabel}.`);
    } catch (err: any) {
      onToast?.error('Lỗi cập nhật vai trò', err.message || 'Vui lòng thử lại sau.');
    } finally {
      setSwitchingRoleId(null);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);
    setTimeout(() => {
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? editingUser : u)));
      setEditingUser(null);
      onToast?.success('Cập nhật thành công', `Thông tin của ${editingUser.name} đã được lưu.`);
      setIsSavingEdit(false);
    }, 600);
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                <Icon name="UsersIcon" size={24} />
             </div>
             <div>
                Quản lý người dùng
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 opacity-70">
                   Tổng số {users.length} tài khoản trong hệ thống
                </p>
             </div>
          </h2>
        </div>
        <button
          className="flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95 group"
        >
          <Icon name="PlusCircleIcon" size={18} className="transition-transform group-hover:rotate-90 duration-300" />
          Thêm người dùng mới
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5 relative group">
          <Icon
            name="MagnifyingGlassIcon"
            size={20}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
            className="w-full pl-14 pr-6 py-4 bg-slate-800/40 border border-white/5 rounded-[22px] text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all focus:bg-slate-800/60"
          />
        </div>
        
        <div className="xl:col-span-4 flex items-center bg-slate-800/20 border border-white/5 rounded-[22px] p-1.5 gap-1">
          <div className="relative flex-1">
            <input
              type="date"
              value={joinDateFrom}
              onChange={(e) => setJoinDateFrom(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-transparent border-none rounded-xl text-[11px] font-black text-slate-300 focus:ring-0 uppercase tracking-wider"
            />
            <Icon name="CalendarDaysIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          </div>
          <Icon name="ArrowRightIcon" size={12} className="text-slate-700" />
          <div className="relative flex-1">
            <input
              type="date"
              value={joinDateTo}
              onChange={(e) => setJoinDateTo(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-transparent border-none rounded-xl text-[11px] font-black text-slate-300 focus:ring-0 uppercase tracking-wider"
            />
            <Icon name="CalendarDaysIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          </div>
        </div>

        <div className="xl:col-span-3 flex items-center justify-end">
            {(activeFilterCount > 0 || searchQuery) && (
                <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-rose-500/20 transition-all group"
                >
                    <Icon name="XMarkIcon" size={16} className="group-hover:rotate-90 transition-transform" />
                    Đặt lại bộ lọc ({activeFilterCount + (searchQuery ? 1 : 0)})
                </button>
            )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-800/40 rounded-2xl p-1.5 border border-white/5 shadow-inner">
             {ROLE_TABS.map(tab => (
                <button
                   key={tab.value}
                   onClick={() => setFilterRole(tab.value)}
                   className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterRole === tab.value ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                   {tab.label}
                </button>
             ))}
          </div>
          <div className="flex bg-slate-800/40 rounded-2xl p-1.5 border border-white/5 shadow-inner">
             {STATUS_TABS.map(tab => (
                <button
                   key={tab.value}
                   onClick={() => setFilterStatus(tab.value)}
                   className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === tab.value ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                   {tab.label}
                </button>
             ))}
          </div>
      </div>

      {/* Table */}
      <div
        className="rounded-3xl border overflow-hidden transition-all duration-500"
        style={{ 
          background: 'rgba(30, 41, 59, 0.4)', 
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th
                  className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('name')}
                >
                  Người dùng
                  <SortIcon col="name" />
                </th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 hidden sm:table-cell">
                  Liên hệ
                </th>
                <th className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5">
                  Vai trò
                </th>
                <th
                  className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 hidden md:table-cell cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('bookings')}
                >
                  Đặt vé
                  <SortIcon col="bookings" />
                </th>
                <th
                  className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 hidden lg:table-cell cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('spent')}
                >
                  Chi tiêu
                  <SortIcon col="spent" />
                </th>
                <th
                  className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort('status')}
                >
                  Trạng thái
                  <SortIcon col="status" />
                </th>
                <th className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 py-5">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-white/5 animate-pulse">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700/50 rounded-xl" />
                          <div>
                            <div className="h-4 w-28 bg-slate-700/50 rounded-full mb-2" />
                            <div className="h-3 w-20 bg-slate-800/50 rounded-full" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <div className="h-3 w-32 bg-slate-700/50 rounded-full mb-2" />
                        <div className="h-3 w-24 bg-slate-800/50 rounded-full" />
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="h-5 w-14 bg-slate-700/50 rounded-full mx-auto" />
                      </td>
                      <td className="px-6 py-5 text-right hidden md:table-cell">
                        <div className="h-4 w-8 bg-slate-700/50 rounded-full ml-auto" />
                      </td>
                      <td className="px-6 py-5 text-right hidden lg:table-cell">
                        <div className="h-4 w-20 bg-slate-700/50 rounded-full ml-auto" />
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="h-7 w-24 bg-slate-700/50 rounded-lg mx-auto" />
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-8 w-8 bg-slate-700/50 rounded-xl" />
                          <div className="h-8 w-8 bg-slate-700/50 rounded-xl" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : hasError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.35s_ease-out]">
                      <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
                        <Icon name="ExclamationTriangleIcon" size={28} className="text-red-400" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-700 text-sm">Không thể tải dữ liệu</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                          Đã xảy ra lỗi khi tải danh sách người dùng. Vui lòng thử lại.
                        </p>
                      </div>
                      <button
                        onClick={retryLoad}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl transition-all shadow-glow-red hover:shadow-none mt-1"
                      >
                        <Icon name="ArrowPathIcon" size={13} />
                        Thử lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.35s_ease-out]">
                      <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-2xl flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite]">
                        <Icon name="UserGroupIcon" size={28} className="text-stone-300" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-700 text-sm">
                          Không tìm thấy người dùng
                        </p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                          {searchQuery ||
                          filterRole !== 'all' ||
                          filterStatus !== 'all' ||
                          joinDateFrom ||
                          joinDateTo
                            ? 'Bộ lọc hiện tại không khớp với người dùng nào. Hãy thử thay đổi tiêu chí tìm kiếm.'
                            : 'Chưa có người dùng nào đăng ký.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {(searchQuery ||
                          filterRole !== 'all' ||
                          filterStatus !== 'all' ||
                          joinDateFrom ||
                          joinDateTo) && (
                          <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl transition-all shadow-glow-red hover:shadow-none"
                          >
                            <Icon name="ArrowPathIcon" size={13} />
                            Đặt lại bộ lọc
                          </button>
                        )}
                        <button
                          onClick={retryLoad}
                          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 px-4 py-2 rounded-xl transition-all"
                        >
                          <Icon name="ArrowPathIcon" size={13} />
                          Tải lại
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((user, i) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.05] transition-all group cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg ${user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/20' : 'bg-slate-700 shadow-black/20'}`}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{user.name}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{user.joinDate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden sm:table-cell">
                      <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">{user.email}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">{user.phone}</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right hidden md:table-cell">
                      <span className="font-black text-white text-sm tracking-tight">{user.bookings}</span>
                    </td>
                    <td className="px-6 py-5 text-right hidden lg:table-cell">
                      <span className="font-black text-white text-sm tracking-tight">
                        {user.spent.toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={(e) => toggleStatus(e, user.id)}
                        disabled={user.role === 'admin' || togglingId === user.id}
                        className={`text-[10px] font-black px-3 py-1 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider ${
                          user.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {togglingId === user.id ? (
                          <Icon name="ArrowPathIcon" size={12} className="animate-spin" />
                        ) : (
                          user.status === 'active' ? 'Hoạt động' : 'Đã khoá'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          disabled={
                            deletingId === user.id ||
                            togglingId === user.id ||
                            switchingRoleId === user.id
                          }
                          className="w-9 h-9 bg-slate-800 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 border border-white/5 rounded-xl flex items-center justify-center transition-all disabled:opacity-20 active:scale-90"
                          title="Chỉnh sửa"
                        >
                          <Icon name="PencilIcon" size={14} />
                        </button>
                        <button
                          onClick={() => handleSwitchRole(user)}
                          disabled={
                            deletingId === user.id ||
                            togglingId === user.id ||
                            switchingRoleId === user.id
                          }
                          className={`w-9 h-9 border border-white/5 rounded-xl flex items-center justify-center transition-all disabled:opacity-20 active:scale-90 ${
                            user.role === 'admin'
                              ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400'
                              : 'bg-slate-800 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400'
                          }`}
                          title={user.role === 'admin' ? 'Hạ cấp về User' : 'Nâng cấp lên Admin'}
                        >
                          {switchingRoleId === user.id ? (
                            <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                          ) : (
                            <Icon
                              name={user.role === 'admin' ? 'ArrowDownIcon' : 'ArrowUpIcon'}
                              size={14}
                            />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, user.id)}
                          disabled={
                            user.role === 'admin' ||
                            deletingId === user.id ||
                            togglingId === user.id ||
                            switchingRoleId === user.id
                          }
                          className="w-9 h-9 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 rounded-xl flex items-center justify-center transition-all disabled:opacity-10 active:scale-90"
                          title="Xoá"
                        >
                          {deletingId === user.id ? (
                            <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                          ) : (
                            <Icon name="TrashIcon" size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 0 && (
          <div className="px-6 py-5 border-t border-white/5 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {sorted.length > pageSize
                  ? `Hiển thị ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} / ${sorted.length} người dùng`
                  : `${sorted.length} / ${users.length} người dùng`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-[10px] font-black border border-white/10 rounded-lg px-2 py-1 bg-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer uppercase tracking-wider transition-all"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                siblingCount={1}
              />
            )}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div 
            className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
            style={{ 
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)'
            }}
          >
            {/* Header / Profile Cover */}
            <div className="h-32 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 relative">
              <div className="absolute -bottom-12 left-8">
                <div 
                  className={`w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl border-4 border-slate-900 ${selectedUser.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-slate-700'}`}
                >
                  {selectedUser.name.charAt(0)}
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border border-white/5"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            <div className="px-8 pt-16 pb-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-white tracking-tight">{selectedUser.name}</h3>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${selectedUser.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-400">{selectedUser.email}</p>
                  <p className="text-xs text-slate-500 font-medium">Thành viên từ: <span className="text-slate-300 font-bold">{selectedUser.joinDate}</span></p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleStatus(e, selectedUser.id); }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedUser.status === 'active' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
                  >
                    {selectedUser.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingUser(selectedUser); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Sửa thông tin
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                {[
                  { label: 'Tổng đặt vé', value: selectedUser.bookings, icon: 'TicketIcon', color: 'indigo' },
                  { label: 'Đã chi tiêu', value: selectedUser.spent.toLocaleString('vi-VN') + '₫', icon: 'BanknotesIcon', color: 'emerald' },
                  { label: 'Điểm thưởng', value: '1,250', icon: 'StarIcon', color: 'amber' },
                  { label: 'Hạng thẻ', value: 'Gold', icon: 'TrophyIcon', color: 'rose' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <Icon name={stat.icon} size={16} className={`text-${stat.color}-400 mb-2`} />
                    <div className="text-lg font-black text-white tracking-tighter">{stat.value}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Advanced info */}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <section>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Liên hệ chi tiết</label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-3 rounded-2xl">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                        <Icon name="PhoneIcon" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Số điện thoại</p>
                        <p className="text-sm font-bold text-slate-200">{selectedUser.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-3 rounded-2xl">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                        <Icon name="GlobeAltIcon" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quốc tịch</p>
                        <p className="text-sm font-bold text-slate-200">Việt Nam</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Ghi chú vận hành</label>
                  <textarea 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/30 min-h-[110px] resize-none"
                    placeholder="Nhập ghi chú cho người dùng này (chỉ admin thấy)..."
                  />
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h3 className="font-bold text-stone-900">Chỉnh sửa người dùng</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center"
              >
                <Icon name="XMarkIcon" size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Họ tên
                </label>
                <div className={`form-field-float ${editingUser.name ? 'has-value' : ''}`}>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) =>
                      setEditingUser((p) => (p ? { ...p, name: e.target.value } : p))
                    }
                    placeholder=" "
                    className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${editingUser.name.trim().length >= 2 ? 'form-input-valid' : ''}`}
                  />
                  <label className="form-label-float">Nguyễn Văn A</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Email
                </label>
                <div className={`form-field-float ${editingUser.email ? 'has-value' : ''}`}>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser((p) => (p ? { ...p, email: e.target.value } : p))
                    }
                    placeholder=" "
                    className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email) ? 'form-input-valid' : ''}`}
                  />
                  <label className="form-label-float">email@example.com</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Số điện thoại
                </label>
                <div className={`form-field-float ${editingUser.phone ? 'has-value' : ''}`}>
                  <input
                    type="tel"
                    value={editingUser.phone}
                    onChange={(e) =>
                      setEditingUser((p) => (p ? { ...p, phone: e.target.value } : p))
                    }
                    placeholder=" "
                    className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input ${editingUser.phone.replace(/\D/g, '').length >= 9 ? 'form-input-valid' : ''}`}
                  />
                  <label className="form-label-float">0901 234 567</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Vai trò
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser((p) => (p ? { ...p, role: e.target.value as UserRole } : p))
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm form-input"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSavingEdit}
                  className="flex-1 border border-stone-300 text-stone-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-stone-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
