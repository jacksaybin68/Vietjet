import React from 'react';
import { AdminDashboardClient } from '@/features/admin';
import { ErrorBoundary } from '@/shared/components/feedback';
import { ProtectedRoute } from '@/features/auth';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-[var(--surface)]">
        <ErrorBoundary variant="api" retryLabel="Tải lại bảng điều khiển">
          <AdminDashboardClient />
        </ErrorBoundary>
      </div>
    </ProtectedRoute>
  );
}
