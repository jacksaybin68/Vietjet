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
  },
  {
    id: '6',
    name: 'Vũ Thị Lan',
    email: 'lan.vu@gmail.com',
    phone: '0956 789 012',
    role: 'user',
    status: 'active',
    bookings: 1,
    spent: 449000,
    joinDate: '2026-02-05',
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
  const { user: currentUser } = useAuth();

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const retryLoad = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => setIsLoading(false), 1200);
  };

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

  const toggleStatus = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user || togglingId === id) return;
    setTogglingId(id);
    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: u.status === 'active' ? 'locked' : 'active' } : u
        )
      );
      const willLock = user.status === 'active';
      if (willLock) {
        onToast?.warning(
          'Tài khoản đã bị khoá',
          `${user.name} không thể đăng nhập cho đến khi được mở khoá.`
        );
      } else {
        onToast?.success('Tài khoản đã được mở khoá', `${user.name} có thể đăng nhập trở lại.`);
      }
      setTogglingId(null);
    }, 500);
  };

  const handleDelete = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (confirm('Bạn có chắc muốn xoá người dùng này?')) {
      setDeletingId(id);
      setTimeout(() => {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        onToast?.error(
          'Đã xoá người dùng',
          `${user?.name ?? 'Người dùng'} đã bị xoá khỏi hệ thống.`
        );
        setDeletingId(null);
      }, 500);
    }
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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-bold text-stone-900">Quản lý người dùng</h2>
        <p className="text-sm text-stone-400">{users.length} người dùng đã đăng ký</p>
      </div>

      {/* Search + Date Range */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm tên, email, số điện thoại..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon
              name="CalendarDaysIcon"
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="date"
              value={joinDateFrom}
              onChange={(e) => {
                setJoinDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input w-40"
              title="Ngày tham gia từ"
            />
          </div>
          <span className="text-stone-400 text-sm font-medium">–</span>
          <div className="relative">
            <Icon
              name="CalendarDaysIcon"
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="date"
              value={joinDateTo}
              onChange={(e) => {
                setJoinDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm form-input w-40"
              title="Ngày tham gia đến"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-4">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider mr-1">
              Vai trò:
            </span>
            {ROLE_TABS.map((tab) => {
              const count =
                tab.value === 'all'
                  ? users.length
                  : users.filter((u) => u.role === tab.value).length;
              const isActive = filterRole === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setFilterRole(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isActive
                      ? `${tab.activeColor} border-transparent shadow-sm`
                      : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/60' : 'bg-stone-100 text-stone-400'}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider mr-1">
              Trạng thái:
            </span>
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === 'all'
                  ? users.length
                  : users.filter((u) => u.status === tab.value).length;
              const isActive = filterStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setFilterStatus(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isActive
                      ? `${tab.activeColor} border-transparent shadow-sm`
                      : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/60' : 'bg-stone-100 text-stone-400'}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {(activeFilterCount > 0 || searchQuery) && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-full border border-stone-200 hover:border-red-200 hover:bg-red-50"
          >
            <Icon name="XMarkIcon" size={13} />
            Xoá bộ lọc
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th
                  className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('name')}
                >
                  Người dùng
                  <SortIcon col="name" />
                </th>
                <th className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden sm:table-cell">
                  Liên hệ
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2">
                  Vai trò
                </th>
                <th
                  className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden md:table-cell cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('bookings')}
                >
                  Đặt vé
                  <SortIcon col="bookings" />
                </th>
                <th
                  className="text-right text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 hidden lg:table-cell cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('spent')}
                >
                  Chi tiêu
                  <SortIcon col="spent" />
                </th>
                <th
                  className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2 cursor-pointer hover:text-stone-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('status')}
                >
                  Trạng thái
                  <SortIcon col="status" />
                </th>
                <th className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider px-4 py-2">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-stone-50 animate-pulse">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-stone-200 rounded-lg" />
                          <div>
                            <div className="h-4 w-28 bg-stone-200 rounded-full mb-1.5" />
                            <div className="h-3 w-20 bg-stone-100 rounded-full" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <div className="h-3 w-32 bg-stone-200 rounded-full mb-1.5" />
                        <div className="h-3 w-24 bg-stone-100 rounded-full" />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="h-5 w-14 bg-stone-200 rounded-full mx-auto" />
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell">
                        <div className="h-4 w-8 bg-stone-200 rounded-full ml-auto" />
                      </td>
                      <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                        <div className="h-4 w-20 bg-stone-200 rounded-full ml-auto" />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="h-6 w-20 bg-stone-200 rounded-full mx-auto" />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-6 w-6 bg-stone-200 rounded-lg" />
                          <div className="h-6 w-6 bg-stone-200 rounded-lg" />
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
                    className={`vj-table-row border-b border-stone-50 ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${user.role === 'admin' ? 'bg-gradient-red' : 'bg-stone-400'}`}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 text-sm">{user.name}</div>
                          <div className="text-xs text-stone-400">{user.joinDate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <div className="text-sm text-stone-600">{user.email}</div>
                      <div className="text-xs text-stone-400">{user.phone}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          user.role === 'admin' ? 'bg-primary-100 text-primary' : 'badge-info'
                        }`}
                      >
                        <span className="badge-dot" />
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell">
                      <span className="font-bold text-stone-900 text-sm">{user.bookings}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                      <span className="font-bold text-stone-900 text-sm">
                        {user.spent.toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => toggleStatus(user.id)}
                        disabled={user.role === 'admin' || togglingId === user.id}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all disabled:cursor-not-allowed ${
                          user.status === 'active'
                            ? 'badge-success hover:bg-red-50 hover:text-red-600'
                            : 'badge-error hover:bg-green-50 hover:text-green-600'
                        }`}
                      >
                        {togglingId === user.id ? (
                          <svg
                            className="animate-spin w-3 h-3 inline-block"
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
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <>
                            <span className="badge-dot" />
                            {user.status === 'active' ? 'Hoạt động' : 'Đã khoá'}
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingUser(user)}
                          disabled={
                            deletingId === user.id ||
                            togglingId === user.id ||
                            switchingRoleId === user.id
                          }
                          className="w-6 h-6 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Chỉnh sửa"
                        >
                          <Icon name="PencilIcon" size={12} />
                        </button>
                        <button
                          onClick={() => toggleStatus(user.id)}
                          disabled={
                            user.role === 'admin' ||
                            togglingId === user.id ||
                            deletingId === user.id ||
                            switchingRoleId === user.id
                          }
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            user.status === 'active'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                              : 'bg-green-50 hover:bg-green-100 text-green-600'
                          }`}
                          title={user.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá'}
                        >
                          {togglingId === user.id ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
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
                          ) : (
                            <Icon
                              name={user.status === 'active' ? 'LockClosedIcon' : 'LockOpenIcon'}
                              size={12}
                            />
                          )}
                        </button>
                        <button
                          onClick={() => handleSwitchRole(user)}
                          disabled={
                            deletingId === user.id ||
                            togglingId === user.id ||
                            switchingRoleId === user.id
                          }
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            user.role === 'admin'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                              : 'bg-primary-50 hover:bg-primary-100 text-primary'
                          }`}
                          title={user.role === 'admin' ? 'Hạ cấp về User' : 'Nâng cấp lên Admin'}
                        >
                          {switchingRoleId === user.id ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
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
                          ) : (
                            <Icon
                              name={user.role === 'admin' ? 'ArrowDownIcon' : 'ArrowUpIcon'}
                              size={12}
                            />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={
                            user.role === 'admin' ||
                            deletingId === user.id ||
                            togglingId === user.id ||
                            switchingRoleId === user.id
                          }
                          className="w-6 h-6 bg-red-50 hover:bg-red-100 text-red-500 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Xoá"
                        >
                          {deletingId === user.id ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
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
                          ) : (
                            <Icon name="TrashIcon" size={12} />
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
          <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">
                {sorted.length > pageSize
                  ? `Hiển thị ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} / ${sorted.length} người dùng`
                  : `${sorted.length} / ${users.length} người dùng`}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400">Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs font-semibold border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-700 focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs text-stone-400">hàng</span>
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
