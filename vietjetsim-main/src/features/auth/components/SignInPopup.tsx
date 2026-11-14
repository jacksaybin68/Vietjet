'use client';

import React from 'react';
import PopupFrame from './PopupFrame';
import SkyIdAuthFlow, { type SkyIdMode } from './skyid/SkyIdAuthFlow';
import SkyIdForgotPassword from './skyid/steps/ForgotPasswordStep';

/**
 * `SignInPopup` — popup đăng nhập / đăng ký 622×664 của site thật.
 *
 * Site thật mở popup này khi bấm nút "Đăng nhập" ở header (mọi route), và
 * `/vi/signin`, `/vi/signup` là trang riêng chỉ chứa popup này. Khung gồm:
 *   - băng đỏ `48px` (tiêu đề "Đăng nhập SkyJoy" / "Đăng ký SkyJoy"),
 *   - khung form SkyID `500×208`,
 *   - bottom nav `62px`.
 *
 * Số đo: `docs/qa/2026-11-15-vietjet-measure/README.md` §1.
 */

export interface SignInPopupProps {
  mode?: SkyIdMode;
  /** Đường dẫn quay lại sau khi xác thực thành công. */
  redirectTo?: string;
  onClose?: () => void;
}

export default function SignInPopup({ mode = 'login', redirectTo, onClose }: SignInPopupProps) {
  const title = mode === 'register' ? 'Đăng ký SkyJoy' : 'Đăng nhập SkyJoy';

  return (
    <PopupFrame title={title} onClose={onClose}>
      <SkyIdAuthFlow variant="popup" mode={mode} redirectTo={redirectTo} onClose={onClose} />
    </PopupFrame>
  );
}

/** Popup "Quên mật khẩu?" — cùng khung 622×664, form quên mật khẩu. */
export function ForgotPasswordPopup({ onClose }: { onClose?: () => void }) {
  return (
    <PopupFrame title="Quên mật khẩu" onClose={onClose}>
      <SkyIdForgotPassword variant="popup" onClose={onClose} />
    </PopupFrame>
  );
}
