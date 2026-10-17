'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/shared/components/ui';
import { getSystemSettings, updateSystemSettings } from '@/features/admin';
import { getApiErrorMessage } from '@/shared/services';
import { AdminTabHeader, ADMIN_CARD_STYLE, ADMIN_ACTION_BTN } from './AdminSection';

interface SettingsObject {
  [key: string]: { value: string; description?: string };
}

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
}

const SETTING_CATEGORIES = [
  { id: 'general', label: 'Cài đặt chung', icon: 'Cog6ToothIcon' },
  { id: 'booking', label: 'Cấu hình đặt vé', icon: 'TicketIcon' },
  { id: 'payment', label: 'Cấu hình thanh toán & Ngân hàng', icon: 'BanknotesIcon' },
  { id: 'notification', label: 'Thông báo', icon: 'BellIcon' },
];

const DEFAULT_SETTINGS: Array<{
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  category: string;
  options?: { value: string; label: string }[];
}> = [
  // --- General ---
  {
    key: 'maintenance_mode',
    label: 'Chế độ bảo trì',
    description: 'Bật/tắt chế độ bảo trì. Khi bật, người dùng sẽ thấy trang bảo trì.',
    type: 'boolean',
    category: 'general',
  },
  // --- Booking ---
  {
    key: 'booking_timeout',
    label: 'Thời gian timeout đặt vé',
    description: 'Thời gian (phút) trước khi đặt vé tự động hủy nếu không thanh toán',
    type: 'number',
    category: 'booking',
  },
  {
    key: 'min_refund_days',
    label: 'Số ngày hoàn tiền tối thiểu',
    description: 'Số ngày tối thiểu trước giờ bay để được yêu cầu hoàn tiền',
    type: 'number',
    category: 'booking',
  },
  {
    key: 'max_booking_per_user',
    label: 'Số vé tối đa/người dùng',
    description: 'Số lượng vé tối đa một người dùng có thể đặt trong cùng một thời điểm',
    type: 'number',
    category: 'booking',
  },
  {
    key: 'min_booking_amount',
    label: 'Giá trị đặt vé tối thiểu',
    description: 'Giá trị (VND) tối thiểu để đặt vé',
    type: 'number',
    category: 'booking',
  },
  {
    key: 'max_passengers_per_booking',
    label: 'Số khách tối đa/đơn',
    description: 'Số lượng hành khách tối đa trong một đơn đặt vé',
    type: 'number',
    category: 'booking',
  },
  // --- Payment & Bank ---
  {
    key: 'admin_bank_name',
    label: 'Tên ngân hàng nhận tiền',
    description: 'Tên ngân hàng chính thức nhận thanh toán (VD: Vietcombank, Techcombank)',
    type: 'text',
    category: 'payment',
  },
  {
    key: 'admin_bank_account_holder',
    label: 'Tên chủ tài khoản',
    description: 'Họ tên đầy đủ của chủ tài khoản nhận tiền',
    type: 'text',
    category: 'payment',
  },
  {
    key: 'admin_bank_account_number',
    label: 'Số tài khoản (STK)',
    description: 'Số tài khoản ngân hàng để người dùng chuyển khoản thanh toán',
    type: 'text',
    category: 'payment',
  },
  // --- Notification ---
  {
    key: 'email_notifications',
    label: 'Thông báo qua email',
    description: 'Bật/tắt gửi thông báo qua email cho người dùng',
    type: 'boolean',
    category: 'notification',
  },
  {
    key: 'sms_notifications',
    label: 'Thông báo qua SMS',
    description: 'Bật/tắt gửi thông báo qua SMS cho người dùng',
    type: 'boolean',
    category: 'notification',
  },
];

export default function SystemSettingsTab({ onToast }: { onToast?: ToastAPI }) {
  const [settings, setSettings] = useState<SettingsObject>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<SettingsObject>({});
  const [activeCategory, setActiveCategory] = useState('general');

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getSystemSettings();
      setSettings(data.settingsObject || {});
      setLocalSettings(data.settingsObject || {});
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingChange = (key: string, value: string | boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: String(value),
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await updateSystemSettings({ settings: localSettings });
      setSettings(localSettings);
      setHasChanges(false);
      onToast?.success('Lưu thành công', 'Các cài đặt đã được cập nhật.');
    } catch (err) {
      onToast?.error('Lỗi', getApiErrorMessage(err, 'Không thể lưu cài đặt.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc muốn đặt lại tất cả cài đặt về giá trị ban đầu?')) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  };

  const getSettingValue = (key: string, type: string): string | boolean => {
    const setting = localSettings[key];
    if (!setting) return type === 'boolean' ? 'false' : '';
    return setting.value || (type === 'boolean' ? 'false' : '');
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <AdminTabHeader icon="CogIcon" title="Cài đặt hệ thống" subtitle="Đang tải..." />
        <div className="rounded-2xl border p-6" style={ADMIN_CARD_STYLE}>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-500/10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-5">
        <AdminTabHeader
          icon="CogIcon"
          title="Cài đặt hệ thống"
          subtitle="Đã xảy ra lỗi"
          actions={
            <button
              onClick={fetchSettings}
              className={`${ADMIN_ACTION_BTN} text-white bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30`}
            >
              <Icon name="ArrowPathIcon" size={14} />
              Thử lại
            </button>
          }
        />
        <div className="rounded-2xl border p-12 text-center" style={ADMIN_CARD_STYLE}>
          <Icon name="ExclamationTriangleIcon" size={48} className="text-red-400 mx-auto mb-4" />
          <p className="font-bold text-white">Không thể tải cài đặt</p>
          <p className="text-sm text-slate-400 mt-2">Vui lòng thử lại sau</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <AdminTabHeader
        icon="CogIcon"
        title="Cài đặt hệ thống"
        subtitle="Quản lý các thông số cấu hình hệ thống"
        actions={
          <>
            {hasChanges && (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className={`${ADMIN_ACTION_BTN} text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50`}
              >
                <Icon name="ArrowPathIcon" size={14} />
                Đặt lại
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={`${ADMIN_ACTION_BTN} text-white bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Icon name="CheckIcon" size={14} />
                  Lưu thay đổi
                </>
              )}
            </button>
          </>
        }
      />
      {/* Categories Tabs */}
      <div className="flex rounded-xl border border-white/10 bg-slate-900/60 p-1.5 gap-1 overflow-x-auto">
        {SETTING_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeCategory === cat.id
                ? 'bg-primary/15 text-primary'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon name={cat.icon} size={18} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Settings List */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ ...ADMIN_CARD_STYLE, padding: 0 }}
      >
        <div
          className="p-5 border-b border-white/5"
          style={{ background: 'linear-gradient(135deg, #1A2948 0%, #2D3E5F 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <Icon
                name={SETTING_CATEGORIES.find((c) => c.id === activeCategory)?.icon || 'CogIcon'}
                size={20}
                className="text-white"
              />
            </div>
            <div>
              <h3 className="font-bold text-white">
                {SETTING_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Cập nhật các thông số quan trọng liên quan đến{' '}
                {SETTING_CATEGORIES.find((c) => c.id === activeCategory)?.label.toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {DEFAULT_SETTINGS.filter((s) => s.category === activeCategory).map((setting) => {
            const value = getSettingValue(setting.key, setting.type);

            return (
              <div key={setting.key} className="px-5 py-5 hover:bg-white/5 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{setting.label}</h4>
                      {hasChanges &&
                        localSettings[setting.key]?.value !== settings[setting.key]?.value && (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            Đã thay đổi
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">{setting.description}</p>
                  </div>
                  <div className="w-full sm:w-64 flex-shrink-0">
                    {setting.type === 'boolean' ? (
                      <div className="flex items-center">
                        <button
                          onClick={() =>
                            handleSettingChange(setting.key, value === 'true' ? 'false' : 'true')
                          }
                          className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                            value === 'true' ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                              value === 'true' ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-xs font-semibold text-slate-400">
                          {value === 'true' ? 'Đang bật' : 'Đang tắt'}
                        </span>
                      </div>
                    ) : setting.type === 'select' ? (
                      <select
                        value={String(value)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        {setting.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={setting.type === 'number' ? 'number' : 'text'}
                        value={String(value)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-500"
                        min={0}
                        placeholder={setting.label}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}
      >
        <Icon
          name="InformationCircleIcon"
          size={20}
          className="text-blue-400 flex-shrink-0 mt-0.5"
        />
        <div>
          <p className="text-sm font-semibold text-white">Lưu ý khi thay đổi cài đặt</p>
          <ul className="text-xs text-slate-400 mt-1 space-y-1">
            <li>- Một số thay đổi có thể cần khởi động lại dịch vụ để có hiệu lực</li>
            <li>- Vui lòng kiểm tra kỹ trước khi bật chế độ bảo trì</li>
            <li>- Các thay đổi sẽ được ghi lại trong nhật ký hệ thống</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
