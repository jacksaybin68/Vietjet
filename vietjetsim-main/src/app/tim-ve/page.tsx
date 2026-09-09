import React from 'react';
import { Header } from '@/shared/components/navigation';
import FlightBookingClient from './components/FlightBookingClient';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';

export default function FlightBookingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-bg)]">
      <Header />
      <ErrorBoundary variant="booking">
        <FlightBookingClient />
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
