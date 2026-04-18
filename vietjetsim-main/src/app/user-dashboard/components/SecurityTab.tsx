'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';

interface UserSession {
  id: string;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  last_active: string;
  is_current: boolean;
  created_at: string;
}

interface LoginHistory {
  id: string;
  ip_address: string | null;
  device_type: string | null;
  location: string | null;
  success: boolean;
  created_at: string;
}

interface TwoFAData {
  isEnabled: boolean;
  backupCodesUsed: number;
}

// ─── 2FA Setup Modal ────────────────────────────────────────────────────────

function TwoFASetupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState<'setup' | 'verify' | 'done'>('setup');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const initSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Lỗi', data.error || 'Không thể khởi tạo 2FA.');
        onClose();
        return;
      }
      setSecret(data.secret);
      setUri(data.uri);
      setBackupCodes(data.backupCodes || []);
      setStep('setup');
    } catch {
      toast.error('Lỗi', 'Không thể khởi tạo 2FA.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSetup();
  }, []);

  const handleVerify = async () => {
    if (token.length !== 6) {
      toast.error('Lỗi', 'Mã xác thực gồm 6 chữ số.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/users/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'verify', token }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Lỗi', data.error || 'Mã xác thực không đúng.');
        return;
      }
      setStep('done');
    } catch {
      toast.error('Lỗi', 'Xác thực thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    toast.success('Thành công', 'Xác thực hai yếu tố đã được kích hoạt.');
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold font-[KoHo,sans-serif] text-[#1A2948]">
            Thiết lập xác thực hai yếu tố (2FA)
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            <Icon name="XMarkIcon" size={20} className="text-stone-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 'setup' && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-[#EC2029]/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="LockClosedIcon" size={36} className="text-[#EC2029]" />
              </div>
              <h4 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948]">
                Quét mã QR với ứng dụng xác thực
              </h4>
              <p className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
                Sử dụng ứng dụng Google Authenticator, Authy hoặc Microsoft Authenticator để quét mã
                QR bên dưới.
              </p>

              {/* QR Code placeholder */}
              <div className="flex justify-center my-4">
                <div className="w-48 h-48 bg-stone-100 rounded-xl flex items-center justify-center border-2 border-dashed border-stone-300">
                  {uri ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}`}
                      alt="2FA QR Code"
                      className="w-44 h-44 rounded-lg"
                    />
                  ) : (
                    <Icon name="QrCodeIcon" size={48} className="text-stone-300" />
                  )}
                </div>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 text-left">
                <p className="text-xs text-stone-500 font-semibold mb-1 font-[Be Vietnam Pro,sans-serif]">
                  Hoặc nhập mã thủ công:
                </p>
                <p className="text-sm font-mono text-[#1A2948] break-all font-[Be Vietnam Pro,sans-serif]">
                  {secret || 'Đang tải...'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={initSetup}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#EC2029] text-white rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                  ) : (
                    'Tiếp tục'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-stone-200 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="ShieldCheckIcon" size={36} className="text-[#10B981]" />
              </div>
              <h4 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948]">
                Nhập mã xác thực
              </h4>
              <p className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
                Nhập mã 6 chữ số từ ứng dụng xác thực của bạn để xác minh.
              </p>

              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-3xl tracking-[0.5em] px-4 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC2029]/20 focus:border-[#EC2029] font-[KoHo,sans-serif]"
                placeholder="000000"
                maxLength={6}
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleVerify}
                  disabled={loading || token.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#EC2029] text-white rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                  ) : (
                    'Xác minh'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-stone-200 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="CheckCircleIcon" size={36} className="text-[#10B981]" />
              </div>
              <h4 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948]">
                Mã dự phòng
              </h4>
              <p className="text-sm text-stone-500 font-[Be Vietnam Pro,sans-serif]">
                Lưu giữ các mã dưới đây ở nơi an toàn. Bạn có thể dùng chúng để đăng nhập nếu mất
                quyền truy cập vào ứng dụng xác thực.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div
                    key={i}
                    className="bg-stone-100 rounded-lg px-3 py-2 text-center font-mono text-sm font-bold text-[#1A2948] font-[Be Vietnam Pro,sans-serif]"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleFinish}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#10B981] text-white rounded-xl font-semibold font-[KoHo,sans-serif] hover:bg-[#059669] transition-all active:scale-95"
                >
                  <Icon name="CheckIcon" size={18} />
                  Hoàn tất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SecurityTab Component ────────────────────────────────────────────────────

export default function SecurityTab() {
  const toast = useToast();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [twoFA, setTwoFA] = useState<TwoFAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, historyRes, twoFARes] = await Promise.all([
        fetch('/api/users/security/sessions?type=sessions', { credentials: 'include' }),
        fetch('/api/users/security/sessions?type=history', { credentials: 'include' }),
        fetch('/api/users/security/2fa', { credentials: 'include' }),
      ]);

      const sessionData = await sessionRes.json();
      const historyData = await historyRes.json();
      const twoFAData = await twoFARes.json();

      if (sessionRes.ok && sessionData.sessions) {
        setSessions(sessionData.sessions);
      }
      if (historyRes.ok && historyData.history) {
        setHistory(historyData.history);
      }
      if (twoFARes.ok && twoFAData.twoFA) {
        setTwoFA(twoFAData.twoFA);
      }
    } catch {
      toast.error('Lỗi', 'Không thể tải dữ liệu bảo mật.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogoutSession = async (sessionId: string) => {
    if (!confirm('Đăng xuất thiết bị này?')) return;

    setActionLoading(sessionId);
    try {
      const res = await fetch(`/api/users/security/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success('Đã đăng xuất', 'Thiết bị đã được đăng xuất.');
      }
    } catch {
      toast.error('Lỗi', 'Không thể đăng xuất thiết bị.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Đăng xuất tất cả thiết bị? Bạn sẽ phải đăng nhập lại trên tất cả.')) return;

    setActionLoading('all');
    try {
      const res = await fetch('/api/users/security/sessions?action=logoutAll', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.is_current));
        toast.success('Đã đăng xuất', 'Tất cả thiết bị đã được đăng xuất.');
      }
    } catch {
      toast.error('Lỗi', 'Không thể đăng xuất tất cả.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Tắt xác thực hai yếu tố? Tài khoản sẽ kém bảo mật hơn.')) return;

    setActionLoading('disable2fa');
    try {
      const res = await fetch('/api/users/security/2fa', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setTwoFA(null);
        toast.success('Đã tắt 2FA', 'Xác thực hai yếu tố đã được tắt.');
      }
    } catch {
      toast.error('Lỗi', 'Không thể tắt 2FA.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-48 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-[KoHo,sans-serif] text-[#1A2948]">
          Bảo mật tài khoản
        </h2>
        <p className="text-sm text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
          Quản lý bảo mật và thiết bị đăng nhập
        </p>
      </div>

      {/* 2FA Section */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
        <div className="p-5 border-b border-stone-100">
          <h3 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948] flex items-center gap-2">
            <Icon name="ShieldCheckIcon" size={20} className="text-[#EC2029]" />
            Xác thực hai yếu tố (2FA)
          </h3>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1A2948] font-[KoHo,sans-serif]">
                {twoFA?.isEnabled ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
              </p>
              <p className="text-xs text-stone-500 mt-0.5 font-[Be Vietnam Pro,sans-serif]">
                {twoFA?.isEnabled
                  ? 'Tài khoản được bảo vệ bằng ứng dụng xác thực.'
                  : 'Bảo vệ tài khoản bằng ứng dụng xác thực (Google Authenticator, Authy).'}
              </p>
            </div>
            <div className="flex gap-2">
              {twoFA?.isEnabled ? (
                <>
                  <button
                    onClick={() => setShow2FASetup(true)}
                    className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg text-sm font-semibold font-[KoHo,sans-serif] hover:bg-stone-200 transition-all"
                  >
                    Cập nhật
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    disabled={actionLoading === 'disable2fa'}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold font-[KoHo,sans-serif] hover:bg-red-100 transition-all disabled:opacity-50"
                  >
                    Tắt 2FA
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShow2FASetup(true)}
                  className="px-5 py-2 bg-[#EC2029] text-white rounded-lg text-sm font-semibold font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all active:scale-95 shadow-sm"
                >
                  Kích hoạt
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948] flex items-center gap-2">
            <Icon name="DevicePhoneMobileIcon" size={20} className="text-[#1A2948]" />
            Thiết bị đã đăng nhập
          </h3>
          {sessions.length > 1 && (
            <button
              onClick={handleLogoutAll}
              disabled={actionLoading === 'all'}
              className="text-xs text-red-500 hover:text-red-600 font-semibold font-[Be Vietnam Pro,sans-serif] disabled:opacity-50"
            >
              {actionLoading === 'all' ? 'Đang xử lý...' : 'Đăng xuất tất cả'}
            </button>
          )}
        </div>
        <div className="divide-y divide-stone-100">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-stone-500 text-sm font-[Be Vietnam Pro,sans-serif]">
              Không có phiên đăng nhập nào.
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon
                    name={
                      session.device_type === 'Mobile'
                        ? 'DevicePhoneMobileIcon'
                        : session.device_type === 'Tablet'
                          ? 'DeviceTabletIcon'
                          : 'ComputerDesktopIcon'
                    }
                    size={20}
                    className="text-stone-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1A2948] font-[KoHo,sans-serif]">
                      {session.device_name ||
                        `${session.browser || 'Trình duyệt'} trên ${session.os || 'thiết bị'}`}
                    </span>
                    {session.is_current && (
                      <span className="px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] rounded-full text-xs font-semibold font-[Be Vietnam Pro,sans-serif]">
                        Hiện tại
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 font-[Be Vietnam Pro,sans-serif]">
                    {session.ip_address || 'Địa chỉ không xác định'} ·{' '}
                    {formatDate(session.last_active)}
                  </p>
                </div>
                {!session.is_current && (
                  <button
                    onClick={() => handleLogoutSession(session.id)}
                    disabled={actionLoading === session.id}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold font-[Be Vietnam Pro,sans-serif] disabled:opacity-50"
                  >
                    {actionLoading === session.id ? '...' : 'Đăng xuất'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
        <div className="p-5 border-b border-stone-100">
          <h3 className="text-base font-bold font-[KoHo,sans-serif] text-[#1A2948] flex items-center gap-2">
            <Icon name="ClockIcon" size={20} className="text-stone-400" />
            Lịch sử đăng nhập
          </h3>
        </div>
        <div className="divide-y divide-stone-100">
          {history.length === 0 ? (
            <div className="p-6 text-center text-stone-500 text-sm font-[Be Vietnam Pro,sans-serif]">
              Chưa có lịch sử đăng nhập.
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.success ? 'bg-[#10B981]/10' : 'bg-[#EF4444]/10'
                  }`}
                >
                  <Icon
                    name={item.success ? 'CheckCircleIcon' : 'XCircleIcon'}
                    size={16}
                    className={item.success ? 'text-[#10B981]' : 'text-[#EF4444]'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1A2948] font-[KoHo,sans-serif]">
                    {item.success ? 'Đăng nhập thành công' : 'Đăng nhập thất bại'}
                    {item.device_type ? ` từ ${item.device_type}` : ''}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5 font-[Be Vietnam Pro,sans-serif]">
                    {item.ip_address || 'Không rõ IP'} · {formatDate(item.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {show2FASetup && (
        <TwoFASetupModal onClose={() => setShow2FASetup(false)} onSuccess={fetchData} />
      )}
    </div>
  );
}
