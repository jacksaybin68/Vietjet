'use client';
import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface NotificationToggle {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

interface DeliveryMethod {
  id: 'inapp' | 'email' | 'sms';
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export default function NotificationSettingsTab() {
  const [alerts, setAlerts] = useState<NotificationToggle[]>([
    {
      id: 'message_alerts',
      label: 'Tin nhắn mới',
      description: 'Nhận thông báo khi có tin nhắn mới từ hỗ trợ khách hàng',
      icon: 'ChatBubbleLeftRightIcon',
      enabled: true,
    },
    {
      id: 'booking_updates',
      label: 'Cập nhật đặt vé',
      description: 'Thông báo xác nhận, thay đổi hoặc huỷ đặt vé của bạn',
      icon: 'TicketIcon',
      enabled: true,
    },
    {
      id: 'flight_changes',
      label: 'Thay đổi chuyến bay',
      description: 'Cảnh báo về thay đổi lịch bay, cổng ra máy bay hoặc trạng thái chuyến bay',
      icon: 'PaperAirplaneIcon',
      enabled: true,
    },
    {
      id: 'promotions',
      label: 'Khuyến mãi & Ưu đãi',
      description: 'Nhận thông tin về các ưu đãi đặc biệt và giảm giá vé máy bay',
      icon: 'TagIcon',
      enabled: false,
    },
    {
      id: 'reminders',
      label: 'Nhắc nhở check-in',
      description: 'Nhắc nhở tự động trước giờ bay để bạn không bỏ lỡ chuyến',
      icon: 'ClockIcon',
      enabled: true,
    },
  ]);

  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([
    {
      id: 'inapp',
      label: 'Trong ứng dụng',
      description: 'Thông báo hiển thị trực tiếp trong ứng dụng',
      icon: 'BellIcon',
      enabled: true,
    },
    {
      id: 'email',
      label: 'Email',
      description: 'Gửi thông báo đến địa chỉ email đã đăng ký',
      icon: 'EnvelopeIcon',
      enabled: true,
    },
    {
      id: 'sms',
      label: 'SMS',
      description: 'Gửi tin nhắn SMS đến số điện thoại của bạn',
      icon: 'DevicePhoneMobileIcon',
      enabled: false,
    },
  ]);

  const [saved, setSaved] = useState(false);

  const toggleAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const toggleDelivery = (id: string) => {
    setDeliveryMethods((prev) =>
      prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="bg-white rounded-2xl border border-stone-200 p-6"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(208,2,27,0.1)' }}
          >
            <Icon name="BellIcon" className="w-5 h-5" style={{ color: '#D0021B' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1A2948]">Cài đặt thông báo</h2>
            <p className="text-sm text-stone-500">Tuỳ chỉnh loại thông báo và phương thức nhận</p>
          </div>
        </div>
      </div>

      {/* Alert Type Toggles */}
      <div
        className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
      >
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="text-base font-bold text-[#1A2948]">Loại thông báo</h3>
          <p className="text-sm text-stone-500 mt-0.5">Chọn những loại thông báo bạn muốn nhận</p>
        </div>
        <div className="divide-y divide-stone-100">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.enabled ? 'bg-red-50' : 'bg-stone-100'}`}
                >
                  <Icon
                    name={alert.icon as any}
                    className="w-4 h-4"
                    style={{ color: alert.enabled ? '#D0021B' : '#a8a29e' }}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${alert.enabled ? 'text-[#1A2948]' : 'text-stone-400'}`}
                  >
                    {alert.label}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 max-w-xs">{alert.description}</p>
                </div>
              </div>
              {/* Toggle Switch */}
              <button
                onClick={() => toggleAlert(alert.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${alert.enabled ? 'bg-[#D0021B]' : 'bg-stone-300'}`}
                aria-label={`Toggle ${alert.label}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${alert.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Methods */}
      <div
        className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
      >
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="text-base font-bold text-[#1A2948]">Phương thức nhận thông báo</h3>
          <p className="text-sm text-stone-500 mt-0.5">Chọn cách bạn muốn nhận thông báo</p>
        </div>
        <div className="divide-y divide-stone-100">
          {deliveryMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${method.enabled ? 'bg-amber-50' : 'bg-stone-100'}`}
                >
                  <Icon
                    name={method.icon as any}
                    className="w-4 h-4"
                    style={{ color: method.enabled ? '#FFC72C' : '#a8a29e' }}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${method.enabled ? 'text-[#1A2948]' : 'text-stone-400'}`}
                  >
                    {method.label}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{method.description}</p>
                </div>
              </div>
              {/* Toggle Switch */}
              <button
                onClick={() => toggleDelivery(method.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${method.enabled ? 'bg-[#FFC72C]' : 'bg-stone-300'}`}
                aria-label={`Toggle ${method.label}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${method.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div
        className="bg-white rounded-2xl border border-stone-200 p-6"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 flex-shrink-0">
            <Icon name="MoonIcon" className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1A2948]">Giờ yên tĩnh</h3>
            <p className="text-xs text-stone-500">
              Tạm dừng thông báo trong khoảng thời gian nhất định
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Từ</label>
            <select className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-[#1A2948] focus:outline-none focus:ring-2 focus:ring-red-200 bg-stone-50">
              <option>22:00</option>
              <option>21:00</option>
              <option>23:00</option>
              <option>00:00</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Đến</label>
            <select className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-[#1A2948] focus:outline-none focus:ring-2 focus:ring-red-200 bg-stone-50">
              <option>07:00</option>
              <option>06:00</option>
              <option>08:00</option>
              <option>09:00</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <Icon name="CheckCircleIcon" className="w-4 h-4" />
            Đã lưu cài đặt
          </div>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#D0021B' }}
        >
          Lưu cài đặt
        </button>
      </div>
    </div>
  );
}
