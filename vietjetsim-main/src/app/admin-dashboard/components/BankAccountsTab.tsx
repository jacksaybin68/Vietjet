'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  bank_bin?: string;
  branch?: string;
  is_default: boolean;
  is_active: boolean;
  transfer_note_template: string;
  created_at: string;
}

interface ToastAPI {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
}

export default function BankAccountsTab({ onToast }: { onToast?: ToastAPI }) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    bank_bin: '',
    branch: '',
    transfer_note_template: 'VJ {code}',
    is_default: false,
    is_active: true,
  });

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/bank-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      onToast?.error('Lỗi', 'Không thể tải danh sách tài khoản');
    } finally {
      setIsLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenModal = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_holder: account.account_holder,
        bank_bin: account.bank_bin || '',
        branch: account.branch || '',
        transfer_note_template: account.transfer_note_template || 'VJ {code}',
        is_default: account.is_default,
        is_active: account.is_active,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        bank_name: '',
        account_number: '',
        account_holder: '',
        bank_bin: '',
        branch: '',
        transfer_note_template: 'VJ {code}',
        is_default: false,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingAccount
      ? `/api/admin/bank-accounts/${editingAccount.id}`
      : '/api/admin/bank-accounts';
    const method = editingAccount ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onToast?.success(
          'Thành công',
          editingAccount ? 'Cập nhật tài khoản thành công' : 'Thêm tài khoản mới thành công'
        );
        setIsModalOpen(false);
        fetchAccounts();
      } else {
        const data = await res.json();
        onToast?.error('Lỗi', data.error || 'Thao tác thất bại');
      }
    } catch (err) {
      onToast?.error('Lỗi', 'Kết nối máy chủ bị gián đoạn');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;

    try {
      const res = await fetch(`/api/admin/bank-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onToast?.success('Thành công', 'Đã xóa tài khoản');
        fetchAccounts();
      }
    } catch (err) {
      onToast?.error('Lỗi', 'Không thể xóa tài khoản');
    }
  };

  const toggleStatus = async (account: BankAccount, field: 'is_active' | 'is_default') => {
    try {
      const res = await fetch(`/api/admin/bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !account[field] }),
      });
      if (res.ok) {
        onToast?.success('Cập nhật', 'Đã thay đổi trạng thái tài khoản');
        fetchAccounts();
      }
    } catch (err) {
      onToast?.error('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Quản lý Tài khoản Ngân hàng</h2>
          <p className="text-sm text-slate-400">
            Thiết lập các tài khoản nhận thanh toán từ khách hàng
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Icon name="PlusIcon" size={18} />
          Thêm tài khoản mới
        </button>
      </div>

      {/* Account List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 h-48 animate-pulse"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700 border-dashed rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Icon name="BanknotesIcon" size={32} className="text-slate-500" />
          </div>
          <h3 className="text-white font-bold text-lg">Chưa có tài khoản nào</h3>
          <p className="text-slate-400 mt-2">
            Hãy thêm tài khoản ngân hàng đầu tiên để nhận tiền từ khách.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`group relative bg-slate-800 border transition-all duration-300 rounded-3xl p-6 hover:shadow-2xl hover:shadow-indigo-500/10 ${account.is_default ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-slate-700'}`}
            >
              {account.is_default && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                  Mặc định
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center text-white font-black text-lg group-hover:bg-indigo-600 transition-colors">
                    {account.bank_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{account.bank_name}</h4>
                    <p className="text-xs text-slate-500">{account.branch || 'Toàn quốc'}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(account)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                    title="Chỉnh sửa"
                  >
                    <Icon name="PencilSquareIcon" size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg"
                    title="Xóa"
                  >
                    <Icon name="TrashIcon" size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    Số tài khoản
                  </label>
                  <p className="text-xl font-mono font-bold text-white tracking-wider">
                    {account.account_number}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    Chủ tài khoản
                  </label>
                  <p className="text-sm font-semibold text-slate-200">
                    {account.account_holder.toUpperCase()}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                    Nội dung chuyển khoản mẫu
                  </label>
                  <p className="text-[11px] font-mono text-indigo-200/70">
                    {account.transfer_note_template || 'VJ {code}'}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
                <button
                  onClick={() => toggleStatus(account, 'is_active')}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
                    account.is_active
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  {account.is_active ? 'Đang hoạt động' : 'Tạm ẩn'}
                </button>
                {!account.is_default && (
                  <button
                    onClick={() => toggleStatus(account, 'is_default')}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    Đặt mặc định
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="XMarkIcon" size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Tên ngân hàng
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="VD: Vietcombank"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Mã BIN (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formData.bank_bin}
                    onChange={(e) => setFormData({ ...formData, bank_bin: e.target.value })}
                    placeholder="VD: 970436"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Số tài khoản ngân hàng"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Chủ tài khoản
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_holder}
                    onChange={(e) =>
                      setFormData({ ...formData, account_holder: e.target.value.toUpperCase() })
                    }
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Chi nhánh (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="VD: Chi nhánh Hà Nội"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Nội dung Chuyển khoản mẫu
                  </label>
                  <input
                    type="text"
                    value={formData.transfer_note_template}
                    onChange={(e) =>
                      setFormData({ ...formData, transfer_note_template: e.target.value })
                    }
                    placeholder="VD: VJ {code}"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sử dụng `{`{code}`}` để tự động thay thế bằng mã đặt vé.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 py-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    Đặt làm tài khoản mặc định
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    Kích hoạt tài khoản
                  </span>
                </label>
              </div>

              <div className="pt-6 border-t border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  {editingAccount ? 'Lưu thay đổi' : 'Xác nhận thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
