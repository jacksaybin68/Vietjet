import React, { Suspense } from 'react';
import { Header } from '@/shared/components/navigation';
import { PaymentClient } from '@/features/payments';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#b4ddf5] via-[#d6ebf9] to-[#edf6fd] relative">
      {/* Header TRẮNG 74px (biến thể `subpage`) — site thật dùng đúng header
          này cho MỌI trang con của luồng đặt vé (`/select-flight`,
          `/passengers`, `/select-service`, `/payment-methods`). Bản cũ dùng
          `variant="compact"` (băng đỏ 122px) nên lệch hoàn toàn về màu nền,
          chiều cao và vị trí các control. */}
      <Header variant="subpage" mobileTitle="THANH TOÁN" mobileRed />
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
