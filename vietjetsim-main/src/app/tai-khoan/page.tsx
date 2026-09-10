import React from 'react';
import { Header } from '@/shared/components/navigation';
import UserDashboardClient from './components/UserDashboardClient';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';
import { ProtectedRoute } from '@/features/auth';

export default function UserDashboardPage() {
  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-[var(--surface)] dark:bg-[var(--dark-surface)]">
        <Header />
        <ErrorBoundary variant="api">
          <UserDashboardClient />
        </ErrorBoundary>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
