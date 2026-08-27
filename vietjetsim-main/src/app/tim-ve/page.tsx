import React from 'react';
import Header from '@/components/Header';
import FlightBookingClient from './components/FlightBookingClient';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function FlightBookingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ErrorBoundary variant="booking">
        <FlightBookingClient />
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
