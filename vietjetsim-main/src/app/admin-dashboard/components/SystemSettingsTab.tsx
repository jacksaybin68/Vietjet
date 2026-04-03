'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

interface SettingsObject {
  [key: string]: { value: string; description?: string };
}

interface ToastAPI {
  success: (title: string, message?: string, options?: object) => void;
  error: (title: string, message?: string, options?: object) => void;
}

const DEFAULT_SETTINGS: Array<{
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: { value: string; label: string }[];
}> = [
  {
    key: 'booking_timeout',
    label: 'Thời gian timeout đặt vé',
    description: 'Thời gian (phút) trước khi đặt vé tự động hủy nếu không thanh toán',
    type: 'number',
  },
  {
    key: 'min_refund_days',
    label: 'Số ngày hoàn tiền tối thiểu',
    description: 'Số ngày tối thiểu trước giờ bay để được yêu cầu hoàn tiền',
    type: 'number',
  },
  {
    key: 'max_booking_per_user',
    label: 'Số vé tối đa/người dùng',
    description: 'Số lượng vé tối đa một người dùng có thể đặt trong cùng một thời điểm',
    type: 'number',
  },
  {
    key: 'maintenance_mode',
    label: 'Chế độ bảo trì',
    description: 'Bật/tắt chế độ bảo trì. Khi bật, người dùng sẽ thấy trang bảo trì.',
    type: 'boolean',
  },
  {
    key: 'email_notifications',
    label: 'Thông báo qua email',
    description: 'Bật/tắt gửi thông báo qua email cho người dùng',
    type: 'boolean',
  },
  {
    key: 'sms_notifications',
    label: 'Thông báo qua SMS',
    description: 'Bật/tắt gửi thông báo qua SMS cho người dùng',
    type: 'boolean',
  },
  {
    key: 'min_booking_amount',
    label: 'Giá trị đặt vé tối thiểu',
    description: 'Giá trị (VND) tối thiểu để đặt vé',
    type: 'number',
  },
  {
    key: 'max_passengers_per_booking',
    label: 'Số khách tối đa/đơn',
    description: 'Số lượng hành khách tối đa trong một đơn đặt vé',
    type: 'number',
  },
];

export default function SystemSettingsTab({ onToast }: { onToast?: ToastAPI }) {
  const [settings, setSettings] = useState<SettingsObject>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<SettingsObject>({});

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch('/api/admin/settings', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settingsObject || {});
        setLocalSettings(data.settingsObject || {});
      } else {
        setHasError(true);
      }
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
    setLocalSettings(prev => ({
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
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: localSettings }),
      });

      const data = await res.json();

      if (res.ok) {
        setSettings(localSettings);
        setHasChanges(false);
        onToast?.success('Lưu thành công', 'Các cài đặt đã được cập nhật.');
      } else {
        onToast?.error('Lỗi', data.message || 'Không thể lưu cài đặt.');
      }
    } catch (err: any) {
      onToast?.error('Lỗi mạng', err.message || 'Kết nối thất bại.');
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-stone-900">Cài đặt hệ thống</h2>
            <p className="text-sm text-stone-400">Đang tải...</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-stone-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-stone-900">Cài đặt hệ thống</h2>
            <p className="text-sm text-stone-400">Đã xảy ra lỗi</p>
          </div>
          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Icon name="ArrowPathIcon" size={16} />
            Thử lại
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Icon name="ExclamationTriangleIcon" size={48} className="text-red-400 mx-auto mb-4" />
          <p className="font-bold text-stone-700">Không thể tải cài đặt</p>
          <p className="text-sm text-stone-500 mt-2">Vui lòng thử lại sau</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-stone-900">Cài đặt hệ thống</h2>
          <p className="text-sm text-stone-400">Quản lý các thông số cấu hình hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-2 border border-stone-300 text-stone-600 font-semibold px-4 py-2.5 rounded-xl transition-all hover:bg-stone-50 text-sm disabled:opacity-50"
            >
              <Icon name="ArrowPathIcon" size={16} />
              Đặt lại
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-glow-red hover:shadow-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang lưu...
              </>
            ) : (
              <>
                <Icon name="CheckIcon" size={16} />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings List */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-5 border-b border-stone-100" style={{ background: 'linear-gradient(135deg, #1A2948 0%, #2D3E5F 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Icon name="CogIcon" size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Cấu hình hệ thống</h3>
              <p className="text-xs text-white/60 mt-0.5">Thay đổi các thông số bên dưới để điều chỉnh hoạt động của hệ thống</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {DEFAULT_SETTINGS.map(setting => {
            const value = getSettingValue(setting.key, setting.type);
            
            return (
              <div key={setting.key} className="px-5 py-4 hover:bg-stone-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-stone-900">{setting.label}</h4>
                      {hasChanges && localSettings[setting.key]?.value !== settings[setting.key]?.value && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Đã thay đổi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{setting.description}</p>
                  </div>
                  <div className="w-48 flex-shrink-0">
                    {setting.type === 'boolean' ? (
                      <button
                        onClick={() => handleSettingChange(setting.key, value === 'true' ? 'false' : 'true')}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          value === 'true' ? 'bg-green-500' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            value === 'true' ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    ) : setting.type === 'select' ? (
                      <select
                        value={String(value)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                      >
                        {setting.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={setting.type === 'number' ? 'number' : 'text'}
                        value={String(value)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                        min={0}
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
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Icon name="InformationCircleIcon" size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Lưu ý khi thay đổi cài đặt</p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>- Một số thay đổi có thể cần khởi động lại dịch vụ để có hiệu lực</li>
            <li>- Vui lòng kiểm tra kỹ trước khi bật chế độ bảo trì</li>
            <li>- Các thay đổi sẽ được ghi lại trong nhật ký hệ thống</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
