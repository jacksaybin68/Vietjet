import React from 'react';
import { redirect } from 'next/navigation';
import { Header } from '@/shared/components/navigation';
import { FlightBookingClient } from '@/features/bookings';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';

export default async function FlightBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hasSearchCriteria = ['from', 'to', 'depart'].every((key) => {
    const value = params[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  // A direct visit to /tim-ve has no booking criteria yet. Send the user to the
  // homepage form so route, date, passenger count and other options are chosen
  // before results are rendered.
  if (!hasSearchCriteria) redirect('/trang-chu#hero-booking-form');

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
