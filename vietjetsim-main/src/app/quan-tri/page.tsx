import React from 'react';
import AdminDashboardClient from './components/AdminDashboardClient';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-stone-50">
        <ErrorBoundary variant="api" retryLabel="Tải lại bảng điều khiển">
          <AdminDashboardClient />
        </ErrorBoundary>
      </div>
    </ProtectedRoute>
  );
}
