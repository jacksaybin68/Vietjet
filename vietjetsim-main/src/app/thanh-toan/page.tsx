import React, { Suspense } from 'react';
import { Header } from '@/shared/components/navigation';
import { PaymentClient } from '@/features/payments';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#b4ddf5] via-[#d6ebf9] to-[#edf6fd] relative">
      <Header variant="compact" mobileTitle="THANH TOÁN" />
      <main id="main-content">
        <ErrorBoundary variant="booking" retryLabel="Thử thanh toán lại">
          <Suspense fallback={<div>Đang tải thanh toán...</div>}>
            <PaymentClient />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
