import React from 'react';
import Header from '@/components/Header';
import UserDashboardClient from './components/UserDashboardClient';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function UserDashboardPage() {
  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-gray-50">
        <Header />
        <ErrorBoundary variant="api">
          <UserDashboardClient />
        </ErrorBoundary>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
