'use client';

import React, { useState, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/hooks/useToast';

/** Get display info for a role (label + badge color) */
function getRoleDisplay(role: string): { label: string; bg: string } {
  const map: Record<string, { label: string; bg: string }> = {
    user: { label: 'Người dùng', bg: '#1A2948' },
    admin: { label: 'Quản trị viên', bg: '#EC2029' },
    super_admin: { label: 'Super Admin', bg: '#991B1B' },
    admin_ops: { label: 'Admin Vận hành', bg: '#1E40AF' },
    admin_finance: { label: 'Admin Tài chính', bg: '#047857' },
    admin_support: { label: 'Admin Hỗ trợ', bg: '#7C3AED' },
    admin_content: { label: 'Admin Nội dung', bg: '#B45309' },
  };
  return map[role] || { label: role, bg: '#6B7280' };
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ProfileTab({ user }: { user: User }) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null);

  const [profile, setProfile] = useState<ProfileForm>({
    fullName: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    dob: '',
    gender: '',
    address: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const validateProfile = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (!profile.fullName.trim() || profile.fullName.trim().length < 2) {
      newErrors.fullName = 'Tên phải có ít nhất 2 ký tự';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (profile.phone && profile.phone.replace(/\D/g, '').length < 9) {
      newErrors.phone = 'Số điện thoại phải có ít nhất 9 chữ số';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [profile]);

  const validatePassword = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passwordForm]);

  const handleProfileChange = (field: keyof ProfileForm, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePasswordChange = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setIsSaving(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success('Lưu thành công', 'Thông tin hồ sơ đã được cập nhật.');
      setIsEditing(false);
    } catch {
      toast.error('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsChangingPassword(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success('Đổi mật khẩu thành công', 'Mật khẩu của bạn đã được cập nhật.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch {
      toast.error('Lỗi', 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        toast.info('Avatar đã cập nhật', 'Ảnh đại diện sẽ được lưu khi bạn nhấn Lưu thay đổi.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelEdit = () => {
    setProfile({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      dob: profile.dob,
      gender: profile.gender,
      address: profile.address,
    });
    setErrors({});
    setIsEditing(false);
  };

  const inputBaseClass =
    'w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#EC2029]/20 focus:border-[#EC2029]';
  const inputDisabledClass = 'bg-stone-100 text-stone-500 cursor-not-allowed';
  const inputErrorClass = 'border-[#EC2029] bg-red-50';
  const labelClass = 'block text-sm font-medium mb-1.5 font-[KoHo,sans-serif] text-[#1A2948]';
  const errorTextClass = 'text-xs text-[#EC2029] mt-1 font-[Be Vietnam Pro,sans-serif]';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-[KoHo,sans-serif] text-navy">Hồ sơ cá nhân</h2>
          <p className="text-sm text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
            Quản lý thông tin tài khoản và mật khẩu của bạn
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#EC2029] text-white rounded-xl font-semibold text-sm font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
          >
            <Icon name="PencilSquareIcon" size={18} />
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Avatar & Quick Info */}
        <div className="lg:col-span-1">
          <div
            className="bg-white rounded-2xl border border-stone-200 p-6 text-center"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          >
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div
                className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#EC2029]/10 mx-auto"
                style={{ background: 'linear-gradient(135deg, #1A2948 0%, #2A3F6F 100%)' }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-white font-[KoHo,sans-serif]">
                      {user.fullName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              {isEditing && (
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-[#EC2029] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#C41017] transition-colors shadow-lg"
                >
                  <Icon name="CameraIcon" size={18} className="text-white" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              )}
            </div>

            <h3 className="text-lg font-bold font-[KoHo,sans-serif] text-navy">
              {user.fullName || 'Người dùng'}
            </h3>
            <p className="text-sm text-stone-500 mt-1 font-[Be Vietnam Pro,sans-serif]">
              {user.email}
            </p>
            <span
              className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold font-[KoHo,sans-serif]"
              style={{
                background: getRoleDisplay(user.role).bg,
                color: '#fff',
              }}
            >
              {getRoleDisplay(user.role).label}
            </span>

            {user.createdAt && (
              <p className="text-xs text-stone-400 mt-4 font-[Be Vietnam Pro,sans-serif]">
                Tham gia từ{' '}
                {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Profile Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card"
          >
            <div className="p-6 border-b border-stone-100">
              <h3 className="text-lg font-bold font-[KoHo,sans-serif] flex items-center gap-2 text-navy">
                <Icon name="UserCircleIcon" size={22} className="text-[#EC2029]" />
                Thông tin cá nhân
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className={labelClass}>Họ và tên</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => handleProfileChange('fullName', e.target.value)}
                  disabled={!isEditing}
                  className={`${inputBaseClass} ${!isEditing ? inputDisabledClass : ''} ${errors.fullName ? inputErrorClass : ''}`}
                  placeholder="Nhập họ và tên"
                />
                {errors.fullName && <p className={errorTextClass}>{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  disabled={!isEditing}
                  className={`${inputBaseClass} ${!isEditing ? inputDisabledClass : ''} ${errors.email ? inputErrorClass : ''}`}
                  placeholder="email@example.com"
                />
                {errors.email && <p className={errorTextClass}>{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className={labelClass}>Số điện thoại</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  disabled={!isEditing}
                  className={`${inputBaseClass} ${!isEditing ? inputDisabledClass : ''} ${errors.phone ? inputErrorClass : ''}`}
                  placeholder="0901234567"
                />
                {errors.phone && <p className={errorTextClass}>{errors.phone}</p>}
              </div>

              {/* DOB & Gender Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Ngày sinh</label>
                  <input
                    type="date"
                    value={profile.dob}
                    onChange={(e) => handleProfileChange('dob', e.target.value)}
                    disabled={!isEditing}
                    className={`${inputBaseClass} ${!isEditing ? inputDisabledClass : ''}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Giới tính</label>
                  <select
                    value={profile.gender}
                    onChange={(e) => handleProfileChange('gender', e.target.value)}
                    disabled={!isEditing}
                    className={`${inputBaseClass} ${!isEditing ? inputDisabledClass : ''}`}
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={labelClass}>Địa chỉ</label>
                <textarea
                  value={profile.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                  className={`${inputBaseClass} resize-none ${!isEditing ? inputDisabledClass : ''}`}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                />
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#EC2029] text-white rounded-xl font-semibold text-sm font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Icon name="CheckCircleIcon" size={18} />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-semibold text-sm font-[KoHo,sans-serif] hover:bg-stone-200 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-vj-card">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold font-[KoHo,sans-serif] flex items-center gap-2 text-navy">
            <Icon name="KeyIcon" size={22} className="text-[#1A2948]" />
            Đổi mật khẩu
          </h3>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A2948] text-white rounded-lg text-sm font-semibold font-[KoHo,sans-serif] hover:bg-[#2A3F6F] transition-all duration-200 active:scale-95"
            >
              <Icon name="LockClosedIcon" size={16} />
              Thay đổi
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="p-6">
            <div className="space-y-5 max-w-lg">
              {/* Current Password */}
              <div>
                <label className={labelClass}>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  className={`${inputBaseClass} ${errors.currentPassword ? inputErrorClass : ''}`}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                {errors.currentPassword && (
                  <p className={errorTextClass}>{errors.currentPassword}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className={labelClass}>Mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  className={`${inputBaseClass} ${errors.newPassword ? inputErrorClass : ''}`}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                />
                {errors.newPassword && <p className={errorTextClass}>{errors.newPassword}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelClass}>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  className={`${inputBaseClass} ${errors.confirmPassword ? inputErrorClass : ''}`}
                  placeholder="Nhập lại mật khẩu mới"
                />
                {errors.confirmPassword && (
                  <p className={errorTextClass}>{errors.confirmPassword}</p>
                )}
              </div>

              {/* Password Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#EC2029] text-white rounded-xl font-semibold text-sm font-[KoHo,sans-serif] hover:bg-[#C41017] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? (
                    <>
                      <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Icon name="CheckCircleIcon" size={18} />
                      Cập nhật mật khẩu
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setErrors({});
                  }}
                  disabled={isChangingPassword}
                  className="px-6 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-semibold text-sm font-[KoHo,sans-serif] hover:bg-stone-200 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
