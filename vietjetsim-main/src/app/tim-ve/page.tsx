import React from 'react';
import { Header } from '@/shared/components/navigation';
import { FlightBookingClient } from '@/features/bookings';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';

export default function FlightBookingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
      <ErrorBoundary variant="booking">
        <FlightBookingClient />
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
