'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, isAdminRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export default function ProtectedRoute({ children, requiredRole = 'user' }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/sign-up-login');
      return;
    }
    if (requiredRole === 'admin' && !isAdminRole(role)) {
      router.push('/user-dashboard');
    }
  }, [loading, user, role, requiredRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-stone-500 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole === 'admin' && !isAdminRole(role)) return null;

  return <>{children}</>;
}
