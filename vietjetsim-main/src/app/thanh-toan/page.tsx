import React, { Suspense } from 'react';
import { Header } from '@/shared/components/navigation';
import PaymentClient from './components/PaymentClient';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ErrorBoundary variant="booking" retryLabel="Thử thanh toán lại">
        <Suspense fallback={<div>Đang tải thanh toán...</div>}>
          <PaymentClient />
        </Suspense>
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
