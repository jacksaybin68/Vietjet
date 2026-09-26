import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Yêu cầu liên kết đặt lại mật khẩu cho tài khoản Vietjet SkyJoy của bạn.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
