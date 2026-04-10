import React, { Suspense } from 'react';
import Header from '@/components/Header';
import PaymentClient from './components/PaymentClient';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ErrorBoundary variant="booking" retryLabel="Thử thanh toán lại">
        <Suspense fallback={<div>Loading payment...</div>}>
          <PaymentClient />
        </Suspense>
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
