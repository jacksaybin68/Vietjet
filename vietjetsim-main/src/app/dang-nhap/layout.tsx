import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng nhập / Đăng ký',
  description:
    'Đăng nhập hoặc tạo tài khoản Vietjet SkyJoy để đặt vé, theo dõi hành trình và tích điểm ưu đãi.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
